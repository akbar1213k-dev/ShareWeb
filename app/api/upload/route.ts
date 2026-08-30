import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type ParsedFile = {
  fieldName: string;
  filename: string;
  mimeType: string;
  data: Buffer;
};

function parseMultipart(body: Buffer, boundary: string): ParsedFile[] {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts: ParsedFile[] = [];
  let start = 0;

  while (true) {
    const partStart = body.indexOf(delimiter, start);
    if (partStart === -1) break;
    const headerStart = partStart + delimiter.length;

    let headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), headerStart);
    if (headerEnd === -1) break;

    const headerBlock = body.toString("latin1", headerStart, headerEnd);
    const nameMatch = /name="([^"]*)"/.exec(headerBlock);
    const filenameMatch = /filename="([^"]*)"/.exec(headerBlock);
    const contentTypeMatch = /Content-Type:\s*([^\r\n]*)/i.exec(headerBlock);

    const dataStart = headerEnd + 4;

    let endSearchStart = dataStart;
    let dataEnd = body.indexOf(delimiter, endSearchStart);
    if (dataEnd === -1) break;

    if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) {
      dataEnd = dataEnd - 2;
    }

    if (dataEnd > dataStart) {
      parts.push({
        fieldName: nameMatch ? nameMatch[1] : "",
        filename: filenameMatch ? filenameMatch[1] : "",
        mimeType: contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream",
        data: body.subarray(dataStart, dataEnd),
      });
    }

    start = dataEnd + delimiter.length;
    const after = body.indexOf(Buffer.from("--"), start);
    if (after !== -1 && after === start) break;
  }

  return parts;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Format upload tidak valid." },
      { status: 400 }
    );
  }

  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!boundaryMatch) {
    return NextResponse.json(
      { error: "Boundary multipart tidak ditemukan." },
      { status: 400 }
    );
  }
  const boundary = (boundaryMatch[1] || boundaryMatch[2]).trim();

  let body: Buffer;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file melebihi batas maksimum 100MB." },
        { status: 413 }
      );
    }
    body = Buffer.from(bytes);
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membaca data." },
      { status: 500 }
    );
  }

  const parts = parseMultipart(body, boundary);

  const roomIdField = parts.find(
    (p) => p.fieldName === "roomId" && p.filename === ""
  );
  const filePart = parts.find((p) => p.fieldName === "file" && p.filename);

  if (!roomIdField || !filePart) {
    return NextResponse.json(
      { error: "roomId dan file wajib ada." },
      { status: 400 }
    );
  }

  const roomId = roomIdField.data.toString("utf-8").trim();
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json(
      { error: "Room tidak ditemukan." },
      { status: 404 }
    );
  }

  try {
    const driveResult = await uploadToDrive({
      name: filePart.filename,
      mimeType: filePart.mimeType,
      body: filePart.data,
    });

    const file = await prisma.file.create({
      data: {
        driveFileId: driveResult.id,
        name: filePart.filename,
        size: filePart.data.length,
        mimeType: filePart.mimeType,
        roomId,
      },
      select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
    });

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: "Gagal mengunggah file ke Google Drive." },
      { status: 500 }
    );
  }
}
