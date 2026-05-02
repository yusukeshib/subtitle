export type Cue = {
  start: number;
  end: number;
  text: string;
};

export type TranslatedCue = {
  start: number;
  end: number;
  text: string;
};

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  // Some providers (OpenRouter) report cost in the response. When present, use
  // it instead of recomputing from the per-model rate table.
  reportedCostUsd?: number;
};

export type CacheEntry = {
  translatedAt: number;
  model: string;
  cues: TranslatedCue[];
  sourceCues?: Cue[];
  // Undefined on legacy entries — treat as complete. False while translation
  // is mid-stream; true once the final cache write lands.
  complete?: boolean;
  // Display metadata — absent on entries written before the cache page existed.
  title?: string;
  pageUrl?: string;
  lang?: string;
  provider?: string;
  usage?: Usage;
};

export type TranslationPhase = "idle" | "translating" | "complete" | "error";

export type PlaybackState = "absent" | "paused" | "playing";

export type StateSnapshot = {
  translation: {
    phase: TranslationPhase;
    progress: { done: number; total: number } | null;
    error: string | null;
  };
  playback: PlaybackState;
  hasSubtitle: boolean;
  enabled: boolean;
  providerReady: boolean;
  title: string | null;
};

export type ContentReady = {
  type: "CONTENT_READY";
};

export type SubtitleDetected = {
  type: "SUBTITLE_DETECTED";
  url: string;
};

export type TabReset = {
  type: "TAB_RESET";
};

export type PopupGetState = {
  type: "POPUP_GET_STATE";
};

export type StateUpdate = {
  type: "STATE_UPDATE";
  state: StateSnapshot;
};

export type OpenRouterConnect = {
  type: "OPENROUTER_CONNECT";
};

export type OpenRouterConnectResult = { ok: true } | { ok: false; error: string };

export type ExtensionMessage =
  | ContentReady
  | SubtitleDetected
  | TabReset
  | PopupGetState
  | StateUpdate
  | OpenRouterConnect;
