"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import UploadZone from "@/components/upload/upload-zone"
import ProcessingScreen from "@/components/upload/processing-screen"
import ResultsDashboard from "@/components/results/results-dashboard"
import Navbar from "@/components/layout/Navbar"
import { saveAnalysis } from "@/lib/storage"
import type { MeetingAnalysis } from "@/types/analysis"

type Step = "upload" | "processing" | "results"

export default function DemoPage() {
  const { user } = useUser()
  const [step, setStep] = useState<Step>("upload")
  const [transcript, setTranscript] = useState("")
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null)

  const handleAnalyze = (text: string) => {
    setTranscript(text)
    setStep("processing")
  }

  const handleProcessingComplete = async (data: MeetingAnalysis) => {
    await saveAnalysis(data, user?.id)
    setAnalysis(data)
    setStep("results")
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-40" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-125 w-125 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <div className="relative z-10 container pt-10">
        <Navbar />
      </div>
      <div className="container relative py-24">
        {step === "upload" && (
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <div className="mb-4 inline-flex rounded-full border bg-background/70 px-4 py-2 text-sm backdrop-blur">
                Live Demo — Powered by Qwen AI
              </div>
              <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
                Try Minutely
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
                Paste a meeting transcript below and see Minutely in action.
              </p>
            </div>
            <div className="mt-14">
              <UploadZone onAnalyze={handleAnalyze} />
            </div>
          </div>
        )}
        {step === "processing" && (
          <div className="mx-auto max-w-4xl">
            <ProcessingScreen transcript={transcript} onComplete={handleProcessingComplete} />
          </div>
        )}
        {step === "results" && analysis && (
          <ResultsDashboard analysis={analysis} />
        )}
      </div>
    </main>
  )
}