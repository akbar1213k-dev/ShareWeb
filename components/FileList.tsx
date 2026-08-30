"use client";

import { formatBytes } from "@/lib/format";

type FileEntry = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return "🗜️";
  if (mimeType.includes("document") || mimeType.includes("word"))
    return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("sheet"))
    return "📊";
  return "📁";
}

export default function FileList({ files }: { files: FileEntry[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center text-slate-400">
        Belum ada file di room ini.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-3 transition hover:border-slate-500"
        >
          <div className="text-2xl">
            <FileIcon mimeType={file.mimeType} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
          </div>
          <a
            href={`/api/download/${file.id}`}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Unduh
          </a>
        </li>
      ))}
    </ul>
  );
}
