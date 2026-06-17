/**
 * AgentOrchestrator
 *
 * 6 specialised LLM agents → single MeetingIntelligence object.
 * Models and provider config live in lib/ai-config.ts.
 * Tuesday Qwen swap: set QWEN_COUPON_ACTIVE=true in .env.local
 */

import type {
  AgentResult,
  AnalysisAgentOutput,
  BlockerAgentOutput,
  SprintAgentOutput,
  WorkflowAgentOutput,
  ActionPlanAgentOutput,
  FollowUpAgentOutput,
  MeetingIntelligence,
  ActionItem,
} from "@/types/analysis"
import { AI_BASE_URL, AI_PRIMARY_MODEL, getAIApiKey, getAIHeaders } from "@/lib/ai-config"
import type { MemoryBlock } from "@/app/api/memory/route"
import type { MemoryBlock } from "@/app/api/memory/route"

const AGENT_VERSION = "1.0.0"

// ─── LLM caller ───────────────────────────────────────────────────────────────

async function callLLM(
  systemPrompt: string,
  userContent: string,
  timeoutMs = 50_000
): Promise<string> {
  const apiKey = getAIApiKey()
  if (!apiKey) throw new Error("AI API key is not set")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(AI_BASE_URL, {
      method: "POST",
      headers: getAIHeaders(apiKey),
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_PRIMARY_MODEL,
        temperature: 0.1,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`LLM ${res.status}: ${body.slice(0, 300)}`)
    }

    const json = await res.json()
    const content = json.choices?.[0]?.message?.content ?? ""
    if (!content) throw new Error("LLM returned empty content")
    return content
  } finally {
    clearTimeout(timer)
  }
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJSON(raw: string): unknown {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim()

  const start = cleaned.search(/[{[]/)
  if (start === -1) throw new Error("No JSON found in LLM response")

  const openChar = cleaned[start]
  const closeChar = openChar === "{" ? "}" : "]"
  let depth = 0
  let end = -1
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++
    else if (cleaned[i] === closeChar) {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  const jsonStr = end !== -1 ? cleaned.slice(start, end + 1) : cleaned.slice(start)
  try {
    return JSON.parse(jsonStr)
  } catch {
    return JSON.parse(cleaned)
  }
}

// ─── Agent runner ─────────────────────────────────────────────────────────────

async function runAgent<T>(name: string, fn: () => Promise<T>): Promise<AgentResult<T>> {
  const start = Date.now()
  try {
    const data = await fn()
    return { agent: name, success: true, data, error: undefined, durationMs: Date.now() - start }
  } catch (err) {
    console.error(`[agent:${name}] failed:`, err)
    return {
      agent: name,
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    }
  }
}

// ─── Agent 1: Core analysis ───────────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are a meeting intelligence agent. Analyze the transcript and return ONLY a JSON object.

No preamble. No markdown. No explanation. Just the JSON.

Required shape:
{
  "title": "short meeting title",
  "summary": "2-3 sentence summary of what was discussed and decided",
  "actionItems": [
    {
      "id": "ai-1",
      "task": "specific actionable task description",
      "assignee": "Full Name",
      "due": "e.g. Friday, End of week",
      "priority": "High",
      "storyPoints": 3,
      "status": "ready",
      "dependencies": []
    }
  ],
  "decisions": ["decision 1", "decision 2"],
  "participants": [
    { "name": "Full Name", "role": "PM" }
  ]
}

priority: "High" | "Medium" | "Low"
storyPoints: 1 | 2 | 3 | 5 | 8
status: always "ready"
dependencies: action item ids this task depends on, or []
Extract ALL action items mentioned, even implicit ones.

If prior meeting context is provided, use it to:
- Identify if this is a recurring blocker or issue
- Note if tasks were previously assigned to the same person
- Surface continuity with past decisions`

async function runAnalysisAgent(transcript: string, memory?: MemoryBlock): Promise<AnalysisAgentOutput> {
  const memoryContext = memory && memory.meetingCount > 0
    ? `\n\nPRIOR MEETING CONTEXT (${memory.meetingCount} previous meetings):\n${memory.condensedSummary}\nKnown participants: ${memory.participantHistory.join(", ")}\nOpen tasks from prior meetings: ${memory.openTasks.slice(0, 5).join("; ") || "none"}`
    : ""

  const raw = await callLLM(ANALYSIS_PROMPT, `Analyze this transcript:${memoryContext}\n\n${transcript}`)
  const parsed = extractJSON(raw) as AnalysisAgentOutput
  if (!parsed.title || !Array.isArray(parsed.actionItems)) {
    throw new Error("Analysis agent returned incomplete data")
  }
  return parsed
}

// ─── Agent 2: Blocker detection ───────────────────────────────────────────────

const BLOCKER_PROMPT = `You are a risk and blocker detection agent. Identify blockers from the meeting.

No preamble. No markdown. No explanation. Just the JSON.

Required shape:
{
  "blockers": [
    {
      "id": "bl-1",
      "description": "what is blocked and why",
      "severity": "Critical",
      "affectedTasks": ["ai-1"],
      "owner": "Full Name",
      "suggestedResolution": "concrete step to unblock"
    }
  ]
}

severity: "Critical" | "High" | "Medium"
Return { "blockers": [] } if nothing is blocked.`

async function runBlockerAgent(transcript: string, actionItems: ActionItem[]): Promise<BlockerAgentOutput> {
  const context = `Action items:\n${actionItems.map((a) => `- [${a.id}] ${a.task} (${a.assignee})`).join("\n")}\n\nTranscript:\n\n${transcript}`
  const raw = await callLLM(BLOCKER_PROMPT, context)
  const parsed = extractJSON(raw) as BlockerAgentOutput
  if (!Array.isArray(parsed.blockers)) parsed.blockers = []
  return parsed
}

// ─── Agent 3: Sprint planner ──────────────────────────────────────────────────

const SPRINT_PROMPT = `You are an agile sprint planning agent. Group action items into 1-week sprints.

No preamble. No markdown. No explanation. Just the JSON.

Required shape:
{
  "sprintPlan": [
    {
      "id": "sprint-1",
      "name": "Sprint 1 — Auth & Core",
      "startDate": "Week 1",
      "endDate": "Week 1, Friday",
      "capacity": 20,
      "tasks": ["ai-1", "ai-3"],
      "goals": ["Complete auth flow", "Fix token refresh"]
    }
  ]
}

Default velocity: 20 story points per sprint.
High priority items go in Sprint 1.
Respect task dependencies.
1-3 goals per sprint.`

async function runSprintAgent(actionItems: ActionItem[]): Promise<SprintAgentOutput> {
  const itemList = actionItems
    .map((a) => `[${a.id}] "${a.task}" — ${a.assignee} | Priority: ${a.priority} | Points: ${a.storyPoints ?? 3} | Deps: ${(a.dependencies ?? []).join(", ") || "none"}`)
    .join("\n")
  const raw = await callLLM(SPRINT_PROMPT, `Plan sprints for these action items:\n\n${itemList}`)
  const parsed = extractJSON(raw) as SprintAgentOutput
  if (!Array.isArray(parsed.sprintPlan)) parsed.sprintPlan = []
  return parsed
}

// ─── Agent 4: Workflow generator ──────────────────────────────────────────────

const WORKFLOW_PROMPT = `You are a workflow DAG generation agent. Build an execution graph from action items.

No preamble. No markdown. No explanation. Just the JSON.

Required shape:
{
  "workflow": [
    {
      "id": "wf-1",
      "title": "short task title",
      "assignee": "Full Name",
      "dependsOn": [],
      "estimatedDays": 2,
      "status": "ready",
      "actionItemId": "ai-1"
    }
  ]
}

status: "ready" if dependsOn is empty, "blocked" otherwise.
estimatedDays: 1pt=0.5d, 2pt=1d, 3pt=1.5d, 5pt=2.5d, 8pt=4d
Use sequential wf-1, wf-2, wf-3 ids.`

async function runWorkflowAgent(actionItems: ActionItem[]): Promise<WorkflowAgentOutput> {
  const itemList = actionItems
    .map((a) => `[${a.id}] "${a.task}" — ${a.assignee} | Points: ${a.storyPoints ?? 3} | Deps: ${(a.dependencies ?? []).join(", ") || "none"}`)
    .join("\n")
  const raw = await callLLM(WORKFLOW_PROMPT, `Build workflow for:\n\n${itemList}`)
  const parsed = extractJSON(raw) as WorkflowAgentOutput
  if (!Array.isArray(parsed.workflow)) parsed.workflow = []
  return parsed
}

// ─── Agent 5: Action plan ─────────────────────────────────────────────────────

const ACTION_PLAN_PROMPT = `You are an execution planning agent. Generate prioritized next steps.

No preamble. No markdown. No explanation. Just the JSON.

Required shape:
{
  "actionPlan": [
    {
      "id": "ap-1",
      "title": "concise next step",
      "description": "what this is and why it matters",
      "owner": "Full Name",
      "due": "Friday",
      "priority": "High",
      "status": "Immediate"
    }
  ]
}

priority: "High" | "Medium" | "Low"
status: "Immediate" | "Short-term" | "Follow-up"`

async function runActionPlanAgent(transcript: string, actionItems: ActionItem[], decisions: string[]): Promise<ActionPlanAgentOutput> {
  const itemList = actionItems
    .map((a) => `[${a.id}] "${a.task}" — ${a.assignee} | Due: ${a.due} | Priority: ${a.priority}`)
    .join("\n")
  const raw = await callLLM(
    ACTION_PLAN_PROMPT,
    `Decisions:\n${decisions.map((d) => `- ${d}`).join("\n")}\n\nAction items:\n${itemList}\n\nTranscript:\n\n${transcript}`
  )
  const parsed = extractJSON(raw) as ActionPlanAgentOutput
  if (!Array.isArray(parsed.actionPlan)) parsed.actionPlan = []
  return parsed
}

// ─── Agent 6: Follow-up drafter ───────────────────────────────────────────────

const FOLLOWUP_PROMPT = `You are a follow-up communication agent. Draft messages for participants with tasks.

No preamble. No markdown. No explanation. Just the JSON.

Required shape:
{
  "followUps": [
    {
      "id": "fu-1",
      "recipient": "Full Name",
      "channel": "email",
      "subject": "subject line",
      "body": "professional message body (2-4 sentences)",
      "tasks": ["ai-1"],
      "urgency": "High"
    }
  ]
}

channel: "email" | "slack"
urgency: "High" | "Medium" | "Low"
Only create follow-ups for people with assigned tasks.`

async function runFollowUpAgent(transcript: string, actionItems: ActionItem[], participants: { name: string; role: string }[]): Promise<FollowUpAgentOutput> {
  const peopleWithTasks = participants
    .map((p) => {
      const myTasks = actionItems.filter((a) => a.assignee.toLowerCase() === p.name.toLowerCase())
      return `${p.name} (${p.role}): ${myTasks.map((t) => `[${t.id}] ${t.task} — due ${t.due}`).join(" | ") || "no tasks"}`
    })
    .join("\n")
  const raw = await callLLM(FOLLOWUP_PROMPT, `Participants and tasks:\n${peopleWithTasks}\n\nTranscript:\n\n${transcript}`)
  const parsed = extractJSON(raw) as FollowUpAgentOutput
  if (!Array.isArray(parsed.followUps)) parsed.followUps = []
  return parsed
}

// ─── Merger ───────────────────────────────────────────────────────────────────

function mergeResults(
  transcript: string,
  analysisResult: AgentResult<AnalysisAgentOutput>,
  blockerResult: AgentResult<BlockerAgentOutput>,
  sprintResult: AgentResult<SprintAgentOutput>,
  workflowResult: AgentResult<WorkflowAgentOutput>,
  actionPlanResult: AgentResult<ActionPlanAgentOutput>,
  followUpResult: AgentResult<FollowUpAgentOutput>,
  totalMs: number
): MeetingIntelligence {
  const analysis = analysisResult.data
  if (!analysis) {
    throw new Error(`Analysis agent failed: ${analysisResult.error ?? "unknown error"}`)
  }

  const sprintPlan = sprintResult.data?.sprintPlan ?? []
  const taggedItems = analysis.actionItems.map((item) => {
    const sprint = sprintPlan.find((s) => s.tasks.includes(item.id))
    return sprint ? { ...item, sprintId: sprint.id } : item
  })

  const secondaryAgents = [blockerResult, sprintResult, workflowResult, actionPlanResult, followUpResult]
  const allSucceeded = secondaryAgents.every((r) => r.success)

  const blockers   = blockerResult.data?.blockers     ?? []
  const workflow   = workflowResult.data?.workflow    ?? []
  const actionPlan = actionPlanResult.data?.actionPlan ?? []
  const followUps  = followUpResult.data?.followUps   ?? []

  console.log(
    `[orchestrator] done in ${totalMs}ms — analysis:${analysisResult.success} blocker:${blockerResult.success} sprint:${sprintResult.success} workflow:${workflowResult.success} actionPlan:${actionPlanResult.success} followup:${followUpResult.success}`,
    `| items:${taggedItems.length} blockers:${blockers.length} sprints:${sprintPlan.length} workflow:${workflow.length} actionPlan:${actionPlan.length} followUps:${followUps.length}`
  )

  return {
    title: analysis.title,
    summary: analysis.summary,
    processingTime: parseFloat((totalMs / 1000).toFixed(1)),
    actionItems: taggedItems,
    decisions: analysis.decisions ?? [],
    participants: analysis.participants ?? [],
    transcript,
    blockers,
    sprintPlan,
    workflow,
    actionPlan,
    followUps,
    agentVersion: AGENT_VERSION,
    analysisMode: allSucceeded ? "full" : "partial",
  }
}

// ─── Public orchestrator ──────────────────────────────────────────────────────

export async function orchestrate(transcript: string, memory?: MemoryBlock): Promise<MeetingIntelligence> {
  const globalStart = Date.now()

  const analysisResult = await runAgent("analysis", () => runAnalysisAgent(transcript, memory))

  const actionItems  = analysisResult.data?.actionItems  ?? []
  const participants = analysisResult.data?.participants ?? []
  const decisions    = analysisResult.data?.decisions    ?? []

  const [blockerResult, sprintResult, workflowResult, actionPlanResult, followUpResult] =
    await Promise.all([
      runAgent("blocker",      () => runBlockerAgent(transcript, actionItems)),
      runAgent("sprint",       () => runSprintAgent(actionItems)),
      runAgent("workflow",     () => runWorkflowAgent(actionItems)),
      runAgent("action-plan",  () => runActionPlanAgent(transcript, actionItems, decisions)),
      runAgent("followup",     () => runFollowUpAgent(transcript, actionItems, participants)),
    ])

  return mergeResults(
    transcript,
    analysisResult,
    blockerResult,
    sprintResult,
    workflowResult,
    actionPlanResult,
    followUpResult,
    Date.now() - globalStart
  )
}