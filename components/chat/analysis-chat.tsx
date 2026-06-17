"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, User, Sparkles, Wand2, Check, X } from "lucide-react"
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
}

const SUGGESTIONS = [
  "Who has the most tasks?",
  "Add a task: send launch recap to stakeholders, owner Sarah, due Monday",
  "Reassign all High priority tasks to Michael",
  "Summarise the key decisions",
]

export default function AnalysisChat({ analysis, onPatch, meetingId }: Props) {
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

  const persistPatch = useCallback(async (patch: Partial<MeetingIntelligence>): Promise<boolean> => {
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
  }, [meetingId])

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
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Something went wrong. Try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col rounded-3xl border bg-card/70 backdrop-blur overflow-hidden mt-33" style={{ height: "550px" }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 border-b px-4 py-3 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium leading-none">Meeting AI</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ask questions or edit the analysis</p>
        </div>
        {!meetingId && (
          <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">
            not saved
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">

        {messages.length === 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs text-muted-foreground px-1">Try asking:</p>
            {SUGGESTIONS.map((s) => (
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
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
            }`}>
              {msg.role === "assistant"
                ? <Bot className="h-3 w-3 text-primary" />
                : <User className="h-3 w-3" />}
            </div>

            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-5 ${
              msg.role === "user"
                ? "rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm bg-muted/60 text-foreground"
            }`}>
              {msg.content}
              {msg.patched && (
                <div className={`flex items-center gap-1 mt-1.5 ${
                  msg.saveError ? "text-red-400" : "text-primary/70"
                }`}>
                  {msg.saveError
                    ? <><X className="h-2.5 w-2.5" /><span className="text-[10px]">Save failed</span></>
                    : <><Wand2 className="h-2.5 w-2.5" /><Check className="h-2.5 w-2.5" /><span className="text-[10px]">Saved</span></>
                  }
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
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

      {/* Input */}
      <div className="border-t bg-background/50 px-3 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-xl border bg-muted/40 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            placeholder="Ask or edit — e.g. reassign ai-2 to Marcus..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}