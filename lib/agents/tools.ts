/**
 * lib/agents/tools.ts — Meetric Unified Tool Layer
 *
 * Tool executors for all agent actions. Each tool has:
 *   - A Qwen function-call definition (schema the LLM sees)
 *   - A real executor that calls the actual API
 *   - A dry-run fallback so demos work without credentials
 *
 * TOOLS:
 *   send_email            → Resend API (server-side, no per-user OAuth needed)
 *   create_calendar_event → Google Calendar API (per-user OAuth2 via stored refresh token)
 *   post_slack            → Slack Incoming Webhook (workspace-level, one URL)
 *   create_notion_page    → Notion API (per-user integration token)
 *
 * HOW CREDENTIALS WORK:
 *   - Resend:   RESEND_API_KEY env var (app-level, you own the sending domain)
 *   - Slack:    SLACK_WEBHOOK_URL env var (webhook URL from Slack app settings)
 *   - Calendar: per-user OAuth2 refresh token stored in Supabase `user_integrations`
 *   - Notion:   per-user integration token stored in Supabase `user_integrations`
 *
 * HOW TO GET PER-USER TOKENS:
 *   See /app/api/integrations — OAuth2 connect flow stores tokens in
 *   the `user_integrations` table keyed by (user_id, provider).
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { AI_BASE_URL, AI_PRIMARY_MODEL, getAIApiKey, getAIHeaders } from "@/lib/ai-config"
import type { ChatCompletionTool } from "openai/resources/chat/completions"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolName =
  | "create_calendar_event"
  | "post_slack"
  | "create_notion_page"

export interface ToolCallResult {
  tool:    ToolName
  success: boolean
  data:    Record<string, unknown>
  error?:  string
}

export interface AgentWithToolsResult {
  reply:       string
  toolResults: ToolCallResult[]
}

// ─── Qwen function definitions (what the LLM sees) ───────────────────────────

export const METRIC_TOOLS = [

  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description:
        "Create a Google Calendar event for a follow-up, sprint kickoff, or deadline check-in.",
      parameters: {
        type: "object",
        properties: {
          title:            { type: "string",  description: "Event title" },
          description:      { type: "string",  description: "Agenda or context" },
          start_datetime:   { type: "string",  description: "ISO 8601, e.g. 2025-06-23T10:00:00Z" },
          duration_minutes: { type: "number",  description: "Duration (default 30)" },
          attendees:        { type: "array", items: { type: "string" }, description: "Attendee emails" },
        },
        required: ["title", "start_datetime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "post_slack",
      description:
        "Post a blocker alert or sprint update to a Slack channel. " +
        "Use for High severity blockers needing immediate team attention.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Slack channel, e.g. #eng-blockers" },
          message: { type: "string", description: "Message text (plain, no markdown)" },
          urgency: { type: "string", enum: ["High", "Medium", "Low"] },
        },
        required: ["channel", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_notion_page",
      description:
        "Create a Notion page in the user's connected workspace. " +
        "Use to save meeting summaries, action plans, or sprint docs to Notion.",
      parameters: {
        type: "object",
        properties: {
          title:      { type: "string", description: "Page title" },
          content:    { type: "string", description: "Page body in plain text or Markdown" },
          database_id: { type: "string", description: "Optional Notion database ID to add as a row" },
        },
        required: ["title", "content"],
      },
    },
  },
] as const

// ─── Helpers: per-user integration tokens from Supabase ──────────────────────

async function getUserToken(
  userId: string,
  provider: "google" | "notion"
): Promise<string | null> {
  try {
    const admin = createAdminSupabaseClient()
    const { data } = await admin
      .from("user_integrations")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single()

    if (!data) return null

    // Refresh Google token if expired
    if (provider === "google" && data.expires_at) {
      const expiresAt = new Date(data.expires_at).getTime()
      if (Date.now() > expiresAt - 60_000) {
        const refreshed = await refreshGoogleToken(userId, data.refresh_token)
        return refreshed
      }
    }

    return data.access_token
  } catch {
    return null
  }
}

async function refreshGoogleToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type:    "refresh_token",
      }),
    })

    if (!res.ok) return null
    const json = await res.json()

    // Persist the new access token
    const admin = createAdminSupabaseClient()
    const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString()
    await admin
      .from("user_integrations")
      .update({ access_token: json.access_token, expires_at: expiresAt })
      .eq("user_id", userId)
      .eq("provider", "google")

    return json.access_token
  } catch {
    return null
  }
}

// ─── Tool: send_email (via Resend — app-level API key, no per-user OAuth) ────
// Resend is the correct approach: you verify your domain once, then send FROM
// any address at that domain TO any recipient. No per-user credentials needed.


// ─── Tool: create_calendar_event (Google Calendar API, per-user OAuth) ────────
// Requires the user to connect their Google account first via /integrations.
// The OAuth flow stores their refresh token in `user_integrations`.
// This function fetches + auto-refreshes the token before each call.

async function execCreateCalendarEvent(
  args: {
    title: string
    description?: string
    start_datetime: string
    duration_minutes?: number
    attendees?: string[]
  },
  _userId: string
): Promise<ToolCallResult> {
  const accessToken = await getUserToken(_userId, "google")

  if (!accessToken) {
    return {
      tool: "create_calendar_event",
      success: false,
      data: args,
      error: "GOOGLE_ACCESS_TOKEN not configured",
    }
  }

  const start = new Date(args.start_datetime)

  const end = new Date(
    start.getTime() +
      (args.duration_minutes ?? 30) * 60_000
  )

  const event = {
    summary: args.title,
    description: args.description ?? "",
    start: {
      dateTime: start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "UTC",
    },
    attendees: (args.attendees ?? []).map(
      (email) => ({ email })
    ),
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      process.env.GOOGLE_CALENDAR_ID ?? "primary"
    )}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(event),
    }
  )

  if (!res.ok) {
    const err = await res.text()

    return {
      tool: "create_calendar_event",
      success: false,
      data: args,
      error: `Google Calendar ${res.status}: ${err}`,
    }
  }

  const created = await res.json()

  return {
    tool: "create_calendar_event",
    success: true,
    data: {
      eventId: created.id,
      htmlLink: created.htmlLink,
    },
  }
}

// ─── Tool: post_slack (Incoming Webhook — workspace-level, one URL) ───────────
// The Slack webhook URL is set once at the workspace level. No per-user OAuth.
// Users paste the webhook URL in Settings → Integrations.

async function execPostSlack(
  args: { channel: string; message: string; urgency?: string },
  _userId: string
): Promise<ToolCallResult> {
  const WEBHOOK = process.env.SLACK_WEBHOOK_URL

  if (!WEBHOOK) {
    console.log("[tools/post_slack] DRY-RUN →", { channel: args.channel })
    return {
      tool:    "post_slack",
      success: true,
      data:    { dryRun: true, channel: args.channel },
    }
  }

  const emoji = args.urgency === "High" ? "🔴" : args.urgency === "Medium" ? "🟡" : "🟢"
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: args.channel,
      text: `${emoji} *Meetric Alert* → *${args.channel}*\n${args.message}`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { tool: "post_slack", success: false, data: args, error: `Slack ${res.status}: ${err}` }
  }

  return { tool: "post_slack", success: true, data: { channel: args.channel, posted: true } }
}

// ─── Tool: create_notion_page (Notion API, per-user integration token) ────────
// Users connect Notion by creating a Notion integration and pasting their
// Internal Integration Token in Settings → Integrations. This token is stored
// in `user_integrations` with provider = "notion".
// See: https://developers.notion.com/docs/create-a-notion-integration

async function execCreateNotionPage(
  args: { title: string; content: string; database_id?: string },
  userId: string
): Promise<ToolCallResult> {
  const token = await getUserToken(userId, "notion")

  if (!token) {
    return {
      tool:    "create_notion_page",
      success: false,
      data:    args,
      error:   "Notion not connected. Go to Settings → Integrations to add your Notion token.",
    }
  }

  // Build Notion blocks from plain text (split on double newlines)
  const paragraphs = args.content
    .split(/\n\n+/)
    .slice(0, 50) // Notion block limit
    .map((p) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: p.slice(0, 2000) } }],
      },
    }))

  // If database_id provided, create as a DB row; otherwise as a standalone page
  const parent = args.database_id
    ? { database_id: args.database_id }
    : { page_id: process.env.NOTION_ROOT_PAGE_ID ?? undefined, type: "workspace" as const, workspace: true }

  const body: Record<string, unknown> = {
    parent,
    properties: {
      title: {
        title: [{ type: "text", text: { content: args.title } }],
      },
    },
    children: paragraphs,
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      Authorization:     `Bearer ${token}`,
      "Notion-Version":  "2022-06-28",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    return {
      tool: "create_notion_page",
      success: false,
      data: args,
      error: `Notion API ${res.status}: ${err.slice(0, 200)}`,
    }
  }

  const page = await res.json()
  return {
    tool:    "create_notion_page",
    success: true,
    data:    { pageId: page.id, url: page.url, title: args.title },
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function executeTool(
  name:   ToolName,
  args:   Record<string, unknown>,
  userId: string
): Promise<ToolCallResult> {
  switch (name) {
    case "create_calendar_event":
      return execCreateCalendarEvent(args as Parameters<typeof execCreateCalendarEvent>[0], userId)
    case "post_slack":
      return execPostSlack(args as Parameters<typeof execPostSlack>[0], userId)
    case "create_notion_page":
      return execCreateNotionPage(args as Parameters<typeof execCreateNotionPage>[0], userId)
    default:
      return { tool: name, success: false, data: {}, error: `Unknown tool: ${name}` }
  }
}

// ─── Agentic tool-call loop ───────────────────────────────────────────────────

export async function callLLMWithTools(
  systemPrompt: string,
  userContent:  string,
  tools: readonly ChatCompletionTool[],
  userId:       string,
  maxRounds =   4
): Promise<AgentWithToolsResult> {
  const apiKey = getAIApiKey()
  if (!apiKey) throw new Error("AI API key is not set")

  type Msg = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string }
  const messages: Msg[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userContent },
  ]

  const allToolResults: ToolCallResult[] = []
  let reply = ""

  for (let round = 0; round < maxRounds; round++) {
    const res = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: getAIHeaders(apiKey),
      body: JSON.stringify({
        model:       AI_PRIMARY_MODEL,
        temperature: 0.1,
        max_tokens:  2048,
        tools,
        tool_choice: "auto",
        messages,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`LLM tool-call error ${res.status}: ${body.slice(0, 300)}`)
    }

    const json    = await res.json()
    const message = json.choices?.[0]?.message

    messages.push({
      role:       "assistant",
      content:    message?.content ?? null,
      tool_calls: message?.tool_calls,
    })

    if (!message?.tool_calls?.length) {
      reply = message?.content ?? ""
      break
    }

    for (const tc of message.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>) {
      let args: Record<string, unknown> = {}
      try { args = JSON.parse(tc.function.arguments) } catch { /* leave empty */ }

      const result = await executeTool(tc.function.name as ToolName, args, userId)
      allToolResults.push(result)

      messages.push({
        role:         "tool",
        content:      JSON.stringify(result.success ? result.data : { error: result.error }),
        tool_call_id: tc.id,
        name:         tc.function.name,
      })
    }
  }

  return { reply, toolResults: allToolResults }
}
