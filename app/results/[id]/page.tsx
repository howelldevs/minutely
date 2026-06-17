import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import Navbar from "@/components/layout/Navbar"
import ResultsDashboard from "@/components/results/results-dashboard"
import type { MeetingIntelligence } from "@/types/analysis"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params
  const { userId } = await auth()

  if (!userId) redirect("/upload")

  const adminSupabase = createAdminSupabaseClient()
  const { data, error } = await adminSupabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (error || !data) notFound()

  const analysis: MeetingIntelligence = {
    title: data.title,
    summary: data.summary,
    processingTime: data.processing_time,
    actionItems: data.action_items ?? [],
    decisions: data.decisions ?? [],
    participants: data.participants ?? [],
    transcript: data.transcript ?? "",
    blockers: data.blockers ?? [],
    sprintPlan: data.sprint_plan ?? [],
    workflow: data.workflow ?? [],
    actionPlan: data.action_plan ?? [],
    followUps: data.follow_ups ?? [],
    agentVersion: data.agent_version ?? "1.0.0",
    analysisMode: data.analysis_mode ?? "legacy",
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-20">
      <div className="bg-grid absolute inset-0 opacity-40" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <Navbar />
      <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <ResultsDashboard analysis={analysis} meetingId={id} />
      </div>
    </main>
  )
}