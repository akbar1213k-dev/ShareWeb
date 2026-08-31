"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveToHistory } from "@/lib/history";

export default function JoinRoom() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal masuk room");
      saveToHistory({ roomId: data.roomId, code: data.code });
      router.push(`/room/${data.roomId}?code=${encodeURIComponent(data.code)}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-xl">
      <h2 className="mb-2 text-lg font-semibold">Gabung ke Room</h2>
      <p className="mb-4 text-sm text-slate-400">
        Masukkan kode room dan password yang dibagikan oleh pengirim.
      </p>
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <form onSubmit={handleJoin} className="space-y-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Kode room (mis. ABC-123)"
          required
          className="w-full rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3 outline-none transition focus:border-emerald-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3 outline-none transition focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Memeriksa..." : "Masuk Room"}
        </button>
      </form>
    </div>
  );
}
