/**
 * Middleware de bloqueo de IPs basado en actividad sospechosa.
 * 
 * Funcionalidades:
 * - Verificación de IPs en lista negra
 * - Bloqueo temporal de accesos no autorizados
 * - Integración con sistema de registro de intentos inválidos
 * 
 * @module middlewares/blockIpMiddleware
 */

import { isBlocked } from '../utils/ipBlocker.js';
import { ENABLE_IP_BLOCKING } from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Middleware que verifica si una IP está bloqueada antes de procesar la petición
 * @param {Object} req - Objeto de petición Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 */
export function blockIpMiddleware(req, res, next) {
  if (!ENABLE_IP_BLOCKING) return next();

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  if (isBlocked(ip)) {
    logger.warn('IP bloqueada intentó acceder', { 
      ip, 
      url: req.originalUrl 
    });
    
    return res.status(403).json({ 
      error: 'Acceso bloqueado temporalmente por actividad sospechosa' 
    });
  }

  next();
}