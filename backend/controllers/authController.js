/**
 * Controlador de Autenticación - Manejo de lógica de negocio para autenticación y gestión de usuarios
 * 
 * Responsabilidades:
 * - Validación de datos de entrada con Joi
 * - Manejo de respuestas HTTP y códigos de estado
 * - Logging de eventos de seguridad y errores
 * - Coordinación con el servicio de autenticación
 * - Gestión de tokens de autorización
 * 
 * @module controllers/authController
 */

import * as authService from '../services/authService.js';
import logger from '../utils/logger.js';
import Joi from 'joi';
import { pwnedPassword } from 'hibp';

/**
 * Esquema de validación para contraseñas
 * @type {Joi.StringSchema}
 */
const passwordSchema = Joi.string().min(6).required();

/**
 * Esquema de validación para registro de usuarios
 * Valida: username (mínimo 3 caracteres), email (formato válido), password (mínimo 6 caracteres)
 * @type {Joi.ObjectSchema}
 */
const registerSchema = Joi.object({
  username: Joi.string().min(3).trim().required(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
  password: passwordSchema,
});

/**
 * Esquema de validación para login de usuarios
 * Valida: username, password y serverName (todos requeridos)
 * @type {Joi.ObjectSchema}
 */
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
  serverName: Joi.string().required(),
});

/**
 * Controlador para registro de nuevos usuarios
 * 
 * Flujo:
 * 1. Validar datos de entrada con Joi
 * 2. Delegar al servicio de autenticación
 * 3. Retornar respuesta apropiada
 * 
 * @param {Object} req - Request de Express
 * @param {Object} req.body - Datos del registro
 * @param {string} req.body.username - Nombre de usuario (min 3 caracteres)
 * @param {string} req.body.email - Email válido
 * @param {string} req.body.password - Contraseña (min 6 caracteres)
 * @param {Object} res - Response de Express
 * @returns {Promise<void>}
 * 
 * @example
 * // Request exitoso
 * POST /api/auth/register
 * {
 *   "username": "nuevoUsuario",
 *   "email": "usuario@ejemplo.com", 
 *   "password": "contraseñaSegura"
 * }
 */
export async function register(req, res) {
  try {
    console.log("body", req.body);
    
    // Validación estricta de datos de entrada
    const { username, email, password } = await registerSchema.validateAsync(req.body, {
      abortEarly: false, // Retorna todos los errores, no solo el primero
    });

    // Delegar lógica de negocio al servicio
    const user = await authService.register({ username, email, password });
    
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    // Determinar código de estado apropiado
    const code = err.status ?? 400;
    
    // Logging de intento fallido para seguridad
    logger.warn('Intento de registro fallido', {
      error: err.message,
      username: req.body?.username,
      email: req.body?.email,
    });
    
    return res.status(code).json({ success: false, message: 'Registration failed' });
  }
}

/**
 * Controlador para autenticación de usuarios
 * 
 * Flujo:
 * 1. Validar credenciales y servidor destino
 * 2. Autenticar usuario via servicio
 * 3. Retornar datos de usuario autenticado
 * 
 * @param {Object} req - Request de Express  
 * @param {Object} req.body - Credenciales de login
 * @param {string} req.body.username - Nombre de usuario
 * @param {string} req.body.password - Contraseña
 * @param {string} req.body.serverName - Servidor de juego destino
 * @param {Object} res - Response de Express
 * @returns {Promise<void>}
 * 
 * @example
 * // Request exitoso
 * POST /api/auth/login
 * {
 *   "username": "usuarioExistente",
 *   "password": "contraseñaCorrecta",
 *   "serverName": "Zone1"
 * }
 */
export async function login(req, res) {
  try {
    // Validar datos de login
    const { serverName, username, password } = await loginSchema.validateAsync(
      req.body,
      { abortEarly: false }
    );

    // Autenticar usuario
    const user = await authService.login({ username, password, serverName });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    // Logging de intento fallido (sin detalles específicos por seguridad)
    logger.warn('Intento de login fallido', {
      error: err.message,
      username: req.body && req.body.username,
    });
    
    // Respuesta genérica para no revelar información
    res.status(400).json({ success: false, message: 'Invalid credentials' });
  }
}

