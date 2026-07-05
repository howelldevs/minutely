"use client"

import { motion } from "framer-motion"

import {
  ArrowRight,
  Sparkles,
  BrainCircuit,
  ShieldCheck,
  Activity,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CTASection() {
  return (
    <section className="relative overflow-hidden py-32">

      {/* Background Glow */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]" />

        <div className="absolute bottom-0 left-1/4 h-75 w-75 rounded-full bg-primary/5 blur-[100px]" />

        <div className="absolute right-1/4 top-0 h-62.5 w-62.5 rounded-full bg-primary/5 blur-[100px]" />
      </div>

      {/* Grid Overlay */}
      <div className="bg-grid absolute inset-0 -z-10 opacity-20" />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
          }}
          className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-card/60 px-8 py-20 shadow-2xl backdrop-blur-2xl md:px-16"
        >

          {/* Gradient Overlay */}
          <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/5 via-transparent to-primary/10" />

          {/* Shine */}
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />

          {/* Floating Glow */}
          <div className="absolute left-1/2 top-1/2 -z-20 h-100 w-100 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

          {/* Floating Metrics */}
          <div className="absolute right-10 top-10 hidden xl:flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl">
            <Activity className="h-3.5 w-3.5 text-primary" />
            AI Pipeline Running
          </div>

          <div className="grid items-center gap-16 xl:grid-cols-[1.1fr_0.9fr]">

            {/* Left Content */}
            <div>

              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl">

                <div className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </div>

                Powered by Qwen AI
              </div>

              {/* Heading */}
              <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
                Turn conversations into

                <span className="relative block bg-linear-to-r from-primary via-emerald-300 to-primary bg-clip-text text-transparent">
                  autonomous execution

                  {/* Text Glow */}
                  <span className="absolute inset-0 -z-10 bg-primary/20 blur-3xl" />
                </span>
              </h2>

              {/* Description */}
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Meetric automatically extracts tasks, summaries,
                participants, priorities, and decisions from meetings —
                then transforms them into actionable workflows in seconds.
              </p>

              {/* CTA */}
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-start">

                <Link href="/upload">
                  <Button
                    size="lg"
                    className="h-12 rounded-2xl px-8 text-base shadow-lg shadow-primary/20"
                  >
                    Upload Meeting
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/demo">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-2xl px-8 text-base backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:bg-background/80"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Watch Demo
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">

                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  AI-powered extraction
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Human approval workflows
                </div>

                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Real-time execution tracking
                </div>
              </div>

              {/* Small Trust Line */}
              <div className="mt-8 text-sm text-muted-foreground">
                No credit card required • Built for hackathon-scale AI workflows
              </div>
            </div>

            {/* Right Bento Preview */}
            <div className="relative">

              {/* Glow */}
              <div className="absolute inset-0 -z-10 flex items-center justify-center">
                <div className="h-80 w-80 rounded-full bg-primary/15 blur-[100px]" />
              </div>

              <div className="grid auto-rows-[140px] gap-4 sm:grid-cols-2">

                {/* Main Card */}
                <div className="group relative overflow-hidden rounded-3xl border border-border/60 bg-background/70 p-5 shadow-xl backdrop-blur-xl sm:col-span-2">

                  <div className="absolute right-0 top-0 h-24 w-24 bg-primary/10 blur-3xl" />

                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        AI Processing
                      </p>

                      <h3 className="mt-2 text-2xl font-semibold">
                        Meeting analyzed
                      </h3>
                    </div>

                    <div className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      Active
                    </div>
                  </div>

                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[92%] rounded-full bg-primary" />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Transcript parsed</span>
                    <span>92%</span>
                  </div>
                </div>

                {/* Card */}
                <div className="rounded-3xl border border-border/60 bg-background/70 p-5 backdrop-blur-xl">
                  <p className="text-sm text-muted-foreground">
                    Tasks Generated
                  </p>

                  <div className="mt-4 text-4xl font-semibold">
                    24
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    AI extracted action items
                  </p>
                </div>

                {/* Card */}
                <div className="rounded-3xl border border-border/60 bg-background/70 p-5 backdrop-blur-xl">
                  <p className="text-sm text-muted-foreground">
                    Decisions Found
                  </p>

                  <div className="mt-4 text-4xl font-semibold">
                    12
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Strategic decisions detected
                  </p>
                </div>

              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  )
}