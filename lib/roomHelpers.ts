import { prisma } from "./db";
import bcrypt from "bcryptjs";

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_LENGTH = 8;
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function secureRandomInt(max: number): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] % max;
}

function generateFromChars(chars: string, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[secureRandomInt(chars.length)];
  }
  return result;
}

function formatRoomCode(raw: string): string {
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = formatRoomCode(
      generateFromChars(ROOM_CODE_CHARS, ROOM_CODE_LENGTH)
    );
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique room code");
}

export function generatePassword(): string {
  return generateFromChars(PASSWORD_CHARS, PASSWORD_LENGTH);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function normalizeRoomCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 6) return formatRoomCode(cleaned.padEnd(6, "0"));
  return formatRoomCode(cleaned);
}
