import type { EnemyDef } from "../../types/combat";
import { DamageType } from "../../types/damage";

const defaultResists = (): Record<DamageType, number> => ({
  [DamageType.Physical]: 0,
  [DamageType.Fire]: 0,
  [DamageType.Cold]: 0,
  [DamageType.Lightning]: 0,
  [DamageType.Chaos]: 0,
});

/**
 * Act 1 enemies. Values are approximate — tuned for gameplay feel.
 * Zone levels in Act 1: 1-13
 */
export const ACT1_ENEMIES: readonly EnemyDef[] = [
  // --- Twilight Strand (level 1) ---
  {
    id: "zombie_1",
    name: "Risen Dead",
    level: 1,
    baseLife: 18,
    armour: 0,
    evasion: 30,
    accuracy: 20,
    resistances: defaultResists(),
    damagePerHit: [{ type: DamageType.Physical, min: 2, max: 4 }],
    attackTime: 1500,
    isMoving: true,
    experienceReward: 8,
    isBoss: false,
  },
  // --- The Coast (level 2-3) ---
  {
    id: "cannibal_2",
    name: "Cannibal",
    level: 3,
    baseLife: 35,
    armour: 10,
    evasion: 40,
    accuracy: 30,
    resistances: defaultResists(),
    damagePerHit: [{ type: DamageType.Physical, min: 3, max: 6 }],
    attackTime: 1400,
    isMoving: true,
    experienceReward: 14,
    isBoss: false,
  },
  // --- The Mud Flats (level 4-5) ---
  {
    id: "rhoa_4",
    name: "Rhoa",
    level: 5,
    baseLife: 65,
    armour: 20,
    evasion: 50,
    accuracy: 45,
    resistances: defaultResists(),
    damagePerHit: [{ type: DamageType.Physical, min: 5, max: 10 }],
    attackTime: 1300,
    isMoving: true,
    experienceReward: 22,
    isBoss: false,
  },
  // --- The Ledge (level 6-7) ---
  {
    id: "skeleton_6",
    name: "Skeleton Warrior",
    level: 7,
    baseLife: 90,
    armour: 40,
    evasion: 45,
    accuracy: 55,
    resistances: defaultResists(),
    damagePerHit: [{ type: DamageType.Physical, min: 7, max: 12 }],
    attackTime: 1200,
    isMoving: true,
    experienceReward: 30,
    isBoss: false,
  },
  // --- The Climb (level 8-9) ---
  {
    id: "goatman_8",
    name: "Goatman",
    level: 9,
    baseLife: 130,
    armour: 60,
    evasion: 70,
    accuracy: 70,
    resistances: { ...defaultResists(), [DamageType.Fire]: 0.15 },
    damagePerHit: [{ type: DamageType.Physical, min: 9, max: 16 }],
    attackTime: 1100,
    isMoving: true,
    experienceReward: 40,
    isBoss: false,
  },
  // --- The Prison (level 9-10) ---
  {
    id: "necromancer_9",
    name: "Necromancer",
    level: 10,
    baseLife: 100,
    armour: 20,
    evasion: 60,
    accuracy: 65,
    resistances: { ...defaultResists(), [DamageType.Cold]: 0.20 },
    damagePerHit: [{ type: DamageType.Cold, min: 8, max: 14 }],
    attackTime: 1500,
    isMoving: false,
    experienceReward: 45,
    isBoss: false,
  },
  // --- The Ship Graveyard (level 11-12) ---
  {
    id: "sea_witch_11",
    name: "Sea Witch",
    level: 12,
    baseLife: 120,
    armour: 15,
    evasion: 80,
    accuracy: 70,
    resistances: { ...defaultResists(), [DamageType.Cold]: 0.30, [DamageType.Lightning]: 0.15 },
    damagePerHit: [{ type: DamageType.Cold, min: 10, max: 18 }],
    attackTime: 1400,
    isMoving: false,
    experienceReward: 50,
    isBoss: false,
  },

  // === BOSSES ===
  {
    id: "brutus",
    name: "Brutus, Lord Incarcerator",
    level: 10,
    baseLife: 1200,
    armour: 150,
    evasion: 60,
    accuracy: 90,
    resistances: { ...defaultResists(), [DamageType.Lightning]: 0.20 },
    damagePerHit: [{ type: DamageType.Physical, min: 18, max: 32 }],
    attackTime: 2000,
    isMoving: true,
    experienceReward: 500,
    isBoss: true,
    ailmentThreshold: 0.5, // 50% reduced ailment effect
  },
  {
    id: "merveil",
    name: "Merveil, the Siren",
    level: 13,
    baseLife: 2000,
    armour: 80,
    evasion: 100,
    accuracy: 100,
    resistances: {
      [DamageType.Physical]: 0,
      [DamageType.Fire]: -0.20, // weak to fire
      [DamageType.Cold]: 0.50,  // strong cold res
      [DamageType.Lightning]: 0.20,
      [DamageType.Chaos]: 0.10,
    },
    damagePerHit: [
      { type: DamageType.Physical, min: 10, max: 18 },
      { type: DamageType.Cold, min: 12, max: 22 },
    ],
    attackTime: 1800,
    isMoving: true,
    experienceReward: 1200,
    isBoss: true,
    ailmentThreshold: 0.5,
  },
];

export const ACT1_ENEMY_MAP: ReadonlyMap<string, EnemyDef> = new Map(
  ACT1_ENEMIES.map(e => [e.id, e]),
);
