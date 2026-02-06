/**
 * Punto de entrada del servidor HTTP de la API de Digimon.
 * Inicializa la conexión a la base de datos y arranca el servidor Express.
 *
 * @module server
 */
import http from 'http';
import app from './app.js';
import { connectDB } from './database.js';
import { createWebSocketServer } from './websocket/hub.js';
import logger from './utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

// Puerto donde se expone la API
const port = process.env.PORT || 1912;

//  Direcciones IP para escuchar: 0.0.0.0 para todas las interfaces (pública)
const host = '127.0.0.1'; 

async function start() {
  try {
    await connectDB();
    console.log("MONGO_URI =", process.env.MONGODB_URI)
    const server = http.createServer(app);
    // Inicializa el servidor WebSocket sobre el servidor HTTP existente asd
    createWebSocketServer(server);
    server.listen(port, host, () => {
      logger.info('======================================');
      logger.info(`✅ Servidor DigimonMMO corriendo en: http://${host}:${port}`); 
      logger.info('======================================\n');
    });

    server.on('error', (err) => {
      logger.error('❌rror en el servidor HTTP: ' + err.message, { stack: err.stack });
      process.exit(1);
    });
  } catch (err) {
    logger.error(' Error crítico al iniciar el servidor: ' + err.message, { stack: err.stack });
    process.exit(1);
  }
}

start();
