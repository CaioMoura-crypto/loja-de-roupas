import { readObject } from '@/lib/storage';
import { errorResponse } from '@/lib/http';
export const runtime = 'nodejs';
const types: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await params;
    if (key.length !== 1 || !/^[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(key[0])) return new Response('Não encontrado', { status: 404 });
    const record = await readObject(`media/${key[0]}`);
    if (!record) return new Response('Não encontrado', { status: 404 });
    return new Response(new Uint8Array(record.data), { headers: { 'Content-Type': types[key[0].split('.').pop()!], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" } });
  } catch (error) { return errorResponse(error); }
}
