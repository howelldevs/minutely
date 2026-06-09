"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getHistory, deleteAnalysis } from "@/lib/storage"
import type { HistoryEntry } from "@/lib/storage"
import { Clock3, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"

export default function HistoryList() {
  const { user, isLoaded } = useUser()

  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    async function loadHistory() {
      try {
        const data = await getHistory(user?.id)

        console.log("History data:", data)

        setEntries(data)
      } catch (err) {
        console.error("History load error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [isLoaded, user?.id])

  const handleDelete = async (id: string) => {
    await deleteAnalysis(id)
    setEntries((e) => e.filter((x) => x.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-3xl border bg-card/70 p-12 text-center backdrop-blur">
        <p className="text-muted-foreground">
          No meetings analyzed yet.
        </p>

        <Link
          href="/upload"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Analyze your first meeting →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-3xl border bg-card/70 p-6 backdrop-blur flex items-center justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {entry.title}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {entry.summary}
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock3 className="h-3 w-3" />

                {new Date(entry.savedAt).toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </span>

              <span>
                {entry.actionItems.length} tasks
              </span>

              <span>
                {entry.participants.length} participants
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDelete(entry.id)}
              className="rounded-xl p-2 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}