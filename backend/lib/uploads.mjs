import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadDir = path.join(__dirname, '..', '..', 'uploads');

export const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

export function safeUploadFilename(prefix, originalname) {
  const ext = path.extname(originalname || '').slice(1).toLowerCase();
  const safeExt = ALLOWED_EXTS.has(ext) ? ext : 'jpg';
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  return `${prefix}-${unique}.${safeExt}`;
}

export function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').slice(1).toLowerCase();
  if (file.mimetype.startsWith('image/') && ALLOWED_EXTS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Please upload a jpg, jpeg, png, gif, or webp image.'), false);
  }
}

export function createImageUpload(_prefix, fileSize) {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: imageFileFilter,
    limits: { fileSize }
  });
}

export function storedUrlFor(filename) {
  return `/uploads/${filename}`;
}

export function urlMatchesFilename(url, filename) {
  if (!url || !filename) {
    return false;
  }
  return path.basename(String(url)) === filename;
}

export function ensureLocalUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}
