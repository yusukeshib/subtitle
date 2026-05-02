import type { Usage } from "../../types";
import { httpErrorFromResponse, type StreamParams, type StreamResult } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

function mergeUsage(into: Usage, src: AnthropicUsage) {
  if (typeof src.input_tokens === "number") into.inputTokens = src.input_tokens;
  if (typeof src.output_tokens === "number") into.outputTokens = src.output_tokens;
  if (typeof src.cache_read_input_tokens === "number") {
    into.cacheReadTokens = src.cache_read_input_tokens;
  }
  if (typeof src.cache_creation_input_tokens === "number") {
    into.cacheCreationTokens = src.cache_creation_input_tokens;
  }
}

export async function streamAnthropic(p: StreamParams): Promise<StreamResult> {
  const body = {
    model: p.config.model,
    max_tokens: p.maxTokens,
    stream: true,
    system: [{ type: "text", text: p.systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: p.userContent }],
  };
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": p.config.apiKey,
      "anthropic-version": API_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
    signal: p.signal,
  });
  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => "");
    throw httpErrorFromResponse("Anthropic", res, err);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let acc = "";
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let sawUsage = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        let eventType = "";
        let dataStr = "";
        for (const l of raw.split("\n")) {
          if (l.startsWith("event:")) eventType = l.slice(6).trim();
          else if (l.startsWith("data:")) dataStr = l.slice(5).trim();
        }
        if (eventType === "content_block_delta" && dataStr) {
          try {
            const d = JSON.parse(dataStr) as { delta?: { text?: string } };
            const text = d.delta?.text ?? "";
            if (text) {
              acc += text;
              p.onTextDelta(text);
            }
          } catch {}
        } else if (eventType === "message_start" && dataStr) {
          try {
            const d = JSON.parse(dataStr) as { message?: { usage?: AnthropicUsage } };
            if (d.message?.usage) {
              mergeUsage(usage, d.message.usage);
              sawUsage = true;
            }
          } catch {}
        } else if (eventType === "message_delta" && dataStr) {
          try {
            const d = JSON.parse(dataStr) as { usage?: AnthropicUsage };
            if (d.usage) {
              mergeUsage(usage, d.usage);
              sawUsage = true;
            }
          } catch {}
        } else if (eventType === "error" && dataStr) {
          throw new Error(`Anthropic stream error: ${dataStr}`);
        }
        sep = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!acc) throw new Error("empty response from Anthropic");
  return { text: acc, usage: sawUsage ? usage : null };
}
