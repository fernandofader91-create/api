/**
 * WebSocket Hub - Sistema de comunicación en tiempo real entre API y GameServers
 * 
 * Funcionalidades principales:
 * - Autenticación y registro de GameServers via WebSocket
 * - Mantenimiento de conexiones activas con servidores de juego
 * - Routing de mensajes entre componentes del sistema
 * - Notificaciones en tiempo real hacia GameServers
 * 
 * Arquitectura:
 * - GameServers se conectan via WebSocket para autenticarse
 * - API utiliza el hub para enviar notificaciones a GameServers
 * - Comunicación bidireccional para coordinación del sistema
 * 
 * @module websocket/hub
 */

import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import MessageTypes from './messageTypes.js';
import logger from '../utils/logger.js';

/**
 * Mapa global de servidores conectados
 * Almacena las conexiones WebSocket activas de los GameServers
 * Estructura: Map<nombre_servidor, WebSocket>
 * 
 * @type {Map<string, WebSocket>}
 */
const connectedServers = new Map();

/**
 * Imprime en el log el estado actual de los servidores conectados
 * Utilizado para monitoreo y debugging del estado del hub
 */
function printState() {
  logger.info('Estado de servidores conectados:', {
    servers: Array.from(connectedServers.keys()),
  });
}

/**
 * Valida el token de autenticación proporcionado por un GameServer
 * Utiliza comparación en tiempo constante para prevenir ataques de timing
 * 
 * @param {string} token - Token proporcionado por el GameServer
 * @returns {boolean} - True si el token es válido y coincide con el esperado
 * 
 * @example
 * isValidToken('token-secreto') // true si coincide con GAME_SERVER_TOKEN
 */
export function isValidToken(token) {
  const expected = process.env.GAME_SERVER_TOKEN;
  if (!token || !expected) return false;

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (tokenBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

/**
 * Maneja el proceso de autenticación y registro de un GameServer en el hub
 * 
 * Flujo de autenticación:
 * 1. GameServer envía credenciales (nombre y token)
 * 2. Se valida el token usando comparación timing-safe
 * 3. Si es válido, se registra la conexión en el mapa global
 * 4. Se envía confirmación al GameServer
 * 5. Si es inválido, se cierra la conexión
 * 
 * @param {WebSocket} ws - Instancia de WebSocket del servidor
 * @param {Object} data - Datos de autenticación recibidos
 * @param {string} data.name - Nombre identificador del GameServer
 * @param {string} data.token - Token de autenticación
 * @param {Object} context - Contexto de la conexión WebSocket actual
 */
function handleServerConnect(ws, data, context) {
  const serverName = data?.name || context.serverName;
  const token = data?.token;

  if (!isValidToken(token)) {
    ws.send(JSON.stringify({
      type: MessageTypes[3], // SERVER_CONNECT_RESULT
      data: { message: `Autenticación fallida para ${serverName}` },
      success: false,
    }));
    logger.warn(`Autenticación fallida para ${serverName}`);
    ws.close();
    return;
  }

  context.serverName = serverName;
  context.authenticated = true;
  connectedServers.set(serverName, ws);

  ws.send(JSON.stringify({
    type: MessageTypes[3], // SERVER_CONNECT_RESULT
    data: { message: `Servidor ${serverName} registrado correctamente`, server_id: serverName },
    success: true,
  }));

  logger.info(`GameServer "${serverName}" conectado`);
  printState();
}

/**
 * Maneja la solicitud de conexión de un cliente hacia un GameServer específico
 * 
 * Propósito:
 * - Validar que el GameServer destino existe y está disponible
 * - Proporcionar token de conexión al cliente
 * - Registrar el intento de conexión para monitoreo
 * 
 * @param {WebSocket} ws - Conexión WebSocket del cliente
 * @param {Object} data - Datos de la solicitud de conexión
 * @param {string} data.serverName - Nombre del GameServer destino
 */
function handleClientConnect(ws, data) {
  const serverName = data?.serverName;
  const target = connectedServers.get(serverName);
  const success = !!target;

  ws.send(JSON.stringify({
    type: MessageTypes[2], // CLIENT_CONNECT
    ...(success
      ? { data: { token: 'token' } }
      : { data: { message: `Servidor ${serverName} no encontrado` } }
    ),
  }));

  logger[success ? 'info' : 'warn'](
    success
      ? `Cliente conectado al servidor: ${serverName}`
      : `Cliente falló al conectar: servidor "${serverName}" no existe`
  );
}

/**
 * Crea e inicia el servidor WebSocket integrado con el servidor HTTP
 * 
 * Configuración:
 * - Se integra con el servidor HTTP existente
 * - Maneja eventos de conexión, mensajes y cierre
 * - Mantiene contexto de autenticación por conexión
 * - Proporciona manejo de errores robusto
 * 
 * @param {http.Server} httpServer - Servidor HTTP para integración
 * @returns {Object} Objeto con el servidor WebSocket y mapa de conexiones
 * @returns {WebSocketServer} return.wss - Instancia del servidor WebSocket
 * @returns {Map} return.connectedServers - Mapa de servidores conectados
 */
export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    logger.info('Conexión WebSocket abierta');

    const context = {
      serverName: 'UnknownServer',
      authenticated: false,
    };

    ws.on('message', (msg) => {
      try {
        const { type, data } = JSON.parse(msg);
        const typeStr = MessageTypes[type];

        switch (typeStr) {
          case 'SERVER_CONNECT':
            handleServerConnect(ws, data, context);
            break;
          case 'CLIENT_CONNECT':
            if (!context.authenticated) {
              logger.warn('Cliente intentó conectar a un servidor no autenticado');
              break;
            }
            handleClientConnect(ws, data);
            break;
          default:
            logger.warn(`Tipo de mensaje no manejado: ${typeStr}`);
        }
      } catch (e) {
        logger.error('Error al procesar mensaje', { error: e.message });
      }
    });

    ws.on('close', () => {
      connectedServers.delete(context.serverName);
      logger.info(`Conexión WebSocket cerrada: ${context.serverName}`);
      printState();
    });
  });

  return { connectedServers, wss };
}

/**
 * Envía un mensaje a un GameServer previamente conectado
 * 
 * Utilizado por la API para enviar notificaciones y comandos
 * a GameServers específicos.
 * 
 * @param {string} name - Nombre del GameServer destino
 * @param {Object} msg - Mensaje a enviar (debe ser serializable a JSON)
 * @returns {void}
 * 
 * @example
 * sendMessageToServer('Zone1', { type: 'USER_AUTH', data: {...} })
 */
export function sendMessageToServer(name, msg) {
  const ws = connectedServers.get(name);
  if (ws) {
    ws.send(JSON.stringify(msg));
    logger.info(`Mensaje enviado a "${name}"`, { msg });
  } else {
    logger.warn(`No se pudo enviar: GameServer "${name}" no encontrado`);
  }
}

/**
 * Obtiene la lista de nombres de todos los servidores conectados
 * 
 * Útil para:
 * - Mostrar servidores disponibles
 * - Balanceo de carga
 * - Monitoreo del sistema
 * 
 * @returns {string[]} Array con los nombres de los servidores conectados
 * 
 * @example
 * getConnectedServerNames() // ['Zone1', 'Zone2', 'Arena1']
 */
export function getConnectedServerNames() {
  return Array.from(connectedServers.keys());
}