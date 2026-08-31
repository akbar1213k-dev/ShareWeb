"use client";

export type HistoryEntry = {
  roomId: string;
  code: string;
  name?: string | null;
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

function write(history: HistoryEntry[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(history.slice(0, 30))
    );
  } catch {
    /* storage full — ignore */
  }
}

export function saveToHistory(entry: { roomId: string; code: string; name?: string | null }) {
  if (typeof window === "undefined") return;
  const prev = getHistory().find((h) => h.roomId === entry.roomId);
  const history = getHistory().filter((h) => h.roomId !== entry.roomId);
  history.unshift({
    roomId: entry.roomId,
    code: entry.code,
    name: entry.name ?? prev?.name ?? null,
    lastAccessedAt: Date.now(),
  });
  write(history);
}

export function updateHistoryName(roomId: string, name: string | null) {
  if (typeof window === "undefined") return;
  write(
    getHistory().map((h) =>
      h.roomId === roomId ? { ...h, name: name ?? null } : h
    )
  );
}

export function removeFromHistory(roomId: string) {
  if (typeof window === "undefined") return;
  write(getHistory().filter((h) => h.roomId !== roomId));
}
