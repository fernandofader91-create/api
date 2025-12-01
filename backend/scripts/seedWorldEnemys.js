/**
 * Script de población inicial de la base de datos para enemigos del mundo.
 * 
 * Propósito:
 * - Inicializar la colección de enemigos con datos predefinidos
 * - Facilitar el setup inicial de entidades del juego
 * - Proporcionar datos de prueba para desarrollo
 * 
 * Características:
 * - Conexión directa a MongoDB Atlas
 * - Limpieza y recreación de datos
 * - Validación de operaciones
 * - Logging detallado del proceso
 * 
 * @module scripts/seedEnemies
 */

import { MongoClient } from 'mongodb';

/**
 * URI de conexión a MongoDB Atlas
 * Incluye credenciales de autenticación y parámetros de conexión
 * La base de datos especificada es 'topmmo'
 */
const MONGODB_URI = "mongodb+srv://admin:0SF7sI6PfoKEc4Em@digimongame.qognndn.mongodb.net/topmmo?retryWrites=true&w=majority&appName=DigimonGame";

/**
 * Datos de enemigos predefinidos para poblar la base de datos
 * Estructura compatible con el modelo WorldEnemy del sistema
 */
const enemiesData = [
  {
    name: "Agumon",
    spd: 75,
    atk: 10,
    px: 0,
    py: 0,
    map: "Mapa2",
    level: 1,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    enemy_type: "aggressive",
    is_active: true
  }
  // Nota: Se puede expandir agregando más enemigos al array
];

/**
 * Función principal que ejecuta el proceso de población de datos
 * 
 * Flujo de ejecución:
 * 1. Establece conexión con MongoDB
 * 2. Limpia la colección existente
 * 3. Inserta los datos predefinidos
 * 4. Valida y reporta los resultados
 * 5. Cierra la conexión de manera segura
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} - Errores de conexión o operación con la base de datos
 */
async function seedEnemies() {
  let client;
  
  try {
    console.log('Conectando a MongoDB...');
    
    // Establecimiento de conexión con el cluster de MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Conectado a MongoDB');

    // Referencia a la base de datos y colección
    const db = client.db(); // Utiliza la base de datos especificada en el connection string
    const collection = db.collection('worldenemies');

    // Fase de limpieza: eliminar documentos existentes
    console.log('Limpiando colección existente...');
    await collection.deleteMany({});
    console.log('Colección limpiada exitosamente');

    // Fase de inserción: poblar con nuevos datos
    console.log('Insertando enemigos...');
    const result = await collection.insertMany(enemiesData);

    console.log(`${result.insertedCount} enemigos insertados exitosamente`);
    
    // Validación: verificar el conteo total de documentos
    const count = await collection.countDocuments();
    console.log(`Total de enemigos en la colección: ${count}`);

    // Verificación: mostrar los enemigos insertados para confirmación
    const enemies = await collection.find({}).toArray();
    console.log('Enemigos insertados:');
    enemies.forEach(enemy => {
      console.log(`   - ${enemy.name} en ${enemy.map} (${enemy.px}, ${enemy.py})`);
    });

  } catch (error) {
    /**
     * Manejo de errores durante el proceso de población
     * Incluye errores de conexión, operaciones de BD y validaciones
     */
    console.error('Error durante la población de datos:', error);
    throw error; // Propaga el error para manejo externo si es necesario
    
  } finally {
    /**
     * Bloque de limpieza que asegura el cierre de la conexión
     * Se ejecuta siempre, independientemente de si hubo error o éxito
     */
    if (client) {
      await client.close();
      console.log('Conexión a base de datos cerrada');
    }
    
    // Finalización controlada del proceso
    process.exit(0);
  }
}

// Ejecución del script
seedEnemies();