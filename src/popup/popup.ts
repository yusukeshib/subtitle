import {
  clearProviderKey,
  DEFAULT_TARGET_LANGUAGE,
  getEnabled,
  getHideOriginal,
  getProvider,
  getProviderKey,
  getShowTranslated,
  getTargetLanguage,
  setEnabled,
  setHideOriginal,
  setProvider,
  setProviderKey,
  setShowTranslated,
  setTargetLanguage,
} from "../lib/cache";
import { PROVIDERS, type ProviderId } from "../lib/providers";
import type {
  ExtensionMessage,
  OpenRouterConnect,
  OpenRouterConnectResult,
  PopupGetState,
  StateSnapshot,
} from "../types";

const LANGUAGES = [
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese (Brazilian)",
  "Portuguese (European)",
  "Russian",
  "Dutch",
  "Polish",
  "Turkish",
  "Arabic",
  "Hindi",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Hebrew",
  "Czech",
  "Ukrainian",
];

const sub = document.getElementById("sub") as HTMLParagraphElement;
const dot = document.getElementById("dot") as HTMLSpanElement;
const statusText = document.getElementById("statusText") as HTMLSpanElement;
const titleText = document.getElementById("titleText") as HTMLParagraphElement;
const bar = document.getElementById("bar") as HTMLDivElement;
const barFill = document.getElementById("barFill") as HTMLDivElement;
const err = document.getElementById("err") as HTMLParagraphElement;
const modelLabel = document.getElementById("modelLabel") as HTMLSpanElement;
const enabledCb = document.getElementById("enabled") as HTMLInputElement;
const showTranslatedCb = document.getElementById("showTranslated") as HTMLInputElement;
const hideOriginalCb = document.getElementById("hideOriginal") as HTMLInputElement;
const languageSelect = document.getElementById("targetLanguage") as HTMLSelectElement;
const providerSelect = document.getElementById("provider") as HTMLSelectElement;
const manualKeyBlock = document.getElementById("manualKeyBlock") as HTMLDivElement;
const apiKeyLabel = document.getElementById("apiKeyLabel") as HTMLLabelElement;
const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
const saveApiKeyBtn = document.getElementById("saveApiKey") as HTMLButtonElement;
const openrouterConnected = document.getElementById("openrouterConnected") as HTMLDivElement;
const disconnectOpenrouterBtn = document.getElementById(
  "disconnectOpenrouter",
) as HTMLButtonElement;
const connectOpenrouterBtn = document.getElementById("connectOpenrouter") as HTMLButtonElement;
const apiKeyStatus = document.getElementById("apiKeyStatus") as HTMLParagraphElement;
const getKeyLink = document.getElementById("getKeyLink") as HTMLAnchorElement;

sub.textContent = "Translates Prime Video subtitles with Claude.";

let currentLanguage = DEFAULT_TARGET_LANGUAGE;
let currentProvider: ProviderId = "anthropic";

function populateLanguageOptions(selected: string) {
  const names = LANGUAGES.includes(selected) ? LANGUAGES : [selected, ...LANGUAGES];
  languageSelect.innerHTML = "";
  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === selected) opt.selected = true;
    languageSelect.appendChild(opt);
  }
}

function setModelLabel() {
  const model = PROVIDERS[currentProvider].defaultModel;
  modelLabel.textContent = `${model} · → ${currentLanguage} · ${__BUILD_VERSION__}`;
}

function setApiKeyStatus(text: string, kind: "ok" | "error" | "clear") {
  apiKeyStatus.textContent = text;
  apiKeyStatus.classList.toggle("error", kind === "error");
  if (kind === "clear") apiKeyStatus.textContent = "";
}

async function renderProviderInputs() {
  const meta = PROVIDERS[currentProvider];
  apiKeyLabel.textContent = meta.keyLabel;
  apiKeyInput.placeholder = meta.keyPlaceholder;
  getKeyLink.href = meta.keyHelpUrl;
  const stored = await getProviderKey(currentProvider);

  if (currentProvider === "openrouter") {
    manualKeyBlock.style.display = "none";
    apiKeyInput.value = "";
    if (stored) {
      openrouterConnected.style.display = "";
      connectOpenrouterBtn.style.display = "none";
    } else {
      openrouterConnected.style.display = "none";
      connectOpenrouterBtn.style.display = "";
    }
  } else {
    manualKeyBlock.style.display = "";
    openrouterConnected.style.display = "none";
    connectOpenrouterBtn.style.display = "none";
    apiKeyInput.value = stored ?? "";
  }

  setApiKeyStatus("", "clear");
  setModelLabel();
}

async function onProviderChanged() {
  const next = providerSelect.value as ProviderId;
  if (!(next in PROVIDERS)) return;
  currentProvider = next;
  await setProvider(next);
  await renderProviderInputs();
}

saveApiKeyBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setApiKeyStatus("API key is empty.", "error");
    return;
  }
  await setProviderKey(currentProvider, key);
  setApiKeyStatus("Saved.", "ok");
  setTimeout(() => setApiKeyStatus("", "clear"), 2500);
});

