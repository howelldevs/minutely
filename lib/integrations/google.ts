/**
 * lib/integrations/google.ts
 *
 * Use this anywhere you're about to call a Google API (Calendar, etc.) on
 * behalf of a user. Handles the refresh-token dance transparently so callers
 * never have to think about expiry.
 *
 * Usage:
 *   const accessToken = await getValidGoogleAccessToken(userId)
 *   if (!accessToken) {
 *     // user isn't connected, or refresh failed and they need to reconnect
 *   }
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin"

interface GoogleIntegrationRow {
  access_token: string
  refresh_token: string | null
  expires_at: string | null
}

const EXPIRY_BUFFER_MS = 60_000 // refresh 1 minute early to avoid races mid-request

export async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient()

  const { data, error } = await admin
    .from("user_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle<GoogleIntegrationRow>()

  if (error) {
    console.error("[google] failed to load integration row:", error)
    return null
  }
  if (!data) return null // not connected

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0
  const isExpired = Date.now() >= expiresAt - EXPIRY_BUFFER_MS

  if (!isExpired) {
    return data.access_token
  }

  if (!data.refresh_token) {
    // Token expired and we have nothing to refresh with — the user granted
    // consent without offline access, or it was never stored. Only real fix
    // is for them to reconnect (which re-triggers prompt=consent).
    console.warn(`[google] access_token expired for user ${userId} with no refresh_token`)
    return null
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error(`[google] refresh failed for user ${userId}:`, err)
    // Common cause: refresh_token was revoked (user removed access in their
    // Google account, or it's simply too old). Caller should treat this the
    // same as "not connected" and prompt the user to reconnect.
    return null
  }

  const refreshed = await tokenRes.json()
  // refreshed: { access_token, expires_in, scope, token_type } — note: Google
  // does NOT return a new refresh_token on a refresh-grant call, so we keep
  // the existing one.

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

  const { error: updateError } = await admin
    .from("user_integrations")
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google")

  if (updateError) {
    // We still have a valid token in hand even though the DB write failed —
    // return it so this request succeeds, but log loudly since the next
    // request will redo this refresh unnecessarily until the DB is healthy.
    console.error(`[google] failed to persist refreshed token for user ${userId}:`, updateError)
  }

  return refreshed.access_token
}