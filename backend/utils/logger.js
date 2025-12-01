// backend/utils/logger.js
import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta de logs
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Nuevo archivo por sesión
const sessionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const sessionLogFile = path.join(logDir, `${sessionTimestamp}.jsonl`);

const asyncLocalStorage = new AsyncLocalStorage();

function getRequestId() {
  const store = asyncLocalStorage.getStore();
  return store && store.requestId;
}

function runWithRequestId(requestId, fn) {
  asyncLocalStorage.run({ requestId }, fn);
}

/**
 * Formatea el mensaje de log en JSON vertical legible
 */
function formatMessage(level, message, meta) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message: message,
  };

  // Agregar requestId si está disponible
  const requestId = getRequestId();
  if (requestId) {
    logEntry.requestId = requestId;
  }

  // Agregar metadata si existe
  if (meta && Object.keys(meta).length > 0) {
    logEntry.meta = meta;
  }

  // Convertir a JSON con formato legible
  return JSON.stringify(logEntry, null, 2) + '\n' + '─'.repeat(80) + '\n';
}

/**
 * Escribe el log formateado al archivo
 */
function writeToFile(formatted) {
  fs.appendFile(sessionLogFile, formatted, (err) => {
    if (err) {
      process.stderr.write(`❌ Error escribiendo archivo de log: ${err}\n`);
    }
  });
}

// Niveles de log
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = Object.prototype.hasOwnProperty.call(levels, process.env.LOG_LEVEL)
  ? process.env.LOG_LEVEL
  : 'info';

function shouldLog(level) {
  return levels[level] <= levels[currentLevel];
}

/**
 * Logger principal con formato JSON vertical
 */
const logger = {
  info(msg, meta) { 
    if (shouldLog('info')) { 
      const formatted = formatMessage('info', msg, meta); 
      process.stdout.write(formatted); 
      writeToFile(formatted); 
    } 
  },
  
  warn(msg, meta) { 
    if (shouldLog('warn')) { 
      const formatted = formatMessage('warn', msg, meta); 
      process.stdout.write(formatted); 
      writeToFile(formatted); 
    } 
  },
  
  error(msg, meta) { 
    if (shouldLog('error')) { 
      const formatted = formatMessage('error', msg, meta); 
      process.stderr.write(formatted); 
      writeToFile(formatted); 
    } 
  },
  
  debug(msg, meta) { 
    if (shouldLog('debug')) { 
      const formatted = formatMessage('debug', msg, meta); 
      process.stdout.write(formatted); 
      writeToFile(formatted); 
    } 
  },
  
  runWithRequestId,
};

export default logger;