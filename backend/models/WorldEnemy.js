// models/Character.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const StatsSchema = new Schema({
  hp:  { type: Number, default: 100, min: 0 },
  mp:  { type: Number, default: 50,  min: 0 },
  atk: { type: Number, default: 10,  min: 0 },
  def: { type: Number, default: 10,  min: 0 },
  spd: { type: Number, default: 10,  min: 0 },
  M:   { type: String, default: "Mapa1"},
  Px: { type: Number, default: 640 },
  Py: { type: Number, default: 384 },
}, { _id: false });

const HotbarSlotSchema = new Schema({
  name: { type: String, default: null },
  type: { type: String, enum: ['item', 'skill', 'equipped_item', ''], default: '' },
  id:   { type: String, default: '' },
  slot_number: { type: Number, min: 1, max: 9, required: true },
  additional_info: { type: String, default: '' },
}, { _id: false });

const HotbarSchema = new Schema({
  slots: {
    type: [HotbarSlotSchema],
    default: () => Array.from({ length: 9 }, (_, i) => ({
      name: null, type: '', id: '', slot_number: i + 1, additional_info: ''
    })),
  },
}, { _id: false });

const InventoryEntrySchema = new Schema({
  item_id:  { type: String, required: true },
  quantity: { type: Number, default: 1, min: 0 },
}, { _id: false });

// ✅ SCHEMA DE SKILL AGREGADO
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

const DigimonMemorySlotSchema = new Schema({
  digimon_id: { type: String, required: true },
  species:    { type: String, required: true },
  level:      { type: Number, default: 1, min: 1 },
  exp:        { type: Number, default: 0, min: 0 },
  stats: {
    hp:  { type: Number, default: 100, min: 0 },
    atk: { type: Number, default: 30,  min: 0 },
    def: { type: Number, default: 20,  min: 0 },
    spd: { type: Number, default: 15,  min: 0 },
  },
  // ✅ SKILLS AGREGADO AQUÍ
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

const DigimonAlbumEntrySchema = new Schema({
  species:      { type: String, required: true },
  discovered_at:{ type: Date, default: Date.now },
}, { _id: false });

const CardEntrySchema = new Schema({
  card_id: { type: String, required: true },
  name:    { type: String },
  rarity:  { type: String, enum: ['common','rare','epic','legendary'], default: 'common' },
  count:   { type: Number, default: 1, min: 0 },
}, { _id: false });

const PreferencesSchema = new Schema({
  music_volume: { type: Number, default: 0.7, min: 0, max: 1 },
  sfx_volume:   { type: Number, default: 0.7, min: 0, max: 1 },
  language:     { type: String, default: 'es' },
}, { _id: false });

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
        atk: 15,
        def: 10,
        spd: 12
      }
      // ✅ Los skills ya vienen por defecto del DigimonMemorySlotSchema
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

  cardStats: { type: new Schema({
    duels_won:  { type: Number, default: 0 },
    duels_lost: { type: Number, default: 0 },
  }, { _id:false }), default: () => ({}) },

  config: { type: Object, default: {} },
}, { versionKey: false });

CharacterSchema.index({ userId: 1, name: 1 }, { unique: true });

export default model('Character', CharacterSchema);