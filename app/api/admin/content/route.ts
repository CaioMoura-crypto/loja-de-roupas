import { requireAdmin } from '@/lib/auth';
import { getContent, saveContent } from '@/lib/content';
import { checkOrigin, errorResponse, readJson } from '@/lib/http';
export const runtime = 'nodejs';
export async function GET() {
  try { await requireAdmin(); return Response.json(await getContent(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request) {
  try { checkOrigin(request); await requireAdmin(); return Response.json(await saveContent(await readJson(request)), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
