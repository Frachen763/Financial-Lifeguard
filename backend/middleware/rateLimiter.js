// Simple in-memory rate limiter for Google OAuth endpoints
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per minute per IP

/**
 * Rate limiting middleware for Google OAuth endpoints
 */
export const googleAuthRateLimit = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const now = Date.now();
  
  // Get or create rate limit entry for this IP
  let rateLimitData = rateLimitStore.get(clientIp);
  
  if (!rateLimitData) {
    rateLimitData = {
      requests: [],
      windowStart: now
    };
    rateLimitStore.set(clientIp, rateLimitData);
  }
  
  // Clean old requests outside the window
  rateLimitData.requests = rateLimitData.requests.filter(timestamp => 
    now - timestamp < RATE_LIMIT_WINDOW
  );
  
  // Check if rate limit exceeded
  if (rateLimitData.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestRequest = Math.min(...rateLimitData.requests);
    const timeToWait = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestRequest)) / 1000);
    
    return res.status(429).json({
      success: false,
      message: `Too many requests to Google OAuth. Please wait ${timeToWait} seconds before trying again.`,
      retryAfter: timeToWait
    });
  }
  
  // Add current request timestamp
  rateLimitData.requests.push(now);
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [ip, data] of rateLimitStore.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
        rateLimitStore.delete(ip);
      }
    }
  }
  
  next();
};

/**
 * Rate limiting middleware for general API endpoints (more lenient)
 */
export const generalRateLimit = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const now = Date.now();
  
  const key = `general_${clientIp}`;
  let rateLimitData = rateLimitStore.get(key);
  
  if (!rateLimitData) {
    rateLimitData = {
      requests: [],
      windowStart: now
    };
    rateLimitStore.set(key, rateLimitData);
  }
  
  // Clean old requests
  rateLimitData.requests = rateLimitData.requests.filter(timestamp => 
    now - timestamp < RATE_LIMIT_WINDOW
  );
  
  // More lenient rate limit for general endpoints
  if (rateLimitData.requests.length >= 30) { // 30 requests per minute
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait a moment before trying again.'
    });
  }
  
  rateLimitData.requests.push(now);
  next();
};
