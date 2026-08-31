"use client";

export type HistoryEntry = {
  roomId: string;
  code: string;
  lastAccessedAt: number;
};

const STORAGE_KEY = "shareweb_history";

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: { roomId: string; code: string }) {
  if (typeof window === "undefined") return;
  const history = getHistory().filter((h) => h.roomId !== entry.roomId);
  history.unshift({
    roomId: entry.roomId,
    code: entry.code,
    lastAccessedAt: Date.now(),
  });
  const trimmed = history.slice(0, 30);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full — ignore */
  }
}

export function removeFromHistory(roomId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(getHistory().filter((h) => h.roomId !== roomId))
    );
  } catch {
    /* ignore */
  }
}
