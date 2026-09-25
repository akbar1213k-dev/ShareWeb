import { NextRequest, NextResponse } from "next/server";
import { discoverDevices, stopDiscovery } from "@/lib/mdns";
import { getServerId } from "@/lib/serverIdentity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let timeout: number | undefined;
    let selfName = "ShareWeb";
    try {
      const body = await req.json();
      timeout = body?.timeout;
      selfName = body?.selfName || selfName;
    } catch {}

    const serverId = getServerId();
    const devices = await discoverDevices(selfName, serverId, timeout ?? 4000);
    return NextResponse.json({ devices, serverId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal memindai perangkat." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  stopDiscovery();
  return NextResponse.json({ ok: true });
}
