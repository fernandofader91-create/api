/**
 * Modelo de datos para la entidad Personaje.
 * 
 * Responsabilidades:
 * - Representación completa de personajes jugables
 * - Gestión de estadísticas, inventario y habilidades
 * - Administración de digimons y sistema de cartas
 * 
 * @module models/Character
 */

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

/**
 * Esquema para estadísticas base del personaje
 */

const StatsSchema = new Schema({
  Level: { type: Number, default: 1 },
  Health: { type: Number, default: 100 },
  MHealth: { type: Number, default: 100 },
  HealthR: { type: Number, default: 0.1 },
  Mana: { type: Number, default: 50 },
  MMana: { type: Number, default: 50 },
  ManaR: { type: Number, default: 0.1 },
  Speed: { type: Number, default: 40 },
  Exp: { type: Number, default: 0 },
  ExpF: { type: Number, default: 0 },
  ExpR: { type: Number, default: 500 },
  Px: { type: Number, default: 250 },
  Py: { type: Number, default: 250 },
  T: { type: Number, default: 0 },
  M: { type: String, default: 'Mapa1' },
}, { _id: false });














/**
 * Esquema para slots de la barra de habilidades/items rápidos
 */
const HotbarSlotSchema = new Schema({
  name: { type: String, default: null },
  type: { type: String, enum: ['item', 'skill', 'equipped_item', ''], default: '' },
  id:   { type: String, default: '' },
  slot_number: { type: Number, min: 1, max: 9, required: true },
  additional_info: { type: String, default: '' },
}, { _id: false });

/**
 * Esquema para la barra de habilidades completa
 */
const HotbarSchema = new Schema({
  slots: {
    type: [HotbarSlotSchema],
    default: () => Array.from({ length: 9 }, (_, i) => ({
      name: null, type: '', id: '', slot_number: i + 1, additional_info: ''
    })),
  },
}, { _id: false });

/**
 * Esquema para entradas de inventario
 */
const InventoryEntrySchema = new Schema({
  item_id:  { type: String, required: true },
  quantity: { type: Number, default: 1, min: 0 },
}, { _id: false });

/**
 * Esquema para habilidades de digimon
 */
const SkillSchema = new Schema({
  name: { type: String, default: "Fireball" },
  type: { type: String, default: "RangedSingleTarget" },
  element: { type: String, default: "NEUTRAL" },
  power: { type: Number, default: 20 },
  range: { type: Number, default: 300 },
  cooldown: { type: Number, default: 3.0 },
  mana_cost: { type: Number, default: 10 },
  learned_at_level: { type: Number, default: 1 }
}, { _id: false });

/**
 * Esquema para slots de memoria de digimon
 */
const DigimonMemorySlotSchema = new Schema({
  digimon_id: { type: String, required: true },
  species:    { type: String, required: true },
  level:      { type: Number, default: 1, min: 1 },
  exp:        { type: Number, default: 0, min: 0 },
  stats: {
    hp:  { type: Number, default: 100, min: 0 },
    atk: { type: Number, default: 30,  min: 0 },
    def: { type: Number, default: 20,  min: 0 },
    spd: { type: Number, default: 40,  min: 0 },
  },
  skills: { 
    type: [SkillSchema], 
    default: () => [
      {
        name: "Garra Afilada",
        type: "RangedSingleTarget",
        element: "NEUTRAL",
        power: 15,
        range: 200,
        cooldown: 2.0,
        mana_cost: 5,
        learned_at_level: 1
      }
    ]
  }
}, { _id: false });

/**
 * Esquema para entradas del álbum de digimon descubiertos
 */
const DigimonAlbumEntrySchema = new Schema({
  species:      { type: String, required: true },
  discovered_at:{ type: Date, default: Date.now },
}, { _id: false });

/**
 * Esquema para sistema de cartas coleccionables
 */
const CardEntrySchema = new Schema({
  card_id: { type: String, required: true },
  name:    { type: String },
  rarity:  { type: String, enum: ['common','rare','epic','legendary'], default: 'common' },
  count:   { type: Number, default: 1, min: 0 },
}, { _id: false });

/**
 * Esquema para preferencias de usuario
 */
const PreferencesSchema = new Schema({
  music_volume: { type: Number, default: 0.7, min: 0, max: 1 },
  sfx_volume:   { type: Number, default: 0.7, min: 0, max: 1 },
  language:     { type: String, default: 'es' },
}, { _id: false });

/**
 * Esquema principal del modelo Personaje
 */
const CharacterSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:       { type: String, required: true, trim: true },
  class:      { type: String, required: true },
  level:      { type: Number, default: 1 },
  createdAt:  { type: Date, default: Date.now },
  lastPlayed: { type: Date },
  guildId:    { type: Schema.Types.ObjectId, ref: 'Guild', default: null },
  
  stats:      { type: StatsSchema,      default: () => ({}) },
  hotbar:     { type: HotbarSchema,     default: () => ({}) },
  inventory:       { type: [InventoryEntrySchema],    default: [] },
  digimons_memory: { 
    type: [DigimonMemorySlotSchema], 
    default: () => [{
      digimon_id: "digi_001",
      species: "Agumon",
      level: 1,
      exp: 0,
      stats: {
        hp: 50,
        Mhp: 50,
        mp: 30,
        maxMp: 30,
        atk: 15,
        atks: 10,
        def: 10,
        spd: 12
      }
    }]
  },
  preferences:     { type: PreferencesSchema,         default: () => ({}) },
  digimon_album:   { 
    type: [DigimonAlbumEntrySchema], 
    default: () => [{
      species: "Agumon",
      discovered_at: new Date()
    }]
  },
  cards:           { type: [CardEntrySchema],         default: [] },

  cardStats: { 
    type: new Schema({
      duels_won:  { type: Number, default: 0 },
      duels_lost: { type: Number, default: 0 },
    }, { _id:false }), 
    default: () => ({}) 
  },

  config: { type: Object, default: {} },
}, { versionKey: false });

/**
 * Índice compuesto para garantizar unicidad de nombres de personaje por usuario
 */
CharacterSchema.index({ userId: 1, name: 1 }, { unique: true });

export default model('Character', CharacterSchema);