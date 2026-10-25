import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { checkOrigin, errorResponse, HttpError, readBody } from '@/lib/http';
import { inspectImage } from '@/lib/media';
import { writeObject } from '@/lib/storage';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request); await requireAdmin();
    const bytes = await readBody(request, 11 * 1024 * 1024);
    const type = request.headers.get('content-type') || '';
    if (!type.startsWith('multipart/form-data')) throw new HttpError(415, 'Envie um formulário de imagem.');
    let form: FormData;
    try { form = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': type } }).formData(); }
    catch { throw new HttpError(400, 'Formulário inválido.'); }
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) throw new HttpError(400, 'Envie uma imagem de até 10 MB.');
    const data = Buffer.from(await file.arrayBuffer()); const info = inspectImage(data);
    const key = `media/${randomUUID()}.${info.ext}`;
    await writeObject(key, data, info.type, { create: true });
    return Response.json({ url: `/api/media/${key.slice(6)}` });
  } catch (error) { return errorResponse(error); }
}
