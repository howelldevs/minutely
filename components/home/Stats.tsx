"use client"

import { motion } from "framer-motion"

import {
  TimerReset,
  BrainCircuit,
  Activity,
  Database,
} from "lucide-react"

const stats = [
  {
    value: "<10s",
    label: "Processing time",
    icon: TimerReset,
    description: "Instant AI workflow generation",
  },
  {
    value: "98%",
    label: "Extraction accuracy",
    icon: BrainCircuit,
    description: "High-confidence AI reasoning",
  },
  {
    value: "24/7",
    label: "AI agent runtime",
    icon: Activity,
    description: "Continuous autonomous processing",
  },
  {
    value: "Unlimited",
    label: "Transcript support",
    icon: Database,
    description: "Meetings, calls, and voice notes",
  },
]

export default function StatsSection() {
  return (
    <section className="relative overflow-hidden py-20">

      {/* Background Glow */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-100 w-100 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Grid Background */}
      <div className="bg-grid absolute inset-0 -z-10 opacity-20" />

      <div className="container relative">

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
          }}
          className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/50 p-6 shadow-2xl backdrop-blur-xl md:p-8"
        >

          {/* Border Glow */}
          <div className="absolute inset-0 rounded-[2rem] bg-linear-to-r from-primary/10 via-transparent to-primary/10 opacity-60" />

          {/* Top Shine */}
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

          {/* Header */}
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div>
              <div className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
                Live AI Metrics
              </div>

              <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
                Production-grade AI performance
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              Built for fast processing, intelligent reasoning,
              and scalable workflow automation powered by Qwen AI.
            </p>
          </div>

          {/* Bento Stats Grid */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                }}
                className="group relative overflow-hidden rounded-3xl border border-border/60 bg-background/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-primary/10"
              >

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" />
                </div>

                {/* Blur Accent */}
                <div className="absolute right-0 top-0 h-24 w-24 bg-primary/10 blur-3xl" />

                {/* Icon */}
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>

                {/* Value */}
                <div className="relative mt-6 text-4xl font-semibold tracking-tight">
                  {stat.value}
                </div>

                {/* Label */}
                <p className="relative mt-2 text-base font-medium">
                  {stat.label}
                </p>

                {/* Description */}
                <p className="relative mt-3 text-sm leading-6 text-muted-foreground">
                  {stat.description}
                </p>

                {/* Bottom Glow */}
                <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}