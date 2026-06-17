"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  GitBranch,
  Network,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"

import type { MeetingIntelligence } from "@/types/analysis"

const steps = [
  {
    icon: BrainCircuit,
    title: "Reading transcript",
    description: "Understanding context and structure",
    status: "Parsing conversation flow",
  },
  {
    icon: Users,
    title: "Identifying speakers & tasks",
    description: "Mapping participants, roles, and commitments",
    status: "Detecting ownership",
  },
  {
    icon: Zap,
    title: "Detecting blockers",
    description: "Surfacing risks and dependencies",
    status: "Analyzing bottlenecks",
  },
  {
    icon: GitBranch,
    title: "Planning sprints",
    description: "Scheduling tasks by priority and capacity",
    status: "Building execution roadmap",
  },
  {
    icon: Network,
    title: "Building workflow",
    description: "Generating execution DAG",
    status: "Linking dependencies",
  },
  {
    icon: Clock3,
    title: "Drafting follow-ups",
    description: "Preparing per-person action messages",
    status: "Finalizing outputs",
  },
]

interface Props {
  transcript: string
  onComplete: (data: MeetingIntelligence) => void
}

export default function ProcessingScreen({
  transcript,
  onComplete,
}: Props) {
  const hasFired = useRef(false)

  const [activeStep, setActiveStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Step animation
  useEffect(() => {
    if (activeStep >= steps.length - 1) return

    const t = setTimeout(() => {
      setActiveStep((s) => s + 1)
    }, 1800)

    return () => clearTimeout(t)
  }, [activeStep])

  // API call
  useEffect(() => {
    if (hasFired.current) return
    hasFired.current = true

    const start = Date.now()

    async function analyze() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transcript }),
        })

        if (!res.ok) {
          let detail = null

          try {
            detail = await res.json()
          } catch {
            detail = await res.text().catch(() => null)
          }

          console.error("API route failed:", detail)

          throw new Error(
            detail?.error ||
              detail?.details ||
              "Analysis failed"
          )
        }

        const data: MeetingIntelligence = await res.json()

        onComplete(data)
      } catch (err) {
        console.error("Processing error:", err)

        onComplete(
          getFallback(
            transcript,
            Date.now() - start
          )
        )
      }
    }

    analyze()
  }, [transcript, onComplete])

  const progress =
    ((activeStep + 1) / steps.length) * 100

    return (
      <div className="relative mx-auto flex h-[calc(100vh-140px)] max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 px-8 py-6 shadow-2xl backdrop-blur-2xl">
    
        {/* Ambient Background */}
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
    
          <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-primary/5 blur-[100px]" />
        </div>
    
        {/* Grid */}
        <div className="bg-grid absolute inset-0 -z-10 opacity-[0.04]" />
    
        {/* Header */}
        <div className="shrink-0 text-center">
    
          {/* Orb */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
            className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-background/70 shadow-xl backdrop-blur-xl"
          >
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
    
            <Sparkles className="relative h-7 w-7 text-primary" />
    
            <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/20" />
          </motion.div>
    
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
    
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
    
            Autonomous multi-agent system active
          </div>
    
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Processing meeting intelligence
          </h2>
    
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Extracting tasks, detecting blockers, building workflows,
            generating sprint plans, and preparing follow-ups.
          </p>
        </div>
    
        {/* Progress */}
        <div className="mt-6 shrink-0">
    
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              AI Processing
            </span>
    
            <span className="text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
    
          <div className="h-2 overflow-hidden rounded-full bg-muted/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${progress}%`,
              }}
              transition={{
                duration: 0.5,
              }}
              className="relative h-full rounded-full bg-primary"
            >
              <div className="absolute inset-0 bg-white/10" />
            </motion.div>
          </div>
        </div>
    
        {/* Steps */}
        <div className="mt-8 flex-1 overflow-hidden">
    
          <div className="grid gap-3 md:grid-cols-2">
    
            {steps.map((step, index) => {
              const isDone = index < activeStep
              const isActive = index === activeStep
              const isPending = index > activeStep
    
              return (
                <motion.div
                  key={step.title}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.05,
                  }}
                  className={`relative overflow-hidden rounded-2xl px-4 py-3 transition-all duration-500 ${
                    isActive
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : isDone
                      ? "bg-muted/30"
                      : "bg-muted/15"
                  }`}
                >
    
                  {/* Active glow */}
                  {isActive && (
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-primary/5" />
                  )}
    
                  <div className="relative flex items-start gap-3">
    
                    {/* Icon */}
                    <div
                      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isDone
                          ? "bg-primary/15"
                          : isActive
                          ? "bg-primary/10"
                          : "bg-muted/40"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <step.icon
                          className={`h-4 w-4 ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      )}
    
                      {isActive && (
                        <span className="absolute inset-0 animate-ping rounded-xl bg-primary/10" />
                      )}
                    </div>
    
                    {/* Content */}
                    <div className="min-w-0 flex-1">
    
                      <div className="flex items-center justify-between gap-3">
    
                        <div className="min-w-0">
                          <h3
                            className={`truncate text-sm font-medium ${
                              isPending
                                ? "text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {step.title}
                          </h3>
    
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
    
                        {/* Status */}
                        <div className="shrink-0">
    
                          {isDone && (
                            <div className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">
                              Done
                            </div>
                          )}
    
                          {isActive && (
                            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">
                              <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
    
                              <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:0.15s]" />
    
                              <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:0.3s]" />
                            </div>
                          )}
                        </div>
                      </div>
    
                      {/* Live status */}
                      {isActive && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: 4,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          className="mt-3 rounded-xl bg-background/50 px-3 py-2 text-[11px] text-muted-foreground"
                        >
                          {step.status}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
    
        {/* Bottom Bar */}
        <div className="mt-6 flex shrink-0 items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
    
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
    
            <span>
              AI agents collaborating in real time
            </span>
          </div>
    
          <div className="rounded-full bg-background/60 px-3 py-1 tabular-nums">
            {elapsed}s
          </div>
        </div>
      </div>
    )
  }