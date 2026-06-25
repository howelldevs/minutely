import { NextRequest, NextResponse } from "next/server"
import type { MeetingAnalysis } from "@/types/analysis"
import { AI_BASE_URL, AI_PRIMARY_MODEL, getAIApiKey, getAIHeaders } from "@/lib/ai-config"

// Use PRIMARY model (qwen-plus) not fast model — better instruction following

const SYSTEM_PROMPT = `You are a meeting data editor. You MUST always respond with valid JSON. Never respond with plain text.

RESPONSE FORMAT — always one of these two shapes:

Shape 1 — answering a question:
{"reply":"your answer here"}

Shape 2 — editing data:
{"reply":"short confirmation of what you changed","patch":{"actionItems":[...]}}

EDITING RULES:
- To edit actionItems: return the COMPLETE actionItems array with ALL items, including your changes
- To add an item: include ALL existing items PLUS the new one
- To remove an item: include ALL existing items EXCEPT the removed one  
- To update an item: include ALL existing items with the target item modified
- New item ids follow the pattern "ai-N" continuing from the highest existing number
- Preserve ALL fields on unchanged items (id, task, assignee, due, priority, storyPoints, status, dependencies)

PATCH FIELDS (only include what you are changing):
- actionItems: ActionItem[]
- decisions: string[]
- summary: string
- blockers: Blocker[]
- sprintPlan: SprintItem[]
- followUps: FollowUp[]
- actionPlan: ActionPlanItem[]

ActionItem shape:
{"id":"task-1","task":"description","assignee":"Full Name","due":"Monday","priority":"High","storyPoints":3,"status":"ready","dependencies":[]}

priority: "High" | "Medium" | "Low"
storyPoints: 1 | 2 | 3 | 5 | 8
status: "ready" | "in-progress" | "done" | "blocked"

IMPORTANT: You CAN add tasks, edit tasks, create action plans, move sprint items, and modify any field. These are NOT restricted to meeting content — the user can ask you to create new items freely.

NEVER respond with plain text. ALWAYS return JSON.`

function buildContext(analysis: MeetingAnalysis): string {
  const intel = analysis as any
  return `CURRENT MEETING DATA (you may read and edit all of this):

Title: ${analysis.title}
Summary: ${analysis.summary}

ACTION ITEMS (${analysis.actionItems?.length ?? 0} total):
${analysis.actionItems?.map((a: any) =>
  `  [${a.id}] task="${a.task}" assignee="${a.assignee}" due="${a.due}" priority="${a.priority}" points=${a.storyPoints ?? 3} status="${a.status ?? "ready"}"`
).join("\n") || "  none"}

DECISIONS:
${analysis.decisions?.map((d: string) => `  - ${d}`).join("\n") || "  none"}

PARTICIPANTS:
${analysis.participants?.map((p: any) => `  - ${p.name} (${p.role})`).join("\n") || "  none"}

BLOCKERS:
${intel.blockers?.map((b: any) => `  [${b.id}] "${b.description}" severity=${b.severity} owner="${b.owner}"`).join("\n") || "  none"}

SPRINT PLAN:
${intel.sprintPlan?.map((s: any) => `  [${s.id}] "${s.name}" tasks=[${s.tasks?.join(", ")}] capacity=${s.capacity}`).join("\n") || "  none"}

ACTION PLAN:
${intel.actionPlan?.map((a: any) => `  [${a.id}] "${a.title}" owner="${a.owner}" due="${a.due}" priority="${a.priority}"`).join("\n") || "  none"}

FOLLOW-UPS:
${intel.followUps?.map((f: any) => `  [${f.id}] to="${f.recipient}" subject="${f.subject}"`).join("\n") || "  none"}`
}

function extractJSON(raw: string): unknown {
  // Strip <think> blocks
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
  // Strip markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim()
  // Find first {
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("No JSON object found")
  return JSON.parse(cleaned.slice(start, end + 1))
}

