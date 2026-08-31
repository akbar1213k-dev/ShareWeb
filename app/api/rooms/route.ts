import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const idsRaw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ rooms: [] });
  }

  const rooms = await prisma.room.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      code: true,
      status: true,
      name: true,
      createdAt: true,
      _count: { select: { files: true } },
    },
  });

  const byId = new Map(rooms.map((r) => [r.id, r]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((r) => ({
      id: r!.id,
      code: r!.code,
      status: r!.status,
      name: r!.name,
      fileCount: r!._count.files,
      createdAt: r!.createdAt.toISOString(),
    }));

  return NextResponse.json({ rooms: ordered });
}
