/**
 * Router de Autenticación - Sistema de gestión de usuarios y autenticación
 * 
 * Propósito:
 * - Manejar registro y login de usuarios con rate limiting
 * - Proporcionar lista de servidores disponibles
 * - Gestionar creación de personajes y listado de personajes existentes
 * - Implementar medidas de seguridad contra ataques de fuerza bruta
 * 
 * Rutas implementadas:
 * - POST /api/auth/register     - Registro de nuevos usuarios
 * - POST /api/auth/login        - Autenticación de usuarios existentes  
 * - GET  /api/auth/servers      - Lista de servidores de juego disponibles
 * - POST /api/auth/create-player- Creación de personajes para usuarios
 * - GET  /api/auth/characters   - Listado de personajes del usuario
 * 
 * @module routes/authRoutes
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  register, 
  login, 
  servers, 
  createPlayer, 
  listCharacters 
} from '../controllers/authController.js';

/**
 * Instancia del router Express para rutas de autenticación
 * @type {import('express').Router}
 */
const router = Router();

/**
 * Configuración de rate limiting para endpoints de autenticación
 * 
 * Propósito de seguridad:
 * - Prevenir ataques de fuerza bruta en login/registro
 * - Limitar consumo de recursos en endpoints críticos
 * - Proteger contra Denial of Service (DoS) básico
 * 
 * Configuración:
 * - Ventana de tiempo: 15 minutos
 * - Límite de requests: 500 por IP por ventana
 * - Headers estándar: Habilita headers RateLimit-*
 * 
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 500, // Límite de 500 requests por IP por ventana de 15 minutos
  standardHeaders: true, // Incluye headers RateLimit-* estándar
  legacyHeaders: false, // Deshabilita headers X-RateLimit-* legacy
  message: 'Too many attempts from this IP, please try again after 15 minutes',
});

// =============================================================================
// RUTAS DE AUTENTICACIÓN CON RATE LIMITING
// =============================================================================

/**
 * Ruta: POST /api/auth/register
 * 
 * Propósito: Registro de nuevos usuarios en el sistema
 * Seguridad: Protegida con rate limiting (authLimiter)
 * 
 * @name POST /api/auth/register
 * @function
 * @memberof module:routes/authRoutes
 * @param {Object} req - Request de Express
 * @param {Object} req.body - Datos de registro
 * @param {string} req.body.username - Nombre de usuario (requerido)
 * @param {string} req.body.password - Contraseña (requerida, mínimo 6 caracteres)
 * @param {Object} res - Response de Express
 */
router.post('/register', authLimiter, register);

/**
 * Ruta: POST /api/auth/login
 * 
 * Propósito: Autenticación de usuarios existentes
 * Seguridad: Protegida con rate limiting (authLimiter)
 * 
 * @name POST /api/auth/login
 * @function
 * @memberof module:routes/authRoutes
 * @param {Object} req - Request de Express
 * @param {Object} req.body - Credenciales de login
 * @param {string} req.body.username - Nombre de usuario
 * @param {string} req.body.password - Contraseña
 * @param {string} req.body.serverName - Nombre del servidor destino
 * @param {Object} res - Response de Express
 */
router.post('/login', authLimiter, login);

// =============================================================================
// RUTAS DE GESTIÓN DE SERVIDORES Y PERSONAJES
// =============================================================================

/**
 * Ruta: GET /api/auth/servers
 * 
 * Propósito: Obtener lista de servidores de juego disponibles
 * Uso: Cliente consulta servidores antes de seleccionar uno para conectar
 * 
 * @name GET /api/auth/servers
 * @function
 * @memberof module:routes/authRoutes
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
router.get('/servers', servers);

/**
 * Ruta: POST /api/auth/create-player
 * 
 * Propósito: Crear un nuevo personaje para el usuario autenticado
 * Uso: Después del registro/login, usuario crea su personaje inicial
 * 
 * @name POST /api/auth/create-player
 * @function
 * @memberof module:routes/authRoutes
 * @param {Object} req - Request de Express
 * @param {Object} req.body - Datos del personaje a crear
 * @param {string} req.body.characterName - Nombre del personaje
 * @param {string} req.body.characterClass - Clase del personaje
 * @param {Object} res - Response de Express
 */
router.post('/create-player', createPlayer);

/**
 * Ruta: GET /api/auth/characters
 * 
 * Propósito: Obtener lista de personajes del usuario autenticado
 * Uso: Usuario consulta sus personajes existentes antes de jugar
 * 
 * @name GET /api/auth/characters
 * @function
 * @memberof module:routes/authRoutes
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
router.get('/characters', listCharacters);

export default router;