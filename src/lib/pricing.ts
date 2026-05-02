import type { Usage } from "../types";

type ModelPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok?: number;
};

// Public list rates as of late 2025. Used only for the cache page's cost
// estimate — OpenRouter reports authoritative cost in its usage payload, so
// estimates here are a fallback for direct Anthropic / OpenAI usage.
const PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  "claude-sonnet-4-5": { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  "anthropic/claude-sonnet-4.6": { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  "gpt-4.1": { inputPerMTok: 2, outputPerMTok: 8 },
};

export function estimateCostUsd(model: string, usage: Usage): number | null {
  if (typeof usage.reportedCostUsd === "number") return usage.reportedCostUsd;
  const p = PRICING[model];
  if (!p) return null;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const billedInput = Math.max(0, usage.inputTokens - cacheRead);
  const inputCost = (billedInput * p.inputPerMTok) / 1_000_000;
  const outputCost = (usage.outputTokens * p.outputPerMTok) / 1_000_000;
  const cacheCost = p.cacheReadPerMTok ? (cacheRead * p.cacheReadPerMTok) / 1_000_000 : 0;
  return inputCost + outputCost + cacheCost;
}

export function formatCostUsd(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return "—";
  if (usd === 0) return "$0.00";
  if (usd < 0.005) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}
