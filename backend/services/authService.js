/**
 * Servicio de Autenticación - Lógica de negocio para gestión de usuarios y autenticación
 * 
 * Responsabilidades:
 * - Registro y validación de nuevos usuarios
 * - Autenticación y generación de tokens JWT
 * - Gestión de personajes y slots de usuarios
 * - Integración con WebSocket Hub para notificaciones
 * - Operaciones transaccionales con MongoDB
 * 
 * @module services/authService
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Character from '../models/Character.js';
import { sendMessageToServer, getConnectedServerNames } from '../websocket/hub.js';
import MessageTypes from '../websocket/messageTypes.js';
import mongoose from 'mongoose';    
import logger from '../utils/logger.js';
import 'dotenv/config.js';

/**
 * Clave secreta para firmar tokens JWT
 * @type {string}
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno');
}

/**
 * Error HTTP personalizado para manejo consistente de códigos de estado
 */
class HttpError extends Error {
  /**
   * @param {number} status - Código de estado HTTP
   * @param {string} msg - Mensaje de error
   */
  constructor(status, msg) { 
    super(msg); 
    this.status = status; 
  }
}

/** 
 * ========= SERVICIO DE REGISTRO ========= 
 */

/**
 * Registra un nuevo usuario en el sistema
 * 
 * Flujo de registro:
 * 1. Validar y normalizar datos de entrada
 * 2. Verificar unicidad de username y email
 * 3. Hashear contraseña con bcrypt
 * 4. Crear usuario en base de datos
 * 5. Retornar datos seguros del usuario (sin password)
 * 
 * @param {Object} params - Parámetros de registro
 * @param {string} params.username - Nombre de usuario (min 3 caracteres)
 * @param {string} params.email - Email válido
 * @param {string} params.password - Contraseña (min 6 caracteres)
 * @returns {Promise<Object>} Datos del usuario creado
 * @throws {HttpError} 400 - Datos inválidos o faltantes
 * @throws {HttpError} 409 - Usuario o email ya existen
 * 
 * @example
 * const user = await register({
 *   username: 'nuevoUsuario',
 *   email: 'usuario@ejemplo.com',
 *   password: 'contraseñaSegura'
 * });
 */
export async function register({ username, email, password }) {
  // Normalización y validación básica
  const uname = String(username ?? '').trim();
  const mail  = String(email ?? '').trim().toLowerCase();
  const pass  = String(password ?? '');

  // Validaciones de negocio
  if (!uname || !mail || !pass) throw new HttpError(400, 'Faltan campos requeridos');
  if (uname.length < 3) throw new HttpError(400, 'El nombre de usuario debe tener al menos 3 caracteres');
  if (!/.+@.+\..+/.test(mail)) throw new HttpError(400, 'Formato de email inválido');
  if (pass.length < 6) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');

  // Verificar unicidad
  if (await User.exists({ username: uname })) throw new HttpError(409, 'Nombre de usuario ya registrado');
  if (await User.exists({ email: mail })) throw new HttpError(409, 'Email ya registrado');

  // Hashear contraseña
  const hashed = await bcrypt.hash(pass, 10);

  try {
    const user = await User.create({
      username: uname,
      email: mail,
      password: hashed,
    });
    
    // Retornar datos seguros (sin password)
    return { 
      id: user._id, 
      username: user.username, 
      email: user.email 
    };
  } catch (err) {
    // Manejar errores de duplicación (fallback)
    if (err && err.code === 11000) {
      const dupField =
        err.keyPattern?.username ? 'usuario' :
        err.keyPattern?.email    ? 'email'   : 'campo';
      throw new HttpError(409, `Duplicado de ${dupField}`);
    }
    throw err;
  }
}

/** 
 * ========= SERVICIO DE LOGIN ========= 
 */

/**
 * Autentica un usuario y notifica al GameServer correspondiente
 * 
 * Flujo de autenticación:
 * 1. Buscar usuario por username
 * 2. Verificar contraseña con bcrypt.compare
 * 3. Generar token JWT con expiración
 * 4. Notificar al GameServer via WebSocket
 * 5. Retornar datos de usuario con token
 * 
 * @param {Object} params - Parámetros de autenticación
 * @param {string} params.username - Nombre de usuario
 * @param {string} params.password - Contraseña
 * @param {string} params.serverName - Nombre del servidor destino
 * @returns {Promise<Object>} Datos de usuario autenticado con token
 * @throws {Error} Credenciales inválidas
 * 
 * @example
 * const user = await login({
 *   username: 'usuarioExistente',
 *   password: 'contraseñaCorrecta', 
 *   serverName: 'Zone1'
 * });
 */
export async function login({ username, password, serverName }) {
  // Buscar usuario
  const user = await User.findOne({ username });
  if (!user) throw new Error('Credenciales inválidas');

  // Verificar contraseña
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Credenciales inválidas');

  // Generar token JWT (1 hora de expiración)
  const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '1h' });

  // Notificar GameServer via WebSocket
  sendMessageToServer(serverName, {
    type: "USER_CONNECTED",
    data: { username, token },
  });

  logger.info(`Login exitoso. Token enviado a GameServer "${serverName}"`);

  return { 
    id: user._id, 
    username, 
    token 
  };
}

/** 
 * ========= SERVICIO DE SERVIDORES ========= 
 */

