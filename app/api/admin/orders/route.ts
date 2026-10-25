import { requireAdmin } from '@/lib/auth';
import { getOrders, updateOrder } from '@/lib/orders';
import { checkOrigin, errorResponse, readJson } from '@/lib/http';
export const runtime = 'nodejs';
export async function GET() {
  try { await requireAdmin(); return Response.json({ orders: await getOrders() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try { checkOrigin(request); await requireAdmin(); return Response.json({ order: await updateOrder(await readJson(request, 4096)) }); }
  catch (error) { return errorResponse(error); }
}
