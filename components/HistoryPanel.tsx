"use client";

import { useCallback, useEffect, useState } from "react";
import { getHistory, removeFromHistory } from "@/lib/history";
import { formatDateIn } from "@/lib/format";

type RoomInfo = {
  id: string;
  code: string;
  name: string | null;
  status: string;
  fileCount: number;
  createdAt: string;
  lastAccessedAt: number;
};

export default function HistoryPanel() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const history = getHistory();
    if (history.length === 0) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ids = history.map((h) => h.roomId).join(",");
      const res = await fetch(`/api/rooms?ids=${encodeURIComponent(ids)}`);
      const data = await res.json();
      const byId = new Map(history.map((h) => [h.roomId, h]));
      const merged = (data.rooms ?? [])
        .map((r: any) => ({
          ...r,
          lastAccessedAt: byId.get(r.id)?.lastAccessedAt ?? 0,
        }))
        .sort((a: RoomInfo, b: RoomInfo) => b.lastAccessedAt - a.lastAccessedAt);
      setRooms(merged);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function remove(roomId: string) {
    removeFromHistory(roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }

  return (
    <section className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">History Room</h2>
        <button
          onClick={load}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm transition hover:border-slate-400"
        >
          Muat Ulang
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Memuat...</p>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-slate-400">
          Belum ada room. Buat atau gabung room untuk melihatnya di sini.
        </p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">
                    {room.name || `Room ${room.code}`}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {room.code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      room.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {room.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {room.fileCount} file · terakhir diakses{" "}
                  {formatDateIn(room.lastAccessedAt)}
                </p>
              </div>
              <a
                href={`/room/${room.id}`}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Buka
              </a>
              <button
                onClick={() => remove(room.id)}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm transition hover:border-red-500 hover:text-red-400"
                title="Hapus dari history (tidak menghapus room)"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
