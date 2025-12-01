/**
 * Test de flujo completo de autenticación con WebSocket - ES Module
 * 
 * Pruebas:
 * - Registro de usuario + Login + Notificación WebSocket
 * - Integración con MongoDB
 * - Comunicación en tiempo real
 * 
 * @module tests/3_login-ws.test
 */

import { config } from 'dotenv';
config();

import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import WebSocket from 'ws';
import mongoose from 'mongoose';
import dns from 'dns/promises';

// Configurar JWT secret antes de importar la aplicación
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Importar módulos necesarios
const appModule = await import('../app.js');
const app = appModule.default;
const hubModule = await import('../websocket/hub.js');
const { createWebSocketServer } = hubModule;
const messageTypesModule = await import('../websocket/messageTypes.js');
const MessageTypes = messageTypesModule.default;
const loggerModule = await import('../utils/logger.js');
const logger = loggerModule.default;
const userModule = await import('../models/User.js');
const User = userModule.default;
const ipBlockerModule = await import('../utils/ipBlocker.js');
const { reset } = ipBlockerModule;

logger.info('Iniciando test: flujo completo de autenticación');

async function startServer() {
  const server = http.createServer(app);
  const { wss } = createWebSocketServer(server);
  server.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  return { server, port, wss };
}

test('Registro + Login notifica al GameServer vía WebSocket', async (t) => {
  logger.info('Iniciando test: Registro + Login + WS');

  process.env.GAME_SERVER_TOKEN = 'secret';
  reset('::1');

  // 1. Verificar acceso a MongoDB y conectar
  try {
    await dns.lookup(new URL(process.env.MONGODB_URI).hostname);
  } catch {
    t.skip('MongoDB host no resolvible');
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteOne({ username: 'tester' });

  const { server, port, wss } = await startServer();

  // 2. Conectar GameServer vía WebSocket
  const ws = new WebSocket(`ws://localhost:${port}`);
  await new Promise(resolve => ws.once('open', resolve));
  logger.info('GameServer conectado vía WebSocket');

  const handshakePromise = new Promise(resolve =>
    ws.once('message', data => {
      const handshake = JSON.parse(data.toString());
      logger.info('Handshake recibido del servidor', handshake);
      resolve(handshake);
    })
  );

  ws.send(JSON.stringify({
    type: 1,
    data: { name: 'Zone1', token: 'secret' }
  }));

  await handshakePromise;

  // 3. Ejecutar registro vía API
  const registerRes = await fetch(`http://localhost:${port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: 'tester', 
      password: 'Sup3rStr0ng!@#' 
    }),
  });

  const registerBody = await registerRes.json();
  assert.strictEqual(registerRes.status, 200);
  assert.strictEqual(registerBody.success, true);
  assert.strictEqual(registerBody.data.username, 'tester');

  // 4. Esperar mensaje que debe recibir el GameServer tras el login
  const messagePromise = new Promise(resolve =>
    ws.once('message', data => {
      const msg = JSON.parse(data.toString());
      logger.info('Mensaje recibido vía WebSocket', msg);
      resolve(msg);
    })
  );

  // 5. Ejecutar login con mismo usuario y nombre de servidor
  const loginRes = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'tester',
      password: 'Sup3rStr0ng!@#',
      serverName: 'Zone1',
    }),
  });

  const loginBody = await loginRes.json();
  logger.info('Login HTTP finalizado', {
    status: loginRes.status,
    body: loginBody,
  });

  assert.strictEqual(loginRes.status, 200);
  assert.deepStrictEqual(loginBody, {
    success: true,
    data: { 
      id: loginBody.data.id, 
      username: 'tester' 
    },
  });

  // 6. Validar mensaje WebSocket recibido
  const msg = await messagePromise;
  assert.strictEqual(msg.type, MessageTypes.USER_CONNECTED);
  assert.strictEqual(msg.data.username, 'tester');
  assert.strictEqual(typeof msg.data.token, 'string');

  // 7. Limpieza final
  await User.deleteOne({ username: 'tester' });
  await mongoose.disconnect();
  ws.close();
  wss.close();
  await new Promise(resolve => server.close(resolve));

  logger.info('Test finalizado correctamente: Registro + Login + Notificación completados');
});