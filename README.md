# Digimon API

API para administrar GameServers de Digimon, incluyendo autenticación de usuarios, WebSockets y registro de solicitudes.

## Contenido

- [Pruebas automatizadas](#pruebas-automatizadas)
- [WebSocket hub](#websocket-hub)
- [Registro de solicitudes](#registro-de-solicitudes)
- [Logger centralizado](#logger-centralizado)
- [Seguridad](#seguridad)
- [Configuración de JWT_SECRET](#configuracion-de-jwt_secret)




## Pruebas automatizadas

Ejecuta los tests de los endpoints de autenticación:

```bash
npm run test
```

## Configuración de JWT_SECRET

Genera un secreto robusto (al menos 32 caracteres aleatorios) y configúralo en la variable de entorno `JWT_SECRET`.

```bash
# genera un secreto hexadecimal de 64 caracteres (32 bytes)
openssl rand -hex 32

# ejemplo de configuración temporal
export JWT_SECRET="<secreto_generado>"

# o guárdalo en un archivo .env
echo "JWT_SECRET=<secreto_generado>" >> .env
```

## WebSocket hub

Los GameServers deben autenticarse enviando un `token` igual al valor de la variable de entorno `GAME_SERVER_TOKEN` en el mensaje `SERVER_CONNECT`.

## Registro de solicitudes

El middleware `requestLogger` oculta los siguientes campos sensibles antes de escribirlos en los logs:

- `password`

Si se añaden nuevos campos sensibles, recuerda incluirlos en la lista `SENSITIVE_FIELDS` ubicada en `backend/middlewares/requestLogger.js`.




## Logger centralizado

Los logs se almacenan en `backend/logs`. Al iniciar el servidor se crea un
archivo nuevo con nombre basado en la fecha y hora (formato
`AAAA-MM-DDTHH-MM-SS-ms.jsonl`). Cada línea del archivo es un objeto JSON con:

- `timestamp`: fecha y hora del evento.
- `level`: nivel del mensaje (`info`, `warn`, `error`).
- `message`: descripción del evento.
- `requestId`: identificador único de la solicitud, también devuelto en la
  cabecera `X-Request-Id`.
- `meta`: datos adicionales opcionales.

El middleware `requestLogger` genera una entrada por cada petición HTTP y
redacta los campos sensibles antes de escribirlos.

## Seguridad

La aplicación usa `helmet` para añadir cabeceras que refuerzan la seguridad.
Si necesitas integrar servicios externos (por ejemplo, CDNs o herramientas de
analítica), recuerda agregar sus dominios de confianza en las listas de
permitidos del archivo `backend/utils/security.js` para que funcionen correctamente.















┌─────────────┐    HTTP/REST      ┌─────────────┐    MongoDB
│             │◄─────────────────►│             │◄───────────┐
│   Cliente   │                   │    API      │            │
│   (Godot)   │   (Login/Auth)    │   HTTP      │            │
│             │                   │             │            │
└─────────────┘                   └─────────────┘            │
                                         │                   │
                                         │ WebSocket         │
                                         │ (Bidireccional)   │
                                         │                   │
                                   ┌─────────────┐           │
                                   │             │           │
                                   │ GameServer  │───────────┘
                                   │   (Godot)   │   (Operaciones DB vía API HTTP)
                                   │             │
                                   └─────────────┘
                                         │
                                         │ UDP
                                         │ (Bidireccional)
                                         │ Juego Real-time
                                   ┌─────────────┐
                                   │             │
                                   │   Cliente   │
                                   │   (Godot)   │
                                   │             │
                                   └─────────────┘