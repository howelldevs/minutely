"use client"

import { useState, useCallback } from "react"
import { CheckCircle2, Clock3, Pencil, Check, X, Save, Loader2, AlertCircle } from "lucide-react"
import type { ActionItem, Priority } from "@/types/analysis"

const priorityStyles: Record<Priority, string> = {
  High: "bg-red-500/10 text-red-500",
  Medium: "bg-yellow-500/10 text-yellow-500",
  Low: "bg-green-500/10 text-green-500",
}

interface Props {
  initial: ActionItem[]
  onChange: (items: ActionItem[]) => void
  meetingId?: string   // present for saved meetings; absent for anonymous / in-session
}

type SaveState = "idle" | "saving" | "saved" | "error"

export default function ActionItems({ initial, onChange, meetingId }: Props) {
  const [items, setItems] = useState<ActionItem[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<ActionItem>>({})
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  const commit = (updated: ActionItem[]) => {
    setItems(updated)
    onChange(updated)
    setHasUnsaved(true)
  }

  const startEdit = (item: ActionItem) => {
    setEditingId(item.id)
    setDraft({ ...item })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft({})
  }

  const saveEdit = () => {
    const updated = items.map((item) =>
      item.id === editingId ? ({ ...item, ...draft } as ActionItem) : item
    )
    commit(updated)
    setEditingId(null)
    setDraft({})
  }

  const toggleDone = (id: string) => {
    const updated = items.map((item) =>
      item.id === id
        ? { ...item, status: item.status === "done" ? ("ready" as const) : ("done" as const) }
        : item
    )
    commit(updated)
  }

  const persist = useCallback(async () => {
    if (!meetingId) {
      // Anonymous session — nothing to persist server-side
      setSaveState("saved")
      setHasUnsaved(false)
      setTimeout(() => setSaveState("idle"), 2000)
      return
    }

    setSaveState("saving")
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItems: items }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Save failed (${res.status})`)
      }

      setSaveState("saved")
      setHasUnsaved(false)
      setTimeout(() => setSaveState("idle"), 2000)
    } catch (err) {
      console.error("[ActionItems] persist failed:", err)
      setSaveState("error")
      setTimeout(() => setSaveState("idle"), 3000)
    }
  }, [meetingId, items])

  return (
    <div className="rounded-3xl border bg-card/70 p-4 sm:p-6 md:p-7 backdrop-blur space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <h2 className="text-xl font-semibold">Action Items</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Save button — only visible when there are unsaved changes */}
          {hasUnsaved && (
            <button
              onClick={persist}
              disabled={saveState === "saving"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap ${
                saveState === "error"
                  ? "bg-red-500/10 text-red-500"
                  : saveState === "saved"
                  ? "bg-green-500/10 text-green-600"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {saveState === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
              {saveState === "saved"  && <Check className="h-3 w-3" />}
              {saveState === "error"  && <AlertCircle className="h-3 w-3" />}
              {(saveState === "idle") && <Save className="h-3 w-3" />}
              {saveState === "saving" ? "Saving…"
                : saveState === "saved"  ? "Saved"
                : saveState === "error"  ? "Retry save"
                : "Save changes"}
            </button>
          )}

          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            {items.length} Task{items.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Anonymous hint */}
      {!meetingId && (
        <p className="text-xs text-muted-foreground">
          Sign in to save edits across sessions.
        </p>
      )}

      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">All tasks cleared.</p>
        ) : (
          items.map((item) =>
            editingId === item.id ? (
              // ── Edit mode ────────────────────────────────────────────────────
              <div
                key={item.id}
                className="rounded-2xl border border-primary/30 bg-background/70 p-4 sm:p-5 space-y-3"
              >
                <input
                  autoFocus
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={draft.task ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, task: e.target.value }))}
                  placeholder="Task"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={draft.assignee ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
                    placeholder="Assignee"
                  />
                  <input
                    className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={draft.due ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))}
                    placeholder="Due date"
                  />
                  <select
                    className="rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={draft.priority ?? "Medium"}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, priority: e.target.value as Priority }))
                    }
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:gap-2 sm:justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center justify-center sm:justify-start gap-1 rounded-xl px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex items-center justify-center sm:justify-start gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" /> Apply
                  </button>
                </div>
              </div>
            ) : (
              // ── View mode ────────────────────────────────────────────────────
              <div
                key={item.id}
                className={`rounded-2xl border bg-background/70 p-4 sm:p-5 transition-opacity ${
                  item.status === "done" ? "opacity-50" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-medium break-words ${
                        item.status === "done" ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.task}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Assigned to {item.assignee}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:justify-end">
                    <div
                      className={`rounded-full px-3 py-1 text-xs whitespace-nowrap ${
                        priorityStyles[item.priority] ?? priorityStyles.Medium
                      }`}
                    >
                      {item.priority}
                    </div>
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => toggleDone(item.id)}
                      className="rounded-lg p-1.5 hover:bg-green-500/10 transition-colors"
                      title={item.status === "done" ? "Mark incomplete" : "Mark as done"}
                    >
                      <Check
                        className={`h-3.5 w-3.5 ${
                          item.status === "done"
                            ? "text-green-500"
                            : "text-muted-foreground hover:text-green-500"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  Due {item.due}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  )
}