import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Client } from "@notionhq/client"
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints/common"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { toMarkdown } from "@/lib/export"

const MAX_BLOCKS_PER_REQUEST = 100

type NotionBlock = BlockObjectRequest

function asNotionBlock(value: Record<string, unknown>): BlockObjectRequest {
  return value as unknown as BlockObjectRequest
}

function toRichText(content: string) {
  return [{ type: "text" as const, text: { content } }]
}

function toParagraphBlock(content: string): BlockObjectRequest {
  return asNotionBlock({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: toRichText(content),
    },
  })
}

function toHeadingBlock(
  content: string,
  level: 1 | 2 | 3 | 4 | 5 | 6
): BlockObjectRequest {
  const richText = toRichText(content)

  switch (level) {
    case 1:
      return asNotionBlock({
        object: "block" as const,
        type: "heading_1" as const,
        heading_1: { rich_text: richText, is_toggleable: false },
      })
    case 2:
      return asNotionBlock({
        object: "block" as const,
        type: "heading_2" as const,
        heading_2: { rich_text: richText, is_toggleable: false },
      })
    case 3:
      return asNotionBlock({
        object: "block" as const,
        type: "heading_3" as const,
        heading_3: { rich_text: richText, is_toggleable: false },
      })
    case 4:
      return asNotionBlock({
        object: "block" as const,
        type: "heading_4" as const,
        heading_4: { rich_text: richText, is_toggleable: false },
      })
    case 5:
      return asNotionBlock({
        object: "block" as const,
        type: "heading_5" as const,
        heading_5: { rich_text: richText, is_toggleable: false },
      })
    default:
      return asNotionBlock({
        object: "block" as const,
        type: "heading_6" as const,
        heading_6: { rich_text: richText, is_toggleable: false },
      })
  }
}

function toListBlock(
  content: string,
  type: "bulleted_list_item" | "numbered_list_item"
): BlockObjectRequest {
  const richText = toRichText(content)

  if (type === "bulleted_list_item") {
    return asNotionBlock({
      object: "block" as const,
      type: "bulleted_list_item" as const,
      bulleted_list_item: { rich_text: richText },
    })
  }

  return asNotionBlock({
    object: "block" as const,
    type: "numbered_list_item" as const,
    numbered_list_item: { rich_text: richText },
  })
}

function toDividerBlock(): BlockObjectRequest {
  return asNotionBlock({
    object: "block" as const,
    type: "divider" as const,
    divider: {},
  })
}

function parseMarkdownToBlocks(markdown: string): NotionBlock[] {
  const blocks: NotionBlock[] = []

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) continue

    if (/^#{1,6}\s+/.test(line)) {
      const match = line.match(/^(#{1,6})\s+(.*)$/)
      if (!match) continue

      const level = Math.min(match[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6
      blocks.push(toHeadingBlock(match[2].trim(), level))
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      blocks.push(toListBlock(line.replace(/^[-*]\s+/, ""), "bulleted_list_item"))
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      blocks.push(toListBlock(line.replace(/^\d+\.\s+/, ""), "numbered_list_item"))
      continue
    }

    if (/^---\s*$/.test(line)) {
      blocks.push(toDividerBlock())
      continue
    }

    blocks.push(toParagraphBlock(line))
  }

  return blocks
}

function chunkBlocks(blocks: NotionBlock[], size: number) {
  const chunks: NotionBlock[][] = []

  for (let i = 0; i < blocks.length; i += size) {
    chunks.push(blocks.slice(i, i + size))
  }

  return chunks
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  const notion = new Client({ auth: integration.access_token })

  const rootPageId = integration.raw?.rootPageId

  if (!rootPageId || typeof rootPageId !== "string") {
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
    const allBlocks = parseMarkdownToBlocks(markdown)
    const batches = chunkBlocks(allBlocks, MAX_BLOCKS_PER_REQUEST)

    const page = await notion.pages.create({
      parent: { type: "page_id", page_id: rootPageId },
      properties: {
        title: {
          title: [{ text: { content: analysis.title || "Meeting Analysis" } }],
        },
      },
      children: batches[0] ?? [],
    })

    for (let i = 1; i < batches.length; i += 1) {
      await notion.blocks.children.append({
        block_id: page.id,
        children: batches[i],
      })
    }

    const pageUrl = `https://www.notion.so/${page.id.replace(/-/g, "")}`

    return NextResponse.json({ ok: true, url: pageUrl })
  } catch (err) {
    console.error("Notion create page error:", err)

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create Notion page.",
      },
      { status: 500 }
    )
  }
}