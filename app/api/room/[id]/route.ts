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
    select: { id: true, code: true, status: true, createdAt: true },
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

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let status: string;
  if (body.action === "deactivate") status = "INACTIVE";
  else if (body.action === "activate") status = "ACTIVE";
  else {
    return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  }

  const updated = await prisma.room.update({
    where: { id: room.id },
    data: { status },
    select: { id: true, code: true, status: true },
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
