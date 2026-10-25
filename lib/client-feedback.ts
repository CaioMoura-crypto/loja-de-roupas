import type { CartItem, Variant } from './types';

export const MAX_QUANTITY = 20;
export const ORDER_TIMEOUT_MS = 20_000;

export function remainingQuantity(productId: string, variant: Variant, cart: CartItem[]) {
  const quantity = cart.find(item => item.productId === productId && item.variantId === variant.id)?.quantity ?? 0;
  return Math.max(0, Math.min(variant.stock, MAX_QUANTITY) - quantity);
}

export type OrderReceipt = { id: string; total: number; whatsappUrl?: string };

export class OrderRequestError extends Error {
  constructor(message: string, public readonly uncertain: boolean) {
    super(message);
    this.name = 'OrderRequestError';
  }
}

// The same key AND serialized body must be reused after an uncertain result.
// Aborting the browser request cannot cancel a write already received by the server.
export async function requestOrder(body: string, key: string, options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<OrderReceipt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? ORDER_TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body,
      signal: controller.signal,
    });
    const data = await response.json().catch(error => {
      if (controller.signal.aborted) throw error;
      return {};
    });
    if (!response.ok) {
      throw new OrderRequestError(
        typeof data.error === 'string' ? data.error : 'Não foi possível enviar a solicitação. Tente novamente.',
        response.status >= 500 || response.status === 408,
      );
    }
    if (typeof data.order?.id !== 'string' || !data.order.id || !Number.isFinite(data.order.total) || data.order.total < 0) {
      throw new OrderRequestError('Não conseguimos confirmar o envio. Verifique novamente com os mesmos dados.', true);
    }
    return { id: data.order.id, total: data.order.total, ...(typeof data.whatsappUrl === 'string' ? { whatsappUrl: data.whatsappUrl } : {}) };
  } catch (error) {
    if (error instanceof OrderRequestError) throw error;
    throw new OrderRequestError(controller.signal.aborted
      ? 'A confirmação demorou mais que o esperado. Verifique o envio novamente; a mesma solicitação será consultada sem duplicar seu pedido.'
      : 'A conexão foi interrompida antes da confirmação. Verifique o envio novamente com os mesmos dados.', true);
  } finally {
    clearTimeout(timer);
  }
}
