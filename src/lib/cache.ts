import type { CacheEntry } from "../types";
import { PROVIDERS, type ProviderConfig, type ProviderId } from "./providers";

// Bump this when the cue-schema or translation behaviour changes so stale
// cached entries are ignored rather than mixed with the new format.
const CACHE_SCHEMA = 3;
const PREFIX = `sub/v${CACHE_SCHEMA}:`;

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function keyFor(url: string, lang: string): Promise<string> {
  const h = await sha256(`${lang}\n${url}`);
  return PREFIX + h;
}

export async function getCache(url: string, lang: string): Promise<CacheEntry | null> {
  const key = await keyFor(url, lang);
  const res = await chrome.storage.local.get(key);
  return (res[key] as CacheEntry | undefined) ?? null;
}

export async function setCache(url: string, lang: string, entry: CacheEntry): Promise<void> {
  const key = await keyFor(url, lang);
  await chrome.storage.local.set({ [key]: entry });
}

export async function deleteCache(url: string, lang: string): Promise<void> {
  const key = await keyFor(url, lang);
  await chrome.storage.local.remove(key);
}

export type CacheRecord = {
  key: string;
  entry: CacheEntry;
};

export async function listCacheEntries(): Promise<CacheRecord[]> {
  const all = await chrome.storage.local.get(null);
  const out: CacheRecord[] = [];
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith(PREFIX)) continue;
    if (!v || typeof v !== "object") continue;
    out.push({ key: k, entry: v as CacheEntry });
  }
  return out;
}

export async function deleteCacheByKey(key: string): Promise<void> {
  if (!key.startsWith(PREFIX)) return;
  await chrome.storage.local.remove(key);
}

export async function clearAllCache(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith(PREFIX));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
}

const KEY_STORAGE: Record<ProviderId, string> = {
  anthropic: "anthropicKey",
  openai: "openaiKey",
  openrouter: "openrouterKey",
};

export async function getProvider(): Promise<ProviderId> {
  const res = await chrome.storage.local.get("provider");
  const v = res.provider;
  if (v === "anthropic" || v === "openai" || v === "openrouter") return v;
  return "openrouter";
}

export async function setProvider(id: ProviderId): Promise<void> {
  await chrome.storage.local.set({ provider: id });
}

export async function getProviderKey(id: ProviderId): Promise<string | null> {
  const storageKey = KEY_STORAGE[id];
  const res = await chrome.storage.local.get(storageKey);
  const v = res[storageKey];
  return typeof v === "string" && v ? v : null;
}

export async function setProviderKey(id: ProviderId, key: string): Promise<void> {
  await chrome.storage.local.set({ [KEY_STORAGE[id]]: key });
}

export async function clearProviderKey(id: ProviderId): Promise<void> {
  await chrome.storage.local.remove(KEY_STORAGE[id]);
}

export async function getProviderConfig(): Promise<ProviderConfig | null> {
  const id = await getProvider();
  const apiKey = await getProviderKey(id);
  if (!apiKey) return null;
  return { id, apiKey, model: PROVIDERS[id].defaultModel };
}

export const DEFAULT_TARGET_LANGUAGE = "Japanese";

export async function getTargetLanguage(): Promise<string> {
  const res = await chrome.storage.local.get("targetLanguage");
  const v = res.targetLanguage;
  return typeof v === "string" && v.trim() ? v : DEFAULT_TARGET_LANGUAGE;
}

export async function setTargetLanguage(lang: string): Promise<void> {
  await chrome.storage.local.set({ targetLanguage: lang });
}

export async function getShowTranslated(): Promise<boolean> {
  const res = await chrome.storage.local.get("showTranslated");
  return res.showTranslated !== false;
}

export async function setShowTranslated(v: boolean): Promise<void> {
  await chrome.storage.local.set({ showTranslated: v });
}

export async function getHideOriginal(): Promise<boolean> {
  const res = await chrome.storage.local.get("hideOriginal");
  return res.hideOriginal === true;
}

export async function setHideOriginal(v: boolean): Promise<void> {
  await chrome.storage.local.set({ hideOriginal: v });
}

export async function getEnabled(): Promise<boolean> {
  const res = await chrome.storage.local.get("enabled");
  // Default on: subtitle auto-translation is the extension's whole point.
  return res.enabled !== false;
}

export async function setEnabled(v: boolean): Promise<void> {
  await chrome.storage.local.set({ enabled: v });
}
