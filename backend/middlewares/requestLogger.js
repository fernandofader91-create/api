/**
 * Middleware de logging estructurado para peticiones HTTP.
 * 
 * Funcionalidades:
 * - Registro completo de todas las peticiones entrantes
 * - Sanitización de datos sensibles en logs
 * - Identificación de peticiones lentas
 * - Generación de IDs de correlación para tracing
 * 
 * @module middlewares/requestLogger
 */

import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Lista de campos considerados sensibles que deben ser redactados en logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'secret',
  'authorization',
];

/**
 * Función recursiva que sanitiza objetos redactando campos sensibles
 * @param {object} data - Objeto a sanitizar
 * @returns {object} Objeto sanitizado
 */
export function sanitizeObject(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const clone = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      clone[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      clone[key] = sanitizeObject(value);
    } else {
      clone[key] = value;
    }
  }

  return clone;
}

/**
 * Middleware principal de logging de peticiones
 * Captura métricas de performance y datos de auditoría
 */
export function requestLogger(req, res, next) {
  const requestId = randomUUID();

  logger.runWithRequestId(requestId, () => {
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const isSlow = duration > 1000;

      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        body: sanitizeObject(req.body),
        requestId,
      };

      logger[isSlow ? 'warn' : 'info']('HTTP Request', logData);
    });

    next();
  });
}