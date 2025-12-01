/**
 * Sistema de Tipos de Mensajes WebSocket
 * 
 * Define los tipos de mensajes utilizados en la comunicación entre:
 * - API Hub Central
 * - GameServers 
 * - Clientes del juego
 * 
 * Características:
 * - Mapeo bidireccional: nombre ↔ código numérico
 * - Eficiencia en transmisión (usando números)
 * - Legibilidad en desarrollo (usando constantes)
 * 
 * @module websocket/messageTypes
 */

/**
 * Enum de tipos de mensajes WebSocket
 * @readonly
 * @enum {number}
 */
const MessageTypes = {
  /**
   * Conexión de GameServer al Hub
   * Dirección: GameServer → Hub
   * Propósito: Autenticación y registro de servidor
   */
  SERVER_CONNECT: 1,
  
  /**
   * Conexión de Cliente a GameServer
   * Dirección: Cliente → Hub → GameServer
   * Propósito: Establecer conexión cliente-servidor
   */
  CLIENT_CONNECT: 2,
  
  /**
   * Resultado de conexión de GameServer
   * Dirección: Hub → GameServer
   * Propósito: Confirmar autenticación y registro
   */
  SERVER_CONNECT_RESULT: 3,
  
  /**
   * Notificación de usuario conectado
   * Dirección: Hub → GameServer
   * Propósito: Informar sobre autenticación exitosa de usuario
   */
  USER_CONNECTED: 4,
};

/**
 * Configuración de mapeo bidireccional
 * Permite búsqueda tanto por nombre como por valor numérico
 * 
 * Ejemplos:
 * - MessageTypes.SERVER_CONNECT → 1
 * - MessageTypes[1] → "SERVER_CONNECT"
 * - MessageTypes[MessageTypes.SERVER_CONNECT] → "SERVER_CONNECT"
 */
for (const [key, value] of Object.entries(MessageTypes)) {
  MessageTypes[value] = key;
}

export default MessageTypes;