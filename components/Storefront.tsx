'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Heart, Instagram, Menu, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem, Product, SiteContent, Variant } from '@/lib/types';
import { money } from '@/lib/format';
import CustomSort from './CustomSort';
import HomeCollections from './HomeCollections';
import HomeLocation from './HomeLocation';
import WhatsAppIcon from './WhatsAppIcon';
import FooterContact from './FooterContact';
import FloatingWhatsApp from './FloatingWhatsApp';
import { getContactDetails } from '@/lib/contact';
import { buildWhatsAppCheckoutUrl } from '@/lib/whatsapp-checkout';
import { getThemeStyle } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { MAX_QUANTITY, OrderRequestError, remainingQuantity, requestOrder, type OrderReceipt } from '@/lib/client-feedback';

const CART_KEY = 'loja-de-roupas:cart:v1';
const FAVORITES_KEY = 'loja-de-roupas:favorites:v1';
const scrollToCollection = () => document.getElementById('colecao')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Modal({ open, onClose, title, className = '', focusKey = '', returnFocusRef, children }: { open: boolean; onClose: () => void; title: string; className?: string; focusKey?: string; returnFocusRef?: { current: HTMLElement | null }; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const target = returnFocusRef?.current ?? previous;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, [open, returnFocusRef]);
  useEffect(() => {
    if (!open) return;
    const target = ref.current?.querySelector<HTMLElement>('[data-dialog-focus]:not(:disabled)') ?? ref.current?.querySelector<HTMLElement>('.dialog-title-focus');
    target?.focus({ preventScroll: true });
  }, [open, focusKey]);
  if (!open) return null;
  return <dialog ref={ref} className={`shop-dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <div className="dialog-shell"><div className="dialog-top"><h2 id={titleId} className="dialog-title-focus" tabIndex={-1}>{title}</h2><button type="button" className="icon-button" aria-label="Fechar janela" onClick={onClose}><X size={22}/></button></div>{children}</div>
  </dialog>;
}

function ProductDetail({ product, category, cart, orderPending, onAdd, onSiteCheckout, getWhatsAppUrl, favorite, onFavorite, demo }: { demo: boolean; product: Product; category: string; cart: CartItem[]; orderPending: boolean; onAdd: (product: Product, variant: Variant) => string | null; onSiteCheckout: (product: Product, variant: Variant) => string | null; getWhatsAppUrl: (product: Product, variant: Variant) => string | null; favorite: boolean; onFavorite: () => void }) {
  const firstVariant = product.variants.find(variant => variant.stock > 0) ?? product.variants[0];
  const [selectedColor, setSelectedColor] = useState(firstVariant?.color ?? '');
  const [selectedSize, setSelectedSize] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const variant = product.variants.find(item => item.color === selectedColor && item.size === selectedSize);
  const colors = [...new Map(product.variants.map(item => [item.color, item])).values()];
  const sizes = [...new Set(product.variants.map(item => item.size))];
  const remaining = variant ? remainingQuantity(product.id, variant, cart) : 0;
  const inCart = variant ? cart.find(item => item.productId === product.id && item.variantId === variant.id)?.quantity ?? 0 : 0;
  const image = product.images[imageIndex] || product.images[0];
  const stockMessage = variant && remaining === 0 ? (variant.stock <= 0 ? 'Esta combinação está indisponível.' : variant.stock > MAX_QUANTITY ? 'Você atingiu o limite de 20 peças desta combinação na sacola.' : 'Todas as peças disponíveis desta combinação já estão na sua sacola.') : '';
  const colorHasStock = product.variants.some(item => item.color === selectedColor && item.stock > 0);
  const sizeHelpId = useId();
  const whatsappUrl = variant && !orderPending ? getWhatsAppUrl(product, variant) : null;
  return <div className="product-detail">
    <div className="detail-gallery"><div className="detail-main-image">{image ? <img src={image} alt={`${product.name} — foto ${imageIndex + 1}`}/> : <div className="image-placeholder">Imagem em breve</div>}</div>{product.images.length > 1 && <div className="detail-thumbnails">{product.images.map((src, index) => <button key={`${src}-${index}`} type="button" className={index === imageIndex ? 'selected' : ''} aria-label={`Ver foto ${index + 1} de ${product.name}`} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}><img src={src} alt=""/></button>)}</div>}</div>
    <div className="detail-copy"><div className="eyebrow">{category}{product.badge && <span> / {product.badge}</span>}</div><div className="detail-title-row"><h3>{product.name}</h3><button type="button" className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`} aria-label={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'} aria-pressed={favorite} onClick={onFavorite}><Heart size={21}/></button></div><div className="detail-price">{money(product.price)}{product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}</div><p className="detail-description">{product.description}</p>{demo && <p className="catalog-demo detail-demo">Peça demonstrativa. Foto ilustrativa; cores, medidas e informações ainda serão substituídas pelo catálogo real.</p>}
      <fieldset className="variant-fieldset"><legend>Cor <span>{selectedColor || 'Indisponível'}</span></legend><div className="color-options">{colors.map(color => <button type="button" key={color.color} className={`color-swatch ${selectedColor === color.color ? 'selected' : ''}`} style={{ '--swatch': color.colorHex } as CSSProperties} aria-label={`Cor ${color.color}`} aria-pressed={selectedColor === color.color} title={color.color} onClick={() => { if (selectedColor !== color.color) { setSelectedColor(color.color); setSelectedSize(''); setFeedback(''); } }}><span/></button>)}</div></fieldset>
      <fieldset className="variant-fieldset" aria-describedby={sizeHelpId}><legend>Tamanho <span>{selectedSize || 'Escolha o seu'}</span></legend><div className="size-options">{sizes.map(size => { const item = product.variants.find(item => item.color === selectedColor && item.size === size); return <button type="button" key={size} disabled={!item || item.stock <= 0} className={selectedSize === size ? 'selected' : ''} aria-pressed={selectedSize === size} aria-label={`Tamanho ${size}${!item || item.stock <= 0 ? ', indisponível' : ''}`} onClick={() => { setSelectedSize(size); setFeedback(''); }}>{size}</button>; })}</div></fieldset>
      <p className="size-selection-hint" id={sizeHelpId}>{selectedSize ? `Tamanho ${selectedSize} selecionado.` : 'Selecione um tamanho para continuar.'}</p>
      <details className="size-help"><summary>Ajuda com o tamanho<Plus size={15}/></summary><p>As medidas desta peça ainda não foram cadastradas. Inclua sua dúvida nas observações da solicitação para confirmar o caimento antes de concluir a compra.</p></details>
      <button type="button" className="add-to-bag" disabled={!variant || remaining <= 0 || orderPending} onClick={() => { if (variant) setFeedback(onAdd(product, variant) ?? ''); }}>{orderPending ? 'Confirme o envio em andamento' : !colorHasStock ? 'Indisponível nesta cor' : !selectedSize ? 'Escolha um tamanho' : remaining > 0 ? 'Adicionar à sacola' : inCart > 0 ? 'Limite na sacola atingido' : 'Indisponível no momento'}<ShoppingBag size={18}/></button>
      <div className="product-checkout-options">
        <p>Como prefere finalizar?</p>
        <button type="button" className="solid-button" disabled={!variant || variant.stock <= 0 || orderPending} aria-describedby={sizeHelpId} onClick={() => { if (variant) setFeedback(onSiteCheckout(product, variant) ?? ''); }}>Finalizar no site</button>
        {whatsappUrl ? <a className="solid-button product-whatsapp-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><WhatsAppIcon width={20} height={20}/>Finalizar pelo WhatsApp</a> : <button type="button" className="solid-button product-whatsapp-button" disabled aria-describedby={sizeHelpId}><WhatsAppIcon width={20} height={20}/>Finalizar pelo WhatsApp</button>}
      </div>
      <p className="product-checkout-hint">Inclui esta peça e as que já estão na sacola.</p>
      <p className="product-feedback" role="status" aria-live="polite">{feedback || (orderPending ? 'Há uma solicitação aguardando confirmação. Abra a sacola para acompanhar ou verificar o envio.' : !colorHasStock ? 'Esta cor não tem tamanhos disponíveis no momento.' : stockMessage)}</p>
      {variant && remaining > 0 && variant.stock <= 3 && <p className="stock-note">{remaining === 1 ? '1 peça disponível' : `${remaining} peças disponíveis`} nesta combinação{inCart > 0 ? `; ${inCart} já na sacola` : ''}.</p>}
      <div className="detail-accordions">{[['Detalhes da peça', product.details], ['Composição', product.composition], ['Cuidados', product.care]].filter(([, text]) => text).map(([label, text], index) => <details key={label} open={index === 0}><summary>{label}<Plus size={16}/></summary><p>{text}</p></details>)}</div>
    </div>
  </div>;
}

type ToastMessage = { id: number; message: string; action?: 'cart' };
function Toast({ toast, suspended, onDismiss, onOpenCart }: { toast: ToastMessage; suspended: boolean; onDismiss: () => void; onOpenCart: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const remaining = useRef(6000);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (hovered || focused || hidden || suspended) return;
    const started = Date.now();
    const timer = setTimeout(onDismiss, remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [hovered, focused, hidden, suspended, onDismiss]);
  return <div className={`shop-toast ${suspended ? '' : 'visible'}`} inert={suspended} aria-hidden={suspended} data-toast-id={toast.id} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}><Check size={17} aria-hidden="true"/><span>{toast.message}</span>{toast.action === 'cart' && <button type="button" onClick={onOpenCart}>Ver sacola<ArrowRight size={15}/></button>}<button type="button" className="toast-dismiss" aria-label="Dispensar aviso" onClick={onDismiss}><X size={15}/></button></div>;
}

export default function Storefront({ content, view = 'home', initialCategory = 'all', promotionsOnly = false }: { content: SiteContent; view?: 'home' | 'collection'; initialCategory?: string; promotionsOnly?: boolean }) {
  const router = useRouter();
  useEffect(() => { if (view === 'collection') window.scrollTo({ top: 0, behavior: 'instant' }); }, [view, initialCategory, promotionsOnly]);
  const { settings, categories } = content;
  const visibleCategories = categories.filter(category => category.visible);
  const products = content.products.filter(product => product.active && visibleCategories.some(category => category.id === product.categoryId));
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sort, setSort] = useState('featured');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [siteCheckoutError, setSiteCheckoutError] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [orderResult, setOrderResult] = useState<OrderReceipt | null>(null);
  const [orderPending, setOrderPending] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', notes: '' });
  const idempotency = useRef<string>('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const bagTriggerRef = useRef<HTMLButtonElement>(null);
  const toastId = useRef(0);
  const pendingRequest = useRef<{ key: string; body: string } | null>(null);
  const cartOpenRef = useRef(false);
  const checkoutErrorRef = useRef<HTMLParagraphElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    setStoreUrl(window.location.origin);
    if (new URLSearchParams(window.location.search).get('sacola') === '1') setCartOpen(true);
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (Array.isArray(saved)) { const seen = new Set<string>(); setCart(saved.flatMap(item => {
        if (!item || typeof item.productId !== 'string' || typeof item.variantId !== 'string' || !Number.isInteger(item.quantity) || item.quantity <= 0) return [];
        const product = content.products.find(product => product.id === item.productId && product.active && content.categories.some(category => category.id === product.categoryId && category.visible));
        const variant = product?.variants.find(variant => variant.id === item.variantId && variant.stock > 0); const key = `${item.productId}:${item.variantId}`;
        if (!variant || seen.has(key)) return []; seen.add(key);
        return [{ productId: item.productId, variantId: item.variantId, quantity: Math.min(item.quantity, variant.stock, MAX_QUANTITY) }];
      })); }
      const savedFavorites: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      if (Array.isArray(savedFavorites)) setFavorites(savedFavorites.filter((id): id is string => typeof id === 'string'));
    } catch { /* Shopping remains available without browser persistence. */ }
    setStorageReady(true);
  }, [content]);
  useEffect(() => { if (storageReady) { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* Private browsing can disable persistence. */ } } }, [cart, storageReady]);
  useEffect(() => { if (storageReady) { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch { /* Private browsing can disable persistence. */ } } }, [favorites, storageReady]);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => { cartOpenRef.current = cartOpen; }, [cartOpen]);
  useEffect(() => { if (checkoutError && cartOpen && checkout) checkoutErrorRef.current?.focus({ preventScroll: true }); }, [checkoutError, cartOpen, checkout]);


  const filtered = useMemo(() => products.filter(product => (!promotionsOnly || product.compareAtPrice > product.price) && (category === 'all' || product.categoryId === category) && (!favoritesOnly || favorites.includes(product.id)) && (!search.trim() || normalize(`${product.name} ${product.description} ${categories.find(item => item.id === product.categoryId)?.name ?? ''}`).includes(normalize(search.trim())))).sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'new' ? products.indexOf(a) - products.indexOf(b) : Number(b.featured) - Number(a.featured)), [products, categories, category, favoritesOnly, favorites, search, sort, promotionsOnly]);
  const cartRows = cart.flatMap(item => { const product = products.find(product => product.id === item.productId); const variant = product?.variants.find(variant => variant.id === item.variantId); return product && variant ? [{ ...item, product, variant }] : []; });
  const cartCount = cartRows.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartRows.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  const activeCategory = visibleCategories.find(item => item.id === category);
  const toggleFavorite = (id: string) => setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const goToCollection = (categoryId = 'all') => {
    if (pendingRequest.current) { setMenuOpen(false); setCheckout(true); setCartOpen(true); return; }
    const target = visibleCategories.find(item => item.id === categoryId);
    setMenuOpen(false);
    if (view === 'collection' && !promotionsOnly && category === categoryId) {
      setFavoritesOnly(false); setSearch(''); scrollToCollection();
    } else router.push(target ? `/categorias/${encodeURIComponent(target.slug)}` : '/colecao');
  };
  const showingCatalog = view === 'collection' || searchOpen || favoritesOnly || !!search.trim();
  const collectionTitle = favoritesOnly ? 'Seus favoritos' : promotionsOnly ? 'Promoções' : activeCategory?.name || (search.trim() ? 'Resultados da busca' : 'A coleção');
  const showToast = (message: string, action?: 'cart') => setToast({ id: ++toastId.current, message, action });
  const changeCart = (next: CartItem[] | ((current: CartItem[]) => CartItem[])) => {
    if (pendingRequest.current) return;
    idempotency.current = ''; setCheckoutError(''); setSiteCheckoutError(''); setOrderResult(null); setCart(next);
  };
  const updateCustomer = (field: keyof typeof customer, value: string) => {
    if (pendingRequest.current) return;
    idempotency.current = ''; setCheckoutError(''); setCustomer(current => ({ ...current, [field]: value }));
  };
  const addToCart = (product: Product, variant: Variant): string | null => {
    if (pendingRequest.current) return 'Abra a sacola para verificar a solicitação em andamento antes de adicionar outras peças.';
    if (remainingQuantity(product.id, variant, cart) <= 0) return variant.stock > MAX_QUANTITY ? 'O limite é de 20 peças por combinação em cada pedido.' : 'Você já adicionou todas as peças disponíveis dessa combinação.';
    changeCart(current => { const item = current.find(item => item.productId === product.id && item.variantId === variant.id); return item ? current.map(row => row === item ? { ...row, quantity: Math.min(row.quantity + 1, variant.stock, MAX_QUANTITY) } : row) : [...current, { productId: product.id, variantId: variant.id, quantity: 1 }]; });
    setSelectedProduct(null); showToast(`${product.name} adicionada à sacola.`, 'cart');
    return null;
  };
  const openCart = () => { if (pendingRequest.current) setCheckout(true); setCartOpen(true); };
  const navigateToSiteCheckout = (nextCart: CartItem[]): string | null => {
    if (pendingRequest.current) return 'Abra a sacola para verificar a solicitação em andamento antes de continuar.';
    try { localStorage.setItem(CART_KEY, JSON.stringify(nextCart)); }
    catch { return 'Não foi possível abrir a finalização. Permita o armazenamento deste site e tente novamente.'; }
    changeCart(nextCart);
    setSelectedProduct(null); setCartOpen(false); setToast(null);
    router.push('/checkout');
    return null;
  };
  const startProductCheckout = (product: Product, variant: Variant): string | null => {
    if (pendingRequest.current) return 'Abra a sacola para verificar a solicitação em andamento antes de adicionar outras peças.';
    if (variant.stock <= 0) return 'Esta combinação está indisponível.';
    const existing = cart.find(item => item.productId === product.id && item.variantId === variant.id);
    if (existing && existing.quantity > Math.min(variant.stock, MAX_QUANTITY)) return 'Atualize a quantidade desta peça na sacola antes de continuar.';
    return navigateToSiteCheckout(existing ? cart : [...cart, { productId: product.id, variantId: variant.id, quantity: 1 }]);
  };
  const getProductWhatsAppUrl = (product: Product, variant: Variant): string | null => {
    if (pendingRequest.current) return null;
    const existing = cartRows.some(item => item.productId === product.id && item.variantId === variant.id);
    const items = existing ? cartRows : [...cartRows, { product, variant, quantity: 1 }];
    return buildWhatsAppCheckoutUrl({ whatsapp: settings.whatsapp, brandName: settings.brandName, items, storeUrl });
  };
  const cartWhatsAppUrl = orderPending ? null : buildWhatsAppCheckoutUrl({ whatsapp: settings.whatsapp, brandName: settings.brandName, items: cartRows, storeUrl });
  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (submittingRef.current || !cartRows.length) return;
    submittingRef.current = true; setSubmitting(true); setCheckoutError('');
    if (!idempotency.current) idempotency.current = crypto.randomUUID();
    const attempt = pendingRequest.current ?? { key: idempotency.current, body: JSON.stringify({ customer, items: cartRows.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }) };
    pendingRequest.current = attempt; setOrderPending(true);
    try {
      const receipt = await requestOrder(attempt.body, attempt.key);
      setOrderResult(receipt); setCart([]); idempotency.current = ''; pendingRequest.current = null; setOrderPending(false); setCheckout(false);
      if (!cartOpenRef.current) showToast('Recebemos sua solicitação. Veja a confirmação na sacola.', 'cart');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Não foi possível confirmar o envio. Verifique novamente.');
      if (error instanceof OrderRequestError && !error.uncertain) { pendingRequest.current = null; setOrderPending(false); }
    } finally { submittingRef.current = false; setSubmitting(false); }
  };
  const contact = getContactDetails(settings);
  const instagramUrl = settings.instagram ? (settings.instagram.startsWith('https://') ? settings.instagram : `https://www.instagram.com/${settings.instagram.replace(/^@/, '')}`) : '';

  return <div className="storefront" onClickCapture={event => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="/"]') : null;
    if (link && pendingRequest.current) { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); openCart(); }
  }} style={getThemeStyle(settings)}>
    <a className="skip-link" href={showingCatalog ? "#colecao" : "#destaques"}>Pular para as peças</a>
    {settings.announcement && <div className="announcement"><span>{settings.announcement}</span></div>}
    <header className="store-header"><button type="button" className="icon-button mobile-menu-button" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={22}/></button><a href="/" className="brand" aria-label={`${settings.brandName}, início`}>{settings.brandName}</a><nav className="desktop-nav" aria-label="Navegação principal"><a href="/colecao">A coleção</a><a href="/promocoes">Promoções</a><a href="#informacoes">Informações</a></nav><div className="header-actions"><button ref={searchTriggerRef} type="button" className="icon-button" aria-label={searchOpen ? 'Fechar busca' : 'Buscar peças'} aria-expanded={searchOpen} onClick={() => setSearchOpen(current => !current)}>{searchOpen ? <X size={20}/> : <Search size={20}/>}</button><button type="button" className="icon-button header-favorites" aria-label="Ver favoritos" aria-pressed={favoritesOnly} onClick={() => { setFavoritesOnly(current => !current); scrollToCollection(); }}><Heart size={20}/>{favorites.length > 0 && <span className="favorite-dot"/>}</button><button ref={bagTriggerRef} type="button" className="bag-button" aria-label={`Abrir sacola, ${cartCount} ${cartCount === 1 ? 'peça' : 'peças'}`} onClick={openCart}><ShoppingBag size={19}/><span className="bag-label">Sacola</span><span className="bag-count">{cartCount}</span></button></div></header>
    {searchOpen && <div className="search-bar"><Search size={20}/><label className="sr-only" htmlFor="collection-search">Buscar na coleção</label><input ref={searchRef} id="collection-search" type="search" value={search} placeholder="Encontre sua próxima peça…" onChange={event => { setSearch(event.target.value); setFavoritesOnly(false); }} onKeyDown={event => { if (event.key === 'Enter') scrollToCollection(); if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false); searchTriggerRef.current?.focus(); } }}/><a href="#colecao">Ver resultados <ArrowRight size={16}/></a></div>}
    <main>{!showingCatalog && <><section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">{settings.heroEyebrow && <p className="hero-subtitle">{settings.heroEyebrow}</p>}<h1 id="hero-title">{settings.heroTitle}</h1><p className="hero-description">{settings.heroDescription}</p><button type="button" className="solid-button hero-cta" onClick={() => goToCollection()}>{settings.heroButton || 'Explorar a coleção'}</button></div>
      <div className="hero-visual">{settings.heroImage ? <img src={settings.heroImage} alt={`Inspiração de moda feminina da ${settings.brandName}`} fetchPriority="high"/> : <div className="hero-image-fallback">{settings.brandName}</div>}</div>
    </section>
      <div id="destaques" className="home-highlights">{settings.catalogIsDemo && <p className="catalog-demo home-demo section-wrap">Catálogo demonstrativo · fotos ilustrativas, preços e estoque de exemplo.</p>}<HomeCollections products={products} categories={visibleCategories} selectedCategoryIds={settings.homeCategoryIds} onOpenProduct={setSelectedProduct} suspended={!!selectedProduct || cartOpen || menuOpen}/></div>
      <HomeLocation settings={settings}/>
      </>}
      {showingCatalog && <section id="colecao" className="collection-section section-wrap" aria-labelledby="collection-title"><nav className="collection-breadcrumb" aria-label="Caminho da página"><a href="/">Início</a><span aria-hidden="true">/</span><span aria-current="page">{collectionTitle}</span></nav><div className="section-heading"><div><h1 id="collection-title">{collectionTitle}</h1>{activeCategory?.description && <p className="collection-description">{activeCategory.description}</p>}</div></div>{settings.catalogIsDemo && <p className="catalog-demo">Catálogo demonstrativo · fotos ilustrativas, preços e estoque de exemplo.</p>}<div className="collection-toolbar"><nav className="category-tabs" aria-label="Categorias"><a href="/colecao" className={category === 'all' && !promotionsOnly ? 'active' : ''} aria-current={category === 'all' && !promotionsOnly ? 'page' : undefined}>Todas</a>{visibleCategories.map(item => <a key={item.id} href={`/categorias/${encodeURIComponent(item.slug)}`} className={category === item.id ? 'active' : ''} aria-current={category === item.id ? 'page' : undefined}>{item.name}</a>)}</nav><CustomSort value={sort} onChange={setSort}/></div><div className="collection-status"><span aria-live="polite">{filtered.length} {filtered.length === 1 ? 'peça' : 'peças'}{search && ` para “${search}”`}</span>{favoritesOnly && <button type="button" onClick={() => setFavoritesOnly(false)}>Favoritos <X size={13}/></button>}{(search || category !== 'all') && <button type="button" onClick={() => { if (initialCategory !== 'all') goToCollection(); else { setSearch(''); setCategory('all'); } }}>Limpar filtros <X size={13}/></button>}</div>
        {filtered.length ? <div className="product-grid">{filtered.map(product => { const categoryName = visibleCategories.find(item => item.id === product.categoryId)?.name ?? ''; const available = product.variants.some(variant => variant.stock > 0); const colorVariants = [...new Map(product.variants.map(item => [item.color, item])).values()]; return <article className="product-card" key={product.id}><div className="product-image-wrap"><button type="button" className="product-image-button" onClick={() => setSelectedProduct(product)} aria-label={`Ver ${product.name}, ${money(product.price)}`}>{product.images[0] ? <img className="product-image-primary" src={product.images[0]} alt={product.name} loading="lazy"/> : <div className="image-placeholder">Imagem em breve</div>}{product.images[1] && <img className="product-image-secondary" src={product.images[1]} alt="" loading="lazy"/>}<span className="product-quick-view">Conhecer a peça </span></button>{(product.badge || !available) && <span className="product-badge">{!available ? 'Esgotado' : product.badge}</span>}<button type="button" className={`product-favorite favorite-button ${favorites.includes(product.id) ? 'is-favorite' : ''}`} aria-label={`${favorites.includes(product.id) ? 'Remover' : 'Salvar'} ${product.name} ${favorites.includes(product.id) ? 'dos' : 'nos'} favoritos`} aria-pressed={favorites.includes(product.id)} onClick={() => toggleFavorite(product.id)}><Heart size={19}/></button></div><div className="product-meta"><span>{categoryName}</span><div className="product-color-dots" aria-label={`Cores: ${colorVariants.map(item => item.color).join(', ')}`}>{colorVariants.slice(0, 5).map(item => <i key={item.color} style={{ background: item.colorHex }} title={item.color}/>)}</div></div><h2><button type="button" onClick={() => setSelectedProduct(product)}>{product.name}</button></h2><div className="product-price">{money(product.price)}{product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}</div></article>; })}</div> : <div className="empty-collection"><Search size={30} strokeWidth={1}/><h3>{favoritesOnly ? 'Suas próximas favoritas estão por aqui.' : 'Ainda não encontramos essa peça.'}</h3><p>{favoritesOnly ? 'Toque no coração de uma peça para guardar sua seleção.' : 'Experimente outra busca ou explore a coleção completa.'}</p><button type="button" className="text-link" onClick={() => goToCollection()}>Explorar a coleção<ArrowRight size={16}/></button></div>}
      </section>}
    </main>
    <footer id="informacoes" className="store-footer">
      <div className="footer-top">
        <div className="footer-brand-block"><a className="brand footer-brand" href="/">{settings.brandName}</a>{settings.footerText && <p>{settings.footerText}</p>}{(settings.legalName || settings.taxId || settings.businessAddress) && <div className="footer-business">{settings.legalName && <p>{settings.legalName}</p>}{settings.taxId && <p>CPF/CNPJ: {settings.taxId}</p>}{settings.businessAddress && <address>{settings.businessAddress}</address>}</div>}</div>
        {(settings.shippingNote || settings.returnsNote) && <div className="footer-information">
          {settings.shippingNote && <div><h2>Entrega</h2><p>{settings.shippingNote}</p></div>}
          {settings.returnsNote && <div><h2>Detalhes das peças</h2><p>{settings.returnsNote}</p></div>}
        </div>}
        <FooterContact settings={settings}>
          {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram size={15}/>Instagram</a>}
        </FooterContact>
        {(settings.privacyPolicy || settings.purchaseTerms || settings.returnsPolicy) && <nav className="footer-column" aria-label="Políticas da loja"><h2>Informações da loja</h2>{settings.privacyPolicy && <a href="/privacidade">Privacidade</a>}{settings.purchaseTerms && <a href="/termos-de-compra">Termos de compra</a>}{settings.returnsPolicy && <a href="/trocas-e-devolucoes">Trocas e devoluções</a>}</nav>}
      </div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} {settings.brandName}. Todos os direitos reservados.</p><a href="/admin">Área administrativa</a></div>
    </footer>
    <FloatingWhatsApp settings={settings} suspended={!!selectedProduct || cartOpen || menuOpen}/>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={toast?.id}>{!selectedProduct && !cartOpen && !menuOpen ? toast?.message : ''}</span></div>
    {toast && <Toast key={toast.id} toast={toast} suspended={!!selectedProduct || cartOpen || menuOpen} onDismiss={() => setToast(null)} onOpenCart={() => { setToast(null); openCart(); }}/>}
    <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={settings.brandName} className="mobile-menu"><nav aria-label="Menu móvel"><a href="/colecao">A coleção</a><a href="/promocoes">Promoções</a>{visibleCategories.map(item => <a key={item.id} href={`/categorias/${encodeURIComponent(item.slug)}`}>{item.name}</a>)}<a href="#informacoes" onClick={() => setMenuOpen(false)}>Informações da loja</a><button type="button" onClick={() => { setMenuOpen(false); setFavoritesOnly(true); scrollToCollection(); }}>Meus favoritos<Heart size={20}/></button></nav><p>{settings.tagline}</p></Modal>
    <Modal open={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Um olhar mais de perto" className="product-dialog">{selectedProduct && <ProductDetail demo={settings.catalogIsDemo} key={selectedProduct.id} product={selectedProduct} cart={cart} orderPending={orderPending} category={visibleCategories.find(item => item.id === selectedProduct.categoryId)?.name ?? ''} onAdd={addToCart} onSiteCheckout={startProductCheckout} getWhatsAppUrl={getProductWhatsAppUrl} favorite={favorites.includes(selectedProduct.id)} onFavorite={() => toggleFavorite(selectedProduct.id)}/>}</Modal>
    <Modal open={cartOpen} returnFocusRef={bagTriggerRef} focusKey={orderResult ? 'result' : checkout ? 'checkout' : 'bag'} onClose={() => setCartOpen(false)} title={orderResult ? 'Recebemos suas escolhas' : checkout ? 'Solicitar pedido' : `Sua sacola (${cartCount})`} className="cart-dialog">
      {orderResult ? <div className="order-success" role="status" aria-live="polite"><div className="success-icon"><Check size={28} strokeWidth={1.4}/></div><p className="eyebrow">Solicitação recebida</p><h3>Obrigada por escolher<br/><em>{settings.brandName}.</em></h3><p>Recebemos suas escolhas. Nossa equipe entrará em contato para confirmar disponibilidade, frete e pagamento.</p><div className="order-receipt"><span>Número do pedido<strong>{orderResult.id}</strong></span><span>Subtotal das peças<strong>{money(orderResult.total)}</strong></span></div><p className="checkout-disclaimer">Nenhuma cobrança foi realizada. O envio desta solicitação não confirma o pagamento.</p>{orderResult.whatsappUrl && <a className="solid-button" href={orderResult.whatsappUrl} target="_blank" rel="noopener noreferrer">Conversar no WhatsApp</a>}{orderResult.whatsappUrl && contact.isDemoWhatsApp && <p className="checkout-disclaimer">Contato de demonstração · {contact.formattedWhatsApp}</p>}<button type="button" className="text-link" onClick={() => setCartOpen(false)}>Continuar explorando<ArrowRight size={16}/></button></div> : checkout ? <form className="checkout-form" onSubmit={submitOrder}><button type="button" className="text-link back-to-bag" onClick={() => setCheckout(false)}><ArrowLeft size={15}/>Voltar à sacola</button><p className="checkout-intro">Deixe seus dados para combinarmos os próximos passos. Frete e forma de pagamento serão confirmados com você.</p><label>Seu nome<input data-dialog-focus autoComplete="name" required minLength={2} maxLength={120} disabled={orderPending} value={customer.name} onChange={event => updateCustomer('name', event.target.value)}/></label><label>E-mail<input type="email" autoComplete="email" required maxLength={180} disabled={orderPending} value={customer.email} onChange={event => updateCustomer('email', event.target.value)}/></label><label>Telefone / WhatsApp<input type="tel" autoComplete="tel" required minLength={10} maxLength={24} placeholder="(11) 99999-9999" disabled={orderPending} value={customer.phone} onChange={event => updateCustomer('phone', event.target.value)}/></label><label>Algum detalhe? <span>(opcional)</span><textarea rows={3} maxLength={2000} placeholder="Dúvidas sobre as peças, cidade de entrega…" disabled={orderPending} value={customer.notes} onChange={event => updateCustomer('notes', event.target.value)}/></label><div className="cart-total"><span>Subtotal · {cartCount} {cartCount === 1 ? 'peça' : 'peças'}</span><strong>{money(total)}</strong></div><p className="checkout-disclaimer">Ao enviar, você solicita atendimento para concluir seu pedido. Não há cobrança online. Usaremos seus dados para tratar desta solicitação.</p>{checkoutError && <p ref={checkoutErrorRef} className="form-error" id="checkout-error" role="alert" tabIndex={-1}>{checkoutError}</p>}{submitting && <p className="checkout-status" role="status">Aguardando confirmação. Você pode fechar esta janela e acompanhar o envio pela sacola.</p>}{orderPending && !submitting && <p className="checkout-recovery">Seus dados e sua sacola estão preservados. Use “Verificar envio” para recuperar a confirmação da mesma solicitação.</p>}<button type="submit" className="solid-button" disabled={submitting} aria-busy={submitting} aria-describedby={checkoutError ? 'checkout-error' : undefined}>{submitting ? 'Enviando solicitação…' : orderPending ? 'Verificar envio' : 'Enviar solicitação de pedido'}</button></form> : cartRows.length ? <div className="cart-content">{orderPending && <p className="checkout-recovery" role="status">{submitting ? 'Sua solicitação está sendo enviada.' : 'Há uma solicitação aguardando confirmação.'} Suas escolhas estão preservadas até a confirmação.</p>}<div className="cart-items">{cartRows.map(item => <article className="cart-item" key={`${item.productId}-${item.variantId}`}>{item.product.images[0] ? <img src={item.product.images[0]} alt={item.product.name}/> : <div className="cart-no-image"/>}<div className="cart-item-info"><h3>{item.product.name}</h3><p>{item.variant.color} · {item.variant.size}</p><strong>{money(item.product.price * item.quantity)}</strong><div className="cart-item-controls"><div className="quantity-control"><button type="button" aria-label={`Diminuir quantidade de ${item.product.name}`} disabled={orderPending || item.quantity <= 1} onClick={() => changeCart(current => current.map(row => row.productId === item.productId && row.variantId === item.variantId ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row))}><Minus size={13}/></button><span aria-label={`Quantidade: ${item.quantity}`}>{item.quantity}</span><button type="button" aria-label={`Aumentar quantidade de ${item.product.name}`} disabled={orderPending || item.quantity >= Math.min(item.variant.stock, MAX_QUANTITY)} onClick={() => changeCart(current => current.map(row => row.productId === item.productId && row.variantId === item.variantId ? { ...row, quantity: Math.min(row.quantity + 1, item.variant.stock, MAX_QUANTITY) } : row))}><Plus size={13}/></button></div><button type="button" className="remove-item" disabled={orderPending} aria-label={`Remover ${item.product.name} da sacola`} onClick={() => changeCart(current => current.filter(row => !(row.productId === item.productId && row.variantId === item.variantId)))}><Trash2 size={15}/></button></div></div></article>)}</div><div className="cart-summary"><div className="cart-total"><span>Subtotal</span><strong>{money(total)}</strong></div><p>Escolha como prefere finalizar sua compra.</p><button type="button" className="solid-button" onClick={() => { if (pendingRequest.current) setCheckout(true); else setSiteCheckoutError(navigateToSiteCheckout(cart) ?? ''); }}>{orderPending ? 'Acompanhar solicitação' : 'Finalizar no site'}</button>{!orderPending && (cartWhatsAppUrl ? <a className="solid-button cart-whatsapp-button" href={cartWhatsAppUrl} target="_blank" rel="noopener noreferrer" onClick={event => { if (pendingRequest.current) event.preventDefault(); }}><WhatsAppIcon width={20} height={20}/>Finalizar pelo WhatsApp</a> : <button type="button" className="solid-button cart-whatsapp-button" disabled><WhatsAppIcon width={20} height={20}/>Finalizar pelo WhatsApp</button>)}{siteCheckoutError && <p className="form-error" role="alert">{siteCheckoutError}</p>}<button type="button" className="text-link" onClick={() => setCartOpen(false)}>Continuar escolhendo<ArrowRight size={16}/></button></div></div> : <div className="empty-bag"><ShoppingBag size={44} strokeWidth={1}/><h3>Espaço para suas<br/><em>próximas escolhas.</em></h3><p>Sua sacola está vazia. A coleção espera por você.</p><button type="button" className="solid-button" onClick={() => { setCartOpen(false); goToCollection(); }}>Explorar a coleção<ArrowRight size={18}/></button></div>}
    </Modal>
  </div>;
}
