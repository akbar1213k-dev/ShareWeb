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

  return (
    <div className="space-y-4">
      <FileUploader
        roomId={roomId}
        onUploaded={(file) => setFiles((prev) => [file, ...prev])}
      />
      <FileList files={files} />
    </div>
  );
}
