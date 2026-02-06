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

const sessionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const sessionLogFile = path.join(logDir, `${sessionTimestamp}.json`);

// Inicializamos el archivo JSON
fs.writeFileSync(sessionLogFile, '[\n', 'utf8');

const asyncLocalStorage = new AsyncLocalStorage();

function getRequestId() {
  const store = asyncLocalStorage.getStore();
  return store && store.requestId;
}

function runWithRequestId(requestId, fn) {
  asyncLocalStorage.run({ requestId }, fn);
}

// Función interna para formatear el objeto de log
function buildLogEntry(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  const requestId = getRequestId();
  if (requestId) entry.requestId = requestId;
  if (meta && Object.keys(meta).length > 0) entry.meta = meta;
  return entry;
}

let isFirstEntry = true;
function writeToFile(logEntry) {
  const prefix = isFirstEntry ? "" : ",\n";
  isFirstEntry = false;
  const formatted = JSON.stringify(logEntry, null, 2);
  
  try {
    fs.appendFileSync(sessionLogFile, prefix + formatted, 'utf8');
  } catch (err) {
    process.stderr.write(`Failed to write log file: ${err}\n`);
  }
}

// Función para imprimir en consola con detalles si existen
function printToConsole(level, message, meta) {
  const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
  const reset = '\x1b[0m';
  const reqId = getRequestId() ? ` [${getRequestId().split('-')[0]}]` : '';
  
  // Imprimir línea principal
  let output = `${color}[${level.toUpperCase()}]${reqId} ${message}${reset}\n`;
  
  // Si hay meta (datos de la request, errores, etc), los imprimimos bonitos
  if (meta && Object.keys(meta).length > 0) {
    output += `\x1b[90m${JSON.stringify(meta, null, 2)}\x1b[0m\n`;
  }
  
  if (level === 'error') {
    process.stderr.write(output);
  } else {
    process.stdout.write(output);
  }
}

process.on('exit', () => {
  try {
    fs.appendFileSync(sessionLogFile, '\n]', 'utf8');
  } catch (e) { /* ignore */ }
});

['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, () => process.exit());
});

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = Object.prototype.hasOwnProperty.call(levels, process.env.LOG_LEVEL)
  ? process.env.LOG_LEVEL
  : 'info';

function shouldLog(level) {
  return levels[level] <= levels[currentLevel];
}

const logger = {
  info(msg, meta) { 
    if (shouldLog('info')) { 
      const entry = buildLogEntry('info', msg, meta);
      printToConsole('info', msg, meta); 
      writeToFile(entry); 
    } 
  },
  warn(msg, meta) { 
    if (shouldLog('warn')) { 
      const entry = buildLogEntry('warn', msg, meta);
      printToConsole('warn', msg, meta); 
      writeToFile(entry); 
    } 
  },
  error(msg, meta) { 
    if (shouldLog('error')) { 
      const entry = buildLogEntry('error', msg, meta);
      printToConsole('error', msg, meta); 
      writeToFile(entry); 
    } 
  },
  debug(msg, meta) { 
    if (shouldLog('debug')) { 
      const entry = buildLogEntry('debug', msg, meta);
      printToConsole('debug', msg, meta); 
      writeToFile(entry); 
    } 
  },
  runWithRequestId,
};

export default logger;