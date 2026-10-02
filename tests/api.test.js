const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');
const db = require('../database/db');
const { clearCache, cache } = require('../middleware/cache');

const seedData = [
  { id: 1, name: 'Keyboard', price: 49.99 },
  { id: 2, name: 'Mouse', price: 19.99 },
  { id: 3, name: 'Monitor', price: 199 },
  { id: 4, name: 'Mouse', price: 19 }
];

describe('API Integration & Layered Flow', () => {
  let server;
  let baseUrl;

  function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let raw = '';
        res.on('data', (chunk) => raw += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: raw ? JSON.parse(raw) : null
          });
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  before(async () => {
    await db.writeData(seedData);
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await db.writeData(seedData);
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    await db.writeData(seedData);
    clearCache();
  });

  test('GET /products returns MISS on first call and HIT on second call', async () => {
    const first = await makeRequest('/products');
    assert.equal(first.statusCode, 200);
    assert.equal(first.headers['x-cache'], 'MISS');
    assert.ok(Array.isArray(first.body));
    assert.equal(first.body.length, 4);

    const second = await makeRequest('/products');
    assert.equal(second.statusCode, 200);
    assert.equal(second.headers['x-cache'], 'HIT');
    assert.deepEqual(second.body, first.body);
  });

  test('GET /products/:id returns MISS on first call and HIT on second call', async () => {
    const first = await makeRequest('/products/1');
    assert.equal(first.statusCode, 200);
    assert.equal(first.headers['x-cache'], 'MISS');
    assert.equal(first.body.id, 1);

    const second = await makeRequest('/products/1');
    assert.equal(second.statusCode, 200);
    assert.equal(second.headers['x-cache'], 'HIT');
    assert.equal(second.body.id, 1);
  });

  test('GET /products/:id returns 404 for non-existent product', async () => {
    const res = await makeRequest('/products/9999');
    assert.equal(res.statusCode, 404);
  });

  test('POST /products fails with 400 when missing required fields without invalidating cache', async () => {
    await makeRequest('/products');
    assert.equal(cache.has('/products'), true);

    const res = await makeRequest('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Incomplete' }
    });

    assert.equal(res.statusCode, 400);
    assert.equal(cache.has('/products'), true);
  });

  test('POST /products creates product and invalidates cache', async () => {
    await makeRequest('/products');
    assert.equal(cache.has('/products'), true);

    const postRes = await makeRequest('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Speaker', price: 59.99 }
    });

    assert.equal(postRes.statusCode, 201);
    assert.equal(postRes.body.name, 'Speaker');
    assert.equal(cache.has('/products'), false);

    const getRes = await makeRequest('/products');
    assert.equal(getRes.headers['x-cache'], 'MISS');
    const createdItem = getRes.body.find((p) => p.name === 'Speaker');
    assert.ok(createdItem);
  });

  test('PUT /products/:id updates product and invalidates cache', async () => {
    await makeRequest('/products');
    await makeRequest('/products/1');
    assert.equal(cache.has('/products'), true);
    assert.equal(cache.has('/products/1'), true);

    const putRes = await makeRequest('/products/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'RGB Keyboard', price: 89.99 }
    });

    assert.equal(putRes.statusCode, 200);
    assert.equal(putRes.body.name, 'RGB Keyboard');
    assert.equal(cache.has('/products'), false);
    assert.equal(cache.has('/products/1'), false);

    const getRes = await makeRequest('/products/1');
    assert.equal(getRes.headers['x-cache'], 'MISS');
    assert.equal(getRes.body.name, 'RGB Keyboard');
  });

  test('PUT /products/:id returns 404 for invalid id and preserves cache', async () => {
    await makeRequest('/products');
    assert.equal(cache.has('/products'), true);

    const res = await makeRequest('/products/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'RGB Keyboard', price: 89.99 }
    });

    assert.equal(res.statusCode, 404);
    assert.equal(cache.has('/products'), true);
  });

  test('PATCH /products/:id updates partial product and invalidates cache', async () => {
    await makeRequest('/products/2');
    assert.equal(cache.has('/products/2'), true);

    const patchRes = await makeRequest('/products/2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { price: 24.99 }
    });

    assert.equal(patchRes.statusCode, 200);
    assert.equal(patchRes.body.price, 24.99);
    assert.equal(cache.has('/products/2'), false);

    const getRes = await makeRequest('/products/2');
    assert.equal(getRes.headers['x-cache'], 'MISS');
    assert.equal(getRes.body.price, 24.99);
  });

  test('PATCH /products/:id returns 404 for invalid id', async () => {
    const res = await makeRequest('/products/9999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { price: 24.99 }
    });
    assert.equal(res.statusCode, 404);
  });

  test('DELETE /products/:id deletes product and invalidates cache', async () => {
    await makeRequest('/products');
    await makeRequest('/products/1');

    const deleteRes = await makeRequest('/products/1', {
      method: 'DELETE'
    });

    assert.equal(deleteRes.statusCode, 200);
    assert.equal(cache.has('/products'), false);
    assert.equal(cache.has('/products/1'), false);

    const getRes = await makeRequest('/products/1');
    assert.equal(getRes.statusCode, 404);
  });

  test('DELETE /products/:id returns 404 for invalid id', async () => {
    const res = await makeRequest('/products/9999', {
      method: 'DELETE'
    });
    assert.equal(res.statusCode, 404);
  });

  test('Cache expires after TTL and fetches fresh data with MISS header', async () => {
    const first = await makeRequest('/products/3');
    assert.equal(first.headers['x-cache'], 'MISS');

    const second = await makeRequest('/products/3');
    assert.equal(second.headers['x-cache'], 'HIT');

    const entry = cache.get('/products/3');
    assert.ok(entry);
    entry.createdAt = Date.now() - 65000;

    const third = await makeRequest('/products/3');
    assert.equal(third.headers['x-cache'], 'MISS');

    const refreshedEntry = cache.get('/products/3');
    assert.ok(Date.now() - refreshedEntry.createdAt < 1000);
  });
});
