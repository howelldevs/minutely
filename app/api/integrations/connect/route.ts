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
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ")

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const provider = req.nextUrl.searchParams.get("provider")

  if (provider === "google") {
    const clientId    = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ??
      `${req.nextUrl.origin}/api/integrations/callback`

    if (!clientId) {
      return NextResponse.json(
        { error: "GOOGLE_CLIENT_ID not set. See /docs/integrations-setup.md" },
        { status: 500 }
      )
    }

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: "code",
      scope:         GOOGLE_SCOPES,
      access_type:   "offline",   // gets refresh token
      prompt:        "consent",   // always show consent to get refresh token
      state:         `${userId}:google`,
    })

    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    )
  }

  return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
}
