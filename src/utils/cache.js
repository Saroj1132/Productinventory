const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60
});

exports.getCached = (key) => {
  return cache.get(key);
};

exports.setCached = (key, data, ttl = 300) => {
  cache.set(key, data, ttl);
};

exports.clearCache = (pattern) => {
  if (pattern) {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
      }
    });
  } else {
    cache.flushAll();
  }
};

exports.cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    res.originalJson = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      res.originalJson(body);
    };
    next();
  };
};
