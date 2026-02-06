// services/gameserverService.js
import Character from '../models/Character.js';
import mongoose from 'mongoose';



class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

function escapeRegex(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function characterDatabase({ name }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new HttpError(400, 'Parámetro "name" requerido');
  }

  const doc = await Character.findOne({
    name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' },
  }); 

  if (!doc) throw new HttpError(404, 'Character not found');
  return doc;
}

export async function worldEnemys() {
  try {
    // Usar la conexión de mongoose para acceder a la colección directamente
    const db = mongoose.connection.db;
    const enemies = await db.collection('worldenemies')
      .find()
      .toArray();
    
    return enemies;
  } catch (error) {
    throw new HttpError(500, 'Error fetching world enemies: ' + error.message);
  }
}


export async function finishArena({ player_id, stats, digimons }) {
  if (!player_id) {
    throw new HttpError(400, 'player_id es requerido');
  }

  // Buscamos por el nombre (que es lo que Godot usa como ID en este MVP)
  // Si prefieres usar el _id de MongoDB, asegúrate que player_id sea el ObjectId
  const character = await Character.findOne({ name: player_id.toString() });

  if (!character) {
    throw new HttpError(404, 'Personaje no encontrado para actualizar');
  }

  // 1. Actualizar Stats del Personaje
  // Mapeamos los campos que vienen de Godot a la estructura de StatsSchema
  if (stats) {
    character.stats.Level = stats.Level || character.stats.Level;
    character.stats.Exp = stats.Exp ?? character.stats.Exp;
    character.stats.ExpR = stats.ExpR || character.stats.ExpR;
    // Agrega aquí stats["Money"] si decides guardarlo en el modelo (no lo vi en el Schema actual)
  }

  // 2. Actualizar Digimons en Memoria
  if (digimons && Array.isArray(digimons)) {
    // Sincronizamos el array completo para mantener niveles y HP actualizados
    character.digimons_memory = digimons.map(d => ({
      digimon_id: d.digimon_id || "digi_001",
      species: d.species || "Unknown",
      level: d.level || 1,
      exp: d.exp || 0,
      stats: {
        hp: d.stats?.hp ?? 100,
        atk: d.stats?.atk ?? 30,
        def: d.stats?.def ?? 20,
        spd: d.stats?.spd ?? 40
      }
      // skills se mantienen por default del esquema si no vienen en el d
    }));
  }

  character.lastPlayed = new Date();
  
  await character.save();
  return { message: 'Arena sync complete', character_name: character.name };
}