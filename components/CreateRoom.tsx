"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveToHistory } from "@/lib/history";

export default function CreateRoom() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat room");
      saveToHistory({ roomId: data.roomId, code: data.code });
      router.push(`/room/${data.roomId}?code=${encodeURIComponent(data.code)}&pw=${encodeURIComponent(data.password)}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-xl">
      <h2 className="mb-2 text-lg font-semibold">Buat Room Baru</h2>
      <p className="mb-4 text-sm text-slate-400">
        Buat room untuk mulai mengirim file ke perangkat lain. Anda akan
        mendapatkan kode room dan password untuk dibagikan.
      </p>
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Membuat room..." : "Buat Room"}
      </button>
    </div>
  );
}
