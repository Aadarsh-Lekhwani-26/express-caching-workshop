const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { cacheMiddleware, invalidateCache, clearCache, cache } = require('../middleware/cache');

describe('Cache Middleware', () => {
  beforeEach(() => {
    clearCache();
  });

  test('cacheMiddleware sets X-Cache MISS on first request and caches data', () => {
    const req = { originalUrl: '/products' };
    const headers = {};
    let sentData = null;
    let nextCalled = false;

    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers[name] = value;
      },
      json(data) {
        sentData = data;
        return data;
      }
    };

    cacheMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(headers['X-Cache'], 'MISS');

    res.json([{ id: 1, name: 'Item' }]);

    assert.equal(cache.has('/products'), true);
    const entry = cache.get('/products');
    assert.ok(entry.createdAt);
    assert.deepEqual(entry.data, [{ id: 1, name: 'Item' }]);
  });

  test('cacheMiddleware sets X-Cache HIT on cached data within TTL', () => {
    cache.set('/products', {
      data: [{ id: 1, name: 'Cached' }],
      createdAt: Date.now()
    });

    const req = { originalUrl: '/products' };
    const headers = {};
    let sentData = null;
    let nextCalled = false;

    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers[name] = value;
      },
      json(data) {
        sentData = data;
        return data;
      }
    };

    cacheMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(headers['X-Cache'], 'HIT');
    assert.deepEqual(sentData, [{ id: 1, name: 'Cached' }]);
  });

  test('cacheMiddleware ignores and clears expired cache entries after 1 minute TTL', () => {
    cache.set('/products', {
      data: [{ id: 1, name: 'Stale' }],
      createdAt: Date.now() - 61000
    });

    const req = { originalUrl: '/products' };
    const headers = {};
    let nextCalled = false;

    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers[name] = value;
      },
      json(data) {
        return data;
      }
    };

    cacheMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(headers['X-Cache'], 'MISS');
  });

  test('clearCache empties all entries', () => {
    cache.set('/products', { data: [], createdAt: Date.now() });
    cache.set('/products/1', { data: {}, createdAt: Date.now() });
    assert.equal(cache.size, 2);

    clearCache();
    assert.equal(cache.size, 0);
  });

  test('invalidateCache clears cache on successful response', () => {
    cache.set('/products', { data: [], createdAt: Date.now() });

    const req = { method: 'POST', originalUrl: '/products' };
    let finishCallback = null;
    const res = {
      statusCode: 201,
      json(data) {
        return data;
      },
      on(event, cb) {
        if (event === 'finish') finishCallback = cb;
      }
    };

    invalidateCache(req, res, () => {});
    res.json({ id: 5 });

    assert.equal(cache.size, 0);
  });

  test('invalidateCache does not clear cache on error response', () => {
    cache.set('/products', { data: [], createdAt: Date.now() });

    const req = { method: 'POST', originalUrl: '/products' };
    const res = {
      statusCode: 400,
      json(data) {
        return data;
      },
      on() {}
    };

    invalidateCache(req, res, () => {});
    res.json({ error: 'Bad Request' });

    assert.equal(cache.size, 1);
  });
});
