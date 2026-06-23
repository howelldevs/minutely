"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, X, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { MeetingAnalysis } from "@/types/analysis"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface Props {
  analysis: MeetingAnalysis
  onClose: () => void
}

function generateSuggestions(analysis: MeetingAnalysis): string[] {
  const suggestions: string[] = []
  const transcript = analysis.transcript.toLowerCase()
  const participantNames = analysis.participants?.map((p) => p.name) ?? []
  const primaryParticipant = participantNames[0]

  if (analysis.actionItems?.length) {
    suggestions.push(`Review the ${analysis.actionItems.length} action items`)
  }

  if (participantNames.length) {
    suggestions.push(`What are ${primaryParticipant}'s main tasks?`)
  }

  if (analysis.decisions?.length) {
    suggestions.push(`Summarize the ${analysis.decisions.length} key decisions`)
  }

  if (/due|deadline|end of week|friday|next monday|tomorrow/.test(transcript)) {
    suggestions.push("What's due first from this meeting?")
  }

  if (/blocker|risk|dependency|issue|problem/.test(transcript)) {
    suggestions.push("What blockers should we resolve?")
  }

  if (/next step|follow[- ]up|action item|deliverable/.test(transcript)) {
    suggestions.push("What needs to happen next?")
  }

  if (suggestions.length === 0) {
    suggestions.push("What did everyone commit to?")
    suggestions.push("What needs to happen next?")
  }

  return Array.from(new Set(suggestions)).slice(0, 4)
}

export default function FollowUpChat({ analysis, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
          analysis,
          messages: [...messages, userMsg],
        }),
      })

      const data = await res.json()
      setMessages((m) => [...m, { role: "assistant", content: data.reply }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, something went wrong. Try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Meeting Assistant</p>
            <p className="text-xs text-muted-foreground">{analysis.title}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Empty state with suggestions */}
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Ask anything about your meeting
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {generateSuggestions(analysis).map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border bg-card/60 px-4 py-2 text-sm hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <AnimatePresence key={i}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
                }`}>
                  {msg.role === "assistant"
                    ? <Bot className="h-3.5 w-3.5 text-primary" />
                    : <User className="h-3.5 w-3.5" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted/60 text-foreground"
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            </AnimatePresence>
          ))}

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end gap-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-muted/60 px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.3s]" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background/80 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <input
            ref={inputRef}
            className="flex-1 rounded-2xl border bg-muted/40 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ask about this meeting..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}