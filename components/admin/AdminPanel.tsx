'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, ExternalLink, LayoutTemplate, LoaderCircle, LogOut, Package, Plus, Save, Search, ShoppingBag, Tags, X } from 'lucide-react';
import type { Category, Product, Settings, SiteContent } from '@/lib/types';
import { money } from '@/lib/format';
import ProductEditor from './ProductEditor';
import CategoriesEditor from './CategoriesEditor';
import SettingsEditor from './SettingsEditor';
import OrdersPanel from './OrdersPanel';
import { ProductThumbnail } from './AdminFields';
import { AdminValidationContext, firstContentIssue, type ValidationIssue } from './AdminValidation';

type Tab = 'products' | 'categories' | 'appearance' | 'orders';
const tabs: { id: Tab; name: string; shortName?: string; icon: typeof Package }[] = [{ id: 'products', name: 'Produtos', icon: Package }, { id: 'categories', name: 'Categorias', icon: Tags }, { id: 'appearance', name: 'Aparência e conteúdo', shortName: 'Aparência', icon: LayoutTemplate }, { id: 'orders', name: 'Pedidos', icon: ShoppingBag }];
const uid = () => crypto.randomUUID();

export default function AdminPanel({ initialContent }: { initialContent: SiteContent }) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(JSON.stringify(initialContent));
  const [tab, setTab] = useState<Tab>('products');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [issue, setIssue] = useState<ValidationIssue | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ field?: string; productId?: string; heading?: boolean } | null>(null);
  const listScroll = useRef(0);
  const returnProductId = useRef<string | null>(null);
  const dirty = JSON.stringify(content) !== saved;
  const selected = content.products.find(product => product.id === selectedId);
  const matching = useMemo(() => content.products.filter(product => `${product.name} ${content.categories.find(category => category.id === product.categoryId)?.name ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [content, query]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty || uploads) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty, uploads]);
  useEffect(() => {
    if (!focusTarget) return;
    const frame = requestAnimationFrame(() => {
      let target: HTMLElement | null = null;
      if (focusTarget.field) {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-admin-field]')).filter(element => element.dataset.adminField === focusTarget.field);
        target = controls.find(element => !(element instanceof HTMLInputElement) || element.type !== 'color') || controls[0] || null;
      } else if (focusTarget.productId) {
        target = Array.from(document.querySelectorAll<HTMLElement>('[data-product-trigger]')).find(element => element.dataset.productTrigger === focusTarget.productId && element.getClientRects().length > 0) || null;
        window.scrollTo({ top: listScroll.current });
      } else if (focusTarget.heading) target = document.getElementById('admin-product-heading');
      const returningToRow = !!target && !!focusTarget.productId;
      if (!target) target = document.getElementById('admin-add-product');
      target?.focus({ preventScroll: true });
      if (!returningToRow) target?.scrollIntoView({ block: 'center', behavior: 'instant' });
      setFocusTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusTarget, selectedId, tab]);
  function openProduct(id: string) {
    if (!selectedId) listScroll.current = window.scrollY;
    returnProductId.current = id;
    setSelectedId(id);
    setFocusTarget({ heading: true });
  }
  function closeProduct() {
    if (!matching.some(product => product.id === returnProductId.current)) setQuery('');
    setSelectedId(null);
    setFocusTarget({ productId: returnProductId.current || selectedId || undefined });
  }
  function changeContent(update: (current: SiteContent) => SiteContent) { setContent(update); setSuccess(''); }
  useEffect(() => {
    if (issue && firstContentIssue(content)?.field !== issue.field) {
      setIssue(null); setError('');
    }
  }, [content, issue]);
  function patchProduct(id: string, changes: Partial<Product>) { changeContent(current => ({ ...current, products: current.products.map(product => product.id === id ? { ...product, ...changes } : product) })); }
  function patchCategory(id: string, changes: Partial<Category>) { changeContent(current => ({ ...current, categories: current.categories.map(category => category.id === id ? { ...category, ...changes } : category) })); }
  function patchSetting<K extends keyof Settings>(key: K, value: Settings[K]) { changeContent(current => ({ ...current, settings: { ...current.settings, [key]: value } })); }
  const onUpload = (busy: boolean) => setUploads(count => Math.max(0, count + (busy ? 1 : -1)));
  function addProduct() {
    if (!content.categories.length) { setError('Crie uma categoria antes de adicionar o primeiro produto.'); setTab('categories'); return; }
    const id = uid();
    const product: Product = { id, name: 'Nova peça', slug: `nova-peca-${id.slice(0, 6)}`, categoryId: content.categories[0].id, price: 0, compareAtPrice: 0, description: '', details: '', composition: '', care: '', images: [], variants: [{ id: uid(), size: 'M', color: 'Natural', colorHex: '#D9D3C5', stock: 0 }], featured: false, active: false, badge: '' };
    changeContent(current => ({ ...current, products: [product, ...current.products] })); openProduct(id); setError(''); setIssue(null);
  }
  function duplicateProduct(product: Product) { const id = uid(); changeContent(current => ({ ...current, products: [{ ...product, id, name: `${product.name} (cópia)`, slug: `${product.slug}-copia-${id.slice(0, 6)}`, active: false, variants: product.variants.map(variant => ({ ...variant, id: uid() })) }, ...current.products] })); openProduct(id); }
  function removeProduct(product: Product) { if (!window.confirm(`Excluir “${product.name}” do catálogo? A exclusão será aplicada ao salvar as alterações.`)) return; changeContent(current => ({ ...current, products: current.products.filter(item => item.id !== product.id) })); closeProduct(); }
  function addCategory() { const id = uid(); changeContent(current => ({ ...current, categories: [...current.categories, { id, name: 'Nova categoria', slug: `nova-categoria-${id.slice(0, 6)}`, description: '', image: '', visible: true }] })); }
  function removeCategory(category: Category) { if (content.products.some(product => product.categoryId === category.id)) { setError(`“${category.name}” possui produtos. Mova esses produtos para outra categoria antes de excluí-la.`); return; } if (window.confirm(`Excluir a categoria “${category.name}”? A exclusão será aplicada ao salvar as alterações.`)) changeContent(current => ({ ...current, categories: current.categories.filter(item => item.id !== category.id) })); }
  function moveCategory(index: number, direction: number) { changeContent(current => { const categories = [...current.categories]; [categories[index], categories[index + direction]] = [categories[index + direction], categories[index]]; return { ...current, categories }; }); }
  async function save() {
    setError(''); setSuccess('');
    const nextIssue = firstContentIssue(content);
    setIssue(nextIssue);
    if (nextIssue) {
      setError(nextIssue.message);
      setTab(nextIssue.tab);
      if (!selectedId && nextIssue.productId) listScroll.current = window.scrollY;
      setSelectedId(nextIssue.productId || null);
      if (nextIssue.productId) returnProductId.current = nextIssue.productId;
      setFocusTarget({ field: nextIssue.field });
      return;
    }
    const payload = { ...content, products: content.products.map(product => ({ ...product, images: product.images.map(image => image.trim()).filter(Boolean) })) };
    setSaving(true);
    try {
      const response = await fetch('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 409 ? 'O conteúdo foi alterado em outra sessão. Suas alterações continuam aqui. Baixe uma cópia antes de recarregar a página e aplicar suas mudanças à versão atual.' : data.error || 'Não foi possível salvar.');
      setContent(data); setSaved(JSON.stringify(data)); setSuccess('Alterações salvas. A loja já está atualizada.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar. Suas alterações foram mantidas.'); }
    finally { setSaving(false); }
  }
  async function logout() {
    if ((dirty || uploads) && !window.confirm('Existem alterações não salvas ou imagens sendo enviadas. Sair e descartar essas alterações?')) return;
    try { const response = await fetch('/api/admin/session', { method: 'DELETE' }); if (!response.ok) throw new Error('Não foi possível sair. Tente novamente.'); window.location.assign('/admin/login'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível sair.'); }
  }
  function exportDraft() { const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'copia-conteudo-loja.json'; link.click(); URL.revokeObjectURL(url); }
  const title = tabs.find(item => item.id === tab)?.name;
  return <AdminValidationContext.Provider value={issue}><div className="admin-shell">
    <aside className="admin-sidebar"><a className="admin-brand" href="/" target="_blank" rel="noreferrer">{content.settings.brandName}<span>ESTÚDIO DA LOJA</span></a><nav aria-label="Navegação do painel">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'admin-nav-item admin-nav-active' : 'admin-nav-item'} onClick={() => { setTab(item.id); setSelectedId(null); }} aria-label={item.name} aria-current={tab === item.id ? 'page' : undefined} disabled={saving || uploads > 0}><item.icon size={19} /><span>{item.shortName || item.name}</span>{tab === item.id && <ChevronRight size={15} />}</button>)}</nav><div className="admin-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer" aria-label="Visitar a loja"><ExternalLink size={17} />Visitar a loja</a><button aria-label="Sair do painel" onClick={logout} disabled={saving || uploads > 0}><LogOut size={17} />Sair do painel</button><p>Os detalhes fazem a diferença.</p></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><h1>{title}</h1></div><div className="admin-save-area"><span className={`admin-save-status${dirty ? ' admin-unsaved' : ''}`} role="status">{saving ? 'Salvando alterações…' : uploads ? 'Enviando imagens…' : dirty ? 'Alterações não salvas' : 'Tudo em dia'}</span><button className="admin-button admin-button-primary" onClick={save} disabled={!dirty || saving || uploads > 0}>{saving ? <LoaderCircle size={17} className="admin-spin" /> : <Save size={17} />}{saving ? 'Salvando…' : 'Salvar alterações'}</button></div></header>
    {error && <div className="admin-alert admin-alert-error" role="alert"><span>{error}</span><button className="admin-text-button" onClick={exportDraft}>Baixar cópia das alterações</button><button className="admin-icon-button" onClick={() => { setError(''); setIssue(null); }} aria-label="Fechar mensagem"><X size={17} /></button></div>}
    {success && <div className="admin-alert admin-alert-success" role="status"><Check size={18} />{success}</div>}
    <fieldset className="admin-editable" disabled={saving || uploads > 0}>
    {tab === 'products' && (selected ? <ProductEditor key={selected.id} product={selected} categories={content.categories} patch={changes => patchProduct(selected.id, changes)} onBack={closeProduct} onDelete={() => removeProduct(selected)} onDuplicate={() => duplicateProduct(selected)} onUpload={onUpload} /> : <>
      <div className="admin-section-heading admin-catalog-heading"><div><h2>Seu catálogo, com cuidado.</h2><p>Preço, descrição e cada detalhe da coleção, em um só lugar.</p></div><button id="admin-add-product" className="admin-button admin-button-primary" onClick={addProduct}><Plus size={18} />Adicionar produto</button></div>
      <div className="admin-stats"><div><span>Peças na coleção</span><strong>{content.products.length.toString().padStart(2, '0')}</strong></div><div><span>Produtos publicados</span><strong>{content.products.filter(product => product.active).length.toString().padStart(2, '0')}</strong></div><div><span>Categorias</span><strong>{content.categories.length.toString().padStart(2, '0')}</strong></div></div>
      <div className="admin-card"><div className="admin-table-toolbar"><h3>Todos os produtos <span>{matching.length}</span></h3><label className="admin-search"><Search size={17} /><input aria-label="Buscar produtos" placeholder="Buscar peça ou categoria" value={query} onChange={event => setQuery(event.target.value)} /></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Preço</th><th scope="col">Estoque</th><th scope="col">Status</th><th scope="col"><span className="admin-sr-only">Editar</span></th></tr></thead><tbody>{matching.map(product => <tr key={product.id}><td><button className="admin-product-cell" data-product-trigger={product.id} onClick={() => openProduct(product.id)}><span className="admin-sr-only">Editar produto: </span><ProductThumbnail src={product.images[0]} /><span><strong>{product.name}</strong><small>{product.variants.length} variações{product.featured ? ' · Destaque' : ''}</small></span></button></td><td>{content.categories.find(category => category.id === product.categoryId)?.name || 'Sem categoria'}</td><td className="admin-price-cell"><strong>{money(product.price)}</strong>{product.compareAtPrice > product.price && <small>{money(product.compareAtPrice)}</small>}</td><td>{product.variants.reduce((sum, variant) => sum + variant.stock, 0)} un.</td><td><span className={`admin-badge${product.active ? ' admin-badge-live' : ''}`}>{product.active ? 'Publicado' : 'Rascunho'}</span></td><td><button className="admin-icon-button" onClick={() => openProduct(product.id)} aria-label={`Editar ${product.name}`}><ChevronRight size={19} /></button></td></tr>)}</tbody></table></div>
      <ul className="admin-mobile-products" aria-label="Produtos">{matching.map(product => <li key={product.id}><button className="admin-mobile-product" data-product-trigger={product.id} onClick={() => openProduct(product.id)}><span className="admin-sr-only">Editar produto: </span><ProductThumbnail src={product.images[0]} /><span className="admin-mobile-product-content"><span className="admin-mobile-product-main"><strong>{product.name}</strong><span className="admin-price-cell"><strong>{money(product.price)}</strong>{product.compareAtPrice > product.price && <small>{money(product.compareAtPrice)}</small>}</span></span><span className="admin-mobile-product-meta">{content.categories.find(category => category.id === product.categoryId)?.name || 'Sem categoria'} · {product.variants.reduce((sum, variant) => sum + variant.stock, 0)} un.</span><span className="admin-mobile-product-meta"><span className={`admin-badge${product.active ? ' admin-badge-live' : ''}`}>{product.active ? 'Publicado' : 'Rascunho'}</span><span>{product.variants.length} variações{product.featured ? ' · Destaque' : ''}</span></span></span></button></li>)}</ul>{!matching.length && <div className="admin-empty"><Package size={30} /><h3>{query ? 'Nenhuma peça encontrada' : 'Sua coleção começa aqui'}</h3><p>{query ? 'Tente buscar por outro nome ou categoria.' : 'Adicione sua primeira peça e cuide de cada detalhe.'}</p></div>}</div>
    </>)}
    {tab === 'categories' && <CategoriesEditor categories={content.categories} products={content.products} patch={patchCategory} add={addCategory} remove={removeCategory} move={moveCategory} onUpload={onUpload} />}
    {tab === 'appearance' && <SettingsEditor settings={content.settings} categories={content.categories} patch={patchSetting} onUpload={onUpload} />}
    {tab === 'orders' && <OrdersPanel />}
    </fieldset><footer className="admin-footer"><span>{content.settings.brandName} · Administração</span><span>Feito para cuidar de cada detalhe.</span></footer></main>
  </div></AdminValidationContext.Provider>;
}
