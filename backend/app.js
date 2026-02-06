/**
 * Configuración de la aplicación Express para la API de Digimon.
 * Define middlewares globales y registra los routers de la aplicación.asdasdasd
 *
 * @module app
 */
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppRouter } from './router.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { registerInvalidRequest } from './utils/ipBlocker.js';
import {
  helmetMiddleware,
  globalLimiter,
  sanitizeMiddleware,
} from './utils/security.js';
import logger from './utils/logger.js';

// 🔹 Definir __filename y __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);







/**
 * Instancia principal de la aplicación Express.
 * @type {import('express').Application}
 */
const app = express();

//  Middlewares globales
app.use(helmetMiddleware);
app.use(globalLimiter);
app.use(cors());
app.use(bodyParser.json());
app.use(sanitizeMiddleware);
app.use(requestLogger);

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

//  Rutas principales de la API
app.use(AppRouter);

//  Ruta de salud
app.get('/', (req, res) => {
  res.send(' API funcionando');
});

//  Manejo de rutas inexistentes (404)
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (registerInvalidRequest(ip)) {
    logger.warn(' IP agregada a blacklist por endpoint inexistente', {
      ip,
      url: req.originalUrl,
    });
  }

  logger.warn(' Ruta no encontrada', {
    method: req.method,
    url: req.originalUrl,
    ip,
    requestId: req.requestId,
  });

  res.status(404).json({ error: 'Ruta no encontrada', requestId: req.requestId });
});

//  Manejo de errores internos
app.use(errorHandler);

export default app;
