/**
 * Modelo de datos para la entidad Usuario.
 * 
 * Responsabilidades:
 * - Gestión de credenciales y autenticación
 * - Administración de slots de personajes por usuario
 * - Control de estado de cuenta y sesiones
 * 
 * @module models/User
 */

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

/**
 * Esquema para slots de personajes del usuario
 * Cada usuario puede tener hasta 5 personajes
 */
const UserCharacterSlotSchema = new Schema({
  slot: { 
    type: Number, 
    min: 1, 
    max: 5, 
    required: true 
  },
  characterId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Character', 
    default: null 
  },
  name_snapshot: { 
    type: String, 
    default: null 
  },
  last_played: { 
    type: Date, 
    default: null 
  },
}, { _id: false });

/**
 * Función factory para crear slots de personajes por defecto
 * @returns {Array} Array de 5 slots vacíos
 */
const makeDefaultSlots = () =>
  Array.from({ length: 5 }, (_, i) => ({
    slot: i + 1,
    characterId: null,
    name_snapshot: null,
  }));

/**
 * Esquema principal del modelo Usuario
 */
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Formato de email inválido'],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  registration_date: { 
    type: Date, 
    default: Date.now 
  },
  last_login: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['active', 'banned', 'disabled'], 
    default: 'active' 
  },

  max_characters: { 
    type: Number, 
    default: 5, 
    min: 1, 
    max: 5 
  },
  characters: { 
    type: [UserCharacterSlotSchema], 
    default: makeDefaultSlots 
  },
}, {
  versionKey: false,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.password;
      return ret;
    }
  },
});

/**
 * Middleware de validación que asegura la integridad de los slots de personajes
 */
UserSchema.pre('validate', function(next) {
  if (!Array.isArray(this.characters) || this.characters.length !== this.max_characters) {
    this.characters = makeDefaultSlots();
  }
  next();
});

export default model('User', UserSchema);