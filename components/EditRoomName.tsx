"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateHistoryName } from "@/lib/history";

export default function EditRoomName({
  roomId,
  initialName,
}: {
  roomId: string;
  initialName: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan nama.");
      const saved = data.room?.name ?? null;
      updateHistoryName(roomId, saved);
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="Nama room (opsional)"
          maxLength={60}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "..." : "Simpan"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setName(initialName ?? "");
          }}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:border-slate-400"
        >
          Batal
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Edit nama room"
      className="group flex items-center gap-2 text-left"
    >
      {name ? (
        <h1 className="text-2xl font-bold group-hover:text-slate-200">
          {name}
        </h1>
      ) : (
        <h1 className="text-2xl font-bold text-slate-200 group-hover:text-emerald-400">
          Beri nama room
        </h1>
      )}
      <span className="text-slate-500 group-hover:text-slate-300">✏️</span>
    </button>
  );
}
