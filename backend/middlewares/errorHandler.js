import logger from '../utils/logger.js';
import { sanitizeObject } from './requestLogger.js';

/**
 * Middleware que captura errores no manejados y los loguea.
 */
export function errorHandler(err, req, res, next) {
  logger.error('Unhandled Error', {
    requestId: req.requestId,
    error: {
      message: err.message,
      stack: err.stack,
    },
    url: req.originalUrl,
    method: req.method,
    body: sanitizeObject(req.body),
  });

  res.status(500).json({ error: 'Internal Server Error', requestId: req.requestId });
}
