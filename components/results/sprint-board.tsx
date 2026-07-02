"use client"

import { useState } from "react"
import {
  GitBranch,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
  Clock3,
  AlertCircle,
  User,
  CalendarDays,
  Flag,
} from "lucide-react"
import type { SprintItem, ActionItem, WorkflowStatus } from "@/types/analysis"

interface Props {
  sprintPlan: SprintItem[]
  actionItems: ActionItem[]
}

const statusConfig: Record<WorkflowStatus, { label: string; icon: typeof Circle; className: string }> = {
  ready:         { label: "Ready",       icon: Circle,        className: "text-blue-500" },
  "in-progress": { label: "In progress", icon: Clock3,        className: "text-yellow-500" },
  blocked:       { label: "Blocked",     icon: AlertCircle,   className: "text-red-500" },
  done:          { label: "Done",        icon: CheckCircle2,  className: "text-primary" },
}

const pointsColor = (points: number) => {
  if (points <= 2) return "bg-green-500/10 text-green-600 dark:text-green-400"
  if (points <= 5) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
  return "bg-red-500/10 text-red-500"
}

export default function SprintBoard({ sprintPlan, actionItems }: Props) {
  const [expanded, setExpanded] = useState<string | null>(
    sprintPlan[0]?.id ?? null
  )
const [selectedTask, setSelectedTask] = useState<string | null>(null)

  if (!sprintPlan.length) return null

  const itemById = Object.fromEntries(actionItems.map((a) => [a.id, a]))

  

  const totalPoints = (sprint: SprintItem) =>
    sprint.tasks
      .map((id) => itemById[id]?.storyPoints ?? 3)
      .reduce((s, p) => s + p, 0)

  return (
    <div className="rounded-3xl border bg-card/70 p-7 backdrop-blur">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Sprint Plan</h2>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          {sprintPlan.length} sprint{sprintPlan.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Sprint cards */}
      <div className="space-y-3">
        {sprintPlan.map((sprint, idx) => {
          const isOpen = expanded === sprint.id
          const tasks = sprint.tasks.map((id) => itemById[id]).filter(Boolean)
          const used = totalPoints(sprint)
          const pct = Math.min(100, Math.round((used / sprint.capacity) * 100))
          const overloaded = used > sprint.capacity

          return (
            <div
              key={sprint.id}
              className="rounded-2xl border bg-background/60 overflow-hidden"
            >
              {/* Sprint header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : sprint.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-primary/5 transition-colors text-left"
              >
                {/* Sprint number badge */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  S{idx + 1}
                </div>

                {/* Name + dates */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sprint.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sprint.startDate} → {sprint.endDate}
                  </p>
                </div>

                {/* Capacity pill */}
                <div className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  overloaded
                    ? "bg-red-500/10 text-red-500"
                    : "bg-primary/10 text-primary"
                }`}>
                  {used}/{sprint.capacity} pts
                </div>

                {/* Tasks count */}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>

                {isOpen
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                }
              </button>

              {/* Capacity bar */}
              <div className="h-1 bg-muted/40 mx-5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${overloaded ? "bg-red-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div className="px-5 pb-5 pt-4 space-y-4">

                  {/* Sprint goals */}
                  {sprint.goals.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Goals
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sprint.goals.map((g, i) => (
                          <span
                            key={i}
                            className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-1.5 text-xs"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task list */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Tasks
                    </p>
                    <div className="space-y-2">
                      {tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tasks assigned to this sprint.</p>
                      ) : (
                        tasks.map((item) => {
                          const st = (item.status ?? "ready") as WorkflowStatus
                          const { icon: Icon, className } = statusConfig[st] ?? statusConfig.ready
                          const pts = item.storyPoints ?? 3
                          return (
                   <div
                    key={item.id}
                    className="space-y-2 transition-all duration-200"
                  >
                      <button
                        onClick={() =>
                          setSelectedTask(
                            selectedTask === item.id ? null : item.id
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                        selectedTask === item.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-transparent bg-muted/30 hover:border-primary/20 hover:bg-primary/5"
                      }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${className}`} />

                        <span className="flex-1 min-w-0 text-left text-sm font-medium truncate">
                          {item.task}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {item.assignee}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${pointsColor(
                            pts
                          )}`}
                        >
                          {pts}pt
                        </span>

                        {selectedTask === item.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {selectedTask === item.id && (
                      <div className="ml-20 rounded-2xl border bg-background/80 p-5 animate-in fade-in-0 slide-in-from-top-2 duration-1000">
                        <div className="flex  items-center gap-2 text-sm justify-between">

                          <div className="space-y-3 flex flex-col gap-4 items-start">

                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-medium">Assignee</span>
                              <span className="text-muted-foreground">
                                {item.assignee}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <CalendarDays className="h-4 w-4 text-primary" />
                              <span className="font-medium">Due</span>
                              <span className="text-muted-foreground">
                                {item.due}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Flag className="h-4 w-4 text-primary" />
                              <span className="font-medium">Priority</span>

                              <span
                                className={`rounded-full px-2 py-1 text-xs ${
                                  item.priority === "High"
                                    ? "bg-red-500/10 text-red-500"
                                    : item.priority === "Medium"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-green-500/10 text-green-500"
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>

                          </div>

                          <div className="space-y-3 flex flex-col  gap-4 items-start">

                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Status
                              </p>

                              <div className="inline-flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-sm">
                                <Icon className={`h-4 w-4 ${className}`} />
                                {statusConfig[st].label}
                              </div>
                            </div>

                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Story Points
                              </p>

                              <div className="flex items-center gap-2">

                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      statusConfig[st].className === "text-red-500"
                                        ? "bg-red-500/10 text-red-500"
                                        : statusConfig[st].className === "text-yellow-500"
                                        ? "bg-yellow-500/10 text-yellow-500"
                                        : statusConfig[st].className === "text-blue-500"
                                        ? "bg-blue-500/10 text-blue-500"
                                        : "bg-green-500/10 text-green-500"
                                    }`}
                                  >
                                    {statusConfig[st].label}
                                  </span>

                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${pointsColor(
                                      pts
                                    )}`}
                                  >
                                    {pts}pt
                                  </span>

                                </div>
                            </div>

                          </div>

                        </div>
                      </div>
                    )}
                    </div>
                  )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total summary row */}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
        <span className="text-xs text-muted-foreground">Total story points</span>
        <span className="text-sm font-semibold">
          {sprintPlan.reduce((s, sp) => s + totalPoints(sp), 0)} pts
          <span className="ml-1 font-normal text-muted-foreground">
            across {sprintPlan.length} sprint{sprintPlan.length !== 1 ? "s" : ""}
          </span>
        </span>
      </div>
    </div>
  )
}