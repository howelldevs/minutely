import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { orchestrate } from "@/lib/agents/orchestrator"
import { buildMemoryContext } from "@/lib/agents/memory"
import { saveAnalysis } from "@/lib/storage"

export const maxDuration = 120

const MIN_TRANSCRIPT_CHARS = 50
const MAX_TRANSCRIPT_CHARS = 10_000

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json()

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < MIN_TRANSCRIPT_CHARS) {
      return NextResponse.json(
        { error: `Transcript is required and must be at least ${MIN_TRANSCRIPT_CHARS} characters.` },
        { status: 400 }
      )
    }

    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json(
        {
          error: `Transcript is too long (${transcript.length.toLocaleString()} / ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters). Please trim it and try again.`,
        },
        { status: 400 }
      )
    }

    const { userId } = await auth()

    // ── Build memory context for signed-in users ──────────────────────────────
    let memoryBlock = undefined
    if (userId) {
      try {
        const memCtx = await buildMemoryContext(userId, 5)
        if (memCtx.meetingCount > 0) {
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