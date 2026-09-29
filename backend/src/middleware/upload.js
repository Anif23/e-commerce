import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';

const uploadDir = path.resolve(process.cwd(), env.uploads.dir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.toLowerCase().replace(/[^a-z0-9.\-_]/g, '-');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image uploads are allowed'));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024, files: env.uploads.maxImages },
});

/** Turns a multer file into the public URL served by /uploads. */
export const fileUrl = (file) => (file ? `${env.appUrl}/uploads/${file.filename}` : null);

/** Best-effort cleanup of files that were written before validation failed. */
export const deleteFiles = (files) => {
  if (!files) return;

  const list = Array.isArray(files) ? files : [files];

  for (const file of list) {
    if (!file?.path) continue;
    fs.unlink(file.path, () => {});
  }
};
