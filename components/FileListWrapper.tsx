"use client";

import { useState } from "react";
import FileList from "./FileList";
import FileUploader from "./FileUploader";

export type FileEntry = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

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
      <div className="flex items-center justify-between gap-3">
        <FileUploader
          roomId={roomId}
          onUploaded={(file) => setFiles((prev) => [file, ...prev])}
        />
        {files.length > 0 && (
          <button
            onClick={clearAll}
            disabled={clearing}
            className="shrink-0 rounded-lg border border-amber-600/60 px-3 py-2 text-sm text-amber-400 transition hover:border-amber-500 disabled:opacity-50"
          >
            {clearing ? "..." : "Hapus Semua File"}
          </button>
        )}
      </div>
      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <FileList files={files} />
    </div>
  );
}
