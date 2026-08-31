import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json(
      { error: "roomId wajib ada." },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true },
  });
  if (!room) {
    return NextResponse.json(
      { error: "Room tidak ditemukan." },
      { status: 404 }
    );
  }
  if (room.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Room ini telah dinonaktifkan." },
      { status: 403 }
    );
  }

  const files = await prisma.file.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      size: true,
      mimeType: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ files });
}
