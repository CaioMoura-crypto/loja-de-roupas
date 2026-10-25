import { credentialsValid, startSession, endSession } from '@/lib/auth';
import { checkOrigin, readJson, rateLimit, HttpError, errorResponse } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request); rateLimit(request, 'login', 10, 15 * 60_000);
    const value = await readJson(request, 4096) as Record<string, unknown>;
    if (!value || typeof value.username !== 'string' || typeof value.password !== 'string') throw new HttpError(400, 'Informe usuário e senha.');
    if (!credentialsValid(value.username, value.password)) throw new HttpError(401, 'Usuário ou senha incorretos.');
    await startSession(); return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  try { checkOrigin(request); await endSession(); return Response.json({ ok: true }); }
  catch (error) { return errorResponse(error); }
}
