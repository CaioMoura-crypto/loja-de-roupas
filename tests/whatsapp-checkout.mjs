import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Import the pure formatter in memory; these tests never contact WhatsApp or the order API.
const modules = new Map();
for (const name of ['client-feedback', 'contact', 'format', 'whatsapp-checkout']) {
  const source = await readFile(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  let { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  for (const [dependency, url] of modules) outputText = outputText.replaceAll(`'./${dependency}'`, JSON.stringify(url));
  modules.set(name, `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { buildWhatsAppCheckoutUrl } = await import(modules.get('whatsapp-checkout'));
const variant = { id: 'rose-m', size: 'M / 40', color: 'Rosé & pérola', colorHex: '#ded3d3', stock: 3 };
const product = { id: 'vestido', name: 'Vestido Ação & Verão', price: 12345, active: true, variants: [variant] };
const settings = { whatsapp: '+55 (71) 00000-0000', brandName: 'CRIATIVA' };
const build = (items, options = {}) => buildWhatsAppCheckoutUrl({ ...settings, ...options, items });
const item = (patch = {}) => ({ product, variant, quantity: 2, ...patch });

test('encodes names, accents, colors and sizes without losing monetary precision', () => {
  const href = build([item()]);
  const url = new URL(href);
  const message = url.searchParams.get('text');
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/5571000000000');
  assert.match(href, /%26/);
  assert.match(message, /Olá, CRIATIVA!/);
  assert.match(message, /Vestido Ação & Verão/);
  assert.match(message, /Cor: Rosé & pérola · Tamanho: M \/ 40/);
  assert.match(message, /Quantidade: 2 · Valor unitário: R\$\s123,45/);
  assert.match(message, /Subtotal da peça: R\$\s246,90/);
  assert.match(message, /Subtotal estimado: R\$\s246,90/);
  assert.match(message, /confirmar a disponibilidade, o frete e as formas de pagamento/);
  assert.doesNotMatch(message, /pedido confirmado|pagamento confirmado|número do pedido/i);
});

test('sums multiple pieces in cents and uses the selected catalog variant', () => {
  const secondVariant = { ...variant, id: 'azul-g', color: 'Azul', size: 'G' };
  const secondProduct = { ...product, id: 'conjunto', name: 'Conjunto', price: 19990, variants: [secondVariant] };
  const href = build([item(), { product: secondProduct, variant: { ...secondVariant, color: 'stale' }, quantity: 1 }]);
  const message = new URL(href).searchParams.get('text');
  assert.match(message, /Cor: Azul · Tamanho: G/);
  assert.match(message, /Subtotal estimado: R\$\s446,80/);
  assert.doesNotMatch(message, /stale/);
});

test('omits the link when phone is absent or malformed', () => {
  for (const whatsapp of ['', ' ', '1234', '0000000000000', '1234567890123456', 'abc5571000000000', 'https://wa.me/5571000000000']) assert.equal(build([item()], { whatsapp }), null);
});

test('rejects empty or duplicated selections', () => {
  assert.equal(build([]), null);
  assert.equal(build([item(), item()]), null);
});

test('rejects inactive products, unknown variants and unavailable quantities', () => {
  assert.equal(build([item({ product: { ...product, active: false } })]), null);
  assert.equal(build([item({ variant: { ...variant, id: 'missing' } })]), null);
  assert.equal(build([item({ product: { ...product, variants: [{ ...variant, stock: 0 }] } })]), null);
  assert.equal(build([item({ quantity: 4, variant: { ...variant, stock: 50 } })]), null);
  assert.ok(build([item({ quantity: 3 })]));
});

test('rejects invalid quantity and honors the existing cap of 20', () => {
  const abundantProduct = { ...product, variants: [{ ...variant, stock: 100 }] };
  for (const quantity of [0, -1, 1.5, NaN, Infinity, 21]) assert.equal(build([item({ product: abundantProduct, quantity })]), null);
  assert.ok(build([item({ product: abundantProduct, quantity: 20 })]));
});

test('rejects invalid prices and arithmetic beyond safe integer precision', () => {
  for (const price of [0, -100, 12.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) assert.equal(build([item({ product: { ...product, price } })]), null);
});

test('handles missing brand as a plain greeting without creating a receipt', () => {
  const message = new URL(build([item()], { brandName: ' ' })).searchParams.get('text');
  assert.match(message, /^Olá! Gostaria/);
  assert.doesNotMatch(message, /undefined|null|Order|CRIATIVA/);
});

test('includes only a safe shop origin and omits unsupported or credentialed URLs', () => {
  const message = new URL(build([item()], { storeUrl: 'https://criativa.example/colecao?q=vestido#item' })).searchParams.get('text');
  assert.match(message, /Loja: https:\/\/criativa\.example\/$/);
  assert.doesNotMatch(message, /\?q=|#item|\/colecao/);
  for (const storeUrl of ['javascript:alert(1)', 'https://user:password@criativa.example', 'not a url', '']) {
    const text = new URL(build([item()], { storeUrl })).searchParams.get('text');
    assert.doesNotMatch(text, /Loja:|password|alert\(/);
  }
});
