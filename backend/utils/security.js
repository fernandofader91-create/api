import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Recursively removes keys that could be used for NoSQL/SQL injection.
 * @param {Object} obj
 */
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      sanitize(obj[key]);
    }
  }
}

/**
 * Middleware that sanitizes request data.
 */
export function sanitizeMiddleware(req, res, next) {
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
}

// ⛑️ Helmet configuration for security headers
//    Add additional domains to the allow-lists below when integrating
//    external providers (e.g., analytics, payment gateways, or CDNs).
export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://trusted.cdn.example.com'],
      styleSrc: ["'self'", 'https://trusted.cdn.example.com'],
      imgSrc: ["'self'", 'data:', 'https://trusted.cdn.example.com'],
      connectSrc: ["'self'"],
    },
  },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
});

// ⏱️ Global rate limiter configuration
export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 minutes
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
