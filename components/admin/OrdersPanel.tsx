'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, LoaderCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import type { Order } from '@/lib/types';
import { money } from '@/lib/format';
import { Field } from './AdminFields';
const statusNames: Record<Order['status'], string> = { pending: 'Recebido', contacted: 'Em atendimento', completed: 'Concluído', cancelled: 'Cancelado' };

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const loadOrders = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await fetch('/api/admin/orders', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os pedidos.'); setOrders(data.orders); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar os pedidos.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadOrders(); }, [loadOrders]);
  async function updateOrder(id: string, status: Order['status']) {
    setBusy(id); setError('');
    try { const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o pedido.'); setOrders(current => current.map(order => order.id === id ? data.order : order)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível atualizar o pedido.'); }
    finally { setBusy(''); }
  }
  return <><div className="admin-section-heading"><div><h2>De olho em cada pedido.</h2><p>Solicitações recebidas na loja. Pagamento e entrega são combinados com a cliente.</p></div><button className="admin-button" onClick={loadOrders} disabled={loading || !!busy}><RefreshCw size={17} className={loading ? 'admin-spin' : ''} />Atualizar</button></div>
    <div className="admin-order-note"><ShoppingBag size={19} /><p>Estes registros são <strong>solicitações de compra, sem pagamento online</strong>. Concluir um pedido aqui altera apenas o status do atendimento.</p></div>
    {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
    {loading && <p role="status" className="admin-loading"><LoaderCircle size={18} className="admin-spin" />Carregando solicitações…</p>}
    <div className="admin-orders">{orders.map(order => <details className="admin-card admin-order" key={order.id}><summary><div><span className="admin-order-id">#{order.id.slice(-8).toUpperCase()}</span><strong>{order.customer.name}</strong><small>{new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bahia' })}</small></div><span className={`admin-badge admin-status-${order.status}`}>{statusNames[order.status]}</span><strong>{money(order.total)}</strong><ChevronRight size={18} /></summary><div className="admin-order-body">
      <div className="admin-order-customer"><h3>Contato da cliente</h3><p><strong>{order.customer.name}</strong></p><p>{order.customer.email}</p><p>{order.customer.phone}</p>{order.customer.notes && <p className="admin-customer-note">{order.customer.notes}</p>}<Field label="Status do atendimento"><select value={order.status} disabled={!!busy || loading} onChange={event => updateOrder(order.id, event.target.value as Order['status'])}>{Object.entries(statusNames).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></Field>{busy === order.id && <small role="status">Atualizando status…</small>}</div>
      <div className="admin-order-items"><h3>Peças solicitadas</h3>{order.items.map((item, index) => <div key={`${item.productId}-${item.variantId}-${index}`}><span><strong>{item.name}</strong><small>{item.size} · {item.color} · {item.quantity} un. × {money(item.unitPrice)}</small></span><strong>{money(item.unitPrice * item.quantity)}</strong></div>)}<footer><span>Total dos produtos</span><strong>{money(order.total)}</strong></footer><small>Frete e pagamento a combinar.</small></div>
    </div></details>)}</div>
    {!loading && !orders.length && !error && <div className="admin-empty admin-card"><ShoppingBag size={32} /><h3>As próximas histórias chegam aqui.</h3><p>As solicitações feitas na loja aparecerão nesta lista.</p></div>}
  </>;
}
