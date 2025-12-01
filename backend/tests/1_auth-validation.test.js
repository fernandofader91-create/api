/**
 * Test de validación de autenticación - ES Module
 * 
 * Pruebas:
 * - Validación de registro (username, password, reglas de contraseña)
 * - Validación de login (campos requeridos, estructura)
 * 
 * @module tests/1_auth-validation.test
 */

import test from 'node:test';
import assert from 'node:assert';

// Configurar JWT secret antes de importar la aplicación
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Importar la aplicación después de configurar las variables de entorno
const app = await import('../app.js').then(module => module.default);

// Configurar proxy para rate limiting
app.set('trust proxy', 1);
let ipCounter = 1;

/**
 * Utilidad para realizar peticiones HTTP en tests
 */
async function request(path, body) {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();

  const ip = `127.0.0.${ipCounter++}`;
  const res = await fetch(`http://localhost:${port}${path}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'X-Forwarded-For': ip 
    },
    body: JSON.stringify(body),
  });
  
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  await new Promise(resolve => server.close(resolve));
  return { res, json };
}

// ------------------ TESTS DE VALIDACIÓN DE REGISTRO ------------------

test('Registration fails without username', async () => {
  const { res, json } = await request('/api/auth/register', {
    password: 'Sup3rStr0ng!@#',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Registration failed');
});

test('Registration fails without password', async () => {
  const { res, json } = await request('/api/auth/register', {
    username: 'tester',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Registration failed');
});

test('Registration fails with short password', async () => {
  const { res, json } = await request('/api/auth/register', {
    username: 'tester',
    password: 'Aa1!', // <12 chars
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Registration failed');
});

test('Registration fails without lowercase letter', async () => {
  const { res, json } = await request('/api/auth/register', {
    username: 'tester',
    password: 'UPPERCASE123!',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Registration failed');
});

test('Registration fails without uppercase letter', async () => {
  const { res, json } = await request('/api/auth/register', {
    username: 'tester',
    password: 'lowercase123!',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Registration failed');
});

test('Registration fails without number', async () => {
  const { res, json } = await request('/api/auth/register', {
    username: 'tester',
    password: 'NoNumbers!!!!A',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Registration failed');
});

test('Registration fails without symbol', async () => {
  const { res, json } = await request('/api/auth/register', {
    username: 'tester',
    password: 'NoSymbols123A',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Registration failed');
});

// ------------------ TESTS DE VALIDACIÓN DE LOGIN ------------------

test('Login fails without serverName', async () => {
  const { res, json } = await request('/api/auth/login', {
    username: 'tester',
    password: 'Sup3rStr0ng!@#',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Invalid credentials');
});

test('Login fails without username', async () => {
  const { res, json } = await request('/api/auth/login', {
    serverName: 'Zone1',
    password: 'Sup3rStr0ng!@#',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Invalid credentials');
});

test('Login fails without password', async () => {
  const { res, json } = await request('/api/auth/login', {
    serverName: 'Zone1',
    username: 'tester',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.message, 'Invalid credentials');
});