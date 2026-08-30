import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, normalizeRoomCode } from "@/lib/roomHelpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = normalizeRoomCode(body.code ?? "");
    const password = String(body.password ?? "");

    if (!code || !password) {
      return NextResponse.json(
        { error: "Kode room dan password wajib diisi." },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room || !(await verifyPassword(password, room.password))) {
      return NextResponse.json(
        { error: "Kode room atau password salah." },
        { status: 401 }
      );
    }

    return NextResponse.json({ roomId: room.id, code: room.code });
  } catch (error) {
    console.error("Failed to join room", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
