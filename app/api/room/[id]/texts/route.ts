import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_RICH_TEXT_HTML_LENGTH } from "@/lib/richText";
import {
  hasRichTextContent,
  sanitizeRichTextHtml,
} from "@/lib/serverRichText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoomContext = { params: { id: string } };

function serialize(textTransfer: {
  id: string;
  html: string;
  createdAt: Date;
}) {
  return {
    id: textTransfer.id,
    html: sanitizeRichTextHtml(textTransfer.html),
    createdAt: textTransfer.createdAt.toISOString(),
  };
}

export async function GET(_request: NextRequest, context: RoomContext) {
  const room = await prisma.room.findUnique({
    where: { id: context.params.id },
    select: { status: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }
  if (room.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Room ini telah dinonaktifkan." },
      { status: 403 }
    );
  }

  const textTransfers = await prisma.textTransfer.findMany({
    where: { roomId: context.params.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, html: true, createdAt: true },
  });

  return NextResponse.json({
    textTransfers: textTransfers.map(serialize),
  });
}

export async function POST(request: NextRequest, context: RoomContext) {
  const room = await prisma.room.findUnique({
    where: { id: context.params.id },
    select: { status: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }
  if (room.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Room ini telah dinonaktifkan." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const html =
    typeof body === "object" && body !== null && "html" in body
      ? (body as { html?: unknown }).html
      : null;
  if (typeof html !== "string" || !html.trim()) {
    return NextResponse.json({ error: "Teks wajib diisi." }, { status: 400 });
  }
  if (html.length > MAX_RICH_TEXT_HTML_LENGTH) {
    return NextResponse.json(
      { error: "Teks terlalu panjang untuk dikirim." },
      { status: 413 }
    );
  }

  const cleanHtml = sanitizeRichTextHtml(html);
  if (!hasRichTextContent(cleanHtml)) {
    return NextResponse.json({ error: "Teks wajib diisi." }, { status: 400 });
  }

  const textTransfer = await prisma.textTransfer.create({
    data: { roomId: context.params.id, html: cleanHtml },
    select: { id: true, html: true, createdAt: true },
  });

  return NextResponse.json({ textTransfer: serialize(textTransfer) });
}

export async function DELETE(_request: NextRequest, context: RoomContext) {
  const room = await prisma.room.findUnique({
    where: { id: context.params.id },
    select: { id: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  }

  const result = await prisma.textTransfer.deleteMany({
    where: { roomId: context.params.id },
  });
  return NextResponse.json({ success: true, deletedCount: result.count });
}
