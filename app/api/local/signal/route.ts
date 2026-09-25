import { NextRequest, NextResponse } from "next/server";
import { pushSignal, getOrCreatePeerKey, createSession } from "@/lib/signalStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { roomId, participant, target, message } = await req.json();
    if (!roomId || !participant || !message) {
      return NextResponse.json(
        { error: "Parameter tidak lengkap." },
        { status: 400 }
      );
    }

    const localKey = getOrCreatePeerKey(roomId, participant);
    // Also register the sender session so target can find us
    createSession(roomId, participant);

    const targetKey = getOrCreatePeerKey(roomId, target);
    pushSignal(roomId, target, {
      type: message.type,
      roomId,
      sender: participant,
      data: message.data,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal mengirim sinyal." },
      { status: 500 }
    );
  }
}
