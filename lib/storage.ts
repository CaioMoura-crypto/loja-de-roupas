import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { HttpError } from './http';
const driver = () => process.env.STORAGE_DRIVER || 'local';
const dataRoot = () => path.resolve(process.env.DATA_DIR || './data');
let s3: S3Client | undefined;
function config() {
  const Bucket = process.env.S3_BUCKET;
  if (!Bucket) throw new Error('Configure S3_BUCKET.');
  const prefix = process.env.S3_PREFIX || 'loja-de-roupas/';
  if (!prefix || prefix.includes('..')) throw new Error('Prefixo S3 inválido.');
  s3 ??= new S3Client({ region: process.env.S3_REGION || 'us-east-1', endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? { credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } } : {}) });
  return { client: s3, Bucket, prefix: prefix.replace(/\/$/, '') + '/' };
}
function filePath(key: string) {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes('..')) throw new Error('Chave inválida.');
  return path.join(dataRoot(), key);
}
export async function readObject(key: string): Promise<{ data: Buffer; etag?: string } | null> {
  if (driver() === 's3') {
    const { client, Bucket, prefix } = config();
    try { const r = await client.send(new GetObjectCommand({ Bucket, Key: prefix + key })); return { data: Buffer.from(await r.Body!.transformToByteArray()), etag: r.ETag }; }
    catch (e) { if ((e as { name?: string }).name === 'NoSuchKey' || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null; throw e; }
  }
  if (driver() !== 'local') throw new Error('STORAGE_DRIVER inválido.');
  try { return { data: await fs.readFile(filePath(key)) }; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
}
export async function writeObject(key: string, data: Buffer | string, contentType: string, condition?: { etag?: string; create?: boolean }) {
  if (driver() === 's3') {
    const { client, Bucket, prefix } = config();
    try { await client.send(new PutObjectCommand({ Bucket, Key: prefix + key, Body: data, ContentType: contentType, ...(condition?.etag ? { IfMatch: condition.etag } : condition?.create ? { IfNoneMatch: '*' } : {}) })); }
    catch (e) { if ([409, 412].includes((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode || 0)) throw new HttpError(409, 'O conteúdo mudou. Recarregue antes de salvar novamente.'); throw e; }
    return;
  }
  const target = filePath(key); await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const tmp = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, data, { flag: 'wx', mode: 0o600 });
  try {
    if (condition?.create) {
      try { await fs.link(tmp, target); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new HttpError(409, 'Este registro já existe.'); throw e; }
    } else await fs.rename(tmp, target);
  } finally { await fs.rm(tmp, { force: true }); }
}
export async function listObjects(prefixKey: string) {
  if (driver() === 's3') {
    const { client, Bucket, prefix } = config(); let token: string | undefined; const keys: string[] = [];
    do { const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix + prefixKey, ContinuationToken: token })); keys.push(...(r.Contents || []).map(o => o.Key!.slice(prefix.length))); token = r.NextContinuationToken; } while (token);
    return keys;
  }
  try { return (await fs.readdir(filePath(prefixKey))).filter(x => x.endsWith('.json')).map(x => prefixKey + x); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
}
const locks = globalThis as typeof globalThis & { shopLocks?: Map<string, Promise<unknown>> };
const queue = locks.shopLocks ??= new Map();
export async function serialized<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = queue.get(key) || Promise.resolve();
  const task = previous.catch(() => {}).then(operation); queue.set(key, task);
  try { return await task; } finally { if (queue.get(key) === task) queue.delete(key); }
}
