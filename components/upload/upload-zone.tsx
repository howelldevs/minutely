"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const MAX_TRANSCRIPT_CHARS = 10_000

const SAMPLE_TRANSCRIPT = `Sarah (PM): Alright, let's get started — we're 23 days out from the July 18 launch and I want to walk through every open thread. Michael, let's start with engineering. Where are we on the API?

Michael (Engineering Lead): Auth endpoints are done and in staging. User creation is about 80% — there's one edge case with OAuth token expiry on mobile that Priya is still debugging. She thinks it's a 2-day fix max.

Sarah: Is that blocking anything else?

Michael: It's blocking the onboarding screens from being fully testable end-to-end. Emma's screens are ready but QA can't sign off until the token issue is resolved.

Emma (Designer): Yeah, I finished the mobile onboarding screens yesterday. I sent the Figma link to the group — did everyone get that?

David (QA Lead): Got it. I've reviewed them visually but I can't run full regression until the auth fix lands. My estimate is 4 days of testing once I have a stable build.

Sarah: Okay so that's a hard dependency. Priya, you're not on this call — Michael, can you relay that the token fix is the critical path item right now? We need it by Wednesday at the latest or the QA timeline collapses.

Michael: Understood. I'll talk to her after this.

Sarah: Good. Emma, what about desktop? Where does that stand?

Emma: Desktop onboarding is about 60% designed. We agreed last sprint that mobile is the priority, so I've been focused there. I can have desktop screens done by July 10 but that gives QA very little time.

Sarah: How long for desktop QA, David?

David: Honestly, if I get desktop screens by July 10 that's only 8 days before launch. I'd need at least 5 days for a proper pass. That's cutting it extremely close — any bugs found after July 13 are basically unfixable before launch.

Sarah: Let's flag that as a risk. Recommendation: we launch mobile onboarding on July 18 and treat desktop as a fast-follow in sprint 2. Everyone agree?

Michael: Agreed.

Emma: Works for me. Honestly better to launch one thing well.

David: Strongly agree. I'd rather sign off on mobile with confidence than rush desktop.

Sarah: Decision made. Mobile onboarding launches July 18, desktop follows in sprint 2. Emma, you can deprioritize desktop for now and focus any remaining bandwidth on polish for mobile.

Emma: Perfect. I'll also need final copy from the marketing team for the empty states — I've been waiting on that for a week. If I don't have it by tomorrow I'm going to write placeholder copy myself and we swap it post-launch.

Sarah: Do that. Don't wait on marketing anymore. Marcus, can you chase them today and get Emma what she needs?

Marcus (Marketing): Yes, I'll ping them right after this call. If I can't get a response by EOD I'll draft the copy myself and send it to Emma.

Sarah: Great. Now, pricing. We aligned on freemium last sprint — that's locked. But Michael I don't think the pricing page reflects that yet.

Michael: Correct, the docs and the pricing page both still show the old tiered model. I'll update the internal docs today and the live pricing page by Monday.

Sarah: That needs to happen before launch — the sales team is already quoting freemium to prospects. If someone clicks through and sees conflicting pricing we have a trust problem.

Michael: Understood, I'll prioritize Monday.

Sarah: Also — notifications. David, have you seen the notification spec?

David: I haven't received anything to test yet. Last I heard it was still being built.

Michael: It's done on the backend. I assumed someone had handed it to QA.

Sarah: This is a gap. Michael, who owns the handoff?

Michael: I'll take that — I'll send David the spec and API docs today so he can start writing test cases.

David: If I get the spec today I can start test cases tomorrow and have results by end of next week. That gives us a few days buffer before launch.

Sarah: Good. Let's make that happen. Next — the dashboard performance issue. We talked about this two sprints ago. Slow load times when there are more than 200 records. Is that resolved?

Michael: Not yet. It got deprioritized. The main query isn't indexed properly — it's about a day of work. I can fit it in this sprint if I slot it after the pricing page update.

Sarah: That's a launch blocker in my opinion. If a power user hits the dashboard with 300 records on day one and it crawls, that's a bad first impression.

Michael: Fair. I'll prioritize it. I'll do pricing page Monday, query optimization Tuesday.

Sarah: Perfect. David, add a performance test scenario to your QA plan — simulate 250+ records and check load time.

David: Will do.

Sarah: Alright, let me summarize where we are. Launch is July 18, that's firm. Mobile onboarding is the launch scope — desktop is sprint 2. The critical path right now is Priya's token fix — that needs to land by Wednesday. Auth done, user creation 80%. Emma has mobile screens done, waiting on copy from marketing. Michael is updating pricing docs and the live pricing page by Monday. Dashboard query optimization is Tuesday. Notification spec handoff is today. QA starts full regression once the token fix is in — David needs 4 days. That puts us at a stable build by Friday this week ideally.

Michael: That timeline works from our side assuming Priya hits Wednesday.

Emma: Same from design — I'm unblocked once I get the copy.

David: I'll be ready. I'll also add the performance scenario and notification tests to my plan today.

Sarah: One more thing — we need a war room plan for launch day. I want someone monitoring the dashboard and someone on call for hotfixes. Michael, can you put together a rotation?

Michael: Yes, I'll send a launch day runbook by Thursday with an on-call rotation.

Sarah: Great. Marcus, what's the comms plan for July 18?

Marcus: We have a launch email ready for the waitlist — 4,200 people. Blog post is drafted. Social content is scheduled. We'll go live at 9am EST. I'll need the final pricing page URL confirmed by July 15 so I can update the links in the email.

Sarah: Michael, note that — pricing page URL locked by July 15.

Michael: Noted.

Sarah: Okay that's everything. To recap the decisions: July 18 launch date is firm, mobile onboarding is launch scope, desktop is sprint 2, freemium pricing is the model, we're not waiting on marketing for copy after today. Action items are going into the tracker. Let's reconvene Thursday for a pre-launch check-in. Thanks everyone!`

