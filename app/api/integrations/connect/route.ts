/**
 * GET /api/integrations/connect?provider=google
 *
 * Redirects the user to the OAuth2 consent screen for the given provider.
 * Currently supports: google (Calendar + email scope)
 *
 * Notion uses a different flow (paste token directly) — see /api/integrations/notion
 *
 * SETUP REQUIRED:
 *   1. Create a project at https://console.cloud.google.com
 *   2. Enable Google Calendar API
 *   3. Create OAuth 2.0 credentials (Web application)
 *   4. Add redirect URI: https://yourdomain.com/api/integrations/callback
 *   5. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 *
 * CSRF PROTECTION:
 *   The `state` param is a random nonce, NOT the userId. We store the nonce
 *   in an httpOnly cookie here, then verify it matches in /callback before
 *   trusting anything. The actual userId is read from the session in the
 *   callback, never from a query param an attacker could forge. See
 *   https://datatracker.ietf.org/doc/html/rfc6749#section-10.12
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { randomBytes } from "crypto"

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ")

export const OAUTH_STATE_COOKIE = "oauth_state"

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const provider = req.nextUrl.searchParams.get("provider")
  const baseUrl = req.nextUrl.origin

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ?? `${baseUrl}/api/integrations/callback`

    if (!clientId) {
      console.error("[integrations/connect] GOOGLE_CLIENT_ID not set")
      // Redirect with an error instead of returning raw JSON — the caller is
      // a top-level <a href> navigation, not a fetch(), so a JSON body here
      // would just render as text in the browser instead of showing the UI.
      return NextResponse.redirect(`${baseUrl}/integrations?error=not_configured`)
    }

    // Random nonce — unguessable, unrelated to userId. Stored httpOnly so
    // client-side JS (and therefore XSS) can't read or forge it either.
    const nonce = randomBytes(16).toString("hex")
    const cookieStore = await cookies()
    cookieStore.set(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // "lax" (not "strict") because this cookie must survive
                        // the top-level redirect coming back from accounts.google.com
      maxAge: 600,      // 10 minutes — plenty for a consent screen, short enough
                         // that a stale leftover cookie can't be replayed later
      path: "/api/integrations",
    })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline", // gets refresh token
      prompt: "consent",      // always show consent to get refresh token
      state: nonce,
    })

    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    )
  }

  return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
}