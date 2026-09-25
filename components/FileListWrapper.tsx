"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FileList from "./FileList";
import FileUploader from "./FileUploader";
import TextTransferPanel from "./TextTransferPanel";

export type FileEntry = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

const POLL_INTERVAL_MS = 3000;

export default function FileListWrapper({
  roomId,
  initialFiles,
}: {
  roomId: string;
  initialFiles: FileEntry[];
}) {
  const [files, setFiles] = useState<FileEntry[]>(initialFiles);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/files?roomId=${encodeURIComponent(roomId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setFiles(data.files ?? []);
      setError("");
    } catch {
      /* ignore transient poll errors */
    }
  }, [roomId]);

  useEffect(() => {
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function clearAll() {
    const ok = window.confirm(
      "Hapus SEMUA file dalam room ini dari penyimpanan? Tindakan tidak dapat dibatalkan."
    );
    if (!ok) return;
    setClearing(true);
    setError("");
    try {
      const res = await fetch(`/api/room/${roomId}/files`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus file.");
      setFiles([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-slate-100">Kirim File</h3>
            <p className="text-xs text-slate-500">
              Klik atau seret file ke area di bawah.
            </p>
          </div>
          <FileUploader
            roomId={roomId}
            onUploaded={(file) => setFiles((prev) => [file, ...prev])}
          />
        </section>
        <TextTransferPanel roomId={roomId} />
      </div>
      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            disabled={clearing}
            className="rounded-lg border border-amber-600/60 px-3 py-2 text-sm text-amber-400 transition hover:border-amber-500 disabled:opacity-50"
          >
            {clearing ? "..." : "Hapus Semua File"}
          </button>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Daftar file dan transfer teks diperbarui otomatis setiap beberapa detik.
      </p>
      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <FileList files={files} />
    </div>
  );
}
