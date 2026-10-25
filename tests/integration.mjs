/**
 * Integration tests mutate content and create uploads/orders. Only run against
 * a dedicated test server using a temporary DATA_DIR, never the main shop.
 *
 * Server (from project root, after build/setup):
 *   APP_ORIGIN=http://127.0.0.1:3011 DATA_DIR=$(mktemp -d /tmp/loja-roupas-test.XXXXXX) STORAGE_DRIVER=local \
 *     pnpm exec next start --hostname 127.0.0.1 --port 3011
 * Tests (from project root):
 *   TEST_ALLOW_MUTATIONS=true BASE_URL=http://127.0.0.1:3011 node tests/integration.mjs
 * Optional PROJECT_DIR points to the project whose .env.local contains the
 * admin credentials. This script never prints credentials or session cookies.
 * Test orders/uploads remain in that disposable DATA_DIR for inspection.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

if (process.env.TEST_ALLOW_MUTATIONS !== 'true') {
  console.error('Refusing mutations. Start a separate server with temporary DATA_DIR, then set TEST_ALLOW_MUTATIONS=true.');
  process.exit(1);
}
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:3011');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Integration tests require a local dedicated test server.');
const projectDir = process.env.PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dotenv = await readFile(path.join(projectDir, '.env.local'), 'utf8');
const env = {};
for (const line of dotenv.split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!match) continue;
  let value = match[2];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  env[match[1]] = value;
}
assert(env.ADMIN_USERNAME && env.ADMIN_PASSWORD, 'Admin credentials missing from project .env.local.');
let cookie = '';
let checks = 0;
let original;
let changed = false;

async function request(route, { method = 'GET', json, body, auth = true, origin = base.origin, headers = {} } = {}) {
  const h = new Headers(headers);
  if (origin !== null) h.set('Origin', origin);
  if (auth && cookie) h.set('Cookie', cookie);
  if (json !== undefined) { h.set('Content-Type', 'application/json'); body = JSON.stringify(json); }
  const response = await fetch(new URL(route, base), { method, headers: h, body, redirect: 'manual', signal: AbortSignal.timeout(45_000) });
  const contentType = response.headers.get('Content-Type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, data, status: response.status };
}
function status(result, expected, label) {
  assert.equal(result.status, expected, `${label}: expected HTTP ${expected}, received ${result.status}`);
}
async function check(label, fn) { await fn(); checks++; console.log(`PASS ${label}`); }
async function content() {
  const r = await request('/api/admin/content'); status(r, 200, 'Read content'); return r.data;
}
async function save(next) {
  const r = await request('/api/admin/content', { method: 'PUT', json: next });
  status(r, 200, 'Save content'); changed = true; return r.data;
}
async function upload(bytes, mime, filename) {
  const form = new FormData(); form.set('file', new Blob([bytes], { type: mime }), filename);
  return request('/api/admin/media', { method: 'POST', body: form });
}

try {
  await check('admin endpoints reject unauthenticated requests', async () => {
    for (const route of ['/api/admin/content', '/api/admin/orders']) status(await request(route, { auth: false }), 401, route);
    status(await request('/api/admin/content', { auth: false, method: 'PUT', json: {} }), 401, 'Content write');
    status(await request('/api/admin/media', { auth: false, method: 'POST', body: 'invalid' }), 401, 'Media upload');
    status(await request('/api/admin/orders', { auth: false, method: 'PATCH', json: {} }), 401, 'Order update');
  });
  await check('login rejects wrong credentials and foreign/missing origins', async () => {
    status(await request('/api/admin/session', { method: 'POST', auth: false, json: { username: env.ADMIN_USERNAME, password: 'incorrect-test-password' } }), 401, 'Wrong password');
    status(await request('/api/admin/session', { method: 'POST', auth: false, origin: 'https://invalid.example', json: {} }), 403, 'Foreign origin');
    status(await request('/api/admin/session', { method: 'POST', auth: false, origin: null, json: {} }), 403, 'Missing origin');
  });
  await check('login sets an HttpOnly, SameSite=Strict admin cookie', async () => {
    const r = await request('/api/admin/session', { method: 'POST', auth: false, json: { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD } });
    status(r, 200, 'Login');
    const setCookie = r.response.headers.get('set-cookie') || '';
    assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=Strict/i);
    cookie = setCookie.split(';')[0]; assert(cookie.startsWith('loja_roupas_admin='));
    original = await content();
  });

  let imageUrl = '';
  await check('valid PNG and JPEG uploads are served with safe headers', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7x8AAAAASUVORK5CYII=', 'base64');
    const jpg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==', 'base64');
    for (const [bytes, mime, filename] of [[png, 'image/png', 'pixel.png'], [jpg, 'image/jpeg', 'pixel.jpg']]) {
      const r = await upload(bytes, mime, filename); status(r, 200, `Upload ${mime}`);
      assert.match(r.data.url, /^\/api\/media\/[a-f0-9-]+\.(png|jpg)$/);
      const response = await fetch(new URL(r.data.url, base), { signal: AbortSignal.timeout(45_000) });
      assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), mime);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('content-security-policy'), "default-src 'none'");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
      imageUrl ||= r.data.url;
    }
  });
  await check('upload rejects HTML disguised as PNG and media traversal paths', async () => {
    status(await upload(Buffer.from('<html><script>alert(1)</script></html>'), 'image/png', 'spoof.png'), 400, 'Spoof upload');
    status(await request('/api/media/not-a-uuid.png', { auth: false }), 404, 'Invalid media key');
    status(await request('/api/media/nested/anything.png', { auth: false }), 404, 'Nested media key');
  });

  const token = randomUUID().replaceAll('-', '').slice(0, 12);
  const categoryId = `integration-category-${token}`;
  const productId = `integration-product-${token}`;
  const variantId = `integration-variant-${token}`;
  const uniqueName = `IntegrationPiece${token}`;
  let current;
  await check('content saves with a revision increment and rejects stale/invalid prices', async () => {
    const draft = structuredClone(original);
    draft.categories.push({ id: categoryId, name: `Integration ${token}`, slug: categoryId, description: 'Disposable test category', image: imageUrl, visible: true });
    draft.products.unshift({
      id: productId, slug: productId, name: uniqueName, categoryId, price: 12345, compareAtPrice: 0,
      description: 'Disposable integration fixture', details: 'Test only', composition: 'Test only', care: 'Test only',
      images: [imageUrl], variants: [{ id: variantId, size: 'M', color: 'Oliva', colorHex: '#666D4B', stock: 2 }],
      featured: true, active: true, badge: '',
    });
    current = await save(draft); assert.equal(current.revision, original.revision + 1);
    assert.equal((await content()).products.find(p => p.id === productId).price, 12345);
    status(await request('/api/admin/content', { method: 'PUT', json: draft }), 409, 'Stale content');
    const invalid = structuredClone(current); invalid.products.find(p => p.id === productId).price = -1;
    status(await request('/api/admin/content', { method: 'PUT', json: invalid }), 400, 'Negative price');
    invalid.products.find(p => p.id === productId).price = 1.5;
    status(await request('/api/admin/content', { method: 'PUT', json: invalid }), 400, 'Fractional cents');
    assert.equal((await content()).revision, current.revision);
  });
  await check('category visibility and product active state affect public HTML', async () => {
    let html = await request('/', { auth: false }); status(html, 200, 'Storefront'); assert(html.data.includes(uniqueName), 'Active fixture missing from HTML');
    current.categories.find(c => c.id === categoryId).visible = false; current = await save(current);
    html = await request('/', { auth: false }); assert(!html.data.includes(uniqueName), 'Hidden category leaked product into HTML');
    current.categories.find(c => c.id === categoryId).visible = true;
    current.products.find(p => p.id === productId).active = false; current = await save(current);
    html = await request('/', { auth: false }); assert(!html.data.includes(uniqueName), 'Inactive product leaked into HTML');
    current.products.find(p => p.id === productId).active = true; current = await save(current);
    html = await request('/', { auth: false }); assert(html.data.includes(uniqueName), 'Reactivated fixture missing from HTML');
  });

  const customer = { name: 'Integração local', email: 'integration@example.test', phone: '71999990000', notes: 'Disposable isolated test only' };
  const orderBody = { customer, items: [{ productId, variantId, quantity: 2, unitPrice: 1, name: 'Forged name' }], total: 1, status: 'completed' };
  const idempotencyKey = randomUUID();
  const place = (body, key = randomUUID()) => request('/api/orders', { method: 'POST', auth: false, json: body, headers: { 'Idempotency-Key': key } });
  let orderId;
  let orderCount;
  await check('order totals and item snapshots come from the server catalog', async () => {
    const before = await request('/api/admin/orders'); status(before, 200, 'Admin orders'); orderCount = before.data.orders.length;
    const r = await place(orderBody, idempotencyKey); status(r, 201, 'Create order');
    assert.equal(r.data.order.total, 24690); assert.match(r.data.order.id, /^CRI-[A-F0-9]{24}$/); orderId = r.data.order.id;
    assert.equal(r.data.order.customer, undefined, 'Public response must not echo customer details');
    const admin = await request('/api/admin/orders'); status(admin, 200, 'List orders');
    const order = admin.data.orders.find(o => o.id === orderId); assert(order);
    assert.equal(order.status, 'pending'); assert.equal(order.items[0].unitPrice, 12345); assert.equal(order.items[0].name, uniqueName);
    assert.equal(order.total, 24690); assert.equal(admin.data.orders.length, orderCount + 1);
  });
  await check('order retries are idempotent and altered reuse is rejected', async () => {
    const r = await place(orderBody, idempotencyKey); status(r, 201, 'Retry order'); assert.equal(r.data.order.id, orderId);
    const changedBody = structuredClone(orderBody); changedBody.items[0].quantity = 1;
    status(await place(changedBody, idempotencyKey), 409, 'Altered idempotency reuse');
    const admin = await request('/api/admin/orders'); assert.equal(admin.data.orders.length, orderCount + 1);
    assert.equal(admin.data.orders.filter(o => o.id === orderId).length, 1);
  });
  await check('orders reject excess stock, duplicate variants, and unavailable products', async () => {
    status(await place({ customer, items: [{ productId, variantId, quantity: 3 }] }), 409, 'Excess stock');
    status(await place({ customer, items: [{ productId, variantId, quantity: 1 }, { productId, variantId, quantity: 1 }] }), 400, 'Duplicate variant');
    status(await place({ customer, items: [{ productId, variantId, quantity: 0 }] }), 400, 'Zero quantity');
    status(await place({ customer, items: [{ productId, variantId, quantity: 1 }] }, 'short'), 400, 'Invalid idempotency key');
    current.categories.find(c => c.id === categoryId).visible = false; current = await save(current);
    status(await place({ customer, items: [{ productId, variantId, quantity: 1 }] }), 409, 'Hidden category order');
    current.categories.find(c => c.id === categoryId).visible = true; current = await save(current);
    const admin = await request('/api/admin/orders'); assert.equal(admin.data.orders.length, orderCount + 1);
  });
  await check('admin can update order status, while invalid status is rejected', async () => {
    let r = await request('/api/admin/orders', { method: 'PATCH', json: { id: orderId, status: 'contacted' } }); status(r, 200, 'Update status'); assert.equal(r.data.order.status, 'contacted');
    r = await request('/api/admin/orders', { method: 'PATCH', json: { id: orderId, status: 'paid' } }); status(r, 400, 'Invalid status');
    const admin = await request('/api/admin/orders'); assert.equal(admin.data.orders.find(o => o.id === orderId).status, 'contacted');
  });
} finally {
  if (original && changed && cookie) {
    const latest = await content();
    const restore = structuredClone(original); restore.revision = latest.revision;
    const restored = await save(restore);
    assert.equal(restored.revision, latest.revision + 1);
    assert.deepEqual({ ...restored, revision: original.revision }, original);
    console.log('PASS original content restored with current revision'); checks++;
  }
  if (cookie) {
    const logout = await request('/api/admin/session', { method: 'DELETE' }); status(logout, 200, 'Logout');
    const cleared = logout.response.headers.get('set-cookie') || '';
    assert(/max-age=0|expires=Thu, 01 Jan 1970/i.test(cleared), 'Logout must clear session cookie');
    cookie = '';
    status(await request('/api/admin/content'), 401, 'Unauthenticated after logout');
    console.log('PASS logout clears the admin cookie'); checks++;
  }
}
console.log(`Integration complete: ${checks} groups passed. Test uploads/orders remain only in the dedicated test data directory.`);
