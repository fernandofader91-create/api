/**
 * Test de rutas inexistentes y sistema de bloqueo de IPs - ES Module
 * 
 * Pruebas:
 * - Respuesta 404 para rutas inválidas
 * - Bloqueo de IP tras intentos repetidos
 * - Comportamiento de IPs bloqueadas
 * 
 * @module tests/4_404.test
 */

import test from 'node:test';
import assert from 'node:assert';

// Configurar JWT secret antes de importar la aplicación
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Importar módulos necesarios
const appModule = await import('../app.js');
const app = appModule.default;
const ipBlockerModule = await import('../utils/ipBlocker.js');
const { reset } = ipBlockerModule;
const loggerModule = await import('../utils/logger.js');
const logger = loggerModule.default;

logger.info('Iniciando test: Rutas inválidas & bloqueo IP');

/**
 * Utilidad para iniciar servidor Express en puerto aleatorio
 */
async function startServer() {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  return { server, port };
}

// TEST 1: Ruta inexistente retorna 404 y contiene requestId
test('GET a ruta inexistente retorna 404 y requestId', async () => {
  reset('::ffff:127.0.0.1');
  logger.info('Iniciando TEST 1: Ruta inexistente');

  const { server, port } = await startServer();
  const res = await fetch(`http://localhost:${port}/pikachu`);
  const body = await res.json();

  logger.info('Resultado del test 1', {
    status: res.status,
    body,
  });

  assert.strictEqual(res.status, 404);
  assert.ok(body.requestId);

  await new Promise(resolve => server.close(resolve));
});

// TEST 2: IP se bloquea tras múltiples requests a rutas inexistentes
test('IP se bloquea tras múltiples requests a rutas inválidas', async () => {
  reset('::ffff:127.0.0.1');
  logger.info('Iniciando TEST 2: Bloqueo por intentos');

  const { server, port } = await startServer();
  const endpoint = `http://localhost:${port}/endpoint-falso`;

  for (let i = 0; i < 2; i++) {
    const res = await fetch(endpoint);
    logger.warn(`Intento ${i + 1}: status ${res.status}`);
    assert.strictEqual(res.status, 404);
  }

  const blockedRes = await fetch(endpoint);
  const body = await blockedRes.json();

  logger.info('Resultado del test 2 (IP bloqueada)', {
    status: blockedRes.status,
    body,
  });

  assert.strictEqual(blockedRes.status, 403);
  const msg = body.message ?? body.error ?? '';
  assert.match(msg, /bloquead/i);

  await new Promise(resolve => server.close(resolve));
});

// TEST 3: IP bloqueada también recibe 403 en rutas válidas
test('IP bloqueada recibe 403 en rutas válidas', async () => {
  reset('::ffff:127.0.0.1');
  logger.info('Iniciando TEST 3: Acceso a ruta válida bloqueado');

  const { server, port } = await startServer();
  const invalidEndpoint = `http://localhost:${port}/ruta-que-no-existe`;

  // Bloquea la IP con 2 requests inválidos
  await fetch(invalidEndpoint);
  await fetch(invalidEndpoint);

  // Verifica que incluso una ruta válida dé 403
  const validRes = await fetch(`http://localhost:${port}/api/auth/login`);
  const body = await validRes.json();

  logger.info('Resultado del test 3 (ruta válida bloqueada)', {
    status: validRes.status,
    body,
  });

  assert.strictEqual(validRes.status, 403);
  const msg = body.message ?? body.error ?? '';
  assert.match(msg, /bloquead/i);

  await new Promise(resolve => server.close(resolve));
});

// Cleanup: Resetear IPs bloqueadas
test('Cleanup final: Liberar IPs bloqueadas', async () => {
  reset('::1');
  reset('::ffff:127.0.0.1');
  logger.info('Todas las IPs fueron liberadas. Entorno limpio para siguientes tests.');
});