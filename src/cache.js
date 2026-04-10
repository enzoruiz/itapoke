import { UI_STORAGE_KEY } from './config.js';

export async function cacheRead(key) {
  void key;
  return null;
}

export async function cacheWrite(key, value) {
  void key;
  void value;
}

export function isFresh(entry, ttl) {
  return Boolean(entry && Date.now() - entry.timestamp < ttl);
}

export function saveUiState(payload) {
  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(payload));
}

export function restoreUiState() {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
