import type { Product, Settings, Variant } from './types';
import { MAX_QUANTITY } from './client-feedback';
import { getWhatsAppUrl } from './contact';
import { money } from './format';

export type WhatsAppCheckoutItem = { product: Product; variant: Variant; quantity: number };
type WhatsAppCheckoutInput = Pick<Settings, 'whatsapp' | 'brandName'> & { items: readonly WhatsAppCheckoutItem[]; storeUrl?: string };

function storeReference(value?: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? `\nLoja: ${url.origin}/` : '';
  } catch { return ''; }
}

// This is an estimate from the displayed catalog, not a saved order or stock reservation.
export function buildWhatsAppCheckoutUrl({ whatsapp, brandName, items, storeUrl }: WhatsAppCheckoutInput): string | null {
  if (!items.length || !getWhatsAppUrl(whatsapp, '')) return null;
  const seen = new Set<string>();
  const lines: string[] = [];
  let subtotal = 0;

  for (const { product, variant, quantity } of items) {
    const catalogVariant = product.variants.find(item => item.id === variant.id);
    const key = JSON.stringify([product.id, variant.id]);
    if (!product.active || !catalogVariant || seen.has(key)
      || !Number.isSafeInteger(product.price) || product.price <= 0
      || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY
      || !Number.isSafeInteger(catalogVariant.stock) || quantity > catalogVariant.stock) return null;
    seen.add(key);
    const rowTotal = product.price * quantity;
    subtotal += rowTotal;
    if (!Number.isSafeInteger(rowTotal) || !Number.isSafeInteger(subtotal)) return null;
    lines.push(`${product.name}\nCor: ${catalogVariant.color} · Tamanho: ${catalogVariant.size}\nQuantidade: ${quantity} · Valor unitário: ${money(product.price)}\nSubtotal da peça: ${money(rowTotal)}`);
  }

  const greeting = brandName.trim() ? `Olá, ${brandName.trim()}!` : 'Olá!';
  const message = `${greeting} Gostaria de fazer um pedido com estas peças:\n\n${lines.join('\n\n')}\n\nSubtotal estimado: ${money(subtotal)}\nPodem confirmar a disponibilidade, o frete e as formas de pagamento?${storeReference(storeUrl)}`;
  return getWhatsAppUrl(whatsapp, message);
}