interface Props {
  onAnalyze: (transcript: string) => void
}

export default function UploadZone({ onAnalyze }: Props) {
  const [transcript, setTranscript] = useState("")
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const overLimit = transcript.length > MAX_TRANSCRIPT_CHARS

  const handleAnalyze = () => {
    const text = transcript.trim()
    if (!text || overLimit) return
    onAnalyze(text)
  }

  const handleSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT.slice(0, MAX_TRANSCRIPT_CHARS))
    setFileName(null)
    setTruncated(false)
  }

  const applyTranscript = (text: string, name: string | null) => {
  setTranscript(text)
  setFileName(name)
}

const readFile = async (file: File) => {
  try {
    let extractedText = ""

    // Handle PDF files
    const pdfjsLib = await import("pdfjs-dist")

    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString()

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const textLines: string[] = []
    let totalChars = 0
    let exceeded = false

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()

      const pageText = textContent.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ")

      textLines.push(pageText)
      totalChars += pageText.length

      // Stop parsing early once we know it's too big — no point
      // reading the rest of the pages if we're rejecting the file anyway
      if (totalChars > MAX_TRANSCRIPT_CHARS) {
        exceeded = true
        break
      }
    }

    if (exceeded) {
      alert(
        `This file is too long (over ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters). Please upload a shorter transcript or trim it before uploading.`
      )
      return
    }

    extractedText = textLines.join("\n")
    applyTranscript(extractedText, file.name)
  } catch (error) {
    console.error("Error reading file:", error)
    alert("Error reading file. Please try again.")
  }
}

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }, [])

  const clearFile = () => {
    setFileName(null)
    setTranscript("")
    setTruncated(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-2xl backdrop-blur-xl">
      <div className="p-6 space-y-5">

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-7 text-center transition-colors duration-200 ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border/60 bg-background/40 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {fileName ? (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {truncated ? "File loaded — truncated to fit the 10,000 character limit" : "File loaded"}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); clearFile() }}
                className="absolute right-3 top-3 rounded-lg p-1 hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </>
          ) : (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Drop a file or click to browse</p>
                <p className="text-xs text-muted-foreground mt-0.5">.pdf .txt .md — up to 10,000 characters</p>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-xs text-muted-foreground">or paste directly</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* Textarea */}
        <div className="relative">
          <Textarea
            placeholder="Paste your meeting transcript here..."
            className={`min-h-48 resize-none rounded-2xl border-border/60 bg-background/60 text-sm leading-7 ${
              overLimit ? "border-destructive/60 focus-visible:ring-destructive/40" : ""
            }`}
            value={transcript}
            onChange={(e) => {
              setTruncated(false)
              setTranscript(e.target.value)
            }}
          />
          {transcript && (
            <button
              onClick={() => { setTranscript(""); setFileName(null); setTruncated(false) }}
              className="absolute right-3 top-3 rounded-lg p-1 hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <p className={`mt-1.5 text-right text-xs ${overLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {transcript.length.toLocaleString()} / {MAX_TRANSCRIPT_CHARS.toLocaleString()}
            {overLimit ? " — trim before analyzing" : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSample}
            className="text-xs text-primary hover:underline"
          >
            Use sample transcript
          </button>
          <Button
            size="lg"
            className="rounded-2xl px-8 shadow-lg shadow-primary/20"
            onClick={handleAnalyze}
            disabled={!transcript.trim() || overLimit}
          >
            Analyze with Qwen AI
          </Button>
        </div>
      </div>
    </div>
  )
}