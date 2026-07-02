import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Client } from "@notionhq/client"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { toMarkdown } from "@/lib/export"

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { analysis } = await req.json()

  if (!analysis) {
    return NextResponse.json(
      { error: "Missing meeting analysis." },
      { status: 400 }
    )
  }

  const admin = createAdminSupabaseClient()

  const { data: integration, error } = await admin
    .from("user_integrations")
    .select("access_token, raw")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .single()

  if (error || !integration) {
    return NextResponse.json(
      { error: "Notion is not connected." },
      { status: 400 }
    )
  }

  const notion = new Client({
    auth: integration.access_token,
  })

  const rootPageId = integration.raw?.rootPageId

  if (!rootPageId) {
    return NextResponse.json(
      {
        error:
          "No Root Page ID configured. Connect Notion again and choose a parent page.",
      },
      { status: 400 }
    )
  }

  try {
  const markdown = toMarkdown(analysis)

  const children =
    markdown.match(/[\s\S]{1,1900}/g)?.map((chunk) => ({
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          {
            type: "text" as const,
            text: {
              content: chunk,
            },
          },
        ],
      },
    })) ?? []

  const page = await notion.pages.create({
    parent: {
      type: "page_id",
      page_id: rootPageId,
    },
    properties: {
      title: {
        title: [
          {
            text: {
              content: analysis.title,
            },
          },
        ],
      },
    },
    children,
  })

  const pageUrl = `https://www.notion.so/${page.id.replace(/-/g, "")}`

  return NextResponse.json({
    ok: true,
    url: pageUrl,
  })
} catch (err) {
  console.error("Notion create page error:", err)

  return NextResponse.json(
    {
      error: err instanceof Error ? err.message : "Failed to create Notion page.",
    },
    { status: 500 }
  )
}
}