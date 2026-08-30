import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { streamFromDrive } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: { fileId: string } }
) {
  const fileId = context.params.fileId;

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      driveFileId: true,
      name: true,
      mimeType: true,
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }

  try {
    const res = await streamFromDrive(file.driveFileId);
    const data = res.data as unknown as NodeJS.ReadableStream;

    const headers = new Headers();
    headers.set("Content-Type", file.mimeType);
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`
    );
    headers.set("Cache-Control", "no-store");

    return new NextResponse(data as any, { headers });
  } catch (error) {
    console.error("Download failed", error);
    return NextResponse.json(
      { error: "Gagal mengambil file dari Google Drive." },
      { status: 500 }
    );
  }
}
