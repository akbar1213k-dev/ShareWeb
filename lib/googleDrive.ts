import { google, Auth } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

let cachedAuth: Auth.JWT | null = null;

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !privateKey) {
    throw new Error(
      "Google Drive credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }
  const decodedKey = privateKey.replace(/\\n/g, "\n");
  return { email, privateKey: decodedKey };
}

function getAuthClient() {
  if (cachedAuth) return cachedAuth;
  const { email, privateKey } = getCredentials();
  cachedAuth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });
  return cachedAuth;
}

export async function getDrive() {
  const auth = getAuthClient();
  await auth.authorize();
  return google.drive({ version: "v3", auth });
}

export async function uploadToDrive(params: {
  name: string;
  mimeType: string;
  body: Buffer;
}): Promise<{ id: string }> {
  const drive = await getDrive();
  const response = await drive.files.create({
    requestBody: {
      name: params.name,
      mimeType: params.mimeType,
      ...(process.env.GOOGLE_DRIVE_FOLDER_ID
        ? { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] }
        : {}),
    },
    media: {
      mimeType: params.mimeType,
      body: params.body,
    },
    fields: "id,size",
  });
  if (!response.data.id) {
    throw new Error("Google Drive did not return a file id");
  }
  return { id: response.data.id };
}

export async function getFileMeta(driveFileId: string) {
  const drive = await getDrive();
  const response = await drive.files.get({
    fileId: driveFileId,
    fields: "name,size,mimeType",
  });
  return response.data;
}

export async function streamFromDrive(driveFileId: string) {
  const drive = await getDrive();
  return drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "stream" }
  );
}

export async function deleteFromDrive(driveFileId: string) {
  const drive = await getDrive();
  await drive.files.delete({ fileId: driveFileId });
}