function buildFallbackPatch(userMessage: string, analysis: MeetingAnalysis): { reply: string; patch: any } | null {
  const msg = userMessage.toLowerCase()

  // "add a task: ..." — parse it manually as last resort
  if (msg.includes("add") && (msg.includes("task") || msg.includes("action"))) {
    const existingIds = analysis.actionItems?.map((a: any) => {
      const n = parseInt(a.id?.replace("ai-", "") ?? "0")
      return isNaN(n) ? 0 : n
    }) ?? [0]
    const nextId = `ai-${Math.max(...existingIds, 0) + 1}`

    // Try to extract owner
    const ownerMatch = msg.match(/owner[:\s]+([a-z]+)/i)
    const dueMatch = msg.match(/due[:\s]+([a-z]+)/i)
    const priorityMatch = msg.match(/\b(high|medium|low)\b/i)

    // Extract task description — everything between "task:" and "owner" or end
    let task = userMessage
    const taskMatch = userMessage.match(/task[:\s]+([^,]+)/i) || userMessage.match(/add[:\s]+([^,]+)/i)
    if (taskMatch) task = taskMatch[1].trim()

    const newItem = {
      id: nextId,
      task,
      assignee: ownerMatch ? ownerMatch[1].charAt(0).toUpperCase() + ownerMatch[1].slice(1) : "Unassigned",
      due: dueMatch ? dueMatch[1].charAt(0).toUpperCase() + dueMatch[1].slice(1) : "TBD",
      priority: priorityMatch ? (priorityMatch[1].charAt(0).toUpperCase() + priorityMatch[1].slice(1)) : "Medium",
      storyPoints: 3,
      status: "ready",
      dependencies: [],
    }

    return {
      reply: `Added task: "${newItem.task}" assigned to ${newItem.assignee}, due ${newItem.due}.`,
      patch: { actionItems: [...(analysis.actionItems ?? []), newItem] },
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const { analysis, messages }: {
      analysis: MeetingAnalysis
      messages: { role: string; content: string }[]
    } = await req.json()

    if (!analysis || !messages?.length) {
      return NextResponse.json({ error: "Missing analysis or messages" }, { status: 400 })
    }

    const apiKey = getAIApiKey()
    if (!apiKey) return NextResponse.json({ error: "AI API key missing" }, { status: 500 })

    const contextBlock = buildContext(analysis)
    const lastUserMessage = messages[messages.length - 1]?.content ?? ""

    const response = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: getAIHeaders(apiKey),
      body: JSON.stringify({
        model: AI_PRIMARY_MODEL,  // Use primary model for better instruction following
        temperature: 0.1,
        max_tokens: 3000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          // Inject context as the first user turn so it's always visible
          { role: "user", content: contextBlock },
          { role: "assistant", content: '{"reply":"Understood. I have the full meeting data and will always respond in JSON."}' },
          // Then the real conversation
          ...messages,
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[/api/chat] LLM error:", err)
      return NextResponse.json({ error: "Chat request failed", details: err }, { status: response.status })
    }

    const json = await response.json()
    const rawReply = json?.choices?.[0]?.message?.content ?? ""

    console.log("[/api/chat] raw reply:", rawReply.slice(0, 300))

    // Try to parse as JSON
    try {
      const parsed = extractJSON(rawReply) as any
      if (parsed?.reply) {
        return NextResponse.json({
          reply: parsed.reply,
          patch: parsed.patch ?? null,
        })
      }
    } catch (e) {
      console.warn("[/api/chat] JSON parse failed, trying fallback:", e)
    }

    // Fallback: try to handle common mutations client-side
    const fallback = buildFallbackPatch(lastUserMessage, analysis)
    if (fallback) {
      return NextResponse.json(fallback)
    }

    // Last resort: return the raw text as a reply with no patch
    const stripped = rawReply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
    return NextResponse.json({
      reply: stripped || "I couldn't process that request. Try rephrasing.",
      patch: null,
    })

  } catch (err) {
    console.error("[/api/chat] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}