/**
 * Obtiene lista de servidores de juego conectados al WebSocket Hub
 * 
 * @returns {Promise<Array>} Lista de servidores disponibles
 * 
 * @example
 * const servers = await servers();
 * // Retorna: [{ id: 'Zone1', name: 'Zone1' }, { id: 'Zone2', name: 'Zone2' }]
 */
export async function servers() {
  const names = getConnectedServerNames();
  return names.map(n => ({ id: n, name: n }));
}

/** 
 * ========= SERVICIO DE CREACIÓN DE PERSONAJE ========= 
 */

/**
 * Crea un nuevo personaje para un usuario autenticado
 * 
 * Flujo de creación:
 * 1. Validar token JWT
 * 2. Verificar slots disponibles (máximo 5 por usuario)
 * 3. Validar unicidad del nombre del personaje
 * 4. Crear personaje en transacción de base de datos
 * 5. Actualizar slot del usuario
 * 
 * @param {Object} params - Parámetros de creación
 * @param {string} params.token - Token JWT de autenticación
 * @param {string} params.name - Nombre del personaje
 * @param {string} params.charClass - Clase del personaje
 * @returns {Promise<Object>} Datos del personaje creado
 * @throws {Error} Token de autenticación requerido
 * @throws {Error} Token inválido o expirado
 * @throws {Error} Cuenta no encontrada
 * @throws {Error} No puedes tener más de 5 personajes
 * @throws {Error} El nombre del personaje ya existe
 * 
 * @example
 * const character = await createPlayer({
 *   token: 'jwt-token-here',
 *   name: 'MiGuerrero',
 *   charClass: 'Warrior'
 * });
 */
export async function createPlayer({ token, name, charClass }) {
  if (!token) throw new Error('Token de autenticación requerido');

  // Normalizar datos
  const normName  = String(name ?? '').trim();
  const normClass = String(charClass ?? '').trim().toLowerCase();
  if (!normName || !normClass) throw new Error('Faltan campos requeridos: name, class');

  // Verificar token JWT
  let decoded;
  try { 
    decoded = jwt.verify(token, JWT_SECRET); 
  } catch { 
    throw new Error('Token inválido o expirado'); 
  }

  const userId = decoded.id;

  // Transacción para consistencia de datos
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Verificar existencia de usuario
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('Cuenta no encontrada');

    // Buscar slot disponible
    const freeIndex = user.characters.findIndex(s => !s.characterId);
    if (freeIndex === -1) throw new Error('No puedes tener más de 5 personajes');

    // Verificar nombre único
    const clash = await Character.exists({ userId, name: normName }).session(session);
    if (clash) throw new Error('El nombre del personaje ya existe');

    // Crear personaje (los defaults se aplican automáticamente)
    const newCharacter = {
      userId, 
      name: normName, 
      class: normClass,
    };

    const [char] = await Character.create([newCharacter], { session });

    // Actualizar slot del usuario
    user.characters[freeIndex].characterId   = char._id;
    user.characters[freeIndex].name_snapshot = char.name;
    user.characters[freeIndex].last_played   = new Date();
    await user.save({ session });

    // Commit de la transacción
    await session.commitTransaction();
    session.endSession();

    return {
      id: char._id.toString(),
      name: char.name,
      class: char.class,
      race: char.race,
      level: char.level,
      slot: user.characters[freeIndex].slot,
    };
  } catch (err) {
    // Rollback en caso de error
    await session.abortTransaction();
    session.endSession();
    
    if (err && err.code === 11000) throw new Error('El nombre del personaje ya existe');
    throw err;
  }
}

/** 
 * ========= SERVICIO DE LISTADO DE PERSONAJES ========= 
 */

/**
 * Obtiene la lista de personajes de un usuario autenticado
 * 
 * Incluye información de slots, incluso los vacíos, ordenados por número de slot
 * 
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.token - Token JWT de autenticación
 * @returns {Promise<Array>} Lista de slots de personajes
 * @throws {Error} Token de autenticación requerido
 * @throws {Error} Token inválido o expirado
 * @throws {Error} Cuenta no encontrada
 * 
 * @example
 * const characters = await listCharacters({ token: 'jwt-token-here' });
 * // Retorna: [
 * //   { slot: 1, characterId: '...', name: 'Personaje1', level: 5, last_played: ... },
 * //   { slot: 2, characterId: null, name: null, level: null, last_played: null }
 * // ]
 */
export async function listCharacters({ token }) {
  if (!token) throw new Error('Token de autenticación requerido');

  // Verificar token
  let decoded;
  try { 
    decoded = jwt.verify(token, JWT_SECRET); 
  } catch { 
    throw new Error('Token inválido o expirado'); 
  }

  const userId = decoded.id;
  
  // Obtener usuario con sus slots
  const user = await User.findById(userId).lean();
  if (!user) throw new Error('Cuenta no encontrada');

  // Obtener datos de personajes existentes
  const ids = user.characters.map(s => s.characterId).filter(Boolean);
  const chars = ids.length
    ? await Character.find({ _id: { $in: ids } }).select('_id name level').lean()
    : [];

  // Crear mapa para búsqueda eficiente
  const map = new Map(chars.map(c => [String(c._id), c]));

  // Construir respuesta ordenada por slot
  return user.characters
    .sort((a, b) => a.slot - b.slot)
    .map(s => {
      const live = s.characterId ? map.get(String(s.characterId)) : null;
      return {
        slot: s.slot,
        characterId: s.characterId || null,
        name: live?.name ?? s.name_snapshot ?? null,
        level: live?.level ?? null,
        last_played: s.last_played ?? null,
      };
    });
}