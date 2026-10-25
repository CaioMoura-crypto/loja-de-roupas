import { createHash } from 'node:crypto';
import { getContent } from './content';
import { readObject, writeObject, listObjects, serialized } from './storage';
import { HttpError } from './http';
import { integer, object, text } from './validation';
import type { Order } from './types';
type StoredOrder = { order: Order; fingerprint: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export async function createOrder(value: unknown, idempotencyKey: string | null) {
  if (!idempotencyKey || !/^[a-zA-Z0-9-]{16,100}$/.test(idempotencyKey)) throw new HttpError(400, 'Identificador de solicitação inválido. Atualize a página.');
  const input = object(value); const c = object(input.customer, 'Cliente');
  const customer = { name: text(c.name, 'Nome', 120, true), email: text(c.email, 'E-mail', 200, true), phone: text(c.phone, 'Telefone', 30, true), notes: text(c.notes ?? '', 'Observações', 2000) };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new HttpError(400, 'Informe um e-mail válido.');
  if (!/^[+\d\s()-]{10,30}$/.test(customer.phone) || customer.phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'Informe um telefone com DDD.');
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) throw new HttpError(400, 'Sua sacola deve ter de 1 a 50 itens.');
  const requested = input.items.map(item => { const i = object(item, 'Item'); return { productId: text(i.productId, 'Produto', 120, true), variantId: text(i.variantId, 'Variação', 120, true), quantity: integer(i.quantity, 'Quantidade', 1, 20) }; });
  const ids = requested.map(i => `${i.productId}:${i.variantId}`);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Variação duplicada na sacola.');
  const fingerprint = hash(JSON.stringify({ customer, items: requested }));
  const id = `CRI-${hash(idempotencyKey).slice(0, 24).toUpperCase()}`;
  const key = `orders/${id}.json`;
  return serialized(key, async () => {
    const existing = await readObject(key);
    if (existing) {
      const stored = JSON.parse(existing.data.toString()) as StoredOrder;
      if (stored.fingerprint !== fingerprint) throw new HttpError(409, 'Esta solicitação já foi usada. Inicie um novo pedido.');
      return stored.order;
    }
    const content = await getContent();
    const items = requested.map(item => {
      const p = content.products.find(p => p.id === item.productId && p.active && content.categories.some(c => c.id === p.categoryId && c.visible));
      const v = p?.variants.find(v => v.id === item.variantId);
      if (!p || !v) throw new HttpError(409, 'Uma peça não está mais disponível. Atualize sua sacola.');
      if (item.quantity > v.stock) throw new HttpError(409, `Quantidade indisponível para ${p.name}, ${v.size} / ${v.color}. Atualize sua sacola.`);
      return { ...item, name: p.name, size: v.size, color: v.color, unitPrice: p.price };
    });
    const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const order: Order = { id, createdAt: new Date().toISOString(), status: 'pending', customer, items, total };
    try { await writeObject(key, JSON.stringify({ order, fingerprint }), 'application/json', { create: true }); }
    catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        const winner = await readObject(key);
        if (winner) { const stored = JSON.parse(winner.data.toString()) as StoredOrder; if (stored.fingerprint === fingerprint) return stored.order; }
      }
      throw error;
    }
    return order;
  });
}
export async function getOrders() {
  const keys = await listObjects('orders/');
  const orders: Order[] = [];
  // Small batches keep S3 reads bounded for a growing inquiry list.
  for (let start = 0; start < keys.length; start += 20) {
    const records = await Promise.all(keys.slice(start, start + 20).map(readObject));
    for (const record of records) if (record) orders.push((JSON.parse(record.data.toString()) as StoredOrder).order);
  }
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function updateOrder(input: unknown) {
  const value = object(input);
  const id = text(value.id, 'Pedido', 40, true);
  if (!/^CRI-[A-F0-9]{24}$/.test(id)) throw new HttpError(400, 'Identificador inválido.');
  if (!['pending', 'contacted', 'completed', 'cancelled'].includes(String(value.status))) throw new HttpError(400, 'Status inválido.');
  const key = `orders/${id}.json`;
  return serialized(key, async () => {
    const record = await readObject(key); if (!record) throw new HttpError(404, 'Pedido não encontrado.');
    const stored = JSON.parse(record.data.toString()) as StoredOrder;
    stored.order.status = value.status as Order['status'];
    await writeObject(key, JSON.stringify(stored), 'application/json', { etag: record.etag });
    return stored.order;
  });
}
