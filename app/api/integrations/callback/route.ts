/**
 * GET /api/integrations/callback
 *
 * OAuth2 callback handler. Google redirects here after the user
 * approves the consent screen.
 *
 * Flow:
 *   1. Verify `state` matches the nonce we stored in a cookie during /connect
 *      (CSRF protection — see comment in connect/route.ts)
 *   2. Get userId from the Clerk session (NOT from the URL — that would be forgeable)
 *   3. Extract `code` from query params
 *   4. Exchange code for access_token + refresh_token
 *   5. Upsert into user_integrations in Supabase (service role)
 *   6. Redirect back to /integrations with ?connected=google
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { OAUTH_STATE_COOKIE } from "../connect/route"

export async function GET(req: NextRequest) {
  const baseUrl = req.nextUrl.origin
  const code = req.nextUrl.searchParams.get("code")
  const returnedState = req.nextUrl.searchParams.get("state")
  const oauthError = req.nextUrl.searchParams.get("error")

  // 1. Did Google itself report an error (user denied consent, etc.)?
  //    Check this first — before touching cookies/state — since this case
  //    has nothing to do with CSRF and deserves its own message.
  if (oauthError) {
    console.error("[integrations/callback] OAuth error from provider:", oauthError)
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent(oauthError)}`
    )
  }

  if (!code || !returnedState) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=missing_params`)
  }

  // 2. CSRF check — the nonce we handed out in /connect must match what
  //    came back. Read-then-delete: a stored state should only ever be
  //    consumable once.
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(OAUTH_STATE_COOKIE)

  if (!expectedState || expectedState !== returnedState) {
    console.error("[integrations/callback] state mismatch — possible CSRF or expired flow")
    return NextResponse.redirect(`${baseUrl}/integrations?error=invalid_state`)
  }

  // 3. Get the user from the session, never from a query param. This is the
  //    actual identity check — state alone only proves "this browser started
  //    a flow we issued," not "this is user X."
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=session_expired`)
  }

  // 4. Exchange auth code for tokens
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${baseUrl}/api/integrations/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error("[integrations/callback] Token exchange failed:", err)
    return NextResponse.redirect(`${baseUrl}/integrations?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  // tokens: { access_token, refresh_token, expires_in, token_type, scope }

  if (!tokens.refresh_token) {
    // Happens if the user previously granted consent and Google decides not
    // to issue a new refresh_token on this pass. We still proceed (the old
    // refresh_token in the DB, if any, may still be valid) but it's worth
    // knowing about — silent expiry an hour later is exactly bug #1 from
    // the original review.
    console.warn(
      `[integrations/callback] No refresh_token returned for user ${userId} — ` +
        `existing stored refresh_token (if any) will be preserved by the upsert below ` +
        `only if you explicitly coalesce it; verify this against your schema.`
    )
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const admin = createAdminSupabaseClient()
  const { error: dbError } = await admin.from("user_integrations").upsert(
    {
      user_id: userId,
      provider: "google",
      access_token: tokens.access_token,
      // Don't overwrite a previously-stored refresh_token with null if Google
      // didn't send a new one this time around.
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      raw: tokens,
      updated_at: new Date().toISOString(),
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