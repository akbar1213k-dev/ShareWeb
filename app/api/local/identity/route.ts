import { NextRequest, NextResponse } from "next/server";
import { getServerId } from "@/lib/serverIdentity";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ serverId: getServerId() });
}
