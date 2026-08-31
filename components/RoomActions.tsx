"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeFromHistory } from "@/lib/history";

type Props = {
  roomId: string;
  initialStatus: string;
};

export default function RoomActions({ roomId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(action: "deactivate" | "activate") {
    const isDeact = action === "deactivate";
    const ok = window.confirm(
      isDeact
        ? "Nonaktifkan room ini? Pengguna lain tidak bisa mengaksesnya."
        : "Aktifkan kembali room ini?"
    );
    if (!ok) return;
    setLoading(action);
    setError("");
    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses.");
      setStatus(isDeact ? "INACTIVE" : "ACTIVE");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function deleteRoom() {
    const ok = window.confirm(
      "Hapus room ini beserta SEMUA file-nya? Tindakan tidak dapat dibatalkan."
    );
    if (!ok) return;
    setLoading("delete");
    setError("");
    try {
      const res = await fetch(`/api/room/${roomId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus.");
      removeFromHistory(roomId);
      router.push("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  const isActive = status === "ACTIVE";

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Kelola Room
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isActive ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggle(isActive ? "deactivate" : "activate")}
          disabled={!!loading}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm transition hover:border-slate-400 disabled:opacity-50"
        >
          {loading === (isActive ? "deactivate" : "activate")
            ? "..."
            : isActive
            ? "Nonaktifkan Room"
            : "Aktifkan Room"}
        </button>
        <button
          onClick={deleteRoom}
          disabled={!!loading}
          className="rounded-lg border border-red-600/60 px-3 py-2 text-sm text-red-400 transition hover:border-red-500 disabled:opacity-50"
        >
          {loading === "delete" ? "..." : "Hapus Room"}
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Room nonaktif tidak dapat diakses (join/upload/download ditolak), tetapi
        data tetap tersimpan sampai room dihapus.
      </p>
    </div>
  );
}
