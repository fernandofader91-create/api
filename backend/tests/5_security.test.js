/**
 * Test de seguridad (Helmet, Rate Limiter & Sanitizer) - ES Module
 * 
 * Pruebas:
 * - Headers de seguridad de Helmet
 * - Rate limiting
 * - Sanitización de datos
 * 
 * @module tests/5_security.test
 */

import test from 'node:test';
import assert from 'node:assert';

// Configurar JWT secret antes de importar la aplicación
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Importar módulos necesarios
const appModule = await import('../app.js');
const app = appModule.default;
const loggerModule = await import('../utils/logger.js');
const logger = loggerModule.default;
const securityModule = await import('../utils/security.js');
const { sanitizeMiddleware } = securityModule;

logger.info('Iniciando test: Helmet, Rate Limiter & Sanitizer');

/**
 * Resetear rate limiter para una IP específica
 */
function resetRateLimiter(ip) {
  const layer = app._router.stack.find(l => typeof l.handle?.resetKey === 'function');
  if (layer) {
    layer.handle.resetKey(ip);
  }
}

/**
 * Utilidad para iniciar servidor en tests
 */
async function startServer() {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  return { server, port };
}

// TEST: Helmet agrega cabeceras de seguridad
test('Helmet aplica cabeceras de seguridad', async () => {
  const { server, port } = await startServer();
  const res = await fetch(`http://localhost:${port}/`);

  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-dns-prefetch-control'), 'off');

  await new Promise(resolve => server.close(resolve));
});

// TEST: Rate limiter bloquea tras muchos requests
test('Rate limiter devuelve 429 tras exceder el límite', async () => {
  resetRateLimiter('::1');
  resetRateLimiter('::ffff:127.0.0.1');

  const { server, port } = await startServer();
  const url = `http://localhost:${port}/`;

  const firstRes = await fetch(url);
  assert.strictEqual(firstRes.status, 200);

  let status = firstRes.status;
  for (let i = 0; i < 110 && status !== 429; i++) {
    const res = await fetch(url);
    status = res.status;
  }

  assert.strictEqual(status, 429);

  await new Promise(resolve => server.close(resolve));
  resetRateLimiter('::1');
  resetRateLimiter('::ffff:127.0.0.1');
});

// TEST: Sanitizer elimina claves potencialmente peligrosas
test('sanitizeMiddleware elimina claves maliciosas', () => {
  const req = {
    body: {
      $where: 'malicious',
      good: 'ok',
      nested: { 'evil.key': 'bad', safe: 'yes' },
    },
    query: {
      'user.name': 'bad',
      normal: 'ok',
      deep: { $gt: 5 },
    },
    params: {
      id: '123',
      '$ne': 'value',
      'bad.key': 'x',
    },
  };

  let nextCalled = false;
  sanitizeMiddleware(req, {}, () => {
    nextCalled = true;
  });

  function hasInvalidKeys(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return Object.keys(obj).some(
      k => k.startsWith('$') || k.includes('.') || hasInvalidKeys(obj[k])
    );
  }

  assert.ok(nextCalled, 'Next middleware was not called');
  assert.strictEqual(hasInvalidKeys(req.body), false);
  assert.strictEqual(hasInvalidKeys(req.query), false);
  assert.strictEqual(hasInvalidKeys(req.params), false);
  assert.strictEqual(req.body.good, 'ok');
  assert.strictEqual(req.body.nested.safe, 'yes');
});