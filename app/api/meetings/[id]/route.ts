/**
 * PATCH /api/meetings/:id
 * Persists AI chat patches back to Supabase.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { updateAnalysis } from "@/lib/storage"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const patch = await req.json()

    if (!patch || typeof patch !== "object") {
      return NextResponse.json({ error: "Invalid patch body" }, { status: 400 })
    }

    const ok = await updateAnalysis(id, patch, userId)

    if (!ok) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/meetings/:id]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}