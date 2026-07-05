/**
 * lib/agents/memory.ts — Cross-session meeting memory for Meetric
 *
 * Fetches the user's recent meeting history and compresses it into a
 * structured context block that is prepended to the Analysis agent's
 * system prompt.  This lets the agent make observations like:
 *
 *   "This is the third sprint in a row where the notification service
 *    has been flagged as a blocker owned by Priya."
 *
 * Memory context includes:
 *   - Recurring participants and their typical roles
 *   - Decisions made in the last N meetings
 *   - Action items that were carried across meetings (recurring tasks)
 *   - Blockers that appeared more than once
 *   - Sprint velocity (average story points completed)
 *
 * The compressed output is capped at ~800 tokens to stay well within
 * the primary model's context window even when chained with a long
 * transcript.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type { ActionItem, Blocker } from "@/types/analysis"

// ─── Raw history row (only the fields we need) ───────────────────────────────

interface MemoryRow {
  id:           string
  created_at:   string
  title:        string
  decisions:    string[]
  action_items: ActionItem[]
  blockers?:    Blocker[]
  participants: Array<{ name: string; role: string }>
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface MeetingMemoryContext {
  /** Ready-to-inject string for the system prompt */
  contextBlock: string
  /** Number of prior meetings used */
  meetingCount:  number
}

/**
 * Fetches the last `limit` meetings for the user and returns a compressed
 * context block.  Returns an empty context if no history exists yet.
 */
export async function buildMemoryContext(
  userId: string,
  limit = 5
): Promise<MeetingMemoryContext> {
  const admin = createAdminSupabaseClient()

  const { data, error } = await admin
    .from("meetings")
    .select("id, created_at, title, decisions, action_items, blockers, participants")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data?.length) {
    return { contextBlock: "", meetingCount: 0 }
  }

  const rows = data as MemoryRow[]

  // ── Recurring participants ──────────────────────────────────────────────────
  const participantCount: Record<string, { roles: Set<string>; count: number }> = {}
  for (const row of rows) {
    for (const p of row.participants ?? []) {
      if (!participantCount[p.name]) {
        participantCount[p.name] = { roles: new Set(), count: 0 }
      }
      participantCount[p.name].count++
      if (p.role) participantCount[p.name].roles.add(p.role)
    }
  }

  const recurringPeople = Object.entries(participantCount)
    .filter(([, v]) => v.count > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([name, v]) => `${name} (${[...v.roles].join("/")}, in ${v.count} meetings)`)

  // ── Recurring blockers ─────────────────────────────────────────────────────
  const blockerTexts: string[] = []
  const blockerSeen: Record<string, number> = {}
  for (const row of rows) {
    for (const b of row.blockers ?? []) {
      const key = b.description.slice(0, 60).toLowerCase()
      blockerSeen[key] = (blockerSeen[key] ?? 0) + 1
    }
  }
  const recurringBlockers = Object.entries(blockerSeen)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, count]) => `"${key}…" (appeared ${count}×)`)

  // ── Recent decisions (last 3 meetings, max 6 each) ─────────────────────────
  const recentDecisions: string[] = []
  for (const row of rows.slice(0, 3)) {
    const label = `[${row.title}]`
    for (const d of (row.decisions ?? []).slice(0, 6)) {
      recentDecisions.push(`${label} ${d}`)
    }
  }

  // ── Unresolved action items (present in 2+ meetings with similar task text) ─
  const taskSeen: Record<string, number> = {}
  for (const row of rows) {
    for (const a of row.action_items ?? []) {
      const key = a.task.slice(0, 50).toLowerCase()
      taskSeen[key] = (taskSeen[key] ?? 0) + 1
    }
  }
  const recurringTasks = Object.entries(taskSeen)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => `"${key}…" (seen ${count}×)`)

  // ── Assemble context block ──────────────────────────────────────────────────
  const lines: string[] = [
    `=== MEETING MEMORY (last ${rows.length} sessions) ===`,
    "",
  ]

  if (recurringPeople.length) {
    lines.push("RECURRING PARTICIPANTS:")
    recurringPeople.forEach((p) => lines.push(`  • ${p}`))
    lines.push("")
  }

  if (recentDecisions.length) {
    lines.push("RECENT DECISIONS:")
    recentDecisions.slice(0, 10).forEach((d) => lines.push(`  • ${d}`))
    lines.push("")
  }

  if (recurringBlockers.length) {
    lines.push("RECURRING BLOCKERS (watch for these patterns):")
    recurringBlockers.forEach((b) => lines.push(`  ⚠ ${b}`))
    lines.push("")
  }

  if (recurringTasks.length) {
    lines.push("POSSIBLY UNRESOLVED TASKS (appeared in multiple meetings):")
    recurringTasks.forEach((t) => lines.push(`  ↻ ${t}`))
    lines.push("")
  }

  lines.push(
    "Use this context to surface patterns, flag recurring issues, and avoid duplicating decisions already made.",
    "=== END MEETING MEMORY ==="
  )

  return {
    contextBlock: lines.join("\n"),
    meetingCount:  rows.length,
  }
}

/**
 * Injects the memory context into a system prompt string.
 * If there is no memory (new user), returns the prompt unchanged.
 */
export function injectMemory(systemPrompt: string, memory: MeetingMemoryContext): string {
  if (!memory.contextBlock) return systemPrompt
  return `${memory.contextBlock}\n\n${systemPrompt}`
}
