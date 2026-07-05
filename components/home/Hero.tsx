import {
  ArrowRight,
  CheckCircle2,
  Activity,
  BrainCircuit,
  Brain,
} from "lucide-react"

import { Button } from "../ui/button"
import { Card } from "../ui/card"
import Link from "next/link"

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute inset-0 -z-30 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-125 w-125 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

        <div className="absolute bottom-0 left-1/4 h-75 w-75 rounded-full bg-primary/10 blur-[100px]" />

        <div className="absolute right-1/4 top-1/3 h-62.5 w-62.5 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Grid Background */}
      <div className="bg-grid absolute inset-0 -z-20 opacity-40" />

      {/* Noise Overlay */}
      <div className="absolute inset-0 -z-10 opacity-[0.03] bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-size-[18px_18px]" />

      <div className="container py-2 sm:py-1 lg:py-3">
        <div className="mx-auto max-w-6xl text-center">

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm shadow-sm backdrop-blur-xl">
            <Brain  className="h-4 w-4 text-primary" />
            Autonomous AI meeting intelligence
          </div>

          {/* Heading */}
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-7xl">
            Turn conversations into

            <span className="relative mt-2 block text-primary">
              structured execution

              {/* Glow */}
              <span className="absolute inset-0 -z-10 bg-primary/20 blur-3xl" />
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
            Meetric uses AI agents to extract summaries, action items,
            decisions, deadlines, and ownership from meetings in seconds.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/upload" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-12 rounded-2xl px-8 text-base shadow-lg shadow-primary/20"
              >
                Try Meetric
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href="/demo" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-2xl px-8 text-base backdrop-blur"
              >
                Live Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              AI summaries
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Smart task extraction
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Real-time collaboration
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative mt-24">

            {/* Floating Metric Card */}
            <div className="absolute -left-8 top-10 hidden lg:block">
              <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                  </div>

                  <div className="text-left">
                    <p className="text-2xl font-semibold">
                      98%
                    </p>

                    <p className="text-sm text-muted-foreground">
                      AI accuracy
                    </p>
                  </div>
                </div>
              </div>
            </div>

            

            {/* Floating Activity */}
            <div className="absolute right-12 top-0 hidden xl:block">
              <div className="rounded-3xl border border-border/60 bg-background/80 p-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" />

                  <span>
                    AI Agent Active
                  </span>
                </div>
              </div>
            </div>

            {/* Glow */}
            <div className="absolute inset-0 -z-20 flex items-center justify-center">
              <div className="h-112.5 w-112.5 rounded-full bg-primary/20 blur-[120px]" />
            </div>

            {/* Border Glow */}
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-linear-to-r from-primary/20 via-primary/5 to-primary/20 blur-2xl" />

            <Card className="relative overflow-hidden border-border/60 bg-card/80 shadow-2xl backdrop-blur-xl">

              {/* Shine */}
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

              {/* Header */}
              <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-4">

                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>

                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  AI Processing Active
                </div>
              </div>

              {/* Main Content */}
              <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">

                {/* Left Side */}
                <div className="rounded-3xl border border-border/60 bg-background/80 p-5 text-left backdrop-blur">

                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="font-medium">
                      Product Strategy Meeting
                    </h3>

                    <div className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      Processed
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-muted-foreground">
                    The team discussed onboarding improvements,
                    launch timelines, pricing updates, and engineering
                    deliverables for Q3 execution.
                  </p>

                  {/* AI Terminal */}
                  <div className="mt-6 rounded-2xl border border-primary/10 bg-black/60 p-4 font-mono text-sm">
                    <div className="space-y-2 text-left text-green-400">
                      <p>{">"} Parsing transcript...</p>
                      <p>{">"} Extracting action items...</p>
                      <p>{">"} Detecting participants...</p>
                      <p>{">"} Sync complete</p>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="mt-6 space-y-3">

                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          Finalize onboarding screens
                        </p>

                        <span className="text-xs text-muted-foreground">
                          High Priority
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Assigned to Sarah • Due Friday
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          Update pricing documentation
                        </p>

                        <span className="text-xs text-muted-foreground">
                          Medium Priority
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Assigned to Michael • Due Monday
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side */}
                <div className="space-y-6">

                  {/* Decisions */}
                  <div className="rounded-3xl border border-border/60 bg-background/80 p-5 text-left backdrop-blur">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Key Decisions
                      </p>

                      <div className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">
                        3 extracted
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-muted/50 p-3 text-sm">
                        Launch moved to July 18
                      </div>

                      <div className="rounded-xl bg-muted/50 p-3 text-sm">
                        Freemium pricing approved
                      </div>

                      <div className="rounded-xl bg-muted/50 p-3 text-sm">
                        Mobile onboarding prioritized
                      </div>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="rounded-3xl border border-border/60 bg-background/80 p-5 text-left backdrop-blur">
                    <p className="text-sm font-medium">
                      Participants
                    </p>

                    <div className="mt-4 space-y-4">

                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Sarah Johnson
                        </span>

                        <span className="text-xs text-muted-foreground">
                          Product Lead
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Michael Chen
                        </span>

                        <span className="text-xs text-muted-foreground">
                          Engineering
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Emma Davis
                        </span>

                        <span className="text-xs text-muted-foreground">
                          Design
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Analytics */}
                  <div className="rounded-3xl border border-border/60 bg-background/80 p-5 text-left backdrop-blur">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        AI Insights
                      </p>

                      <div className="text-xs text-primary">
                        Live
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-2xl font-semibold">
                          24
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Tasks detected
                        </p>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-4">
                        <p className="text-2xl font-semibold">
                          12
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Decisions found
                        </p>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}