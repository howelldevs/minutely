/**
 * POST /api/analysis  — legacy single-agent fallback route
 */
import { NextRequest, NextResponse } from "next/server"
import { AI_BASE_URL, AI_FAST_MODEL, getAIApiKey, getAIHeaders } from "@/lib/ai-config"

const SYSTEM_PROMPT = `You are a meeting intelligence assistant.
Analyze the transcript and return ONLY a JSON object. No markdown. No preamble.

Required shape:
{
  "title": "short meeting title",
  "summary": "2-3 sentence summary",
  "processingTime": 0,
  "actionItems": [
    { "id": "task-1", "task": "task", "assignee": "Full Name", "due": "Friday", "priority": "High" }
  ],
  "decisions": ["decision"],
  "participants": [{ "name": "Full Name", "role": "role" }],
  "transcript": ""
}
priority: "High" | "Medium" | "Low"`

function safeParse(raw: string) {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim()
  const start = cleaned.indexOf("{")
  if (start > 0) cleaned = cleaned.slice(start)
  return JSON.parse(cleaned)
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json()
    if (!transcript?.trim()) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 })
    }

    const apiKey = getAIApiKey()
    if (!apiKey) return NextResponse.json({ error: "AI API key missing" }, { status: 500 })

    const start = Date.now()

    const response = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: getAIHeaders(apiKey),
      body: JSON.stringify({
        model: AI_FAST_MODEL,
        temperature: 0.2,
        max_tokens: 3000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this meeting transcript:\n\n${transcript}` },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: "AI request failed", details: error }, { status: response.status })
    }

    const json = await response.json()
    const raw = json?.choices?.[0]?.message?.content
    if (!raw) return NextResponse.json({ error: "Empty AI response" }, { status: 500 })

    let data
    try {
      data = safeParse(raw)
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 500 })
    }

    data.processingTime = parseFloat(((Date.now() - start) / 1000).toFixed(1))
    data.transcript = transcript
    return NextResponse.json(data)
  } catch (err) {
    console.error("Legacy analysis route error:", err)
    return NextResponse.json({ error: "Failed to process transcript" }, { status: 500 })
  }
}