import { NextRequest, NextResponse } from "next/server";
import { consumeSignals, getOrCreatePeerKey } from "@/lib/signalStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const roomId = params.get("roomId");
  const participant = params.get("participant");
  if (!roomId || !participant) {
    return NextResponse.json(
      { error: "Parameter tidak lengkap." },
      { status: 400 }
    );
  }

  getOrCreatePeerKey(roomId, participant);
  const signals = consumeSignals(roomId, participant);
  return NextResponse.json({ signals });
}
