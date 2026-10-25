export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const own = new URL(request.url).origin;
  const configured = process.env.APP_ORIGIN;
  if (!origin || (origin !== own && origin !== configured)) throw new HttpError(403, 'Origem da solicitação não permitida.');
}
export async function readBody(request: Request, limit = 1_000_000) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > limit) throw new HttpError(413, 'Arquivo ou conteúdo muito grande.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Envie o conteúdo da solicitação.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Arquivo ou conteúdo muito grande.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request, limit?: number): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Envie JSON.');
  const bytes = await readBody(request, limit);
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new HttpError(400, 'Conteúdo JSON inválido.'); }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error('Falha no servidor:', error instanceof Error ? error.message : 'erro desconhecido');
  return Response.json({ error: 'Não foi possível concluir. Tente novamente.' }, { status: 500 });
}
const globalRates = globalThis as typeof globalThis & { shopRates?: Map<string, { count: number; until: number }> };
const rates = globalRates.shopRates ??= new Map();
export function rateLimit(request: Request, action: string, max: number, windowMs: number) {
  const client = process.env.TRUST_PROXY === 'true' ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'direct') : 'direct';
  const key = `${action}:${client}`; const now = Date.now();
  for (const [id, value] of rates) if (value.until <= now) rates.delete(id);
  if (rates.size > 5000) throw new HttpError(429, 'Muitas solicitações. Aguarde alguns minutos.');
  const entry = rates.get(key) || { count: 0, until: now + windowMs };
  entry.count++; rates.set(key, entry);
  if (entry.count > max) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
}
