const cache = new Map();
const TTL = 60 * 1000;

function cacheMiddleware(req, res, next) {
  const key = req.originalUrl || req.url;
  const entry = cache.get(key);
  const now = Date.now();

  if (entry) {
    if (now - entry.createdAt < TTL) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(entry.data);
    }
    cache.delete(key);
  }

  res.setHeader('X-Cache', 'MISS');

  const originalJson = res.json.bind(res);
  res.json = function(data) {
    res.json = originalJson;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, {
        data,
        createdAt: Date.now()
      });
    }
    return originalJson(data);
  };

  next();
}

function clearCache() {
  cache.clear();
}

function invalidateCache(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    res.json = originalJson;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      clearCache();
    }
    return originalJson(data);
  };
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      clearCache();
    }
  });
  next();
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearCache,
  cache
};
