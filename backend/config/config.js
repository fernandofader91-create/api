/**
 * Configuración centralizada del sistema de bloqueo de IPs.
 * 
 * Propósito:
 * - Controlar el comportamiento del sistema de seguridad por IP
 * - Configurar umbrales y tiempos de bloqueo
 * - Permitir habilitación/deshabilitación rápida del sistema
 * 
 * @module config
 */

/**
 * Bandera que activa/desactiva el sistema de bloqueo de IPs
 * @type {boolean}
 */
export const ENABLE_IP_BLOCKING = true;

/**
 * Duración del bloqueo de IP en minutos
 * @type {number}
 */
export const BLOCK_DURATION_MINUTES = 30;

/**
 * Número máximo de intentos inválidos permitidos antes del bloqueo
 * Valores recomendados: 2 para alta seguridad, 3 para mayor tolerancia
 * @type {number}
 */
export const MAX_INVALID_ATTEMPTS = 2;