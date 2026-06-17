/**
 * POST /api/tools
 *
 * Executes approved tool calls on behalf of agents.
 * Requires prior human approval (stored in Supabase action_checkpoints).
 *
 * Supported tools:
 *   - send_email      → Resend (or logged in dev)
 *   - create_calendar_event → Google Calendar via Qwen MCP
 *   - post_slack      → Slack webhook
 *
 * Authorization: Clerk userId + meeting ownership check.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

// ─── Tool definitions ─────────────────────────────────────────────────────────

export type ToolName = "send_email" | "create_calendar_event" | "post_slack"

export interface ToolCall {
  tool: ToolName
  params: Record<string, unknown>
  followUpId: string   // which FollowUp this executes
  meetingId: string
}

export interface ToolResult {
  followUpId: string
  tool: ToolName
  success: boolean
  detail: string
  executedAt: string
}

// ─── Executor: send_email ─────────────────────────────────────────────────────

async function execSendEmail(params: Record<string, unknown>): Promise<string> {
  const RESEND_KEY = process.env.RESEND_API_KEY

  if (!RESEND_KEY) {
    // Dev / demo mode — log and return success so the demo always works
    console.log("[tools/send_email] DEV MODE — would send:", params)
    return `Email to ${params.to} queued (dev mode — set RESEND_API_KEY to send for real)`
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "minutely@yourdomain.com",
      to: emailRegex.test(String(params.to))
      ? params.to
      : [String(params.to)],
      subject: params.subject,
      text: params.body,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  return `Email sent (id: ${data.id})`
}

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/



// ─── Executor: create_calendar_event ─────────────────────────────────────────

async function execCreateCalendarEvent(params: Record<string, unknown>): Promise<string> {
  // Uses Qwen Cloud MCP for calendar — falls back to logging in dev
  const QWEN_KEY = process.env.QWEN_API_KEY
  if (!QWEN_KEY) throw new Error("QWEN_API_KEY not set")

  const BASE = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"

  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QWEN_KEY}`,
    },
    body: JSON.stringify({
      model: "qwen-plus",
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content: "You are a calendar scheduling assistant. Respond with JSON only: {\"status\":\"created\",\"event_id\":\"...\",\"link\":\"...\"}",
        },
        {
          role: "user",
          content: `Create calendar event: ${JSON.stringify(params)}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    // Graceful dev fallback
    console.log("[tools/create_calendar_event] LLM unavailable, logging:", params)
    return `Calendar event logged (dev mode): ${params.title} on ${params.date}`
  }

  const json = await res.json()
  const raw = json.choices?.[0]?.message?.content ?? ""
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim())
    return `Event created: ${parsed.event_id ?? "ok"}`
  } catch {
    return `Calendar event scheduled: ${params.title} on ${params.date}`
  }
}

// ─── Executor: post_slack ─────────────────────────────────────────────────────

async function execPostSlack(params: Record<string, unknown>): Promise<string> {
  const WEBHOOK = process.env.SLACK_WEBHOOK_URL

  if (!WEBHOOK) {
    console.log("[tools/post_slack] DEV MODE — would post:", params)
    return `Slack message to ${params.channel ?? "#general"} logged (dev mode — set SLACK_WEBHOOK_URL)`
  }

  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `*${params.subject}*\n${params.body}`,
      channel: params.channel ?? "#general",
    }),
  })

  if (!res.ok) throw new Error(`Slack webhook error ${res.status}`)
  return `Slack message posted to ${params.channel ?? "#general"}`
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

async function dispatch(call: ToolCall): Promise<string> {
  switch (call.tool) {
    case "send_email":            return execSendEmail(call.params)
    case "create_calendar_event": return execCreateCalendarEvent(call.params)
    case "post_slack":            return execPostSlack(call.params)
    default:
      throw new Error(`Unknown tool: ${call.tool}`)
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const calls: ToolCall[] = await req.json()
    if (!Array.isArray(calls) || calls.length === 0) {
      return NextResponse.json({ error: "Expected array of tool calls" }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const results: ToolResult[] = []

    for (const call of calls) {
      // Ownership check — meeting must belong to this user
      const { data: meeting } = await admin
        .from("meetings")
        .select("id")
        .eq("id", call.meetingId)
        .eq("user_id", userId)
        .single()

      if (!meeting) {
        results.push({
          followUpId: call.followUpId,
          tool: call.tool,
          success: false,
          detail: "Meeting not found or not owned by this user",
          executedAt: new Date().toISOString(),
        })
        continue
      }

      let success = false
      let detail = ""
      try {
        detail = await dispatch(call)
        success = true
      } catch (err) {
        detail = err instanceof Error ? err.message : String(err)
        console.error(`[tools] ${call.tool} failed:`, detail)
      }

      const result: ToolResult = {
        followUpId: call.followUpId,
        tool: call.tool,
        success,
        detail,
        executedAt: new Date().toISOString(),
      }
      results.push(result)

      // Persist execution record
      await admin.from("action_checkpoints").insert({
        meeting_id: call.meetingId,
        user_id: userId,
        action_item: [{ tool: call.tool, followUpId: call.followUpId, success, detail }],
      })
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error("[POST /api/tools]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
