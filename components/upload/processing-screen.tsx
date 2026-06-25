"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Brain,
  ListChecks,
  AlertTriangle,
  GitBranch,
  Network,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react"

import type { MeetingIntelligence } from "@/types/analysis"

const steps = [
  {
    icon: Brain,
    name: "Parsing transcript",
    desc: "Reading context, speakers, and structure",
    phase: "serial" as const,
  },
  {
    icon: ListChecks,
    name: "Extracting tasks & owners",
    desc: "Mapping commitments to participants",
    phase: "parallel" as const,
  },
  {
    icon: AlertTriangle,
    name: "Detecting blockers",
    desc: "Surfacing risks and dependencies",
    phase: "parallel" as const,
  },
  {
    icon: GitBranch,
    name: "Planning sprints",
    desc: "Scheduling by priority and capacity",
    phase: "parallel" as const,
  },
  {
    icon: Network,
    name: "Building workflow DAG",
    desc: "Linking task dependencies",
    phase: "parallel" as const,
  },
  {
    icon: Send,
    name: "Drafting follow-ups",
    desc: "Per-person action messages",
    phase: "parallel" as const,
  },
]

// Step 0 is the serial analysis agent (~3-4s).
// Steps 1-5 run in parallel immediately after.
const STEP_DELAYS_MS = [0, 3200, 3600, 4000, 4400, 4800]

interface Props {
  transcript: string
  onComplete: (data: MeetingIntelligence) => void
  onRetry: () => void
}

export default function ProcessingScreen({ transcript, onComplete, onRetry }: Props) {
  const hasFired = useRef(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())
  const [elapsed, setElapsed] = useState(0)
  const [apiDone, setApiDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingResult = useRef<MeetingIntelligence | null>(null)

  // Timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Step animation — advances independently of API, reflects actual pipeline shape
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    STEP_DELAYS_MS.forEach((delay, i) => {
      timers.push(
        setTimeout(() => {
          setActiveStep(i)
          if (i > 0) setDoneSteps((prev) => new Set([...prev, i - 1]))
        }, delay)
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  // When API finishes successfully, mark all done then hand off
  useEffect(() => {
    if (!apiDone || error) return
    setDoneSteps(new Set(steps.map((_, i) => i)))
    setActiveStep(-1)
    const t = setTimeout(() => {
      if (pendingResult.current) onComplete(pendingResult.current)
    }, 600)
    return () => clearTimeout(t)
  }, [apiDone, error, onComplete])

  // API call — fires exactly once
  useEffect(() => {
    if (hasFired.current) return
    hasFired.current = true

    async function analyze() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        })

        if (!res.ok) {
          let detail: { error?: string; details?: string } | null = null
          try { detail = await res.json() } catch { /* ignore */ }
          throw new Error(
            detail?.error || detail?.details || `Server error ${res.status}`
          )
        }

        const data: MeetingIntelligence = await res.json()
        pendingResult.current = data
        setApiDone(true)
      } catch (err) {
        console.error("[ProcessingScreen] analysis failed:", err)
        setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
        setApiDone(true)
      }
    }

    analyze()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  const progress = apiDone && !error
    ? 100
    : Math.round(((doneSteps.size + (activeStep >= 0 ? 0.5 : 0)) / steps.length) * 100)

  const footerStatus = error
    ? "Analysis failed"
    : apiDone
    ? "All agents complete"
    : activeStep >= 0
    ? `${steps[activeStep].name}…`
    : "Starting…"

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 sm:py-16 text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 shrink-0">
          <XCircle className="h-5 w-5 text-destructive" />
        </div>

        <h2 className="text-lg sm:text-xl font-medium tracking-tight">Analysis failed</h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {error}
        </p>

        <p className="mt-1 text-xs text-muted-foreground/60">
          Elapsed: {elapsed}s
        </p>

        <button
          onClick={onRetry}
          className="mx-auto mt-6 flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    )
  }

  // ── Processing state ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10 w-full">
      {/* Header */}
      <div className="mb-6 sm:mb-8 text-center">
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-card shadow-sm shrink-0"
        >
          <Brain className="h-5 w-5 text-foreground/70" />
        </motion.div>

        <h2 className="text-lg sm:text-xl font-medium tracking-tight">
          Processing meeting intelligence
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm leading-6 text-muted-foreground">
          6 AI agents running in parallel — extracting tasks, blockers, sprints, and follow-ups.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-muted/60">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full bg-foreground/80"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="mb-6 flex flex-col gap-1">
        {steps.map((step, i) => {
          const isDone = doneSteps.has(i)
          const isActive = activeStep === i && !isDone
          const isPending = !isDone && !isActive

          return (
            <motion.div
              key={step.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-2 sm:gap-3 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 transition-colors duration-300 ${
                isActive
                  ? "bg-muted/60 ring-1 ring-border/60"
                  : isDone
                  ? "bg-muted/30"
                  : "bg-transparent"
              }`}
            >
              {/* Icon */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300 ${
                  isDone
                    ? "border-border/40 bg-card"
                    : isActive
                    ? "border-border/60 bg-card"
                    : "border-border/20 bg-transparent"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground/70" />
                ) : (
                  <step.icon
                    className={`h-3.5 w-3.5 ${
                      isActive ? "text-foreground/80" : "text-muted-foreground/40"
                    }`}
                  />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs sm:text-sm font-medium leading-none ${
                    isPending ? "text-muted-foreground/50" : "text-foreground"
                  }`}
                >
                  {step.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/60 hidden sm:block">{step.desc}</p>
              </div>

              {/* Badge */}
              <div className="shrink-0">
                {isDone && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
                    done
                  </span>
                )}
                {isActive && (
                  <span className="flex items-center gap-0.5">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1 w-1 animate-bounce rounded-full bg-foreground/50"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <p className="mb-6 text-center text-xs text-muted-foreground/60">
        Agents 2–6 run in parallel after the initial parse
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/30 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shrink-0" />
          <span className="truncate">{footerStatus}</span>
        </div>
        <span className="tabular-nums shrink-0 ml-2">{elapsed}s</span>
      </div>
    </div>
  )
}