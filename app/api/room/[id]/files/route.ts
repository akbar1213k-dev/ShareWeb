import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const room = await prisma.room.findUnique({
    where: { id: context.params.id },
    select: { id: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }

  const files = await prisma.file.findMany({
    where: { roomId: room.id },
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
  await prisma.file.deleteMany({ where: { roomId: room.id } });

  return NextResponse.json({ success: true, deletedCount: files.length });
}
