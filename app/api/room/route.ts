import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateUniqueRoomCode,
  generatePassword,
  hashPassword,
} from "@/lib/roomHelpers";

export const runtime = "nodejs";

export async function POST() {
  try {
    const code = await generateUniqueRoomCode();
    const password = generatePassword();
    const hashed = await hashPassword(password);

    const room = await prisma.room.create({
      data: { code, password: hashed },
      select: { id: true, code: true },
    });

    return NextResponse.json({ roomId: room.id, code: room.code, password });
  } catch (error) {
    console.error("Failed to create room", error);
    return NextResponse.json(
      { error: "Gagal membuat room. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
