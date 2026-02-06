/**
 * Utilidades de conexión a la base de datos.
 * Se encarga de establecer la conexión con MongoDB usando Mongoose.
 *
 * @module database
 */
import mongoose from 'mongoose';
import logger from './utils/logger.js';

/**
 * Establece la conexión con MongoDB usando la URI definida en las variables de entorno.
 * Si la conexión falla el proceso termina para evitar problemas posteriores.
 *
 * @returns {Promise<void>}
 */
export async function connectDB() {
  try {
    logger.info('🔌 Conectando a MongoDB');

    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'topmmo' });
    logger.info(' Conectado a MongoDB Atlas');
  } catch (err) {
    logger.error(' Error al conectar a MongoDB: ' + err.message);
    process.exit(1);
  }
}