connectOpenrouterBtn.addEventListener("click", () => {
  // OAuth is run in the background service worker. Toolbar popups close when
  // the OAuth window takes focus, which would otherwise kill the flow — the
  // SW keeps running. If the popup is still open when the flow finishes, we
  // render via both the response AND the storage-change listener below;
  // whichever arrives first wins, the other is a no-op.
  connectOpenrouterBtn.disabled = true;
  setApiKeyStatus("Opening OpenRouter…", "ok");
  const msg: OpenRouterConnect = { type: "OPENROUTER_CONNECT" };
  chrome.runtime.sendMessage(msg, (raw?: OpenRouterConnectResult) => {
    connectOpenrouterBtn.disabled = false;
    const lastErr = chrome.runtime.lastError;
    if (lastErr || !raw) {
      // Popup was likely closed during the flow; if storage got a key, the
      // onChanged listener will catch it when popup reopens.
      return;
    }
    if (raw.ok) {
      void renderProviderInputs();
      setApiKeyStatus("Connected.", "ok");
      setTimeout(() => setApiKeyStatus("", "clear"), 2500);
    } else {
      setApiKeyStatus(raw.error || "OpenRouter sign-in cancelled.", "error");
    }
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.openrouterKey && currentProvider === "openrouter") {
    void renderProviderInputs();
  }
});

disconnectOpenrouterBtn.addEventListener("click", async () => {
  await clearProviderKey("openrouter");
  await renderProviderInputs();
  setApiKeyStatus("Disconnected.", "ok");
  setTimeout(() => setApiKeyStatus("", "clear"), 2500);
});

providerSelect.addEventListener("change", () => {
  void onProviderChanged();
});

void getProvider().then((id) => {
  currentProvider = id;
  providerSelect.value = id;
  void renderProviderInputs();
});

void getEnabled().then((v) => {
  enabledCb.checked = v;
});
void getShowTranslated().then((v) => {
  showTranslatedCb.checked = v;
});
void getHideOriginal().then((v) => {
  hideOriginalCb.checked = v;
});
enabledCb.addEventListener("change", () => {
  void setEnabled(enabledCb.checked);
});
void getTargetLanguage().then((l) => {
  currentLanguage = l;
  populateLanguageOptions(l);
  setModelLabel();
});
showTranslatedCb.addEventListener("change", () => {
  void setShowTranslated(showTranslatedCb.checked);
});
hideOriginalCb.addEventListener("change", () => {
  void setHideOriginal(hideOriginalCb.checked);
});
languageSelect.addEventListener("change", () => {
  currentLanguage = languageSelect.value;
  setModelLabel();
  void setTargetLanguage(currentLanguage);
});

let activeTabId: number | null = null;
let contentReachable = false;

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

// --- Pure UI derivation ---

type PopupView = {
  dotClass: "idle" | "active" | "error";
  label: string;
  progressPct: number | null;
  errorMessage: string | null;
};

function deriveView(s: StateSnapshot): PopupView {
  if (!s.enabled) {
    return {
      dotClass: "idle",
      label: "Auto-translate is off.",
      progressPct: null,
      errorMessage: null,
    };
  }
  const t = s.translation;
  if (t.phase === "error") {
    return {
      dotClass: "error",
      label: "Something went wrong.",
      progressPct: null,
      errorMessage: t.error,
    };
  }
  if (t.phase === "translating") {
    const p = t.progress;
    const done = p?.done ?? 0;
    const total = p?.total ?? 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      dotClass: "active",
      label: `Translating… ${done}/${total || "?"} (${pct}%)`,
      progressPct: pct,
      errorMessage: null,
    };
  }
  if (t.phase === "complete") {
    return {
      dotClass: "active",
      label: `${currentLanguage} subtitles ready.`,
      progressPct: null,
      errorMessage: null,
    };
  }
  // phase === "idle"
  if (s.hasSubtitle) {
    return {
      dotClass: "active",
      label: "Subtitle track detected.",
      progressPct: null,
      errorMessage: null,
    };
  }
  return {
    dotClass: "active",
    label: "Waiting for a subtitle track…",
    progressPct: null,
    errorMessage: null,
  };
}

function renderUnreachable() {
  dot.className = "dot idle";
  statusText.textContent = "Open a Prime Video page to use Jimaku.";
  bar.classList.add("hidden");
  err.style.display = "none";
}

function render(s: StateSnapshot) {
  const v = deriveView(s);
  dot.className = `dot ${v.dotClass}`;
  statusText.textContent = v.label;
  if (v.progressPct !== null) {
    bar.classList.remove("hidden");
    barFill.style.width = `${v.progressPct}%`;
  } else {
    bar.classList.add("hidden");
  }
  if (v.errorMessage) {
    err.style.display = "";
    err.textContent = v.errorMessage;
  } else {
    err.style.display = "none";
  }
  if (s.title) {
    titleText.textContent = s.title;
    titleText.style.display = "";
  } else {
    titleText.style.display = "none";
  }
}

chrome.runtime.onMessage.addListener((raw: ExtensionMessage, sender) => {
  if (raw.type !== "STATE_UPDATE") return;
  if (sender.tab?.id !== activeTabId) return;
  contentReachable = true;
  render(raw.state);
});

async function init() {
  const tab = await getActiveTab();
  if (!tab?.id) {
    renderUnreachable();
    return;
  }
  activeTabId = tab.id;
  const msg: PopupGetState = { type: "POPUP_GET_STATE" };
  try {
    await chrome.tabs.sendMessage(activeTabId, msg);
  } catch {
    renderUnreachable();
    return;
  }
  setTimeout(() => {
    if (!contentReachable) renderUnreachable();
  }, 500);
}

void init();
