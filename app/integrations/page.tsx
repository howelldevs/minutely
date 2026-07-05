"use client"

/**
 * /integrations — User-facing integrations settings page
 *
 * Shows connection status for all supported tools and provides:
 *   - Google Calendar: one-click OAuth2 connect button
 *   - Notion: paste-your-token form
 *   - Slack: shows whether the app admin has configured a webhook
 *   - Email (Resend): shows whether the app admin has set up sending
 */

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { FaGoogle, FaN, FaSlack } from "react-icons/fa6";

import { FileText, MessageSquare, Mail,
  CheckCircle2, XCircle, Loader2, ExternalLink, Link2Off,
  ArrowLeftCircle,
} from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import Link from "next/link"

interface IntegrationStatus {
  google: boolean
  notion: boolean
  slack:  boolean
  resend: boolean
}

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
      <CheckCircle2 className="h-3 w-3" /> Connected
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted border px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <XCircle className="h-3 w-3" /> Not connected
    </span>
  )
}

/**
 * Shared header row for each integration card: icon + title + description
 * on the left, status badge on the right. Pulled out once so the responsive
 * fix (wrap on narrow screens instead of squeezing) only needs to live in
 * one place.
 */
function IntegrationHeader({
  icon,
  iconBg,
  title,
  description,
  connected,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  connected: boolean
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`rounded-2xl p-2.5 shrink-0 ${iconBg}`}>{icon}</div>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground break-words">{description}</p>
        </div>
      </div>
      <StatusBadge connected={connected} />
    </div>
  )
}

// ── Inner component that uses useSearchParams ──────────────────────────────────
// Must be wrapped in <Suspense> at the page level for Next.js static export.

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const [status, setStatus]               = useState<IntegrationStatus | null>(null)
  const [loading, setLoading]             = useState(true)
  const [notionToken, setNotionToken]     = useState("")
  const [notionPage, setNotionPage]       = useState("")
  const [savingNotion, setSavingNotion]   = useState(false)
  const [notionError, setNotionError]     = useState("")
  const [notionSuccess, setNotionSuccess] = useState(false)

  const connected = searchParams.get("connected")
  const error     = searchParams.get("error")

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => r.json())
      .then((data) => { setStatus(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [connected]) // re-fetch after OAuth redirect

  const handleNotionSave = async () => {
    if (!notionToken) return
    setSavingNotion(true)
    setNotionError("")
    setNotionSuccess(false)

    const res = await fetch("/api/integrations/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: notionToken, rootPageId: notionPage || undefined }),
    })

    const data = await res.json()
    setSavingNotion(false)

    if (res.ok && data.ok) {
      setNotionSuccess(true)
      setNotionToken("")
      fetch("/api/integrations/status").then((r) => r.json()).then(setStatus)
    } else {
      setNotionError(data.error ?? "Failed to save token")
    }
  }

  const handleDisconnectNotion = async () => {
    await fetch("/api/integrations/notion", { method: "DELETE" })
    fetch("/api/integrations/status").then((r) => r.json()).then(setStatus)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/*
        my-20 (80px top+bottom, unconditional) pushed real content below the
        fold on mobile. Scaled down on small screens, full size from sm: up.
      */}
      <div className="my-15 sm:my-20">
        <Navbar />
      </div>

      <div>
        {/*
          router.back() silently does nothing if there's no history entry
          (e.g. user opened this page directly via bookmark/shared link).
          A real href always works.
        */}
        <Link
          href="/results"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftCircle className="h-5 w-5" /> Back to Results
        </Link>
        <h1 className="text-2xl font-bold mt-3">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your tools so Meetric can send follow-ups, book meetings, and sync notes automatically.
        </p>
      </div>

      {connected && (
        <div className="rounded-2xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 break-words">
          ✓ {connected === "google" ? "Google Calendar" : connected} connected successfully.
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 break-words">
          Connection failed: {error.replace(/_/g, " ")}. Please try again.
        </div>
      )}

      {/* ── Google Calendar ── */}
      <div className="rounded-3xl border bg-card p-4 sm:p-6 space-y-4">
        <IntegrationHeader
          icon={<FaGoogle className="h-5 w-5 text-blue-400" />}
          iconBg="bg-blue-500/10"
          title="Google Calendar"
          description="Auto-book follow-up meetings and sprint kickoffs"
          connected={status?.google ?? false}
        />

        {status?.google ? (
          <a
            href="/api/integrations/connect?provider=google"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link2Off className="h-3.5 w-3.5" /> Reconnect
          </a>
        ) : (
          <a
            href="/api/integrations/connect?provider=google"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Connect Google Account
          </a>
        )}

        <p className="text-xs text-muted-foreground break-words">
          Requires <code className="break-all">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="break-all">GOOGLE_CLIENT_SECRET</code> in your environment.{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Create credentials →
          </a>
        </p>
      </div>

      {/* ── Notion ── */}
      <div className="rounded-3xl border bg-card p-4 sm:p-6 space-y-4">
        <IntegrationHeader
          icon={<FaN className="h-5 w-5 text-gray-400" />}
          iconBg="bg-gray-500/10"
          title="Notion"
          description="Save meeting summaries and action plans as Notion pages"
          connected={status?.notion ?? false}
        />

        {status?.notion ? (
          <div className="space-y-2">
            <p className="text-sm text-green-400">Integration token saved.</p>
            <button
              onClick={handleDisconnectNotion}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Link2Off className="h-3.5 w-3.5" /> Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Integration Token
              </label>
              <input
                type="password"
                value={notionToken}
                onChange={(e) => setNotionToken(e.target.value)}
                placeholder="secret_xxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Root Page ID <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <input
                type="text"
                value={notionPage}
                onChange={(e) => setNotionPage(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {notionError && <p className="text-xs text-red-400 break-words">{notionError}</p>}
            {notionSuccess && <p className="text-xs text-green-400">✓ Notion connected!</p>}
            <button
              onClick={handleNotionSave}
              disabled={!notionToken || savingNotion}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {savingNotion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save Token
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground break-words">
          Create an integration at{" "}
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            notion.so/my-integrations
          </a>{" "}
          then share your pages with it.
        </p>
      </div>

      {/* ── Slack ── */}
      <div className="rounded-3xl border bg-card p-4 sm:p-6 space-y-3">
        <IntegrationHeader
          icon={<FaSlack className="h-5 w-5 text-yellow-400" />}
          iconBg="bg-yellow-500/10"
          title="Slack"
          description="Post blocker alerts to your team channels"
          connected={status?.slack ?? false}
        />
        <p className="text-xs text-muted-foreground break-words">
          Configured via <code className="break-all">SLACK_WEBHOOK_URL</code> in your environment
          (app-level, not per-user).{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Create Slack webhook →
          </a>
        </p>
      </div>

      {/* ── Email (Resend) ── */}
      <div className="rounded-3xl border bg-card p-4 sm:p-6 space-y-3">
        <IntegrationHeader
          icon={<Mail className="h-5 w-5 text-purple-400" />}
          iconBg="bg-purple-500/10"
          title="Email"
          description="Send follow-up emails via Resend (no per-user setup needed)"
          connected={status?.resend ?? false}
        />
        <p className="text-xs text-muted-foreground break-words">
          Configured via <code className="break-all">RESEND_API_KEY</code> and{" "}
          <code className="break-all">EMAIL_FROM</code> in your environment. Verify your sending domain
          at{" "}
          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            resend.com/domains →
          </a>
        </p>
      </div>
    </div>
  )
}

// ── Page export — wraps the content in Suspense for useSearchParams ────────────

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  )
}