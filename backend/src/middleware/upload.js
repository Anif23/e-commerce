import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';

const uploadDir = path.resolve(process.cwd(), env.uploads.dir);
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const extensionByMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

if (env.uploads.storage === 'local' && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

let s3Client;
const getS3Client = () => {
  const { bucket, region, endpoint, accessKeyId, secretAccessKey, sessionToken, forcePathStyle } = env.uploads.s3;
  if (!bucket) throw ApiError.badRequest('S3_BUCKET is required when UPLOAD_STORAGE=s3');
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw ApiError.badRequest('Configure both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or use the runtime role');
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) } }
        : {}),
    });
  }
  return s3Client;
};

const encodeKey = (key) => key.split('/').map(encodeURIComponent).join('/');

const publicObjectUrl = (key) => {
  const encodedKey = encodeKey(key);
  if (env.uploads.s3.publicUrl) return `${env.uploads.s3.publicUrl}/${encodedKey}`;

  const { endpoint, bucket, region, forcePathStyle } = env.uploads.s3;
  if (endpoint) {
    const base = new URL(endpoint);
    const endpointPath = base.pathname.replace(/\/$/, '');
    if (forcePathStyle) {
      base.pathname = `${endpointPath}/${encodeURIComponent(bucket)}/${encodedKey}`;
    } else {
      base.hostname = `${bucket}.${base.hostname}`;
      base.pathname = `${endpointPath}/${encodedKey}`;
    }
    return base.toString().replace(/\/$/, '');
  }

  return `https://${encodeURIComponent(bucket)}.s3.${region}.amazonaws.com/${encodedKey}`;
};

const uploadOneToS3 = async (file) => {
  const { bucket, keyPrefix } = env.uploads.s3;
  if (!file?.buffer || !file.mimetype) throw ApiError.badRequest('The uploaded image is empty or invalid');

  const ext = extensionByMime.get(file.mimetype);
  const group = file.fieldname === 'image' ? 'categories' : file.fieldname === 'logo' ? 'branding' : 'products';
  const key = [keyPrefix, group, `${Date.now()}-${crypto.randomUUID()}${ext}`].filter(Boolean).join('/');
  const location = publicObjectUrl(key);
  file.key = key;
  file.filename = key;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentLength: file.size,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  file.location = location;
};

const uploadFilesToS3 = async (files) => {
  const list = (Array.isArray(files) ? files : [files]).filter(Boolean);

  try {
    for (const file of list) await uploadOneToS3(file);
  } catch (error) {
    await deleteFiles(list.filter((file) => file.key));
    throw error;
  }
};

const fileFilter = (_req, file, cb) => {
  if (allowedImageTypes.has(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest('Only JPEG, PNG, WebP, GIF, and AVIF images are allowed'));
};

const commonOptions = {
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024, files: env.uploads.maxImages },
};

const localUploader = multer({
  ...commonOptions,
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${extensionByMime.get(file.mimetype)}`),
  }),
});
const memoryUploader = multer({ ...commonOptions, storage: multer.memoryStorage() });

const wrapParser = (parser) => (req, res, next) => {
  parser(req, res, async (error) => {
    if (error) return next(error);
    if (env.uploads.storage !== 's3') return next();

    try {
      await uploadFilesToS3(req.files ?? req.file);
      next();
    } catch (uploadError) {
      next(uploadError);
    }
  });
};

/** Multer-compatible upload methods, selecting local disk or S3 at runtime. */
export const upload = {
  single: (fieldName) =>
    wrapParser((req, res, next) =>
      (env.uploads.storage === 's3' ? memoryUploader : localUploader).single(fieldName)(req, res, next),
    ),
  array: (fieldName, maxCount) =>
    wrapParser((req, res, next) =>
      (env.uploads.storage === 's3' ? memoryUploader : localUploader).array(fieldName, maxCount)(req, res, next),
    ),
};

/** Turns a multer file into its stable public URL. */
export const fileUrl = (file) => {
  if (!file) return null;
  if (file.location) return file.location;
  return `${env.appUrl}/uploads/${file.filename}`;
};

/** Best-effort removal of newly-uploaded files after a failed database write. */
export const deleteFiles = async (files) => {
  if (!files) return;
  const list = Array.isArray(files) ? files : [files];

  if (env.uploads.storage === 's3') {
    const keys = list.map((file) => file?.key).filter(Boolean);
    if (!keys.length) return;
    try {
      const client = getS3Client();
      await Promise.all(keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: env.uploads.s3.bucket, Key }))));
    } catch (error) {
      console.error('[uploads] S3 cleanup failed:', error.message);
    }
    return;
  }

  await Promise.all(
    list.map(async (file) => {
      if (!file?.path) return;
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        if (error.code !== 'ENOENT') console.error('[uploads] local cleanup failed:', error.message);
      }
    }),
  );
};

export const keyFromStoredUrl = (storedUrl) => {
  try {
    const url = new URL(storedUrl);
    const { bucket, endpoint, publicUrl, keyPrefix } = env.uploads.s3;
    let key = null;

    if (publicUrl) {
      const base = new URL(publicUrl);
      const basePath = base.pathname.replace(/\/$/, '');
      if (url.origin === base.origin && url.pathname.startsWith(`${basePath}/`)) {
        key = decodeURIComponent(url.pathname.slice(basePath.length + 1));
      }
    }

    if (!key && endpoint) {
      const base = new URL(endpoint);
      const sameHost = url.hostname === base.hostname || url.hostname === `${bucket}.${base.hostname}`;
      if (url.protocol !== base.protocol || !sameHost || url.port !== base.port) return null;
      let pathname = decodeURIComponent(url.pathname);
      const endpointPath = base.pathname.replace(/\/$/, '');
      if (endpointPath && pathname.startsWith(`${endpointPath}/`)) pathname = pathname.slice(endpointPath.length + 1);
      pathname = pathname.replace(/^\//, '');
      if (pathname.startsWith(`${bucket}/`)) pathname = pathname.slice(bucket.length + 1);
      key = pathname;
    }

    if (
      !key &&
      url.hostname.startsWith(`${bucket}.s3.`) &&
      url.hostname.endsWith('.amazonaws.com')
    ) {
      key = decodeURIComponent(url.pathname.replace(/^\//, ''));
    }

    const scopedPrefix = keyPrefix ? `${keyPrefix}/` : '';
    if (!key || !key.startsWith(scopedPrefix) || key.split('/').some((segment) => segment === '.' || segment === '..')) return null;
    return key;
  } catch {
    return null;
  }
};

/** Removes S3 objects by their previously stored public URLs; local/external URLs are ignored. */
export const deleteStoredFiles = async (urls) => {
  if (env.uploads.storage !== 's3') return;
  const keys = (Array.isArray(urls) ? urls : [urls]).map(keyFromStoredUrl).filter(Boolean);
  if (!keys.length) return;

  try {
    const client = getS3Client();
    await Promise.all(keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: env.uploads.s3.bucket, Key }))));
  } catch (error) {
    console.error('[uploads] S3 asset cleanup failed:', error.message);
  }
};
