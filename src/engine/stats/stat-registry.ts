/**
 * Well-known stat IDs used across the engine.
 * The system accepts any string as StatId, but these constants
 * provide type safety for core mechanics.
 */

// --- Attributes ---
export const STAT_STRENGTH = "strength";
export const STAT_DEXTERITY = "dexterity";
export const STAT_INTELLIGENCE = "intelligence";

// --- Life / Mana / ES ---
export const STAT_MAX_LIFE = "maximum_life";
export const STAT_MAX_MANA = "maximum_mana";
export const STAT_MAX_ENERGY_SHIELD = "maximum_energy_shield";
export const STAT_LIFE_REGEN = "life_regeneration_rate"; // flat per second
export const STAT_MANA_REGEN = "mana_regeneration_rate";
export const STAT_ES_RECHARGE_RATE = "energy_shield_recharge_rate";
export const STAT_ES_RECHARGE_DELAY = "energy_shield_recharge_delay"; // ms

// --- Offensive ---
export const STAT_ATTACK_SPEED = "attack_speed";
export const STAT_CAST_SPEED = "cast_speed";
export const STAT_MOVEMENT_SPEED = "movement_speed";
export const STAT_ACCURACY = "accuracy_rating";
export const STAT_CRIT_CHANCE = "critical_strike_chance";
export const STAT_CRIT_MULTIPLIER = "critical_strike_multiplier";

// --- Damage (global) ---
export const STAT_DAMAGE = "damage";
export const STAT_ATTACK_DAMAGE = "attack_damage";
export const STAT_SPELL_DAMAGE = "spell_damage";

// --- Damage by type ---
export const STAT_PHYSICAL_DAMAGE = "physical_damage";
export const STAT_FIRE_DAMAGE = "fire_damage";
export const STAT_COLD_DAMAGE = "cold_damage";
export const STAT_LIGHTNING_DAMAGE = "lightning_damage";
export const STAT_CHAOS_DAMAGE = "chaos_damage";
export const STAT_ELEMENTAL_DAMAGE = "elemental_damage";

// --- DoT ---
export const STAT_DOT_DAMAGE = "damage_over_time";
export const STAT_DOT_MULTIPLIER = "damage_over_time_multiplier";

// --- Added flat damage (for weapons/spells) ---
export const STAT_ADDED_PHYSICAL_MIN = "added_physical_damage_min";
export const STAT_ADDED_PHYSICAL_MAX = "added_physical_damage_max";
export const STAT_ADDED_FIRE_MIN = "added_fire_damage_min";
export const STAT_ADDED_FIRE_MAX = "added_fire_damage_max";
export const STAT_ADDED_COLD_MIN = "added_cold_damage_min";
export const STAT_ADDED_COLD_MAX = "added_cold_damage_max";
export const STAT_ADDED_LIGHTNING_MIN = "added_lightning_damage_min";
export const STAT_ADDED_LIGHTNING_MAX = "added_lightning_damage_max";
export const STAT_ADDED_CHAOS_MIN = "added_chaos_damage_min";
export const STAT_ADDED_CHAOS_MAX = "added_chaos_damage_max";

// --- Defenses ---
export const STAT_ARMOUR = "armour";
export const STAT_EVASION = "evasion_rating";
export const STAT_BLOCK_CHANCE = "block_chance"; // decimal
export const STAT_SPELL_BLOCK_CHANCE = "spell_block_chance";
export const STAT_SPELL_SUPPRESSION = "spell_suppression_chance";

// --- Resistances ---
export const STAT_FIRE_RESISTANCE = "fire_resistance";
export const STAT_COLD_RESISTANCE = "cold_resistance";
export const STAT_LIGHTNING_RESISTANCE = "lightning_resistance";
export const STAT_CHAOS_RESISTANCE = "chaos_resistance";
export const STAT_MAX_FIRE_RESISTANCE = "maximum_fire_resistance";
export const STAT_MAX_COLD_RESISTANCE = "maximum_cold_resistance";
export const STAT_MAX_LIGHTNING_RESISTANCE = "maximum_lightning_resistance";
export const STAT_MAX_CHAOS_RESISTANCE = "maximum_chaos_resistance";

// --- Penetration ---
export const STAT_FIRE_PENETRATION = "fire_penetration";
export const STAT_COLD_PENETRATION = "cold_penetration";
export const STAT_LIGHTNING_PENETRATION = "lightning_penetration";
export const STAT_CHAOS_PENETRATION = "chaos_penetration";
export const STAT_ELEMENTAL_PENETRATION = "elemental_penetration";

// --- Conversion ---
export const STAT_PHYS_TO_FIRE_CONVERSION = "physical_to_fire_conversion";
export const STAT_PHYS_TO_COLD_CONVERSION = "physical_to_cold_conversion";
export const STAT_PHYS_TO_LIGHTNING_CONVERSION = "physical_to_lightning_conversion";
export const STAT_PHYS_TO_CHAOS_CONVERSION = "physical_to_chaos_conversion";
export const STAT_COLD_TO_FIRE_CONVERSION = "cold_to_fire_conversion";
export const STAT_LIGHTNING_TO_COLD_CONVERSION = "lightning_to_cold_conversion";
export const STAT_LIGHTNING_TO_FIRE_CONVERSION = "lightning_to_fire_conversion";

// --- Ailment ---
export const STAT_IGNITE_CHANCE = "ignite_chance";
export const STAT_CHILL_CHANCE = "chill_chance";
export const STAT_FREEZE_CHANCE = "freeze_chance";
export const STAT_SHOCK_CHANCE = "shock_chance";
export const STAT_POISON_CHANCE = "poison_chance";
export const STAT_BLEED_CHANCE = "bleed_chance";
export const STAT_IGNITE_DAMAGE = "ignite_damage";
export const STAT_POISON_DAMAGE = "poison_damage";
export const STAT_BLEED_DAMAGE = "bleed_damage";
export const STAT_AILMENT_DURATION = "ailment_duration";

// --- Flask ---
export const STAT_FLASK_EFFECT = "flask_effect";
export const STAT_FLASK_DURATION = "flask_duration";
export const STAT_FLASK_CHARGES_GAINED = "flask_charges_gained";
