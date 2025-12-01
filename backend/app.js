/**
 * Configuración principal de la aplicación Express para la API de Digimon.
 * 
 * Responsabilidades:
 * - Configuración de variables de entorno
 * - Definición de middlewares globales
 * - Registro de routers de la aplicación
 * - Manejo de rutas estáticas
 * - Gestión centralizada de errores
 * - Configuración de seguridad
 * 
 * @module app
 */

// Configuración de variables de entorno
import dotenv from 'dotenv';
dotenv.config();

// Dependencias principales
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Módulos personalizados de la aplicación
import { AppRouter } from './router.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { blockIpMiddleware } from './middlewares/blockIpMiddleware.js';
import { registerInvalidRequest } from './utils/ipBlocker.js';
import {
  helmetMiddleware,
  sanitizeMiddleware,
} from './utils/security.js';
import logger from './utils/logger.js';

/**
 * Configuración de variables globales __filename y __dirname para ES Modules.
 * Necesario debido a la transición de CommonJS a ES Modules.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Instancia principal de la aplicación Express.
 * @type {import('express').Application}
 */
const app = express();

// SECCIÓN: MIDDLEWARES GLOBALES

/**
 * Configuración de middlewares de seguridad
 * - helmetMiddleware: Headers de seguridad HTTP
 * - cors: Control de acceso cross-origin
 * - bodyParser.json: Parseo de cuerpos JSON en requests
 * - sanitizeMiddleware: Sanitización de datos de entrada
 * - requestLogger: Logging estructurado de peticiones
 */
app.use(helmetMiddleware);
app.use(cors());
app.use(bodyParser.json());
app.use(sanitizeMiddleware);
app.use(requestLogger);

/**
 * Servicio de archivos estáticos desde el directorio 'public'
 * Para servir contenido estático como imágenes, CSS, JavaScript del cliente
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Montaje del router principal de la aplicación
 * Todas las rutas de la API están definidas en AppRouter
 */
app.use(AppRouter);

/**
 * Endpoint de health check
 * Proporciona verificación básica de que la API está operativa
 */
app.get('/', (req, res) => {
  res.send('API funcionando');
});

/**
 * Manejo de rutas no encontradas (404)
 * Registra intentos de acceso a endpoints inexistentes
 * Puede integrarse con sistema de bloqueo de IPs
 */
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  logger.warn('Ruta no encontrada', {
    method: req.method,
    url: req.originalUrl,
    ip: ip,
    requestId: req.requestId,
  });

  res.status(404).json({ 
    error: 'Ruta no encontrada', 
    requestId: req.requestId 
  });
});

/**
 * Middleware de manejo de errores global
 * Captura y procesa todos los errores no manejados en la aplicación
 */
app.use(errorHandler);

export default app;