/**
 * Controlador para obtener lista de servidores disponibles
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express  
 * @returns {Promise<void>}
 * 
 * @example
 * // Request
 * GET /api/auth/servers
 * 
 * // Response exitosa
 * {
 *   "success": true,
 *   "data": [
 *     { "name": "Zone1", "players": 45, "status": "online" },
 *     { "name": "Zone2", "players": 32, "status": "online" }
 *   ]
 * }
 */
export async function servers(req, res) {
  try {
    const servers = await authService.servers();
    res.status(200).json({ success: true, data: servers });
  } catch (err) {
    logger.error('Error al obtener servidores', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * Controlador para creación de nuevos personajes
 * 
 * Requiere autenticación via Bearer token
 * 
 * @param {Object} req - Request de Express
 * @param {Object} req.body - Datos del personaje
 * @param {string} req.body.name - Nombre del personaje
 * @param {string} req.body.class - Clase del personaje
 * @param {Object} req.headers - Headers de la request
 * @param {string} req.headers.authorization - Token Bearer de autenticación
 * @param {Object} res - Response de Express
 * @returns {Promise<void>}
 * 
 * @example
 * // Request
 * POST /api/auth/create-player
 * Authorization: Bearer <jwt-token>
 * {
 *   "name": "MiPersonaje",
 *   "class": "Warrior"
 * }
 */
export async function createPlayer(req, res) {
  try {
    const { name, class: charClass } = req.body ?? {};
    
    // Extraer token de autorización
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Delegar creación al servicio
    const character = await authService.createPlayer({ token, name, charClass });

    // Logging de creación exitosa
    logger.info('Personaje creado exitosamente', {
      user: req.user?.id,
      name,
      class: charClass,
    });

    return res.status(200).json({ success: true, character });
  } catch (err) {
    // Mapear errores a códigos HTTP apropiados
    let code = 500;
    switch (err.message) {
      case 'Token de autenticación requerido':
      case 'Token inválido o expirado':
        code = 401; break;
      case 'Cuenta no encontrada':
        code = 404; break;
      case 'No puedes tener más de 5 personajes':
      case 'Faltan campos requeridos: name, class, race':
        code = 400; break;
      case 'El nombre del personaje ya existe':
        code = 409; break;
      default:
        code = 500;
    }

    // Logging detallado del error
    logger.warn('Error al crear personaje', {
      httpStatus: code,
      message: err.message,
      body: req.body,
    });

    return res.status(code).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * Controlador para listar personajes de un usuario
 * 
 * Requiere autenticación via Bearer token
 * 
 * @param {Object} req - Request de Express
 * @param {Object} req.headers - Headers de la request  
 * @param {string} req.headers.authorization - Token Bearer de autenticación
 * @param {Object} res - Response de Express
 * @returns {Promise<void>}
 * 
 * @example
 * // Request
 * GET /api/auth/characters
 * Authorization: Bearer <jwt-token>
 * 
 * // Response exitosa
 * {
 *   "success": true,
 *   "data": [
 *     { "slot": 1, "name": "Personaje1", "class": "Warrior", "level": 5 },
 *     { "slot": 2, "name": "Personaje2", "class": "Mage", "level": 3 }
 *   ]
 * }
 */
export async function listCharacters(req, res) {
  try {
    // Extraer token de autorización
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Obtener lista de personajes
    const slots = await authService.listCharacters({ token });
    
    return res.status(200).json({ success: true, data: slots });
  } catch (err) {
    // Mapear errores a códigos HTTP apropiados
    let code = 500;
    switch (err.message) {
      case 'Token de autenticación requerido':
      case 'Token inválido o expirado': 
        code = 401; break;
      case 'Cuenta no encontrada': 
        code = 404; break;
      default: 
        code = 500;
    }
    
    logger.warn('Error al listar personajes', { 
      httpStatus: code, 
      error: err.message 
    });
    
    return res.status(code).json({ success: false, message: err.message || 'Server error' });
  }
}