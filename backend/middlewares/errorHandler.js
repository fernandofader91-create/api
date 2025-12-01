/**
 * Middleware de manejo centralizado de errores.
 * 
 * Responsabilidades:
 * - Captura de errores no manejados en la aplicación
 * - Logging estructurado de excepciones
 * - Respuesta consistente al cliente en caso de errores
 * 
 * @module middlewares/errorHandler
 */

import logger from '../utils/logger.js';
import { sanitizeObject } from './requestLogger.js';

/**
 * Middleware final que captura todos los errores no manejados
 * @param {Error} err - Error capturado
 * @param {Object} req - Objeto de petición Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
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

  res.status(500).json({ 
    error: 'Internal Server Error', 
    requestId: req.requestId 
  });
}