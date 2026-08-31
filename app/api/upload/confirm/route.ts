import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorageFileMeta } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { roomId?: string; fileId?: string; name?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const roomId = (body.roomId ?? "").trim();
  const fileId = (body.fileId ?? "").trim();
  const name = (body.name ?? "").trim();
  const mimeType = (body.mimeType ?? "").trim() || "application/octet-stream";

  if (!roomId || !fileId || !name) {
    return NextResponse.json(
      { error: "roomId, fileId, dan name wajib ada." },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, status: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }
  if (room.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Room ini telah dinonaktifkan." },
      { status: 403 }
    );
  }

  let meta: { name: string; size: number; mimeType: string };
  try {
    meta = await getStorageFileMeta(fileId);
  } catch {
    return NextResponse.json(
      { error: "File belum terunggah lengkap ke penyimpanan." },
      { status: 400 }
    );
  }

  const file = await prisma.file.create({
    data: {
      driveFileId: fileId,
      name,
      size: meta.size,
      mimeType,
      roomId,
    },
    select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
  });

  return NextResponse.json({ file }, { status: 201 });
}