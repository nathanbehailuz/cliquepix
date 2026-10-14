import fs from 'fs';
import path from 'path';
import { put, get } from '@vercel/blob';
import { uploadDir } from './uploads.mjs';

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp'
};

export function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL);
}

export function blobPathFor(filename) {
  return `uploads/${filename}`;
}

export function contentTypeFor(filename) {
  const ext = path.extname(filename || '').slice(1).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

export async function persistUpload(filename, file) {
  if (useBlob()) {
    await put(blobPathFor(filename), file.buffer, {
      access: 'private',
      addRandomSuffix: false,
      contentType: file.mimetype || contentTypeFor(filename)
    });
    return;
  }

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
}

export async function readUploadBuffer(filenameOrUrl) {
  const filename = path.basename(String(filenameOrUrl).replace(/^.*\/uploads\//, ''));
  if (!filename || filename === '.' || filename === '..') {
    return null;
  }

  if (useBlob()) {
    const result = await get(blobPathFor(filename), { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath);
}
