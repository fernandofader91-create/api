import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Campos sensibles que deben filtrarse de los logs.
 * Agrega nuevos campos a esta lista según sea necesario.
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
 * Devuelve una copia del objeto con los campos sensibles redaccionados.
 * Se aplica recursivamente a objetos y arreglos.
 * @param {object} data - Datos a sanitizar.
 * @returns {object} Objeto sanitizado.
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
 * Middleware que registra todas las solicitudes entrantes.
 * Captura información relevante para auditoría y seguridad.
 * También identifica peticiones lentas y las marca como 'warn'.
 */
export function requestLogger(req, res, next) {
  const requestId = randomUUID();

  logger.runWithRequestId(requestId, () => {
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const isSlow = duration > 1000; // 💡 Consideramos lento si > 1 segundo

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

      // Usamos 'warn' si fue lento, 'info' si fue normal
      logger[isSlow ? 'warn' : 'info']('HTTP Request', logData);
    });

    next();
  });
}
