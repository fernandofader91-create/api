/**
 * Módulo de gestión de conexión a base de datos MongoDB.
 * 
 * Funcionalidades:
 * - Establecimiento de conexión con MongoDB Atlas
 * - Manejo de errores de conexión
 * - Configuración centralizada de conexión a BD
 * 
 * @module database
 */

import mongoose from 'mongoose';
import logger from './utils/logger.js';

/**
 * Establece conexión con la base de datos MongoDB
 * 
 * Flujo de ejecución:
 * 1. Intenta conexión usando URI de variables de entorno
 * 2. Registra éxito o fallo de la conexión
 * 3. En caso de error, termina el proceso para evitar estados inconsistentes
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} - Error de conexión a MongoDB
 */
export async function connectDB() {
  try {
    logger.info('Conectando a MongoDB');

    /**
     * Conexión a MongoDB usando Mongoose
     * La URI de conexión se obtiene de process.env.MONGODB_URI
     */
    await mongoose.connect(process.env.MONGODB_URI);
    
    logger.info('Conectado a MongoDB Atlas');
    
  } catch (err) {
    /**
     * Manejo de errores de conexión
     * Se considera error crítico que requiere terminación del proceso
     */
    logger.error('Error al conectar a MongoDB: ' + err.message);
    process.exit(1);
  }
}