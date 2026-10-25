import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { HttpError } from './http';
const COOKIE = 'loja_roupas_admin';
const TTL = 60 * 60 * 8;
export function authConfigured() {
  return !!process.env.ADMIN_USERNAME && (process.env.ADMIN_PASSWORD?.length ?? 0) >= 12 && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32;
}
function equal(a: string, b: string) {
  const x = createHmac('sha256', 'constant-time-comparison').update(a).digest();
  const y = createHmac('sha256', 'constant-time-comparison').update(b).digest();
  return timingSafeEqual(x, y);
}
function sign(payload: string) {
  if (!authConfigured()) throw new HttpError(503, 'Execute pnpm run setup para configurar o administrador.');
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(`${payload}:${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`).digest('hex');
}
export function credentialsValid(username: string, password: string) {
  if (!authConfigured()) throw new HttpError(503, 'Execute pnpm run setup para configurar o administrador.');
  const userOk = equal(username, process.env.ADMIN_USERNAME!);
  return equal(password, process.env.ADMIN_PASSWORD!) && userOk;
}
export async function isAdmin() {
  if (!authConfigured()) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const [version, expires, signature, extra] = token.split('.');
  const expiry = Number(expires);
  if (version !== 'v1' || extra || !signature || !Number.isSafeInteger(expiry) || expiry <= Date.now() / 1000 || expiry > Date.now() / 1000 + TTL + 60) return false;
  return equal(signature, sign(`${version}.${expires}`));
}
export async function requireAdmin() { if (!(await isAdmin())) throw new HttpError(401, 'Entre novamente para continuar.'); }
export async function startSession() {
  const payload = `v1.${Math.floor(Date.now() / 1000) + TTL}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: TTL });
}
export async function endSession() { (await cookies()).delete(COOKIE); }
