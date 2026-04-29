const buckets = new Map();

const rateLimit = ({ windowMs = 60 * 1000, max = 60, key = "global" } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const identifier = `${key}:${req.ip}`;
    const bucket = buckets.get(identifier);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(identifier, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Too many requests. Please try again shortly." });
    }

    bucket.count += 1;
    return next();
  };
};

module.exports = rateLimit;
