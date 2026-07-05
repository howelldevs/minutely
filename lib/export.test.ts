import { describe, expect, it } from "vitest"
import { toPlainText } from "./export"
import type { MeetingAnalysis } from "@/types/analysis"

describe("toPlainText", () => {
  it("returns plain text without markdown syntax", () => {
    const analysis: MeetingAnalysis = {
      title: "Sprint Sync",
      summary: "Discussed launch readiness.",
      processingTime: 12,
      actionItems: [
        {
          id: "a1",
          task: "Ship release",
          assignee: "Ava",
          due: "Tomorrow",
          priority: "High",
        },
      ],
      decisions: ["Release on Friday"],
      participants: [{ name: "Ava", role: "PM" }],
      transcript: "",
    }

    const result = toPlainText(analysis)

    expect(result).toContain("Sprint Sync")
    expect(result).toContain("Summary")
    expect(result).toContain("Discussed launch readiness")
    expect(result).not.toMatch(/^#/m)
    expect(result).not.toContain("- [ ]")
    expect(result).not.toContain("**")
  })
})
