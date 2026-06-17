"use client"

/**
 * components/results/follow-ups.tsx
 *
 * Slack + Calendar only follow-up system.
 * Email support removed completely.
 */

import { useState } from "react"
import {
  MessageCircle,
  Clock3,
  SendHorizonal,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  AlertTriangle,
  X,
  CalendarDays,
} from "lucide-react"

import type { FollowUp } from "@/types/analysis"
import Link from "next/link"

interface Props {
  followUps: FollowUp[]
  meetingTitle?: string
}

type SendStatus =
  | "idle"
  | "reviewing"
  | "sending"
  | "sent"
  | "failed"

interface FollowUpState {
  status: SendStatus
  errorMsg?: string
  toolResults?: Array<{
    tool: string
    success: boolean
    data: Record<string, unknown>
    error?: string
  }>
}

function UrgencyBadge({
  urgency,
}: {
  urgency: string
}) {
  const colour =
    urgency === "High"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : urgency === "Medium"
      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      : "bg-green-500/10 text-green-400 border-green-500/20"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${colour}`}
    >
      <Clock3 className="h-3 w-3" />
      {urgency}
    </span>
  )
}

function ChannelBadge({
  channel,
}: {
  channel: string
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      <MessageCircle className="h-3 w-3" />
      {channel}
    </span>
  )
}

function ReviewModal({
  followUp,
  onConfirm,
  onCancel,
}: {
  followUp: FollowUp
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>

            <div>
              <h3 className="text-base font-semibold">
                Human Approval Required
              </h3>

              <p className="text-sm text-muted-foreground">
                Review this AI-generated action before dispatch
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-6">
          <div className="flex flex-wrap gap-2">
            <ChannelBadge channel={followUp.channel} />

            <UrgencyBadge urgency={followUp.urgency} />
          </div>

          <div className="grid gap-5">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Recipient
              </p>

              <p className="text-sm font-medium">
                {followUp.recipient}
              </p>
            </div>

            {followUp.subject && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Subject
                </p>

                <p className="text-sm">
                  {followUp.subject}
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Slack Message
              </p>

              <div className="rounded-3xl border bg-muted/30 p-5 text-sm leading-7 text-muted-foreground">
                {followUp.body}
              </div>
            </div>

            {followUp.tasks.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Related Tasks
                </p>

                <div className="flex flex-wrap gap-2">
                  {followUp.tasks.map((task) => (
                    <span
                      key={task}
                      className="rounded-full bg-muted px-3 py-1 text-xs"
                    >
                      {task}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-4 w-4 text-primary" />

                <div className="text-sm text-muted-foreground">
                  This action will:
                  <ul className="mt-2 space-y-1">
                    <li>
                      • Post a Slack notification
                    </li>

                    {followUp.urgency ===
                      "High" && (
                      <li>
                        • Schedule a calendar
                        follow-up
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border/60 px-6 py-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <SendHorizonal className="h-4 w-4" />
            Confirm & Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FollowUpsPanel({
  followUps,
  meetingTitle = "Meeting",
}: Props) {
  const [states, setStates] =
    useState<Record<string, FollowUpState>>(
      () =>
        Object.fromEntries(
          followUps.map((f) => [
            f.id,
            { status: "idle" },
          ])
        )
    )

  const [reviewing, setReviewing] =
    useState<FollowUp | null>(null)

  const setState = (
    id: string,
    update: Partial<FollowUpState>
  ) =>
    setStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...update,
      },
    }))

  const handleSendClick = (
    fu: FollowUp
  ) => {
    setState(fu.id, {
      status: "reviewing",
    })

    setReviewing(fu)
  }

  const handleCancelReview = () => {
    if (reviewing) {
      setState(reviewing.id, {
        status: "idle",
      })
    }

    setReviewing(null)
  }

  const handleConfirmSend =
    async () => {
      if (!reviewing) return

      const fu = reviewing

      setReviewing(null)

      setState(fu.id, {
        status: "sending",
      })

      try {
        const res = await fetch(
          "/api/send-followup",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              followUp: fu,
              meetingTitle,
            }),
          }
        )

        const data = await res.json()

        if (res.ok && data.ok) {
          setState(fu.id, {
            status: "sent",
            toolResults:
              data.toolResults,
          })
        } else {
          setState(fu.id, {
            status: "failed",
            errorMsg:
              data.error ??
              "Dispatch failed",
          })
        }
      } catch (err) {
        setState(fu.id, {
          status: "failed",
          errorMsg:
            err instanceof Error
              ? err.message
              : "Network error",
        })
      }
    }

  return (
    <>
      {reviewing && (
        <ReviewModal
          followUp={reviewing}
          onConfirm={
            handleConfirmSend
          }
          onCancel={
            handleCancelReview
          }
        />
      )}

      <div className="rounded-[2rem] border border-border/60 bg-card/60 p-7 backdrop-blur-xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-semibold">
              AI Follow-ups
            </h2>

            <p className="text-sm text-muted-foreground">
              Human-reviewed Slack and
              calendar actions
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-5">
          {followUps.map((message) => {
            const s =
              states[message.id] ?? {
                status: "idle",
              }

            const isSent =
              s.status === "sent"

            const isFailed =
              s.status === "failed"

            const isSending =
              s.status === "sending"

            return (
              <div
                key={message.id}
                className={`rounded-[2rem] border p-6 transition-all duration-300 ${
                  isSent
                    ? "border-green-500/20 bg-green-500/5"
                    : isFailed
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-border/60 bg-background/60"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <ChannelBadge
                        channel={
                          message.channel
                        }
                      />

                      <UrgencyBadge
                        urgency={
                          message.urgency
                        }
                      />

                      {message.urgency ===
                        "High" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                          <CalendarDays className="h-3 w-3" />
                          Calendar
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">
                        {message.subject}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {message.body}
                      </p>
                    </div>

                    {message.tasks.length >
                      0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.tasks.map(
                          (task) => (
                            <span
                              key={task}
                              className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                            >
                              {task}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* Tool Results */}
                    {s.toolResults &&
  s.toolResults.length > 0 && (
    <div className="space-y-2 border-t border-border/50 pt-4">
      {s.toolResults.map((tr, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {tr.success ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            )}
            <span className="font-medium">
              {tr.tool === "create_calendar_event"
                ? "Google Calendar"
                : tr.tool === "post_slack"
                ? "Slack"
                : tr.tool}
            </span>
            {tr.error && <span>— {tr.error}</span>}
          </div>

         
          {tr.success &&
  tr.tool === "create_calendar_event" &&
  (tr.data as Record<string, unknown>)?.htmlLink && (
    <a
    href={(tr.data as Record<string, unknown>).htmlLink as string}
    target="_blank"
    rel="noreferrer"
    className="ml-5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
  >
      <CalendarDays className="h-3 w-3" />
      View in Google Calendar →
    </a>
  )}

          {/* Slack dry-run note */}
          {tr.success &&
            tr.tool === "post_slack" &&
            (tr.data as Record<string, unknown>)?.dryRun && (
              <p className="ml-5 text-xs text-yellow-400">
                ⚠ Dry run — add SLACK_WEBHOOK_URL to send for real
              </p>
            )}
        </div>
      ))}
    </div>
  )}

                    {isFailed &&
                      s.errorMsg && (
                        <p className="text-xs text-red-400">
                          {
                            s.errorMsg
                          }
                        </p>
                      )}

                      
                  </div>

                  {/* Right */}
                  <div className="flex shrink-0 flex-col items-end gap-4">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Recipient
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {
                          message.recipient
                        }
                      </p>
                    </div>

                    {isSent ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-xs font-medium text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Sent
                      </div>
                    ) : isFailed ? (
                      <button
                        onClick={() =>
                          setState(
                            message.id,
                            {
                              status:
                                "idle",
                              errorMsg:
                                undefined,
                            }
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        <XCircle className="h-4 w-4" />
                        Retry
                      </button>
                    ) : isSending ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          handleSendClick(
                            message
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <Eye className="h-4 w-4" />
                        Review & Send
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}