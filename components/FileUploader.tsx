"use client";

import { useRef, useState } from "react";

type FileEntry = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

const MAX_SIZE = 100 * 1024 * 1024;

export default function FileUploader({
  roomId,
  onUploaded,
}: {
  roomId: string;
  onUploaded: (file: FileEntry) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    const tooBig = list.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setError(`"${tooBig.name}" melebihi batas maksimum 100MB.`);
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);

    let done = 0;
    for (const file of list) {
      const formData = new FormData();
      formData.append("roomId", roomId);
      formData.append("file", file);

      try {
        const uploaded = await new Promise<FileEntry>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const overall = ((done + e.loaded / e.total) / list.length) * 100;
              setProgress(Math.round(overall));
            }
          };
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data.file);
              } else {
                reject(new Error(data.error || `Gagal mengunggah "${file.name}"`));
              }
            } catch {
              reject(new Error(`Gagal mengunggah "${file.name}"`));
            }
          };
          xhr.onerror = () =>
            reject(new Error(`Kesalahan jaringan saat "${file.name}"`));
          xhr.send(formData);
        });
        onUploaded(uploaded);
      } catch (e: any) {
        setError(e.message);
        break;
      } finally {
        done += 1;
      }
    }

    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragOver
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-slate-600 hover:border-emerald-500/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="mb-2 text-4xl">📤</div>
        {uploading ? (
          <p className="font-medium">Mengunggah... {progress}%</p>
        ) : (
          <p className="font-medium">
            Klik atau seret file ke sini untuk mengunggah
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Bisa pilih atau seret banyak file sekaligus · maks 100MB per file
        </p>
      </div>
      {uploading && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
