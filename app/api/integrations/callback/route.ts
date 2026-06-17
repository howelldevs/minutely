/**
 * GET /api/integrations/callback
 *
 * OAuth2 callback handler. Google redirects here after the user
 * approves the consent screen.
 *
 * Flow:
 *   1. Extract code + state (userId:provider) from query params
 *   2. Exchange code for access_token + refresh_token
 *   3. Upsert into user_integrations in Supabase (service role)
 *   4. Redirect back to /integrations with ?connected=google
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")   // "userId:provider"
  const error = req.nextUrl.searchParams.get("error")

  const baseUrl = req.nextUrl.origin

  if (error) {
    console.error("[integrations/callback] OAuth error:", error)
    return NextResponse.redirect(`${baseUrl}/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=missing_params`)
  }

  const [userId, provider] = state.split(":")
  if (!userId || provider !== "google") {
    return NextResponse.redirect(`${baseUrl}/integrations?error=bad_state`)
  }

  // Exchange auth code for tokens
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${baseUrl}/api/integrations/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error("[integrations/callback] Token exchange failed:", err)
    return NextResponse.redirect(`${baseUrl}/integrations?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  // tokens: { access_token, refresh_token, expires_in, token_type, scope }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const admin = createAdminSupabaseClient()
  const { error: dbError } = await admin
    .from("user_integrations")
    .upsert(
      {
        user_id:       userId,
        provider:      "google",
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at:    expiresAt,
        scope:         tokens.scope ?? null,
        raw:           tokens,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )

  if (dbError) {
    console.error("[integrations/callback] DB upsert failed:", dbError)
    return NextResponse.redirect(`${baseUrl}/integrations?error=db_error`)
  }

  console.log(`[integrations/callback] Connected Google for user ${userId}`)
  return NextResponse.redirect(`${baseUrl}/integrations?connected=google`)
}
