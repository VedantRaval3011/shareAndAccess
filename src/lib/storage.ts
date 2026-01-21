/**
 * BunnyCDN Storage Client
 * Uses BunnyCDN's REST API for file storage
 */

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || '';
const API_KEY = process.env.BUNNY_API_KEY || '';
const CDN_URL = process.env.BUNNY_CDN_URL || '';
const STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || '';

// Build the storage API base URL based on region
function getStorageBaseUrl(): string {
  if (STORAGE_REGION) {
    return `https://${STORAGE_REGION}.storage.bunnycdn.com`;
  }
  return 'https://storage.bunnycdn.com';
}

export async function uploadToStorage(
  body: ArrayBuffer,
  key: string,
  contentType: string
): Promise<{ key: string }> {
  const baseUrl = getStorageBaseUrl();
  const url = `${baseUrl}/${STORAGE_ZONE}/${key}`;

  // Create a Blob from the ArrayBuffer for fetch compatibility
  const blob = new Blob([body], { type: contentType });

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'AccessKey': API_KEY,
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BunnyCDN upload failed: ${response.status} - ${errorText}`);
  }

  return { key };
}

export function getPublicUrl(key: string): string {
  return `${CDN_URL}/${key}`;
}

export async function getSignedDownloadUrl(
  key: string,
  _expiresIn: number = 3600
): Promise<string> {
  // BunnyCDN serves files directly from CDN URL
  // For private zones, you'd need to implement token authentication
  // For now, return the public CDN URL
  return getPublicUrl(key);
}

export async function deleteFromStorage(key: string): Promise<void> {
  const baseUrl = getStorageBaseUrl();
  const url = `${baseUrl}/${STORAGE_ZONE}/${key}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'AccessKey': API_KEY,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`BunnyCDN delete failed: ${response.status} - ${errorText}`);
  }
}

export function generateStorageKey(filename: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const sanitized = sanitizeFilename(filename);
  return `uploads/${timestamp}-${randomStr}-${sanitized}`;
}

export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[\\/]/).pop() || filename;
  
  // Replace dangerous characters
  return basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

export async function getFileStream(key: string): Promise<ReadableStream<Uint8Array>> {
  const url = getPublicUrl(key);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file stream: ${response.status}`);
  }
  
  if (!response.body) {
    throw new Error('Response body is null');
  }

  return response.body;
}

