import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPresignedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let body: { roomId?: string; name?: string; mimeType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
  }

  const roomId = (body.roomId ?? "").trim();
  const name = (body.name ?? "").trim();
  const mimeType = (body.mimeType ?? "").trim() || "application/octet-stream";
  const size = Number(body.size ?? 0);

  if (!roomId || !name) {
    return NextResponse.json(
      { error: "roomId dan name wajib ada." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Ukuran file melebihi batas maksimum 100MB." },
      { status: 413 }
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

  const { fileId, uploadUrl } = await createPresignedUploadUrl({ name, mimeType });
  return NextResponse.json({ fileId, uploadUrl, name, mimeType, size });
}