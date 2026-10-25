'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CreditCard, QrCode, ShoppingBag } from 'lucide-react';
import { MAX_QUANTITY } from '@/lib/client-feedback';
import { money } from '@/lib/format';
import { getThemeStyle } from '@/lib/theme';
import type { CartItem, Product, SiteContent, Variant } from '@/lib/types';
import StoreLegalDetails from './StoreLegalDetails';
import styles from './DemoCheckout.module.css';

const CART_KEY = 'loja-de-roupas:cart:v1';
const DEMO_PIX_CODE = 'PIX-DEMONSTRACAO-SEM-VALOR';
type PaymentMethod = 'pix' | 'card';
type DeliveryMethod = 'pickup' | 'delivery';
type CheckoutRow = CartItem & { product: Product; variant: Variant };

function restoreRows(saved: unknown, content: SiteContent): CheckoutRow[] {
  if (!Array.isArray(saved)) return [];
  const seen = new Set<string>();
  return saved.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<CartItem>;
    if (typeof candidate.productId !== 'string' || typeof candidate.variantId !== 'string'
      || typeof candidate.quantity !== 'number' || !Number.isInteger(candidate.quantity) || candidate.quantity <= 0) return [];
    const product = content.products.find(product => product.id === candidate.productId && product.active
      && content.categories.some(category => category.id === product.categoryId && category.visible));
    const variant = product?.variants.find(variant => variant.id === candidate.variantId && variant.stock > 0);
    const key = JSON.stringify([candidate.productId, candidate.variantId]);
    if (!product || !variant || seen.has(key)) return [];
    seen.add(key);
    return [{ productId: product.id, variantId: variant.id, quantity: Math.min(candidate.quantity, variant.stock, MAX_QUANTITY), product, variant }];
  });
}

