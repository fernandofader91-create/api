// backend/websocket/hub.js
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import MessageTypes from './messageTypes.js';
import logger from '../utils/logger.js';

// 🗺️ Mapa global: nombre del servidor → conexión WebSocket
const connectedServers = new Map();

/**
 * Imprime en log el estado actual de los servidores conectados.
 */
function printState() {
  logger.info('📦 Servidores conectados:', {
    servers: Array.from(connectedServers.keys()),
  });
}

/**
 * Valida el token enviado por un GameServer al conectarse.
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
 * Maneja la autenticación y registro de un GameServer que se conecta al hub.
 */
function handleServerConnect(ws, data, context) {
  const serverName = data?.name || context.serverName;
  const token = data?.token;

  if (!isValidToken(token)) {
    ws.send(JSON.stringify({
      type: MessageTypes[3],
      data: { message: `Autenticación fallida para ${serverName}` },
      success: false,
    }));
    logger.warn(`❌ Autenticación fallida para ${serverName}`);
    ws.close();
    return;
  }

  context.serverName = serverName;
  context.authenticated = true;
  connectedServers.set(serverName, ws);

  ws.send(JSON.stringify({
    type: MessageTypes[3],
    data: { message: `Servidor ${serverName} registrado correctamente`, server_id: serverName },
    success: true,
  }));

  logger.info(`✅ GameServer "${serverName}" conectado`);
  printState();
}

/**
 * Maneja la conexión de un cliente hacia un GameServer.
 */
function handleClientConnect(ws, data) {
  const serverName = data?.serverName;
  const target = connectedServers.get(serverName);
  const success = !!target;

  ws.send(JSON.stringify({
    type: MessageTypes[2],
    ...(success
      ? { data: { token: 'token' } }
      : { data: { message: `Servidor ${serverName} no encontrado` } }
    ),
  }));

  logger[success ? 'info' : 'warn'](
    success
      ? `✅ Cliente conectado al servidor: ${serverName}`
      : `❌ Cliente falló al conectar: servidor "${serverName}" no existe`
  );
}

/**
 * Crea e inicia el WebSocket server.
 */
export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    logger.info('🔌 Conexión WebSocket abierta');

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
              logger.warn('❌ Cliente intentó conectar a un servidor no autenticado');
              break;
            }
            handleClientConnect(ws, data);
            break;
          default:
            logger.warn(`❓ Tipo de mensaje no manejado: ${typeStr}`);
        }
      } catch (e) {
        logger.error('❗ Error al procesar mensaje', { error: e.message });
      }
    });

    ws.on('close', () => {
      connectedServers.delete(context.serverName);
      logger.info(`🔌 Conexión WebSocket cerrada: ${context.serverName}`);
      printState();
    });
  });

  return { connectedServers, wss };
}

/**
 * Envía un mensaje a un GameServer previamente conectado
 */
export function sendMessageToServer(name, msg) {
  const ws = connectedServers.get(name);
  if (ws) {
    ws.send(JSON.stringify(msg));
    logger.info(`📤 Mensaje enviado a "${name}"`, { msg });
  } else {
    logger.warn(`❌ No se pudo enviar: GameServer "${name}" no encontrado`);
  }
}

/**
 * Obtiene solo los nombres de los servidores conectados
 */
export function getConnectedServerNames() {
  return Array.from(connectedServers.keys());
}
