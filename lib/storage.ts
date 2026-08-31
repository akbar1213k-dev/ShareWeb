import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

let cachedClient: S3Client | null = null;

function getEndpoint() {
  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) return endpoint.replace(/\/$/, "");
  const accountId = process.env.R2_ACCOUNT_ID;
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  throw new Error(
    "Storage endpoint is not configured. Set S3_ENDPOINT (e.g. Backblaze B2) or R2_ACCOUNT_ID."
  );
}

function getBucket() {
  const bucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Storage bucket name is not configured.");
  return bucket;
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Storage credentials are not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY."
    );
  }
  cachedClient = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: getEndpoint(),
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function normalizeKey(key: string) {
  const decoded = key.replace(/\\n/g, "\n");
  return decoded.startsWith("/") ? decoded.slice(1) : decoded;
}

export async function uploadToStorage(params: {
  name: string;
  mimeType: string;
  body: Buffer;
}): Promise<{ id: string }> {
  const key = randomUUID();
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: params.body,
      ContentType: params.mimeType,
      Metadata: { filename: params.name },
    })
  );
  return { id: key };
}

export async function createPresignedUploadUrl(): Promise<{
  fileId: string;
  uploadUrl: string;
}> {
  const key = randomUUID();
  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: 3600 }
  );
  return { fileId: key, uploadUrl };
}

export async function createPresignedDownloadUrl(
  key: string,
  name?: string
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: normalizeKey(key) });
  if (name) {
    command.input.ResponseContentDisposition = `attachment; filename*=UTF-8''${encodeURIComponent(
      name
    )}`;
    command.input.ResponseContentType = "application/octet-stream";
  }
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}

export async function getStorageFileMeta(key: string) {
  const data = await getClient().send(
    new HeadObjectCommand({ Bucket: getBucket(), Key: normalizeKey(key) })
  );
  return {
    name: data.Metadata?.filename ?? normalizeKey(key),
    size: Number(data.ContentLength ?? 0),
    mimeType: data.ContentType ?? "application/octet-stream",
  };
}

export async function streamFromStorage(key: string) {
  return getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: normalizeKey(key) })
  );
}

export async function deleteFromStorage(key: string) {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: normalizeKey(key) })
  );
}
