import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Transpile the pure client helper in memory. No server or real order endpoint is used.
const source = await readFile(new URL('../lib/client-feedback.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { remainingQuantity, requestOrder, OrderRequestError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('available quantity subtracts existing bag contents and honors both stock and order cap', () => {
  const variant = { id: 'cream-m', stock: 3 };
  assert.equal(remainingQuantity('shirt', variant, [{ productId: 'shirt', variantId: variant.id, quantity: 2 }]), 1);
  assert.equal(remainingQuantity('shirt', variant, [{ productId: 'shirt', variantId: variant.id, quantity: 9 }]), 0);
  assert.equal(remainingQuantity('shirt', { ...variant, stock: 50 }, [{ productId: 'shirt', variantId: variant.id, quantity: 19 }]), 1);
  assert.equal(remainingQuantity('shirt', variant, [{ productId: 'other', variantId: variant.id, quantity: 2 }]), 3);
});

test('timeout aborts the request and leaves the outcome explicitly uncertain', async () => {
  let aborted = false;
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true }));
  await assert.rejects(requestOrder('{}', 'test-key', { fetchImpl, timeoutMs: 5 }), error => error instanceof OrderRequestError && error.uncertain && /demorou/.test(error.message));
  assert.equal(aborted, true);
});

test('an interrupted response can be retried with the exact key and body', async () => {
  const calls = [];
  const body = JSON.stringify({ customer: { name: 'Test' }, items: [{ productId: 'shirt', variantId: 'cream-m', quantity: 1 }] });
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: options.body, key: options.headers['Idempotency-Key'] });
    if (calls.length === 1) throw new TypeError('Connection lost');
    return Response.json({ order: { id: 'EXAMPLE', total: 12300 } });
  };
  await assert.rejects(requestOrder(body, 'same-test-key', { fetchImpl }), error => error.uncertain === true);
  assert.deepEqual(await requestOrder(body, 'same-test-key', { fetchImpl }), { id: 'EXAMPLE', total: 12300 });
  assert.deepEqual(calls[0], calls[1]);
});

test('server failure is uncertain because a write might have completed', async () => {
  await assert.rejects(requestOrder('{}', 'test-key', { fetchImpl: async () => Response.json({ error: 'Falha temporária' }, { status: 500 }) }), error => error.uncertain === true && error.message === 'Falha temporária');
});

test('explicit validation rejection permits correction of the request', async () => {
  await assert.rejects(requestOrder('{}', 'test-key', { fetchImpl: async () => Response.json({ error: 'Informe um telefone com DDD.' }, { status: 400 }) }), error => error.uncertain === false && /DDD/.test(error.message));
});

test('malformed success never clears the bag as though confirmation succeeded', async () => {
  for (const payload of [{}, { order: { id: 'EXAMPLE', total: '12300' } }, { order: { id: '', total: 12300 } }]) {
    await assert.rejects(requestOrder('{}', 'test-key', { fetchImpl: async () => Response.json(payload) }), error => error.uncertain === true);
  }
});

test('confirmation response preserves receipt and optional contact URL', async () => {
  assert.deepEqual(await requestOrder('{}', 'test-key', { fetchImpl: async () => Response.json({ order: { id: 'EXAMPLE', total: 12300 }, whatsappUrl: 'https://wa.me/123' }) }), { id: 'EXAMPLE', total: 12300, whatsappUrl: 'https://wa.me/123' });
});
