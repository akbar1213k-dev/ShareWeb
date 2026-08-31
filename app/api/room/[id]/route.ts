import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function deleteFilesForRoom(roomId: string) {
  const files = await prisma.file.findMany({
    where: { roomId },
    select: { id: true, driveFileId: true },
  });
  const ts = [];
  for (const file of files) {
    ts.push(
      deleteFromStorage(file.driveFileId).catch(() => {
        /* ignore storage delete error */
      })
    );
  }
  await Promise.allSettled(ts);
  await prisma.file.deleteMany({ where: { roomId } });
}

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const room = await prisma.room.findUnique({
    where: { id: context.params.id },
    select: { id: true, code: true, status: true, name: true, createdAt: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ room });
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const room = await prisma.room.findUnique({
    where: { id: context.params.id },
    select: { id: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }

  let body: { action?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const data: { status?: string; name?: string | null } = {};
  if (body.action === "deactivate") data.status = "INACTIVE";
  else if (body.action === "activate") data.status = "ACTIVE";
  else if (body.action !== undefined) {
    return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  }

  if (typeof body.name === "string") {
    data.name = body.name.trim() === "" ? null : body.name.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const updated = await prisma.room.update({
    where: { id: room.id },
    data,
    select: { id: true, code: true, status: true, name: true, createdAt: true },
  });
  return NextResponse.json({ room: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const room = await prisma.room.findUnique({
    where: { id: context.params.id },
    select: { id: true, code: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }

  await deleteFilesForRoom(room.id);
  await prisma.room.delete({ where: { id: room.id } });

  return NextResponse.json({ success: true, roomId: room.id });
}
