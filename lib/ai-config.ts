/**
 * AI Provider Configuration — Meetric
 *
 * All model strings live here.
 * Tuesday swap: change ACTIVE_TIER from "free" to "paid" — that's it.
 *
 * Both tiers use Qwen Cloud (dashscope-intl) with your QWEN_API_KEY.
 * Free tier:  qwen-plus (free quota) + qwen-turbo (free quota)
 * Paid tier:  qwen-max + qwen-turbo (coupon/paid credits)
 */

export type ProviderTier = "free" | "paid"

// ─── Change this one line on Tuesday ─────────────────────────────────────────
const ACTIVE_TIER: ProviderTier =
  (process.env.QWEN_COUPON_ACTIVE === "true" ? "paid" : "free") as ProviderTier

const BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
const getApiKey = () => process.env.QWEN_API_KEY ?? ""
const buildHeaders = (apiKey: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${apiKey}`,
})

// ─── Free tier — Qwen free-quota models ──────────────────────────────────────
// qwen-plus:  mid-size, generous free quota — used by all 6 agents
// qwen-turbo: fastest, free quota — used by legacy route + chat
const FREE_CONFIG = {
  baseUrl: BASE_URL,
  primaryModel: "qwen-plus",
  fastModel: "qwen-turbo",
  getApiKey,
  headers: buildHeaders,
}

// ─── Paid tier — best models once coupon is active ───────────────────────────
const PAID_CONFIG = {
  baseUrl: BASE_URL,
  primaryModel: "qwen-max",
  fastModel: "qwen-turbo",
  getApiKey,
  headers: buildHeaders,
}

// ─── Active config ────────────────────────────────────────────────────────────
export const AI_CONFIG = ACTIVE_TIER === "paid" ? PAID_CONFIG : FREE_CONFIG

export const {
  baseUrl: AI_BASE_URL,
  primaryModel: AI_PRIMARY_MODEL,
  fastModel: AI_FAST_MODEL,
  getApiKey: getAIApiKey,
  headers: getAIHeaders,
} = AI_CONFIG

if (typeof window === "undefined") {
  console.log(
    `[ai-config] tier:${ACTIVE_TIER} model:${AI_PRIMARY_MODEL} fast:${AI_FAST_MODEL} key:${getApiKey() ? "set" : "MISSING"}`
  )
}