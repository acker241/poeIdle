/**
 * poeIdle Game Engine
 *
 * Complete implementation of Path of Exile mechanics:
 * - Stat system (flat → increased → more)
 * - Damage pipeline (hits, DoT, conversion)
 * - Defense calculations (armour, evasion, resistances, block, ES)
 * - Ailments (ignite, chill, freeze, shock, poison, bleed)
 * - Skills & support gems
 * - Passive skill tree
 * - Items & equipment
 * - Character state & resolution
 * - Combat engine (tick-based idle loop)
 * - Save/load serialization
 */

// Types
export * from "./types";

// Stats
export * from "./stats";

// Damage
export * from "./damage";

// Defense (excluding functions already exported from damage)
export {
  calculateArmourReduction as defenseArmourReduction,
  applyArmour as defenseApplyArmour,
} from "./defense/armour";
export * from "./defense/evasion";
export {
  calculateEffectiveResistance,
  DEFAULT_RESISTANCE_CAP,
  DEFAULT_CHAOS_RESISTANCE_CAP,
  getDefaultResistancePenalty,
  applyResistance as defenseApplyResistance,
} from "./defense/resistances";
export * from "./defense/block";
export * from "./defense/energy-shield";
export * from "./defense/life-mana";
export * from "./defense/suppression";

// Ailments
export * from "./ailments";

// Skills
export * from "./skills";

// Tree
export * from "./tree";

// Items
export * from "./items";

// Character
export * from "./character";

// Combat
export * from "./combat";

// Data
export * from "./data";

// Utils
export * from "./utils";
