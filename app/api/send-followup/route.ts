/**
 * POST /api/send-followup
 *
 * Human-in-the-loop gate for follow-up dispatch.
 *
 * FLOW:
 *   1. User reviews + approves follow-up in UI
 *   2. This route validates auth
 *   3. Uses ONLY Slack + Calendar tools
 *   4. Posts follow-up to Slack
 *   5. If urgency is High → schedules calendar follow-up
 *
 * Email support has been completely removed.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { callLLMWithTools } from "@/lib/agents/tools"
import type { FollowUp } from "@/types/analysis"

const DISPATCH_SYSTEM_PROMPT = `
You are Minutely's follow-up dispatch agent.

The human has already reviewed and approved the message.

RULES:
- ALWAYS use post_slack
- NEVER use send_email
- If urgency is "High", ALSO create a calendar event 3 days from now
- Use "#general" unless another Slack channel is clearly specified
- Do not ask for confirmation
- Execute immediately
`

// ONLY expose Slack + Calendar tools
const DISPATCH_TOOLS = [
  {
    type: "function",
    function: {
      name: "post_slack",
      description: "Post a follow-up message to Slack",
      parameters: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description: "Slack channel",
          },
          message: {
            type: "string",
            description: "Slack message body",
          },
          urgency: {
            type: "string",
            enum: ["High", "Medium", "Low"],
          },
        },
        required: ["channel", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a Google Calendar follow-up reminder",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          description: {
            type: "string",
          },
          start_datetime: {
            type: "string",
          },
          duration_minutes: {
            type: "number",
          },
          attendees: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["title", "start_datetime"],
      },
    },
  },
] as const

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const {
      followUp,
      meetingTitle,
    }: {
      followUp: FollowUp
      meetingTitle: string
    } = await req.json()

    if (!followUp?.recipient || !followUp?.body) {
      return NextResponse.json(
        { error: "Missing follow-up data" },
        { status: 400 }
      )
    }

    // Calendar check-in = 3 days later
    const checkInDate = new Date()
    checkInDate.setDate(checkInDate.getDate() + 3)

    const startISO = new Date(
      checkInDate.setHours(10, 0, 0, 0)
    ).toISOString()

    const userContent = `
Meeting: ${meetingTitle}

Approved follow-up:

Recipient: ${followUp.recipient}
Urgency: ${followUp.urgency}
Subject: ${followUp.subject}
Body: ${followUp.body}

Tasks:
${followUp.tasks.join(", ")}

If urgency is High, create a calendar reminder for:
${startISO}
`.trim()

    const { reply, toolResults } =
      await callLLMWithTools(
        DISPATCH_SYSTEM_PROMPT,
        userContent,
        DISPATCH_TOOLS,
        userId,
        3
      )

    const allSucceeded = toolResults.every(
      (r) => r.success
    )

    console.log(
      `[send-followup] user:${userId} recipient:${followUp.recipient} tools:[${toolResults
        .map((r) => r.tool)
        .join(",")}] ok:${allSucceeded}`
    )

    return NextResponse.json({
      ok: allSucceeded,
      toolResults,
      reply:
        reply ||
        `Slack follow-up dispatched to ${followUp.recipient}.`,
    })
  } catch (err) {
    console.error("[POST /api/send-followup]", err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}