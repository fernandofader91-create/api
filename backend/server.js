/**
 * Punto de entrada principal del servidor de la API Digimon.
 * 
 * Responsabilidades:
 * - Inicialización de la conexión a base de datos
 * - Creación del servidor HTTP
 * - Configuración del servidor WebSocket
 * - Manejo de errores de inicialización
 * - Configuración del puerto de escucha
 * 
 * @module server
 */

import http from 'http';
import app from './app.js';
import { connectDB } from './database.js';
import { createWebSocketServer } from './websocket/hub.js';
import logger from './utils/logger.js';
import dotenv from 'dotenv';

// Configuración de variables de entorno
dotenv.config();

/**
 * Puerto de operación del servidor
 * Prioridad: Variable de entorno PORT, valor por defecto 1912
 */
const port = process.env.PORT || 1912;

/**
 * Función de inicialización del servidor
 * Secuencia de arranque:
 * 1. Conexión a base de datos MongoDB
 * 2. Creación del servidor HTTP con la app Express
 * 3. Inicialización del servidor WebSocket
 * 4. Puesta en escucha del puerto configurado
 * 
 * @async
 * @throws {Error} - Error crítico que detiene la ejecución
 */
async function start() {
  try {
    // Establecimiento de conexión con la base de datos
    await connectDB();

    // Creación del servidor HTTP usando la aplicación Express
    const server = http.createServer(app);
    
    // Inicialización del servidor WebSocket sobre el mismo servidor HTTP
    createWebSocketServer(server);

    /**
     * Puesta en marcha del servidor
     * Una vez en escucha, responde a peticiones HTTP y WebSocket
     */
    server.listen(port, () => {
      logger.info('======================================');
      logger.info(`Servidor corriendo en: http://localhost:${port}`);
      logger.info('======================================\n');
    });

    /**
     * Manejo de errores del servidor HTTP
     * Errores críticos que requieren terminación del proceso
     */
    server.on('error', (err) => {
      logger.error('Error en el servidor HTTP: ' + err.message, { 
        stack: err.stack 
      });
      process.exit(1);
    });

  } catch (err) {
    /**
     * Manejo de errores durante la inicialización
     * Incluye errores de conexión a BD y otros errores críticos
     */
    logger.error('Error crítico al iniciar el servidor: ' + err.message, { 
      stack: err.stack 
    });
    process.exit(1);
  }
}

// Ejecución del proceso de inicio
start();