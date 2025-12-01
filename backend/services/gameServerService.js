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
      .find({ is_active: true })
      .toArray();
    
    return enemies;
  } catch (error) {
    throw new HttpError(500, 'Error fetching world enemies: ' + error.message);
  }
}