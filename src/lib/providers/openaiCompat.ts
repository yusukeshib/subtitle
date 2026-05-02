import type { Usage } from "../../types";
import { httpErrorFromResponse, type StreamParams, type StreamResult } from "./types";

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  // OpenRouter extension — when the request opts into usage accounting,
  // returns the authoritative cost in USD.
  cost?: number;
  // OpenAI cached prompt tokens (when using their prompt cache).
  prompt_tokens_details?: { cached_tokens?: number };
};

function parseUsage(u: OpenAIUsage): Usage | null {
  if (typeof u.prompt_tokens !== "number" && typeof u.completion_tokens !== "number") {
    return null;
  }
  const usage: Usage = {
    inputTokens: u.prompt_tokens ?? 0,
    outputTokens: u.completion_tokens ?? 0,
  };
  const cached = u.prompt_tokens_details?.cached_tokens;
  if (typeof cached === "number" && cached > 0) usage.cacheReadTokens = cached;
  if (typeof u.cost === "number") usage.reportedCostUsd = u.cost;
  return usage;
}

type Endpoint = {
  url: string;
  label: string;
  extraHeaders?: Record<string, string>;
};

const ENDPOINTS: Record<"openai" | "openrouter", Endpoint> = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    label: "OpenAI",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    label: "OpenRouter",
    extraHeaders: {
      "HTTP-Referer": "https://github.com/yusuke/jimaku",
      "X-Title": "Jimaku",
    },
  },
};

export async function streamOpenAICompat(p: StreamParams): Promise<StreamResult> {
  if (p.config.id === "anthropic") {
    throw new Error("streamOpenAICompat called with anthropic config");
  }
  const ep = ENDPOINTS[p.config.id];
  const isOpenRouter = p.config.id === "openrouter";
  const body: Record<string, unknown> = {
    model: p.config.model,
    max_tokens: p.maxTokens,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: p.systemPrompt },
      { role: "user", content: p.userContent },
    ],
  };
  // OpenRouter returns cost in the usage payload only when explicitly asked.
  if (isOpenRouter) body.usage = { include: true };
  const res = await fetch(ep.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${p.config.apiKey}`,
      ...(ep.extraHeaders ?? {}),
    },
    body: JSON.stringify(body),
    signal: p.signal,
  });
  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => "");
    throw httpErrorFromResponse(ep.label, res, err);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let acc = "";
  let usage: Usage | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();
          if (!dataStr || dataStr === "[DONE]") continue;
          try {
            const d = JSON.parse(dataStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
              usage?: OpenAIUsage;
              error?: { message?: string };
            };
            if (d.error?.message) {
              throw new Error(`${ep.label} stream error: ${d.error.message}`);
            }
            const text = d.choices?.[0]?.delta?.content ?? "";
            if (text) {
              acc += text;
              p.onTextDelta(text);
            }
            if (d.usage) {
              const parsed = parseUsage(d.usage);
              if (parsed) usage = parsed;
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes("stream error")) throw e;
          }
        }
        sep = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!acc) throw new Error(`empty response from ${ep.label}`);
  return { text: acc, usage };
}
