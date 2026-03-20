// ---------------------------------------------------------------------------
// Flask system
// ---------------------------------------------------------------------------

export interface FlaskState {
  id: string;
  name: string;
  type: "life" | "mana" | "hybrid" | "utility";
  amount: number;
  durationMs: number;
  maxCharges: number;
  currentCharges: number;
  chargesPerUse: number;
  cooldownMs: number;
  lastUsedAt: number;
  autoUseThreshold: number; // 0-1, percentage of max
}

const LIFE_FLASK_TIERS = [
  { name: "Small Life Flask", amount: 50, maxCharges: 3, chargesPerUse: 1, cooldownMs: 3000 },
  { name: "Medium Life Flask", amount: 120, maxCharges: 3, chargesPerUse: 1, cooldownMs: 4000 },
  { name: "Large Life Flask", amount: 250, maxCharges: 3, chargesPerUse: 1, cooldownMs: 5000 },
];

const MANA_FLASK_TIERS = [
  { name: "Small Mana Flask", amount: 40, maxCharges: 3, chargesPerUse: 1, cooldownMs: 3000 },
  { name: "Medium Mana Flask", amount: 90, maxCharges: 3, chargesPerUse: 1, cooldownMs: 4000 },
  { name: "Large Mana Flask", amount: 180, maxCharges: 3, chargesPerUse: 1, cooldownMs: 5000 },
];

export function createLifeFlask(tier: number): FlaskState {
  const t = LIFE_FLASK_TIERS[Math.min(tier, LIFE_FLASK_TIERS.length - 1)];
  return {
    id: `life_flask_${tier}`,
    ...t,
    type: "life",
    durationMs: 0,
    currentCharges: t.maxCharges,
    lastUsedAt: -99999,
    autoUseThreshold: 0.5,
  };
}

export function createManaFlask(tier: number): FlaskState {
  const t = MANA_FLASK_TIERS[Math.min(tier, MANA_FLASK_TIERS.length - 1)];
  return {
    id: `mana_flask_${tier}`,
    ...t,
    type: "mana",
    durationMs: 0,
    currentCharges: t.maxCharges,
    lastUsedAt: -99999,
    autoUseThreshold: 0.3,
  };
}

/** Tick flasks: auto-use when thresholds are met, gain charges on kill. */
export function tickFlasks(
  flasks: FlaskState[],
  currentLife: number,
  maxLife: number,
  currentMana: number,
  maxMana: number,
  elapsedMs: number,
  enemyKilledThisTick: boolean,
): { flasks: FlaskState[]; lifeRestored: number; manaRestored: number } {
  let lifeRestored = 0;
  let manaRestored = 0;

  const updated = flasks.map((flask) => {
    const f = { ...flask };

    // Gain charges on enemy kill
    if (enemyKilledThisTick && f.currentCharges < f.maxCharges) {
      f.currentCharges = Math.min(f.maxCharges, f.currentCharges + 1);
    }

    const offCooldown = elapsedMs - f.lastUsedAt >= f.cooldownMs;
    const hasCharges = f.currentCharges >= f.chargesPerUse;

    if (offCooldown && hasCharges) {
      if (f.type === "life" && maxLife > 0 && currentLife / maxLife < f.autoUseThreshold) {
        f.currentCharges -= f.chargesPerUse;
        f.lastUsedAt = elapsedMs;
        lifeRestored += f.amount;
      } else if (f.type === "mana" && maxMana > 0 && currentMana / maxMana < f.autoUseThreshold) {
        f.currentCharges -= f.chargesPerUse;
        f.lastUsedAt = elapsedMs;
        manaRestored += f.amount;
      }
    }

    return f;
  });

  return { flasks: updated, lifeRestored, manaRestored };
}
