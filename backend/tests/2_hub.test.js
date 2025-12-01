/**
 * Test del WebSocket Hub - ES Module
 * 
 * Pruebas:
 * - Autenticación de GameServer con token válido/inválido
 * - Comparación en tiempo constante de tokens
 * 
 * @module tests/2_hub.test
 */

import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import WebSocket from 'ws';

// Configurar JWT secret antes de importar la aplicación
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Importar módulos necesarios
const appModule = await import('../app.js');
const app = appModule.default;
const hubModule = await import('../websocket/hub.js');
const { createWebSocketServer, isValidToken } = hubModule;
const messageTypesModule = await import('../websocket/messageTypes.js');
const MessageTypes = messageTypesModule.default;

/**
 * Inicia un servidor HTTP + WebSocket para tests de integración
 */
async function startServer() {
  const server = http.createServer(app);
  const { connectedServers, wss } = createWebSocketServer(server);
  server.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  return { server, port, connectedServers, wss };
}

// ----------------------------------
// TEST: GameServer autentica con token válido
// ----------------------------------
test('GameServer authenticates with valid token', async () => {
  process.env.GAME_SERVER_TOKEN = 'secret';
  const { server, port, connectedServers, wss } = await startServer();
  const ws = new WebSocket(`ws://localhost:${port}`);

  await new Promise(resolve => ws.once('open', resolve));

  const responsePromise = new Promise(resolve =>
    ws.once('message', data => resolve(JSON.parse(data.toString())))
  );

  ws.send(JSON.stringify({
    type: 1,
    data: { name: 'Zone1', token: 'secret' }
  }));

  const res = await responsePromise;
  assert.strictEqual(res.type, MessageTypes[3]);
  assert.strictEqual(res.success, true);
  assert.strictEqual(connectedServers.has('Zone1'), true);

  ws.close();
  wss.close();
  await new Promise(resolve => server.close(resolve));
});

// ----------------------------------
// TEST: GameServer rechazado con token inválido
// ----------------------------------
test('GameServer rejected with invalid token', async () => {
  process.env.GAME_SERVER_TOKEN = 'secret';
  const { server, port, connectedServers, wss } = await startServer();
  const ws = new WebSocket(`ws://localhost:${port}`);

  await new Promise(resolve => ws.once('open', resolve));

  const responsePromise = new Promise(resolve =>
    ws.once('message', data => resolve(JSON.parse(data.toString())))
  );
  const closePromise = new Promise(resolve => ws.once('close', resolve));

  ws.send(JSON.stringify({
    type: 1,
    data: { name: 'Zone2', token: 'wrong' }
  }));

  const res = await responsePromise;
  assert.strictEqual(res.type, MessageTypes[3]);
  assert.strictEqual(res.success, false);
  assert.strictEqual(connectedServers.has('Zone2'), false);

  await closePromise;
  wss.close();
  await new Promise(resolve => server.close(resolve));
});

// ----------------------------------
// TEST: Comparación en tiempo constante
// ----------------------------------
test('isValidToken compares tokens in constant time', () => {
  process.env.GAME_SERVER_TOKEN = 'secret';

  const iterations = 1000000;
  const measure = (token) => {
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      isValidToken(token);
    }
    return process.hrtime.bigint() - start;
  };

  const validTime = measure('secret');
  const invalidTime = measure('secres');

  const diffPerCall = Math.abs(Number(validTime - invalidTime)) / iterations;
  assert.ok(diffPerCall < 1000, `Timing difference too high: ${diffPerCall}ns`);
});