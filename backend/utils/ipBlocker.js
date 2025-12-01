import { BLOCK_DURATION_MINUTES, MAX_INVALID_ATTEMPTS } from '../config/config.js';

const blacklist = new Map();
const attempts = new Map();

function normalizeIp(ip) {
  return ip === '::1' ? '::ffff:127.0.0.1' : ip;
}

export function isBlocked(ip) {
  ip = normalizeIp(ip);
  const expiresAt = blacklist.get(ip);
  return expiresAt && Date.now() < expiresAt;
}

export function registerInvalidRequest(ip) {
  ip = normalizeIp(ip);
  const count = attempts.get(ip) || 0;
  attempts.set(ip, count + 1);

  if (count + 1 >= MAX_INVALID_ATTEMPTS) {
    const expires = Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000;
    blacklist.set(ip, expires);
    attempts.delete(ip);
    return true;
  }
  return false;
}

export function reset(ip) {
  ip = normalizeIp(ip);
  blacklist.delete(ip);
  attempts.delete(ip);
}
