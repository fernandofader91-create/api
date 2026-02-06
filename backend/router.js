/**
 * Router principal de la aplicación.
 * Desde aquí se montan los subrouters de cada módulo del sistema.
 *
 * @module router
 */
import { Router } from 'express';
import authRoutes from './routes/authRoutes.js';
import gameServerRoutes from './routes/gameServerRoutes.js';
import logger from './utils/logger.js';


export const AppRouter = Router();
logger.debug('AppRouter cargado');

// Montar subrouter de autenticación
AppRouter.use('/api/auth', authRoutes);
AppRouter.use('/api/gameserver', gameServerRoutes);
