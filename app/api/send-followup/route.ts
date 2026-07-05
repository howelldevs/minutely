/**
 * POST /api/send-followup
 *
 * Human-in-the-loop gate for follow-up dispatch.
 *
 * FLOW:
 *   1. User reviews + approves follow-up in UI, choosing an action mode:
 *      "message" (Slack only), "calendar" (calendar only), or "both"
 *   2. This route validates auth
 *   3. Only the tool(s) matching the chosen action mode are exposed to the LLM
 *   4. Response reflects exactly what was attempted — no phantom calendar
 *      failure when the user only asked for Slack, and vice versa
 *
 * Email support has been completely removed.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { callLLMWithTools } from "@/lib/agents/tools"
import type { FollowUp } from "@/types/analysis"

type ActionMode = "message" | "calendar" | "both"

const POST_SLACK_TOOL = {
  type: "function",
  function: {
    name: "post_slack",
    description: "Post a follow-up message to Slack",
    parameters: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Slack channel" },
        message: { type: "string", description: "Slack message body" },
        urgency: { type: "string", enum: ["High", "Medium", "Low"] },
      },
      required: ["channel", "message"],
    },
  },
} as const

const CREATE_CALENDAR_EVENT_TOOL = {
  type: "function",
  function: {
    name: "create_calendar_event",
    description: "Create a Google Calendar follow-up reminder",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        start_datetime: { type: "string" },
        duration_minutes: { type: "number" },
        attendees: { type: "array", items: { type: "string" } },
      },
      required: ["title", "start_datetime"],
    },
  },
} as const

function buildSystemPrompt(action: ActionMode): string {
  const rules: string[] = [
    "You are Meetric's follow-up dispatch agent.",
    "",
    "The human has already reviewed and approved this action.",
    "",
    "RULES:",
  ]

  if (action === "message") {
    rules.push(
      "- ALWAYS use post_slack",
      "- Do NOT use create_calendar_event under any circumstances",
      '- Use "#general" unless another Slack channel is clearly specified'
    )
  } else if (action === "calendar") {
    rules.push(
      "- ALWAYS use create_calendar_event",
      "- Do NOT use post_slack under any circumstances"
    )
  } else {
    rules.push(
      "- ALWAYS use post_slack",
      "- ALWAYS also use create_calendar_event",
      '- Use "#general" unless another Slack channel is clearly specified'
    )
  }

  rules.push("- NEVER use send_email", "- Do not ask for confirmation", "- Execute immediately")

  return rules.join("\n")
}

function toolsForAction(action: ActionMode) {
  if (action === "message") return [POST_SLACK_TOOL]
  if (action === "calendar") return [CREATE_CALENDAR_EVENT_TOOL]
  return [POST_SLACK_TOOL, CREATE_CALENDAR_EVENT_TOOL]
}

function fallbackReply(action: ActionMode, recipient: string): string {
  if (action === "message") return `Slack follow-up dispatched to ${recipient}.`
  if (action === "calendar") return `Calendar reminder created for ${recipient}.`
  return `Slack follow-up dispatched and calendar reminder created for ${recipient}.`
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      followUp,
      meetingTitle,
      action,
    }: {
      followUp: FollowUp
      meetingTitle: string
      action?: ActionMode
    } = await req.json()

    if (!followUp?.recipient || !followUp?.body) {
      return NextResponse.json({ error: "Missing follow-up data" }, { status: 400 })
    }

    // Fall back to the old urgency-based default only if the client didn't
    // send an explicit action (keeps this backward compatible).
    const actionMode: ActionMode =
      action ?? (followUp.urgency === "High" ? "both" : "message")

    const dispatchTools = toolsForAction(actionMode)
    const systemPrompt = buildSystemPrompt(actionMode)

    // Calendar check-in = 3 days later — only relevant if calendar is in play.
    const checkInDate = new Date()
    checkInDate.setDate(checkInDate.getDate() + 3)
    const startISO = new Date(checkInDate.setHours(10, 0, 0, 0)).toISOString()

    const userContent = `
Meeting: ${meetingTitle}

Approved follow-up:

Recipient: ${followUp.recipient}
Urgency: ${followUp.urgency}
Subject: ${followUp.subject}
Body: ${followUp.body}

Tasks:
${followUp.tasks.join(", ")}

${
  actionMode !== "message"
    ? `Create the calendar reminder for:\n${startISO}`
    : ""
}
`.trim()

    const { reply, toolResults } = await callLLMWithTools(
      systemPrompt,
      userContent,
      dispatchTools,
      userId,
      3
    )

    const allSucceeded = toolResults.every((r) => r.success)

    console.log(
      `[send-followup] user:${userId} recipient:${followUp.recipient} action:${actionMode} tools:[${toolResults
        .map((r) => r.tool)
        .join(",")}] ok:${allSucceeded}`
    )

    return NextResponse.json({
      ok: allSucceeded,
      toolResults,
      reply: reply || fallbackReply(actionMode, followUp.recipient),
    })
  } catch (err) {
    console.error("[POST /api/send-followup]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}