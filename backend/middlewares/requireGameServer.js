/**
 * Middleware de autenticación para servidores de juego.
 * 
 * Propósito:
 * - Verificar que las peticiones provengan de servidores de juego autorizados
 * - Proteger endpoints internos del acceso no autorizado
 * - Utilizar tokens estáticos para autenticación server-to-server
 * 
 * @module middlewares/requireGameServer
 */

import 'dotenv/config.js';

/**
 * Token de autenticación para servidores de juego
 * Se obtiene de las variables de entorno
 */
const GAME_SERVER_TOKEN = process.env.GAME_SERVER_TOKEN;

/**
 * Middleware que valida el token de servidor de juego
 * @param {Object} req - Objeto de petición Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 */
export default function requireGameServer(req, res, next) {
  const token = req.header('x-gs-token');
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Missing x-gs-token' 
    });
  }
  
  if (token !== GAME_SERVER_TOKEN) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid game server token' 
    });
  }

  next();
}