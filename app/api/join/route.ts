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

    const room = await prisma.room.findUnique({
      where: { code },
      select: { id: true, code: true, password: true, status: true },
    });
    if (!room || !(await verifyPassword(password, room.password))) {
      return NextResponse.json(
        { error: "Kode room atau password salah." },
        { status: 401 }
      );
    }
    if (room.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Room ini telah dinonaktifkan." },
        { status: 403 }
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
