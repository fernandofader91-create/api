/**
 * Router principal de la aplicación Express.
 * 
 * Funcionalidades:
 * - Centraliza el registro de todos los endpoints de la API
 * - Organiza las rutas por módulos funcionales
 * - Proporciona estructura escalable para añadir nuevos módulos
 * 
 * @module router
 */

import { Router } from 'express';
import authRoutes from './routes/authRoutes.js';
import gameServerRoutes from './routes/gameServerRoutes.js';
import logger from './utils/logger.js';

/**
 * Instancia principal del Router de Express
 * @type {import('express').Router}
 */
export const AppRouter = Router();

logger.debug('AppRouter cargado');

/**
 * Registro de sub-routers por módulo funcional
 * 
 * Estructura de rutas:
 * - /api/auth/* -> Rutas de autenticación y autorización
 * - /api/gameserver/* -> Rutas relacionadas con servidores de juego
 */
AppRouter.use('/api/auth', authRoutes);
AppRouter.use('/api/gameserver', gameServerRoutes);