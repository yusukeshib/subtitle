import { httpErrorFromResponse, type StreamParams } from "./types";

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

export async function streamOpenAICompat(p: StreamParams): Promise<string> {
  if (p.config.id === "anthropic") {
    throw new Error("streamOpenAICompat called with anthropic config");
  }
  const ep = ENDPOINTS[p.config.id];
  const body = {
    model: p.config.model,
    max_tokens: p.maxTokens,
    stream: true,
    messages: [
      { role: "system", content: p.systemPrompt },
      { role: "user", content: p.userContent },
    ],
  };
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
  return acc;
}
