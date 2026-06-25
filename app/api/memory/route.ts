/**
 * GET  /api/memory?userId=...
 *   Returns a condensed memory block for the orchestrator:
 *   last 5 meetings → recurring participants, running blockers, open tasks.
 *
 * POST /api/memory
 *   Called after analysis completes to upsert a memory entry.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { AI_BASE_URL, getAIApiKey, getAIHeaders } from "@/lib/ai-config"

const MEMORY_MODEL = "qwen-turbo"   // fast model — memory summarisation is cheap

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoryBlock {
  participantHistory: string[]       // names seen across sessions
  recurringBlockers: string[]        // blocker descriptions that appear 2+ times
  openTasks: string[]                // tasks from prior meetings not marked done
  recentDecisions: string[]          // last 10 decisions across meetings
  meetingCount: number
  lastMeetingAt: string | null
  condensedSummary: string           // AI-generated 2-3 sentence context
}

// ─── Condenser ────────────────────────────────────────────────────────────────

async function condenseMemory(raw: string): Promise<string> {
  const apiKey = getAIApiKey()
  if (!apiKey) return "Memory context unavailable."

  try {
    const res = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: getAIHeaders(apiKey),
      body: JSON.stringify({
        model: MEMORY_MODEL,
        max_tokens: 300,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are a meeting memory assistant. Given a summary of prior meetings, write 2-3 sentences of context that would help an AI analyst understand recurring themes, outstanding issues, and who the key players are. Be factual, specific, and concise. No preamble.",
          },
          { role: "user", content: raw },
        ],
      }),
    })

    if (!res.ok) return "Memory context unavailable."
    const json = await res.json()
    return (json.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
  } catch {
    return "Memory context unavailable."
  }
}

// ─── GET /api/memory ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminSupabaseClient()

    // Pull last 5 meetings for this user
    const { data: meetings, error } = await admin
      .from("meetings")
      .select("id, created_at, title, summary, action_items, decisions, participants, blockers, follow_ups")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error || !meetings || meetings.length === 0) {
      return NextResponse.json<MemoryBlock>({
        participantHistory: [],
        recurringBlockers: [],
        openTasks: [],
        recentDecisions: [],
        meetingCount: 0,
        lastMeetingAt: null,
        condensedSummary: "No prior meeting history found.",
      })
    }

    // ── Aggregate memory ──────────────────────────────────────────────────────

    const participantSet = new Set<string>()
    const blockerMap = new Map<string, number>()   // description → count
    const openTasks: string[] = []
    const recentDecisions: string[] = []

    for (const m of meetings) {
      // Participants
      for (const p of (m.participants ?? [])) {
        if (p?.name) participantSet.add(p.name)
      }

      // Blockers — track frequency
      for (const b of (m.blockers ?? [])) {
        if (b?.description) {
          const key = b.description.slice(0, 80).toLowerCase()
          blockerMap.set(key, (blockerMap.get(key) ?? 0) + 1)
        }
      }

      // Open tasks (no done/completed status)
      for (const a of (m.action_items ?? [])) {
        if (a?.task && a.status !== "done") {
          openTasks.push(`${a.assignee}: ${a.task} (due ${a.due})`)
        }
      }

      // Decisions
      for (const d of (m.decisions ?? [])) {
        if (d) recentDecisions.push(d)
      }
    }

    const recurringBlockers = [...blockerMap.entries()]
      .filter(([, count]) => count >= 1)
      .sort(([, a], [, b]) => b - a)
      .map(([desc]) => desc)
      .slice(0, 5)

    // ── Build raw summary for condensation ────────────────────────────────────

    const rawSummary = [
      `Team members seen: ${[...participantSet].join(", ")}`,
      `Recent meetings: ${meetings.map((m) => m.title).join("; ")}`,
      `Blockers seen: ${recurringBlockers.join("; ") || "none"}`,
      `Open tasks sample: ${openTasks.slice(0, 5).join("; ") || "none"}`,
      `Key decisions: ${recentDecisions.slice(0, 5).join("; ") || "none"}`,
    ].join("\n")

    const condensedSummary = await condenseMemory(rawSummary)

    const block: MemoryBlock = {
      participantHistory: [...participantSet],
      recurringBlockers,
      openTasks: openTasks.slice(0, 10),
      recentDecisions: recentDecisions.slice(0, 10),
      meetingCount: meetings.length,
      lastMeetingAt: meetings[0]?.created_at ?? null,
      condensedSummary,
    }

    return NextResponse.json(block)
  } catch (err) {
    console.error("[GET /api/memory]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── POST /api/memory (upsert after analysis) ─────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { meetingId, summary } = await req.json()
    if (!meetingId || !summary) {
      return NextResponse.json({ error: "meetingId and summary required" }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    // Upsert into meeting_memory table
    const { error } = await admin.from("meeting_memory").upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        memory_data: { summary, updatedAt: new Date().toISOString() },
      },
      { onConflict: "meeting_id" }
    )

    if (error) {
      console.error("[POST /api/memory] upsert error:", error)
      return NextResponse.json({ error: "Failed to save memory" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/memory]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
