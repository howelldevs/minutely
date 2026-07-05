"use client"

import { motion } from "framer-motion"

import {
  Upload,
  BrainCircuit,
  KanbanSquare,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Upload transcript",
    description:
      "Paste a transcript or upload a voice note from meetings, calls, or interviews.",
    icon: Upload,
    status: "Input Layer",
  },
  {
    number: "02",
    title: "AI extracts insights",
    description:
      "Meetric identifies summaries, action items, owners, priorities, and decisions using AI reasoning.",
    icon: BrainCircuit,
    status: "AI Processing",
  },
  {
    number: "03",
    title: "Track execution",
    description:
      "Manage AI-generated tasks inside a collaborative real-time workspace with approval workflows.",
    icon: KanbanSquare,
    status: "Execution Layer",
  },
]

export default function HowItWorks() {
  return (
    <section
      id="how"
      className="relative overflow-hidden py-32"
    >

      {/* Background Glow */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Grid Overlay */}
      <div className="bg-grid absolute inset-0 -z-10 opacity-30" />

      <div className="container relative">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.5,
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
            AI Workflow Engine
          </div>

          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            From raw meetings
            <span className="block text-primary">
              to operational execution
            </span>
          </h2>

          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Meetric transforms conversations into structured workflows
            using autonomous AI agents and collaborative execution pipelines.
          </p>
        </motion.div>

        {/* Workflow Pipeline */}
        <div className="relative mt-24">

          {/* Connection Line */}
          <div className="absolute left-1/2 top-28 hidden h-0.5 w-[72%] -translate-x-1/2 bg-linear-to-r from-transparent via-primary/30 to-transparent lg:block" />

          {/* Floating Activity */}
          <div className="absolute left-1/2 top-16 hidden -translate-x-1/2 xl:flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl">
            <Activity className="h-3.5 w-3.5 text-primary" />
            AI Agent Pipeline Active
          </div>

          <div className="grid gap-8 lg:grid-cols-3">

            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.15,
                }}
                className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/60 p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-primary/10"
              >

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" />
                </div>

                {/* Gradient Blur */}
                <div className="absolute right-0 top-0 h-32 w-32 bg-primary/10 blur-3xl" />

                {/* Number */}
                <div className="absolute right-6 top-6 text-7xl font-bold tracking-tight text-primary/30">
                  {step.number}
                </div>

                {/* Status */}
                <div className="relative inline-flex items-center rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs text-primary">
                  {step.status}
                </div>

                {/* Icon */}
                <div className="relative mt-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="mt-8 text-2xl font-semibold tracking-tight">
                    {step.title}
                  </h3>

                  <p className="mt-4 leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Dynamic Extra Content */}
                {step.number === "02" && (
                  <div className="relative mt-8 rounded-2xl border border-border/60 bg-background/60 p-4">

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        AI Confidence
                      </span>

                      <span className="text-sm text-primary">
                        98%
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[98%] rounded-full bg-primary" />
                    </div>

                    <div className="mt-5 space-y-2 font-mono text-xs text-green-400">
                      <p>{">"} Parsing transcript...</p>
                      <p>{">"} Detecting participants...</p>
                      <p>{">"} Extracting decisions...</p>
                      <p>{">"} Workflow generated</p>
                    </div>
                  </div>
                )}

                {step.number === "03" && (
                  <div className="relative mt-8 flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
                    <ShieldCheck className="h-4 w-4 text-primary" />

                    <span className="text-muted-foreground">
                      Human approval enabled before execution
                    </span>
                  </div>
                )}

                {/* Arrow Connector */}
                {index !== steps.length - 1 && (
                  <div className="absolute -right-0 top-1/2 z-20 hidden -translate-y-1/2 lg:flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 backdrop-blur">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}

                {/* Bottom Glow */}
                <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}