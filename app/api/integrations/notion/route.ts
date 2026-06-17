/**
 * POST /api/integrations/notion
 * Body: { token: "secret_xxxx" }
 *
 * Saves a Notion Internal Integration Token for the authed user.
 * Users get this token from https://www.notion.so/my-integrations
 * after creating an integration and sharing it with their workspace pages.
 *
 * Notion integration tokens don't expire, so no refresh needed.
 *
 * GET /api/integrations/notion  — returns { connected: bool }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token, rootPageId } = await req.json()

  if (!token || !token.startsWith("secret_")) {
    return NextResponse.json(
      { error: "Invalid token. Notion integration tokens start with 'secret_'" },
      { status: 400 }
    )
  }

  // Verify the token works by calling Notion's /users/me
  const verifyRes = await fetch("https://api.notion.com/v1/users/me", {
    headers: {
      Authorization:    `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    },
  })

  if (!verifyRes.ok) {
    return NextResponse.json(
      { error: "Token verification failed. Make sure the token is valid and the integration has access to your workspace." },
      { status: 400 }
    )
  }

  const admin = createAdminSupabaseClient()
  const { error: dbError } = await admin
    .from("user_integrations")
    .upsert(
      {
        user_id:      userId,
        provider:     "notion",
        access_token: token,
        raw:          { rootPageId: rootPageId ?? null },
        updated_at:   new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )

  if (dbError) {
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 })
  }

  // Also store the root page ID in env-like fashion (scoped to user via DB)
  if (rootPageId) {
    await admin
      .from("user_integrations")
      .update({ raw: { rootPageId } })
      .eq("user_id", userId)
      .eq("provider", "notion")
  }

  return NextResponse.json({ ok: true, connected: true })
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from("user_integrations")
    .select("provider, updated_at")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .single()

  return NextResponse.json({ connected: !!data, connectedAt: data?.updated_at ?? null })
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminSupabaseClient()
  await admin
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "notion")

  return NextResponse.json({ ok: true, disconnected: true })
}