export default function DemoCheckout({ content }: { content: SiteContent }) {
  const [rows, setRows] = useState<CheckoutRow[] | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [installments, setInstallments] = useState('1');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [reviewing, setReviewing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const successRef = useRef<HTMLHeadingElement>(null);
  const paymentRef = useRef<HTMLHeadingElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      setRows(restoreRows(JSON.parse(localStorage.getItem(CART_KEY) || '[]'), content));
    } catch {
      setStorageError(true);
      setRows([]);
    }
  }, [content]);

  useEffect(() => {
    if (completed) successRef.current?.focus();
  }, [completed]);
  useEffect(() => {
    if (reviewing && !completed) reviewRef.current?.focus();
  }, [reviewing, completed]);

  const subtotal = rows?.reduce((sum, row) => sum + row.product.price * row.quantity, 0) ?? 0;
  const shipping = deliveryMethod === 'delivery' ? 1490 : 0;
  const total = subtotal + shipping;
  const count = rows?.reduce((sum, row) => sum + row.quantity, 0) ?? 0;
  const pickupAddress = content.settings.locationAddress.trim();

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(DEMO_PIX_CODE);
      setCopyStatus('Código de exemplo copiado. Ele não permite pagamentos.');
    } catch {
      setCopyStatus('Não foi possível copiar. O código de exemplo está escrito acima.');
    }
  }

  function reviewPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rows?.length) setReviewing(true);
  }

  function resetSimulation() {
    setCompleted(false);
    setReviewing(false);
    setCopyStatus('');
    requestAnimationFrame(() => paymentRef.current?.focus());
  }

  return (
    <div className={styles.checkout} style={getThemeStyle(content.settings)}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={`${content.settings.brandName}, início`}>{content.settings.brandName}</Link>
        <Link href="/?sacola=1" className={styles.backLink}><ArrowLeft size={17} aria-hidden="true"/>Voltar à sacola</Link>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Finalizar compra</h1>
          <p>Suas escolhas, do seu jeito.</p>
        </div>
        <p className={styles.demoNotice}><strong>Esta é uma demonstração.</strong> Experimente Pix ou cartão com dados de exemplo. Nenhum pagamento ou pedido real será realizado.</p>

        {rows === null ? (
          <div className={styles.empty} role="status" aria-live="polite"><ShoppingBag size={28} aria-hidden="true"/><p>Carregando suas escolhas…</p></div>
        ) : !rows.length ? (
          <section className={styles.empty} aria-labelledby="empty-checkout-title">
            <ShoppingBag size={30} strokeWidth={1.4} aria-hidden="true"/>
            <h2 id="empty-checkout-title">Sua sacola está vazia</h2>
            <p>{storageError ? 'Não conseguimos recuperar sua sacola neste navegador. Volte à coleção e escolha uma peça para experimentar.' : 'Escolha suas peças favoritas para experimentar a finalização.'}</p>
            <Link href="/colecao" className={styles.primaryButton}>Explorar a coleção</Link>
          </section>
        ) : (
          <div className={styles.layout}>
            <div className={styles.paymentColumn}>
              {completed ? (
                <section className={styles.success} aria-labelledby="simulation-title">
                  <span className={styles.successIcon}><Check size={30} strokeWidth={1.4} aria-hidden="true"/></span>
                  <h2 id="simulation-title" ref={successRef} tabIndex={-1}>Simulação concluída</h2>
                  <p>Assim termina a experiência de compra na {content.settings.brandName}.</p>
                  <dl className={styles.receipt}>
                    <div><dt>Forma escolhida</dt><dd>{method === 'pix' ? 'Pix' : 'Cartão de crédito'}{method === 'card' && ` · ${installments}x`}</dd></div>
                    <div><dt>Modalidade de exemplo</dt><dd>{deliveryMethod === 'pickup' ? 'Retirada na loja' : 'Entrega em casa'}</dd></div>
                    <div><dt>Total demonstrativo</dt><dd>{money(total)}</dd></div>
                  </dl>
                  <p className={styles.helper}>Não houve cobrança nem criação de pedido. Suas peças continuam na sacola para você testar novamente.</p>
                  <button type="button" className={styles.primaryButton} onClick={resetSimulation}>Testar outra forma de pagamento</button>
                  <Link href="/colecao" className={styles.continueLink}>Continuar escolhendo</Link>
                </section>
              ) : reviewing ? (
                <section className={styles.review} aria-labelledby="review-title">
                  <h2 id="review-title" ref={reviewRef} tabIndex={-1}>Revise sua compra</h2>
                  <p className={styles.helper}>Confira o resumo antes de concluir esta simulação.</p>
                  <dl className={styles.reviewDetails}>
                    <div><dt>Compradora de exemplo</dt><dd>Cliente de demonstração<br/>cliente@criativa.example<br/>(00) 00000-0000 · CPF 000.000.000-00</dd></div>
                    <div><dt>{deliveryMethod === 'pickup' ? 'Retirada na loja · exemplo' : 'Entrega · exemplo'}</dt><dd>{deliveryMethod === 'pickup' ? pickupAddress || 'Endereço da loja não informado.' : 'Rua de Exemplo, 123 · Bairro de Exemplo\nCidade de Exemplo — BA · CEP 00000-000'}</dd></div>
                    <div><dt>Pagamento demonstrativo</dt><dd>{method === 'pix' ? 'Pix à vista' : `Cartão de crédito · ${installments}x · total ${money(total)}`}</dd></div>
                    <div><dt>Vendido por</dt><dd>{content.settings.legalName || `${content.settings.brandName} · identificação jurídica não informada`}</dd></div>
                  </dl>
                  <div className={styles.reviewTotal}><span>Total da simulação, com {deliveryMethod === 'pickup' ? 'retirada' : 'frete'}</span><strong>{money(total)}</strong></div>
                  <nav className={styles.policyLinks} aria-label="Políticas antes de finalizar"><Link href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</Link><Link href="/termos-de-compra" target="_blank" rel="noopener noreferrer">Condições de compra</Link><Link href="/trocas-e-devolucoes" target="_blank" rel="noopener noreferrer">Trocas e devoluções</Link></nav>
                  <p className={styles.helper}>Os links abrem em outra aba. Os dados e valores são ilustrativos; nenhum pedido ou pagamento real será realizado.</p>
                  <button type="button" className={styles.primaryButton} onClick={() => setCompleted(true)}>Simular pagamento de {money(total)}</button>
                  <button type="button" className={styles.continueLink} onClick={() => { setReviewing(false); requestAnimationFrame(() => paymentRef.current?.focus()); }}>Alterar entrega ou pagamento</button>
                </section>
              ) : (
                <form onSubmit={reviewPurchase} className={styles.form}>
                  <section className={styles.customer} aria-labelledby="customer-title">
                    <div className={styles.sectionHeading}><h2 id="customer-title">Dados da compra</h2><span>Exemplo preenchido</span></div>
                    <div className={styles.customerFields}>
                      <label>Nome<input readOnly value="Cliente de demonstração" autoComplete="off" aria-describedby="customer-note"/></label>
                      <label>E-mail<input readOnly value="cliente@criativa.example" autoComplete="off" aria-describedby="customer-note"/></label>
                      <label>Telefone<input readOnly value="(00) 00000-0000" autoComplete="off" aria-describedby="customer-note"/></label>
                      <label>CPF<input readOnly value="000.000.000-00" autoComplete="off" aria-describedby="customer-note"/></label>
                    </div>
                    <p id="customer-note" className={styles.helper}>Dados ilustrativos. Não é necessário informar seus dados pessoais.</p>
                  </section>

                  <section className={styles.deliverySection} aria-labelledby="delivery-title">
                    <h2 id="delivery-title">Como quer receber?</h2>
                    <fieldset className={styles.methods}>
                      <legend className={styles.srOnly}>Modalidade de entrega demonstrativa</legend>
                      <label className={`${styles.method} ${deliveryMethod === 'pickup' ? styles.methodSelected : ''}`}><input type="radio" name="delivery-method" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')}/><span>Retirar na loja<small>{money(0)} · exemplo</small></span></label>
                      <label className={`${styles.method} ${deliveryMethod === 'delivery' ? styles.methodSelected : ''}`}><input type="radio" name="delivery-method" checked={deliveryMethod === 'delivery'} onChange={() => setDeliveryMethod('delivery')}/><span>Receber em casa<small>{money(1490)} · exemplo</small></span></label>
                    </fieldset>
                    {deliveryMethod === 'delivery' ? <div className={styles.addressFields}>
                      <label>CEP<input readOnly value="00000-000" autoComplete="off" aria-describedby="delivery-note"/></label>
                      <label>Endereço<input readOnly value="Rua de Exemplo, 123" autoComplete="off" aria-describedby="delivery-note"/></label>
                      <label>Bairro<input readOnly value="Bairro de Exemplo" autoComplete="off" aria-describedby="delivery-note"/></label>
                      <label>Cidade / UF<input readOnly value="Cidade de Exemplo — BA" autoComplete="off" aria-describedby="delivery-note"/></label>
                    </div> : <p className={styles.pickupAddress}>{pickupAddress || 'Endereço de retirada não informado.'}</p>}
                    <p id="delivery-note" className={styles.helper}>{deliveryMethod === 'delivery' ? 'Endereço fictício e frete de R$ 14,90 apenas ilustrativo. Não há cálculo de frete ou prazo de entrega real.' : 'Retirada ilustrativa. A disponibilidade e o prazo real devem ser definidos pela loja.'}</p>
                  </section>

                  <section className={styles.payment} aria-labelledby="payment-title">
                    <h2 id="payment-title" ref={paymentRef} tabIndex={-1}>Como prefere pagar?</h2>
                    <fieldset className={styles.methods}>
                      <legend className={styles.srOnly}>Forma de pagamento demonstrativa</legend>
                      <label className={`${styles.method} ${method === 'pix' ? styles.methodSelected : ''}`}>
                        <input type="radio" name="payment-method" value="pix" checked={method === 'pix'} onChange={() => { setMethod('pix'); setCopyStatus(''); }}/>
                        <QrCode size={22} strokeWidth={1.5} aria-hidden="true"/><span>Pix<small>À vista</small></span>
                      </label>
                      <label className={`${styles.method} ${method === 'card' ? styles.methodSelected : ''}`}>
                        <input type="radio" name="payment-method" value="card" checked={method === 'card'} onChange={() => { setMethod('card'); setCopyStatus(''); }}/>
                        <CreditCard size={24} strokeWidth={1.5} aria-hidden="true"/><span>Cartão<small>Crédito</small></span>
                      </label>
                    </fieldset>

                    {method === 'pix' ? (
                      <div className={styles.paymentPanel} key="pix">
                        <div className={styles.pixDetails}>
                          <div className={styles.qrIllustration}><QrCode size={100} strokeWidth={1.1} aria-hidden="true"/><span>QR ilustrativo</span></div>
                          <div><h3>Pagamento com Pix</h3><p>Na loja, o cliente escaneia o QR ou copia o código. Aqui, eles são apenas uma prévia e não permitem pagar.</p></div>
                        </div>
                        <div className={styles.pixCode}><span>Código de exemplo · sem valor</span><p>{DEMO_PIX_CODE}</p></div>
                        <button type="button" className={styles.copyButton} onClick={copyPixCode}>Copiar código de exemplo</button>
                        <p className={styles.copyStatus} role="status" aria-live="polite">{copyStatus}</p>
                      </div>
                    ) : (
                      <div className={styles.paymentPanel} key="card">
                        <p id="card-demo-note" className={styles.cardNote}>Cartão fictício, já preenchido para a demonstração. Os campos não recebem dados reais.</p>
                        <div className={styles.cardFields}>
                          <label className={styles.fullField}>Número do cartão<input readOnly value="0000 0000 0000 0000" autoComplete="off" aria-describedby="card-demo-note"/></label>
                          <label className={styles.fullField}>Nome no cartão<input readOnly value="CLIENTE DE DEMONSTRAÇÃO" autoComplete="off" aria-describedby="card-demo-note"/></label>
                          <label>Validade<input readOnly value="12/30" autoComplete="off" aria-describedby="card-demo-note"/></label>
                          <label>Código de segurança<input readOnly value="000" autoComplete="off" aria-describedby="card-demo-note"/></label>
                          <label className={styles.fullField}>Parcelas de exemplo<select value={installments} onChange={event => setInstallments(event.target.value)}>{[1, 2, 3].map(value => <option key={value} value={value}>{total % value === 0 ? `${value}x de ${money(total / value)}${value === 1 ? ' · à vista' : ' · sem juros'}` : `${value}x · total ${money(total)}`}</option>)}</select></label>
                        </div>
                      </div>
                    )}
                    <div className={styles.reviewTotal}><span>Total demonstrativo</span><strong>{money(total)}</strong></div>
                    <button type="submit" className={styles.primaryButton}>Revisar compra</button>
                    <p className={styles.finalNote}>Você confere o resumo antes de concluir a simulação.</p>
                  </section>
                </form>
              )}
            </div>

            <aside className={styles.summary} aria-labelledby="summary-title">
              <div className={styles.summaryHeading}><h2 id="summary-title">Suas escolhas</h2><span>{count} {count === 1 ? 'peça' : 'peças'}</span></div>
              <ul className={styles.items}>
                {rows.map(row => (
                  <li className={styles.item} key={`${row.productId}:${row.variantId}`}>
                    {row.product.images[0] ? <img src={row.product.images[0]} alt={row.product.name} width={84} height={112}/> : <div className={styles.missingImage} aria-hidden="true"><ShoppingBag size={22}/></div>}
                    <div className={styles.itemInfo}><h3>{row.product.name}</h3><p>{row.variant.color} · {row.variant.size}</p><p>{row.quantity} × {money(row.product.price)}</p><strong>{money(row.product.price * row.quantity)}</strong></div>
                  </li>
                ))}
              </ul>
              <dl className={styles.totals}>
                <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
                <div><dt>{deliveryMethod === 'pickup' ? 'Retirada na loja' : 'Frete'} <span>(exemplo)</span></dt><dd>{money(shipping)}</dd></div>
                <div className={styles.total}><dt>Total demonstrativo</dt><dd>{money(total)}</dd></div>
              </dl>
              <p className={styles.summaryNote}>Peças e valores de demonstração.</p>
              <Link href="/?sacola=1" className={styles.editLink}>Editar minha sacola</Link>
            </aside>
          </div>
        )}
        <div className={styles.seller}><StoreLegalDetails settings={content.settings}/></div>
      </main>
      <footer className={styles.footer}><span>{content.settings.brandName}</span><nav className={styles.policyLinks} aria-label="Informações da loja"><Link href="/privacidade">Privacidade</Link><Link href="/termos-de-compra">Condições de compra</Link><Link href="/trocas-e-devolucoes">Trocas e devoluções</Link></nav><Link href="/colecao">Continuar escolhendo</Link><p>Uma prévia da sua experiência de compra.</p></footer>
    </div>
  );
}
