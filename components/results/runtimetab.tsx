"use client"

import { CheckCircle2, Clock, AlertCircle, Zap } from "lucide-react"
import type { MeetingIntelligence } from "@/types/analysis"

interface AgentEvent {
  agent: string
  status: "success" | "partial" | "failed"
  note?: string
}

interface Props {
  analysis: MeetingIntelligence
}

/**
 * Derives a real execution log from the MeetingIntelligence object.
 * No fake UUIDs or hardcoded messages — everything is inferred from
 * the actual data that came back from the orchestrator.
 */
function deriveEvents(analysis: MeetingIntelligence): AgentEvent[] {
  const events: AgentEvent[] = []

  // Agent 1 — always ran (we have a title)
  events.push({
    agent: "Analysis agent",
    status: "success",
    note: `Extracted ${analysis.actionItems.length} action item${analysis.actionItems.length !== 1 ? "s" : ""}, ${analysis.decisions.length} decision${analysis.decisions.length !== 1 ? "s" : ""}, ${analysis.participants.length} participant${analysis.participants.length !== 1 ? "s" : ""}`,
  })

  // Agent 2 — blockers
  if (analysis.blockers && analysis.blockers.length > 0) {
    events.push({
      agent: "Blocker detection agent",
      status: "success",
      note: `Found ${analysis.blockers.length} blocker${analysis.blockers.length !== 1 ? "s" : ""}`,
    })
  } else {
    events.push({
      agent: "Blocker detection agent",
      status: "success",
      note: "No blockers detected",
    })
  }

  // Agent 3 — sprint planner
  if (analysis.sprintPlan && analysis.sprintPlan.length > 0) {
    const totalPoints = analysis.actionItems.reduce((sum, a) => sum + (a.storyPoints ?? 0), 0)
    events.push({
      agent: "Sprint planning agent",
      status: "success",
      note: `${analysis.sprintPlan.length} sprint${analysis.sprintPlan.length !== 1 ? "s" : ""} planned · ${totalPoints} total story points`,
    })
  } else {
    events.push({
      agent: "Sprint planning agent",
      status: analysis.analysisMode === "partial" ? "partial" : "success",
      note: analysis.analysisMode === "partial" ? "Returned no sprints" : "No items to schedule",
    })
  }

  // Agent 4 — workflow
  if (analysis.workflow && analysis.workflow.length > 0) {
    const blocked = analysis.workflow.filter((w) => w.status === "blocked").length
    events.push({
      agent: "Workflow DAG agent",
      status: "success",
      note: `${analysis.workflow.length} nodes · ${blocked} blocked`,
    })
  } else {
    events.push({
      agent: "Workflow DAG agent",
      status: analysis.analysisMode === "partial" ? "partial" : "success",
      note: analysis.analysisMode === "partial" ? "Returned empty graph" : "No dependencies to map",
    })
  }

  // Agent 5 — action plan
  if (analysis.actionPlan && analysis.actionPlan.length > 0) {
    const immediate = analysis.actionPlan.filter((a) => a.status === "Immediate").length
    events.push({
      agent: "Action plan agent",
      status: "success",
      note: `${analysis.actionPlan.length} steps · ${immediate} immediate`,
    })
  } else {
    events.push({
      agent: "Action plan agent",
      status: analysis.analysisMode === "partial" ? "partial" : "success",
      note: analysis.analysisMode === "partial" ? "Returned no plan" : "No steps generated",
    })
  }

  // Agent 6 — follow-ups
  if (analysis.followUps && analysis.followUps.length > 0) {
    events.push({
      agent: "Follow-up drafting agent",
      status: "success",
      note: `${analysis.followUps.length} message${analysis.followUps.length !== 1 ? "s" : ""} drafted`,
    })
  } else {
    events.push({
      agent: "Follow-up drafting agent",
      status: analysis.analysisMode === "partial" ? "partial" : "success",
      note: analysis.analysisMode === "partial" ? "Returned no follow-ups" : "No assignees found",
    })
  }

  return events
}

const statusIcon = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  partial: <AlertCircle className="h-4 w-4 text-amber-500" />,
  failed: <AlertCircle className="h-4 w-4 text-destructive" />,
}

const statusLabel = {
  success: "Success",
  partial: "Partial",
  failed: "Failed",
}

const statusStyle = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  partial: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  failed: "bg-destructive/5 text-destructive",
}

export default function RuntimeTab({ analysis }: Props) {
  const events = deriveEvents(analysis)
  const successCount = events.filter((e) => e.status === "success").length
  const mode = analysis.analysisMode ?? "legacy"

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/40 bg-card p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {successCount}/{events.length} agents succeeded
          </span>
        </div>

        <span className="text-border">·</span>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {analysis.processingTime}s total
          </span>
        </div>

        <span className="text-border">·</span>

        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            mode === "full"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : mode === "partial"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {mode} analysis
        </span>

        <span
          className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          title="Agent pipeline version"
        >
          v{analysis.agentVersion ?? "1.0.0"}
        </span>
      </div>

      {/* Agent log */}
      <div className="space-y-2">
        {events.map((event, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-border/30 bg-card px-4 py-3"
          >
            <div className="mt-0.5 shrink-0">{statusIcon[event.status]}</div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{event.agent}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[event.status]}`}
                >
                  {statusLabel[event.status]}
                </span>
              </div>
              {event.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {mode === "partial" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          One or more agents returned incomplete data. The results above may be missing some sections.
        </p>
      )}
    </div>
  )
}