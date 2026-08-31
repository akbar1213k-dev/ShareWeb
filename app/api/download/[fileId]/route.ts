import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPresignedDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: { fileId: string } }
) {
  const fileId = context.params.fileId;

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      driveFileId: true,
      name: true,
      room: { select: { status: true } },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }

  if (file.room.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Room ini telah dinonaktifkan." },
      { status: 403 }
    );
  }

  try {
    const url = await createPresignedDownloadUrl(file.driveFileId, file.name);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Download failed", error);
    return NextResponse.json(
      { error: "Gagal mengambil file dari penyimpanan." },
      { status: 500 }
    );
  }
}