import { streamAnthropic } from "./anthropic";
import { streamOpenAICompat } from "./openaiCompat";
import type { StreamParams, StreamResult } from "./types";

export type {
  ProviderConfig,
  ProviderId,
  ProviderMeta,
  StreamParams,
  StreamResult,
} from "./types";
export { PROVIDERS, ProviderHttpError } from "./types";

export function streamTranslation(p: StreamParams): Promise<StreamResult> {
  if (p.config.id === "anthropic") return streamAnthropic(p);
  return streamOpenAICompat(p);
}
