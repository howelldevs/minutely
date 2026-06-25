/**
 * POST /api/analyze
 *
 * Accepts { transcript } and runs the 6-agent orchestrator.
 * Memory context is built from the user's prior meetings and injected
 * into Agent 1 before orchestration begins.
 *
 * Returns MeetingIntelligence + savedId (null for anonymous users).
 */

import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { orchestrate } from "@/lib/agents/orchestrator"
import { buildMemoryContext } from "@/lib/agents/memory"
import { saveAnalysis } from "@/lib/storage"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json()

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 50) {
      return NextResponse.json(
        { error: "Transcript is required and must be at least 50 characters." },
        { status: 400 }
      )
    }

    const { userId } = await auth()

    // ── Build memory context for signed-in users ──────────────────────────────
    // This gives Agent 1 awareness of recurring participants, blockers, and
    // unresolved tasks from the last 5 meetings.
    let memoryBlock = undefined
    if (userId) {
      try {
        const memCtx = await buildMemoryContext(userId, 5)
        if (memCtx.meetingCount > 0) {
          // Shape the MemoryBlock the orchestrator expects
          memoryBlock = {
  meetingCount: memCtx.meetingCount,
  condensedSummary: memCtx.contextBlock,

  participantHistory: [],
  openTasks: [],

  recurringBlockers: [],
  recentDecisions: [],
  lastMeetingAt: null,
}
        }
      } catch (memErr) {
        // Non-fatal — analysis continues without memory
        console.warn("[analyze] memory build failed, continuing without:", memErr)
      }
    }

    // ── Run orchestrator ──────────────────────────────────────────────────────
    const intelligence = await orchestrate(transcript, memoryBlock)

    // ── Persist (signed-in only) ──────────────────────────────────────────────
    let savedId: string | null = null
    if (userId) {
      savedId = await saveAnalysis(intelligence, userId)
    }

    return NextResponse.json({ ...intelligence, savedId })
  } catch (err) {
    console.error("[analyze] error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json(
      { error: message, details: String(err) },
      { status: 500 }
    )
  }
}