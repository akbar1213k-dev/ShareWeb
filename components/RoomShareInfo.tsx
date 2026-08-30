"use client";

import { useState } from "react";

type CopyTarget = "link" | "code" | "password" | null;

export default function RoomShareInfo({
  roomId,
  code,
  initialPassword,
}: {
  roomId: string;
  code: string;
  initialPassword?: string;
}) {
  const [copied, setCopied] = useState<CopyTarget>(null);

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  async function copy(text: string, target: CopyTarget) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Salin teks ini:", text);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Bagikan ke Perangkat Lain
      </h2>
      <div className="space-y-3">
        <InfoRow
          label="Kode Room"
          value={code}
          copied={copied === "code"}
          onCopy={() => copy(code, "code")}
        />
        <InfoRow
          label="Link"
          value={shareLink}
          copied={copied === "link"}
          onCopy={() => copy(shareLink, "link")}
        />
        {initialPassword && (
          <InfoRow
            label="Password (bagikan hanya ke penerima)"
            value={initialPassword}
            copied={copied === "password"}
            onCopy={() => copy(initialPassword, "password")}
          />
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Perangkat lain memasukkan kode room dan password untuk mengakses dan
        mengunduh file.
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate rounded-lg bg-slate-900/60 px-3 py-2 font-mono text-sm">
          {value || "—"}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm transition hover:border-emerald-500"
      >
        {copied ? "✓" : "Salin"}
      </button>
    </div>
  );
}
