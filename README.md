markdown# Meetric — AI Meeting Intelligence

> **Global AI Hackathon with Qwen Cloud — Track 4: Autopilot Agent**

Meetric turns raw meeting transcripts into structured intelligence and then **acts on it** — drafting follow-ups, detecting blockers, planning sprints, and dispatching messages to email, Slack, and Notion, all with a human-in-the-loop approval checkpoint before anything is sent.

---

## What it does

Paste or upload a meeting transcript. Meetric runs a **6-agent pipeline on Qwen Cloud** and produces:

| Output | Agent |
|---|---|
| Summary, decisions, action items, participants | Agent 1 — Analysis (+ cross-session memory) |
| Blocker detection with severity + owner | Agent 2 — Blocker |
| Sprint plan with story points + velocity | Agent 3 — Sprint Planner |
| Dependency workflow as a DAG | Agent 4 — Workflow |
| Prioritised action plan with phases | Agent 5 — Action Plan |
| Drafted follow-up messages per recipient | Agent 6 — Follow-up |

Results appear in a 9-tab dashboard. An inline AI chat lets you edit any field — changes are patched back to the database in real time.

---

## Autopilot features (Track 4)

### Human-in-the-loop tool dispatch
Every follow-up draft has a **Review & Send** button. Clicking it opens an approval modal showing exactly which tool will be called and what data it will send. Only after clicking **Confirm & Send** does the agent execute the tool call. This is the HITL checkpoint required by Track 4.

### MCP tool layer (`lib/agents/tools.ts`)
After approval, the LLM runs an agentic tool-call loop using Qwen's function-calling API:

| Tool | Provider | Credentials |
|---|---|---|
| `send_email` | Resend API | App-level `RESEND_API_KEY` |
| `create_calendar_event` | Google Calendar API | Per-user OAuth2 (stored in Supabase) |
| `post_slack` | Slack Incoming Webhook | App-level `SLACK_WEBHOOK_URL` |
| `create_notion_page` | Notion API | Per-user integration token (stored in Supabase) |

For High-urgency follow-ups the agent automatically books a calendar check-in in addition to sending the message — no extra instruction needed.

### Cross-session memory (`lib/agents/memory.ts`)
Before each analysis run, Meetric fetches the user's last 5 meetings from Supabase and compresses them into a structured context block injected into Agent 1's system prompt. The agent can surface patterns like:

> "This is the third sprint in a row where the notification service has been flagged as a blocker owned by Priya."

---

## Architecture
┌─────────────────────────────────────────────────────────────────┐
│  Client                                                          │
│  Upload zone → Results dashboard (9 tabs + AI chat)             │
│                                    ↓ HITL approval modal        │
├─────────────────────────────────────────────────────────────────┤
│  API layer (Next.js App Router)                                  │
│  /api/analyze   /api/chat   /api/send-followup   /api/memory    │
├─────────────────────────────────────────────────────────────────┤
│  Orchestrator (lib/agents/orchestrator.ts)                       │
│  Agent 1 (serial) → Agents 2-6 (parallel, Promise.allSettled)   │
│  Analysis  Blocker  Sprint  Workflow  ActionPlan  FollowUp       │
├─────────────────────────────────────────────────────────────────┤
│  Tools / Infrastructure                                          │
│  Qwen Cloud (qwen-plus / qwen-max)   Supabase (PostgreSQL + RLS)│
│  Resend (email)   Google Calendar    Slack   Notion              │
│  Clerk (auth)                                                    │
└─────────────────────────────────────────────────────────────────┘

See [`public/architecture.svg`](public/architecture.svg) for the full diagram.

---

## Tech stack

- **Framework**: Next.js 15 (App Router, server components)
- **AI**: Qwen Cloud — `qwen-plus` (free tier) / `qwen-max` (paid), via `dashscope-intl` API
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Clerk
- **Email**: Resend
- **Language**: TypeScript

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/howelldevs/Meetric
cd Meetric
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

### 3. Database setup

Run the migrations in your Supabase SQL editor:

```bash
# Run in order:
supabase/migrations/20250616_user_integrations.sql
```

Or paste the SQL directly into the Supabase dashboard → SQL Editor.

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Connecting integrations

Go to `/integrations` after signing in:

- **Google Calendar** — click Connect, approve the OAuth screen. Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` and the callback URI `https://yourdomain.com/api/integrations/callback` added to your Google Cloud OAuth app.
- **Notion** — create an integration at [notion.so/my-integrations](https://www.notion.so/my-integrations), copy the `secret_` token, paste it in the Integrations page.
- **Slack** — create an Incoming Webhook at [api.slack.com/apps](https://api.slack.com/apps), set `SLACK_WEBHOOK_URL`.
- **Email** — verify your domain at [resend.com/domains](https://resend.com/domains), set `RESEND_API_KEY` + `EMAIL_FROM`.

All credentials are dry-run safe — if a key is missing, the tool logs the action and returns success so demos work without live credentials.

---

## Alibaba Cloud deployment

This project runs on Alibaba Cloud via the Qwen Cloud API (`dashscope-intl.aliyuncs.com`). See [`lib/ai-config.ts`](lib/ai-config.ts) for the API configuration.

**Proof of deployment**: see the screen recording in the submission for the backend running on Alibaba Cloud infrastructure.

---

## Project structure
lib/
ai-config.ts          # Qwen Cloud model config (free / paid tier swap)
storage.ts            # Supabase admin client, all DB operations
agents/
orchestrator.ts     # 6-agent pipeline
tools.ts            # MCP tool layer (email, calendar, Slack, Notion)
memory.ts           # Cross-session meeting memory
app/
api/
analyze/            # Agentic pipeline route
chat/               # AI chat + patch persistence
send-followup/      # HITL tool dispatch
memory/             # Cross-session memory endpoint
integrations/       # OAuth connect, callback, Notion token, status
results/[id]/         # Results dashboard page
integrations/         # Integrations settings page
upload/               # Transcript upload page
components/
results/
results-dashboard   # 9-tab results UI
follow-ups          # HITL approval flow
analysis-chat       # Inline AI chat panel
supabase/
migrations/           # SQL schema files
public/
architecture.svg      # System architecture diagram

---

## License

MIT — see [LICENSE](LICENSE)