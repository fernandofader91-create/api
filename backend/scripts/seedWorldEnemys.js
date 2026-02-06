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
    type: "Digimon",
    level: 1,
    xp: 150,
    stats: {
      Health: 25,
      MHealth: 25,
      Mana: 50,
      MMana: 50,
      HealthR: 0.3,
      ManaR: 0.3,
      PAtk: 5,
      PDef: 5,
      MAtk: 10,
      MDef: 5,
      Speed: 40,
      ASpeed: 100,
      CSpeed: 100, 
      Px: 0,
      Py: 0,
      M: "Mapa2",
      Str: 5,
      Dex: 5,
      Int: 5,
      Con: 5,
      Crit: 0,   
      MCrit: 0
    },
    ai_config: {
        view_range: 128,
        max_chase_distance: 512,
        attack_range: 16,
        aggro_type: "aggressive", // o "neutral"
        experience: 500,
    },
  }
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