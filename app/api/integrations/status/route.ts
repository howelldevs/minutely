/**
 * GET /api/integrations/status
 *
 * Returns which integrations the authed user has connected.
 * Used by the Integrations settings page and the follow-ups panel
 * to know which send buttons to enable.
 *
 * Response: { google: bool, notion: bool, slack: bool, resend: bool }
 */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: rows } = await admin
    .from("user_integrations")
    .select("provider")
    .eq("user_id", userId)

  const connected = new Set((rows ?? []).map((r: { provider: string }) => r.provider))

  return NextResponse.json({
    google: connected.has("google"),
    notion: connected.has("notion"),
    // Slack and email are app-level (env vars), not per-user
    slack:  !!process.env.SLACK_WEBHOOK_URL,
    resend: !!process.env.RESEND_API_KEY,
  })
}
