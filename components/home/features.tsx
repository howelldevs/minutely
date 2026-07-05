"use client"

import {
  BrainCircuit,
  CheckSquare,
  Users,
  Clock3,
  FileText,
  Sparkles,
  Activity,
  Workflow,
  ShieldCheck,
} from "lucide-react"

import { motion } from "framer-motion"

const features = [
  {
    icon: BrainCircuit,
    title: "AI Meeting Understanding",
    description:
      "Meetric understands context, decisions, and implicit commitments from long conversations.",
    className: "md:col-span-2 ",
  },
  {
    icon: Clock3,
    title: "10-Second Processing",
    description:
      "Generate structured outputs instantly using Qwen-powered reasoning pipelines.",
    className: "md:col-span-1 ",
  },
  {
    icon: Users,
    title: "Participant Detection",
    description:
      "Identify participants and understand team roles automatically.",
    className: "md:col-span-1 ",
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    description:
      "Turn discussions into structured execution pipelines and collaborative workflows.",
    className: "md:col-span-2 ",
  },
  {
    icon: CheckSquare,
    title: "Smart Action Extraction",
    description:
      "Automatically extract tasks, owners, priorities, and deadlines.",
    className: "md:col-span-1",
  },
  {
    icon: FileText,
    title: "Structured Summaries",
    description:
      "Convert raw conversations into concise and shareable summaries.",
    className: "md:col-span-1 ",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-loop Approval",
    description:
      "Review and validate AI-generated outputs before execution.",
    className: "md:col-span-2",
  },
  {
    icon: Sparkles,
    title: "Live Task Board",
    description:
      "Track AI-generated action items in a collaborative workspace.",
    className: "md:col-span-2 ",
  },
]

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden py-12"
    >

      {/* Background Glow */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-100 w-100 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

        <div className="absolute bottom-0 right-0 h-75 w-75 rounded-full bg-primary/5 blur-[100px]" />
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
            Powered by Qwen AI
          </div>

          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Autonomous meeting intelligence
          </h2>

          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            AI agents that transform conversations into
            structured execution, collaboration, and operational clarity.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
              }}
              className={`group relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/60 p-7 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-primary/10 ${feature.className}`}
            >

              {/* Glow Hover */}
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" />
              </div>

              {/* Gradient Blur */}
              <div className="absolute right-0 top-0 h-32 w-32 bg-primary/10 blur-3xl" />

              {/* Icon */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Content */}
              <div className="relative">

                <h3 className="mt-6 text-2xl font-semibold tracking-tight">
                  {feature.title}
                </h3>

                <p className="mt-4 max-w-md leading-7 text-muted-foreground">
                  {feature.description}
                </p>

                {/* Large Card Extras */}
                {feature.title === "AI Meeting Understanding" && (
                  <div className="mt-8 space-y-4">

                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          AI Confidence
                        </span>

                        <span className="text-sm text-primary">
                          98%
                        </span>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-[98%] rounded-full bg-primary" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">

                      <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                        <p className="text-2xl font-semibold">
                          24
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Tasks detected
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                        <p className="text-2xl font-semibold">
                          12
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Decisions
                        </p>
                      </div>

                    </div>
                  </div>
                )}

    {feature.title === "Workflow Automation" && (
      <div className="mt-8 space-y-4">

    {/* Pipeline */}
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-2">

      <div className="flex flex-wrap items-center gap-3">

        {[
          "Transcript",
          "AI Analysis",
          "Approval",
          "Execution",
          "Task Extraction",
          
          
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-1 whitespace-nowrap rounded-full border border-border px-4 py-2 text-sm font-medium backdrop-blur"
          >
            <div className="whitespace-nowrap  px-4 py-2 text-sm font-medium backdrop-blur">
              {item}
            </div>

            {item !== "Execution" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70">
                <Activity className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Live Workflow Status */}
    <div className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            Workflow Status
          </p>

          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            AI pipeline currently processing meeting data
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />

            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>

          Active
        </div>
      </div>

      {/* Progress */}
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[78%] rounded-full bg-primary transition-all duration-700" />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Processing workflow</span>
        <span>78%</span>
      </div>
    </div>
  </div>
)}

</div>

              {/* Bottom Glow */}
              <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}