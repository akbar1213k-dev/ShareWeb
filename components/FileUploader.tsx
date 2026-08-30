"use client";

import { useRef, useState } from "react";

type FileEntry = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

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
    const file = files[0];
    if (file.size > 100 * 1024 * 1024) {
      setError("Ukuran file melebihi batas maksimum 100MB.");
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);

    const formData = new FormData();
    formData.append("roomId", roomId);
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      const uploaded = await new Promise<FileEntry>((resolve, reject) => {
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data.file);
            } else {
              reject(new Error(data.error || "Gagal mengunggah file"));
            }
          } catch {
            reject(new Error("Gagal mengunggah file"));
          }
        };
        xhr.onerror = () => reject(new Error("Terjadi kesalahan jaringan"));
        xhr.send(formData);
      });
      onUploaded(uploaded);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
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
          Maksimal 100MB per file
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
