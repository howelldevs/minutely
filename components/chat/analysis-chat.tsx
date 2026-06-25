"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, User, Wand2, Check, X } from "lucide-react"
import type { MeetingAnalysis, MeetingIntelligence } from "@/types/analysis"

interface Message {
  role: "user" | "assistant"
  content: string
  patched?: boolean
  saved?: boolean
  saveError?: boolean
}

interface Props {
  analysis: MeetingAnalysis | MeetingIntelligence
  onPatch: (patch: Partial<MeetingIntelligence>) => void
  meetingId?: string | null
  /**
   * "dock"   = fixed floating widget pinned to the viewport bottom (mobile)
   * "panel"  = normal block in document flow (desktop sidebar/inline)
   * Defaults to "panel" so existing inline usages keep working.
   */
  variant?: "dock" | "panel"
  /** Only relevant when variant="dock" — lets the parent close the floating widget. */
  onClose?: () => void
}

function generateAnalysisSuggestions(analysis: MeetingAnalysis | MeetingIntelligence): string[] {
  const suggestions: string[] = []
  const transcript = analysis.transcript.toLowerCase()
  const participantNames = analysis.participants?.map((p) => p.name) ?? []
  const primaryParticipant = participantNames[0]

  if (analysis.actionItems?.length) {
    suggestions.push(`Who has the most tasks?`)
    suggestions.push(`Review the ${analysis.actionItems.length} action items`)    
  }

  if (participantNames.length) {
    suggestions.push(`What are ${primaryParticipant}'s key responsibilities?`)
  }

  if (analysis.decisions?.length) {
    suggestions.push(`Summarize the ${analysis.decisions.length} key decisions`)    
  }

  if (/due|deadline|end of week|friday|next monday|tomorrow/.test(transcript)) {
    suggestions.push("What is due first?")
  }

  if (/blocker|risk|dependency|issue|problem/.test(transcript)) {
    suggestions.push("Which blockers need action?")
  }

  if (/next step|follow[- ]up|action item|deliverable/.test(transcript)) {
    suggestions.push("What are the next steps?")
  }

  if (suggestions.length === 0) {
    suggestions.push("What did everyone commit to?")
    suggestions.push("What needs to happen next?")
  }

  return Array.from(new Set(suggestions)).slice(0, 4)
}

export default function AnalysisChat({
  analysis,
  onPatch,
  meetingId,
  variant = "panel",
  onClose,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Keep a ref to the latest analysis so send() always uses current data
  // even after onPatch has updated the parent state
  const analysisRef = useRef(analysis)
  useEffect(() => {
    analysisRef.current = analysis
  }, [analysis])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const persistPatch = useCallback(
    async (patch: Partial<MeetingIntelligence>): Promise<boolean> => {
      if (!meetingId) return false
      try {
        const res = await fetch(`/api/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!res.ok) console.error("[AnalysisChat] persist failed:", await res.text())
        return res.ok
      } catch (err) {
        console.error("[AnalysisChat] persist error:", err)
        return false
      }
    },
    [meetingId]
  )

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: "user", content }
    setMessages((m) => [...m, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Use the ref — always the freshest analysis state
          analysis: analysisRef.current,
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()
      const hasPatch = !!data.patch

      // 1. Update UI immediately
      if (hasPatch) onPatch(data.patch)

      // 2. Persist to Supabase
      let saved = false
      let saveError = false
      if (hasPatch) {
        saved = await persistPatch(data.patch)
        saveError = !saved
        if (saveError) console.warn("[AnalysisChat] patch not persisted")
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply ?? "Done.",
          patched: hasPatch,
          saved: hasPatch ? saved : undefined,
          saveError: hasPatch ? saveError : undefined,
        },
      ])
    } catch (err) {
      console.error("[AnalysisChat] send error:", err)
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Try again." }])
    } finally {
      setLoading(false)
    }
  }

  const isDock = variant === "dock"

  return (
    <div
      className={
        isDock
          ? // Floating widget, pinned to the viewport — only ever used on mobile.
            // z-50 keeps it above cards that create their own stacking context
            // (backdrop-blur / transform). Height is capped relative to the
            // viewport so it never swallows the whole screen.
            "fixed inset-x-3 bottom-3 z-50 flex flex-col rounded-3xl border bg-card/95 backdrop-blur-xl shadow-2xl h-[60vh] max-h-[480px]"
          : // Normal block in document flow — desktop sidebar / inline panel.
            "relative flex flex-col rounded-3xl border bg-card/95 backdrop-blur-xl shadow-xl h-[420px]"
      }
    >
      {/* Header — only shown in dock mode, since panel mode usually sits under its own section heading */}
      {isDock && (
        <div className="flex items-center gap-2.5 border-b px-4 py-3 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none">Meeting AI</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">Ask questions or edit the analysis</p>
          </div>
          {!meetingId && (
            <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5 shrink-0">
              not saved
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close chat"
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/60 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Messages — min-h-0 is required so this scrolls instead of pushing the input bar off-screen */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs text-muted-foreground px-1">Try asking:</p>
            {generateAnalysisSuggestions(analysis).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left rounded-2xl border bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-3 w-3 text-primary" />
              ) : (
                <User className="h-3 w-3" />
              )}
            </div>

            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-5 break-words ${
                msg.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted/60 text-foreground"
              }`}
            >
              {msg.content}
              {msg.patched && (
                <div
                  className={`flex items-center gap-1 mt-1.5 ${
                    msg.saveError ? "text-red-400" : "text-primary/70"
                  }`}
                >
                  {msg.saveError ? (
                    <>
                      <X className="h-2.5 w-2.5" />
                      <span className="text-[10px]">Save failed</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-2.5 w-2.5" />
                      <Check className="h-2.5 w-2.5" />
                      <span className="text-[10px]">Saved</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2">
              <div className="flex gap-1 items-center h-3">
                <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.15s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — shrink-0 + safe-area padding keeps it pinned and tappable above iOS home indicator */}
      <div
        className="border-t bg-background/70 px-4 py-3 shrink-0"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-full border bg-muted/40 px-5 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ask or edit — e.g. reassign ai-2 to Marcus..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="h-12 w-12 shrink-0 rounded-full bg-primary flex items-center justify-center active:scale-95 transition disabled:opacity-40"
          >
            <Send className="h-6 w-6 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}