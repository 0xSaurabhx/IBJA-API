const { RateLimiterMemory } = require('rate-limiter-flexible');

// --- Configuration ---
// General: 100 requests / 15 mins = 100 points / 900 seconds
const generalLimiter = new RateLimiterMemory({
  points: 100,
  duration: 15 * 60, // 15 minutes in seconds
  blockDuration: 15 * 60, // Block for 15 minutes if consumed points > points
});

// Data-Heavy: 20 requests / 15 mins = 20 points / 900 seconds
const dataHeavyLimiter = new RateLimiterMemory({
  points: 20,
  duration: 15 * 60,
  blockDuration: 15 * 60,
});

// Utility: 50 requests / 15 mins = 50 points / 900 seconds
const utilityLimiter = new RateLimiterMemory({
  points: 50,
  duration: 15 * 60,
  blockDuration: 15 * 60,
});


// --- Middleware Function ---
const rateLimiterMiddleware = (limiter) => async (req, res, next) => {
  // Get the IP address - Vercel uses 'x-forwarded-for'
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(/, /)[0] : req.socket?.remoteAddress;

  if (!ip) {
    // Should ideally not happen, but handle defensively
    return res.status(400).json({ error: 'Could not identify client IP' });
  }

  try {
    const rateLimiterRes = await limiter.consume(ip);

    // Set Headers on Success
    res.setHeader('X-RateLimit-Limit', limiter.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    // Calculate reset time (convert ms to Unix timestamp seconds)
    const resetTime = Math.ceil((Date.now() + rateLimiterRes.msBeforeNext) / 1000);
    res.setHeader('X-RateLimit-Reset', resetTime);

    // Proceed to the actual API logic
    next();

  } catch (rejRes) {
    // Rate limit exceeded
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000); // Seconds to wait
    const resetTime = new Date(Date.now() + rejRes.msBeforeNext).toISOString();

    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', limiter.points);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + rejRes.msBeforeNext) / 1000));

    return res.status(429).json({
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter: retryAfter,
      limit: limiter.points,
      remaining: 0,
      resetTime: resetTime
    });
  }
};

module.exports = {
  generalLimiter,
  dataHeavyLimiter,
  utilityLimiter,
  applyRateLimit: rateLimiterMiddleware // Export the middleware generator
};