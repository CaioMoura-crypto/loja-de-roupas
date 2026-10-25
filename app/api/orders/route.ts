import { createOrder } from '@/lib/orders';
import { getContent } from '@/lib/content';
import { checkOrigin, errorResponse, rateLimit, readJson } from '@/lib/http';
import { money } from '@/lib/format';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request); rateLimit(request, 'order', 30, 10 * 60_000);
    const order = await createOrder(await readJson(request, 32_000), request.headers.get('idempotency-key'));
    const { settings } = await getContent();
    const message = `Olá! Enviei a solicitação ${order.id}.\n${order.items.map(i => `${i.quantity}x ${i.name} — ${i.size}, ${i.color}`).join('\n')}\nSubtotal: ${money(order.total)}. Gostaria de confirmar disponibilidade, frete e pagamento.`;
    const whatsappUrl = settings.whatsapp ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}` : undefined;
    return Response.json({ order: { id: order.id, total: order.total }, ...(whatsappUrl ? { whatsappUrl } : {}) }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
