/**
 * storage.ts — all Supabase DB operations for Meetric
 *
 * Uses the ADMIN client (service role) for all writes so Clerk user IDs
 * are accepted without needing a Supabase JWT. RLS is enforced manually
 * by always filtering on user_id in queries.
 *
 * getHistory uses the anon client for reads so it works on the client side.
 */

import { createClient } from "@/lib/supabase/client"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getDeviceId } from "@/lib/device-id"
import type {
  MeetingAnalysis,
  MeetingIntelligence,
  ActionItem,
  Participant,
  Blocker,
  SprintItem,
  WorkflowNode,
  ActionPlanItem,
  FollowUp,
} from "@/types/analysis"

// ─── HistoryEntry ─────────────────────────────────────────────────────────────

export type HistoryEntry = MeetingIntelligence & {
  id: string
  savedAt: string
}

// ─── DB row shape ─────────────────────────────────────────────────────────────

interface MeetingRow {
  id: string
  created_at: string
  title: string
  summary: string
  processing_time: number
  action_items: ActionItem[]
  decisions: string[]
  participants: Participant[]
  transcript: string
  device_id: string
  user_id: string | null
  blockers?: Blocker[] | null
  sprint_plan?: SprintItem[] | null
  workflow?: WorkflowNode[] | null
  action_plan?: ActionPlanItem[] | null
  follow_ups?: FollowUp[] | null
  agent_version?: string | null
  analysis_mode?: string | null
}

// ─── Serialisers ──────────────────────────────────────────────────────────────

function toRow(analysis: MeetingAnalysis, deviceId: string, userId?: string) {
  const intel = analysis as Partial<MeetingIntelligence>
  return {
    device_id: deviceId,
    user_id: userId ?? null,
    title: analysis.title,
    summary: analysis.summary,
    processing_time: Math.round(analysis.processingTime),
    action_items: analysis.actionItems,
    decisions: analysis.decisions,
    participants: analysis.participants,
    transcript: analysis.transcript,
    blockers: intel.blockers ?? [],
    sprint_plan: intel.sprintPlan ?? [],
    workflow: intel.workflow ?? [],
    action_plan: intel.actionPlan ?? [],
    follow_ups: intel.followUps ?? [],
    agent_version: intel.agentVersion ?? "1.0.0",
    analysis_mode: intel.analysisMode ?? "legacy",
  }
}

function fromRow(row: MeetingRow): HistoryEntry {
  return {
    id: row.id,
    savedAt: row.created_at,
    title: row.title,
    summary: row.summary,
    processingTime: row.processing_time,
    actionItems: row.action_items ?? [],
    decisions: row.decisions ?? [],
    participants: row.participants ?? [],
    transcript: row.transcript ?? "",
    blockers: row.blockers ?? [],
    sprintPlan: row.sprint_plan ?? [],
    workflow: row.workflow ?? [],
    actionPlan: row.action_plan ?? [],
    followUps: row.follow_ups ?? [],
    agentVersion: row.agent_version ?? "1.0.0",
    analysisMode: (row.analysis_mode as MeetingIntelligence["analysisMode"]) ?? "legacy",
  }
}

// ─── saveAnalysis ─────────────────────────────────────────────────────────────
// Called server-side from /api/analyze — uses admin client to bypass RLS

export async function saveAnalysis(
  analysis: MeetingAnalysis,
  userId?: string
): Promise<string | null> {
  if (!userId) return null

  const admin = createAdminSupabaseClient()
  const deviceId = "server" // server-side call has no browser device id

  const { data, error } = await admin
    .from("meetings")
    .insert(toRow(analysis, deviceId, userId))
    .select("id")
    .single()

  if (error) {
    console.error("saveAnalysis error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return null
  }

  console.log("[saveAnalysis] saved meeting:", data.id, "user:", userId)
  return data.id
}

// ─── updateAnalysis ───────────────────────────────────────────────────────────
// Called server-side from PATCH /api/meetings/:id — uses admin client

export async function updateAnalysis(
  meetingId: string,
  patch: Partial<MeetingIntelligence>,
  userId: string
): Promise<boolean> {
  const admin = createAdminSupabaseClient()

  // Map camelCase → snake_case, only include fields that are present in patch
  const dbPatch: Record<string, unknown> = {}
  if (patch.actionItems  !== undefined) dbPatch.action_items  = patch.actionItems
  if (patch.decisions    !== undefined) dbPatch.decisions     = patch.decisions
  if (patch.summary      !== undefined) dbPatch.summary       = patch.summary
  if (patch.title        !== undefined) dbPatch.title         = patch.title
  if (patch.blockers     !== undefined) dbPatch.blockers      = patch.blockers
  if (patch.sprintPlan   !== undefined) dbPatch.sprint_plan   = patch.sprintPlan
  if (patch.workflow     !== undefined) dbPatch.workflow      = patch.workflow
  if (patch.actionPlan   !== undefined) dbPatch.action_plan   = patch.actionPlan
  if (patch.followUps    !== undefined) dbPatch.follow_ups    = patch.followUps

  if (Object.keys(dbPatch).length === 0) return true

  const { error } = await admin
    .from("meetings")
    .update(dbPatch)
    .eq("id", meetingId)
    .eq("user_id", userId)  // enforce ownership manually since we're bypassing RLS

  if (error) {
    console.error("updateAnalysis error:", error)
    return false
  }

  console.log("[updateAnalysis] patched meeting:", meetingId, "fields:", Object.keys(dbPatch))
  return true
}

// ─── updateActionItems ────────────────────────────────────────────────────────

export async function updateActionItems(
  meetingId: string,
  actionItems: ActionItem[],
  userId: string
): Promise<boolean> {
  const admin = createAdminSupabaseClient()

  const { error } = await admin
    .from("meetings")
    .update({ action_items: actionItems })
    .eq("id", meetingId)
    .eq("user_id", userId)

  if (error) {
    console.error("updateActionItems error:", error)
    return false
  }

  // Audit checkpoint — best effort
  await admin.from("action_checkpoints").insert({
    meeting_id: meetingId,
    user_id: userId,
    action_item: actionItems,
  }).then(({ error: e }) => {
    if (e) console.warn("checkpoint insert failed:", e.message)
  })

  return true
}

// ─── getHistory ───────────────────────────────────────────────────────────────
// Called client-side — uses admin client for reliable reads

export async function getHistory(userId?: string): Promise<HistoryEntry[]> {
  const admin = createAdminSupabaseClient()
  const deviceId = getDeviceId()

  let query = admin.from("meetings").select("*")

  if (userId) {
    query = query.or(`user_id.eq.${userId},device_id.eq.${deviceId}`)
  } else {
    query = query.eq("device_id", deviceId)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    console.error("getHistory error:", error)
    return []
  }

  return (data ?? []).map((row) => fromRow(row as MeetingRow))
}

// ─── getMeeting ───────────────────────────────────────────────────────────────

export async function getMeeting(
  id: string,
  userId: string
): Promise<HistoryEntry | null> {
  const admin = createAdminSupabaseClient()

  const { data, error } = await admin
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (error || !data) return null
  return fromRow(data as MeetingRow)
}

// ─── deleteAnalysis ───────────────────────────────────────────────────────────

export async function deleteAnalysis(id: string, userId: string): Promise<void> {
  const admin = createAdminSupabaseClient()

  const { error } = await admin
    .from("meetings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)  // ownership check

  if (error) console.error("deleteAnalysis error:", error)
}