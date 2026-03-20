import type { CombatState, TickResult, CombatEvent } from "../types/combat";
import type { ResolvedCharacter } from "../types/character";
import type { ResolvedSkill } from "../types/skills";
import type { DurationMs } from "../types/common";
import { DamageType } from "../types/damage";
import { GemTag } from "../types/skills";
import type { SeededRng } from "../utils/rng";
import { getStatValue } from "../stats/stat-calculator";
import { STAT_ACCURACY, STAT_EVASION, STAT_BLOCK_CHANCE, STAT_CRIT_CHANCE, STAT_CRIT_MULTIPLIER, STAT_LIFE_REGEN, STAT_MANA_REGEN } from "../stats/stat-registry";
import { resolveAttackHit } from "./accuracy";
import { resolveBlock } from "../defense/block";
import { calculateHitDamage, type HitContext } from "../damage/hit-damage";
import { applyDamageToHealthPool } from "../damage/damage-taken";
import { tickAilments, applyAilmentsFromHit, type HitDamageByType } from "../ailments/ailment-engine";
import { tickLifeRegen, tickManaRegen, spendMana } from "../defense/life-mana";
import { tickEnergyShield } from "../defense/energy-shield";

/** Duration of one combat tick in ms */
export const TICK_DURATION: DurationMs = 100; // 10 ticks per second

/**
 * Execute a single combat tick.
 *
 * Each tick:
 * 1. Check if player can attack/cast (based on speed accumulator)
 * 2. If so, resolve the hit (accuracy → block → damage → ailments)
 * 3. Tick enemy ailments (DoT damage)
 * 4. Enemy attacks player (simplified)
 * 5. Tick player regen/ES recharge
 * 6. Check for death
 */
export function combatTick(
  state: CombatState,
  player: ResolvedCharacter,
  activeSkill: ResolvedSkill,
  rng: SeededRng,
): TickResult {
  const events: CombatEvent[] = [];
  let newState = {
    ...state,
    tickCount: state.tickCount + 1,
    elapsedMs: state.elapsedMs + TICK_DURATION,
  };

  const isAttack = activeSkill.finalTags.includes(GemTag.Attack);

  // --- Player action ---
  const attackInterval = isAttack
    ? 1000 / player.attacksPerSecond
    : (activeSkill.active.castTime ?? 1000);

  let accumulator = newState.playerAttackAccumulator + TICK_DURATION;

  if (accumulator >= attackInterval) {
    accumulator -= attackInterval;

    // Check mana — if insufficient, fall back to default attack (free, weapon-only)
    const manaResult = spendMana(newState.playerCurrentMana, activeSkill.effectiveManaCost);
    const usingDefaultAttack = !manaResult;
    if (manaResult) {
      newState = { ...newState, playerCurrentMana: manaResult.newMana };
    }

    // Default attack is always an attack (uses weapon damage, no added damage)
    const effectiveIsAttack = usingDefaultAttack ? true : isAttack;

    {
      // Resolve hit
      let didHit = true;
      let newEnemyEntropy = newState.enemyEvasionEntropy;

      if (effectiveIsAttack) {
        const accuracy = getStatValue(player.stats, STAT_ACCURACY);
        const hitResult = resolveAttackHit(accuracy, newState.enemy.evasion, newState.enemyEvasionEntropy);
        didHit = hitResult.hit;
        newEnemyEntropy = hitResult.newEntropy;
      }

      newState = { ...newState, enemyEvasionEntropy: newEnemyEntropy };

      if (!didHit) {
        events.push({ type: "player_miss" });
      } else {
        // Calculate damage
        const hitCtx: HitContext = {
          baseDamage: effectiveIsAttack ? getWeaponDamage(player) : activeSkill.active.baseDamage,
          addedDamage: usingDefaultAttack ? [] : activeSkill.totalAddedDamage,
          damageEffectiveness: usingDefaultAttack ? 1.0 : activeSkill.active.damageEffectiveness,
          conversions: [], // TODO: collect from stats
          isAttack: effectiveIsAttack,
          stats: player.stats,
          enemyResistances: newState.enemy.resistances,
          enemyArmour: newState.enemy.armour,
          rng,
          didHit: true,
        };

        const breakdown = calculateHitDamage(hitCtx);
        const totalDamage = breakdown.totalDamage;

        // Apply damage to enemy
        const enemyNewLife = Math.max(0, newState.enemyCurrentLife - totalDamage);
        newState = { ...newState, enemyCurrentLife: enemyNewLife };

        events.push({ type: "player_hit", damage: totalDamage, breakdown });

        // Apply ailments (not for default attack)
        if (!usingDefaultAttack) {
          const hitDmgByType = extractDamageByType(breakdown.afterResistances);
          const ailmentResult = applyAilmentsFromHit(
            hitDmgByType,
            totalDamage,
            newState.enemy.baseLife,
            newState.enemyAilments,
            player.stats,
            activeSkill.active.id,
            newState.elapsedMs,
            rng,
            activeSkill.active.ailmentChances,
          );
          newState = { ...newState, enemyAilments: ailmentResult.newAilmentState };
          for (const a of ailmentResult.appliedAilments) {
            events.push({ type: "ailment_applied", ailment: a, effect: 0 });
          }
        }
      }
    }
  }
  newState = { ...newState, playerAttackAccumulator: accumulator };

  // --- Enemy ailment DoT tick ---
  const ailmentTick = tickAilments(newState.enemyAilments, TICK_DURATION, newState.enemy.isMoving);
  newState = { ...newState, enemyAilments: ailmentTick.newState };
  if (ailmentTick.dotDamage > 0) {
    const enemyNewLife = Math.max(0, newState.enemyCurrentLife - ailmentTick.dotDamage);
    newState = { ...newState, enemyCurrentLife: enemyNewLife };
  }
  for (const expired of ailmentTick.expired) {
    events.push({ type: "ailment_expired", ailment: expired });
  }

  // --- Enemy attacks player ---
  let enemyAccum = newState.enemyAttackAccumulator + TICK_DURATION;
  if (enemyAccum >= newState.enemy.attackTime) {
    enemyAccum -= newState.enemy.attackTime;

    // Evasion check: player evasion vs enemy accuracy
    const playerEvasion = getStatValue(player.stats, STAT_EVASION);
    const evasionResult = resolveAttackHit(newState.enemy.accuracy, playerEvasion, newState.playerEvasionEntropy);
    newState = { ...newState, playerEvasionEntropy: evasionResult.newEntropy };

    if (!evasionResult.hit) {
      events.push({ type: "enemy_miss" });
    } else {
      // Simplified enemy damage: just sum all damage types
      let enemyDamage = 0;
      for (const dmg of newState.enemy.damagePerHit) {
        enemyDamage += rng.rollRange(dmg.min, dmg.max);
      }

      // Block check
      const blockChance = getStatValue(player.stats, STAT_BLOCK_CHANCE);
      if (resolveBlock(blockChance, rng)) {
        events.push({ type: "player_blocked" });
      } else {
        // Apply damage to player (simplified: no armour/resistance breakdown per type for enemy hits)
        const result = applyDamageToHealthPool(
          enemyDamage,
          newState.playerCurrentLife,
          newState.playerCurrentES,
        );
        newState = {
          ...newState,
          playerCurrentLife: result.newLife,
          playerCurrentES: result.newES,
        };
        events.push({ type: "enemy_hit", damage: enemyDamage });
      }
    }
  }
  newState = { ...newState, enemyAttackAccumulator: enemyAccum };

  // --- Player regen ---
  // Base life regen: 1.5% of max life per second (PoE default for idle game)
  const lifeRegenStat = getStatValue(player.stats, STAT_LIFE_REGEN);
  const effectiveLifeRegen = lifeRegenStat > 0 ? lifeRegenStat : player.maxLife * 0.015;
  // Base mana regen: 1.75% of max mana per second
  const manaRegenStat = getStatValue(player.stats, STAT_MANA_REGEN);
  const effectiveManaRegen = manaRegenStat > 0 ? manaRegenStat : player.maxMana * 0.0175;
  newState = {
    ...newState,
    playerCurrentLife: tickLifeRegen(newState.playerCurrentLife, player.maxLife, effectiveLifeRegen, TICK_DURATION),
    playerCurrentMana: tickManaRegen(newState.playerCurrentMana, player.maxMana, effectiveManaRegen, TICK_DURATION),
  };

  // --- Check outcomes ---
  const enemyDefeated = newState.enemyCurrentLife <= 0;
  const playerDefeated = newState.playerCurrentLife <= 0;

  if (enemyDefeated) {
    events.push({ type: "enemy_defeated", xp: newState.enemy.experienceReward });
  }
  if (playerDefeated) {
    events.push({ type: "player_defeated" });
  }

  return { newState, events, enemyDefeated, playerDefeated };
}

/** Extract weapon base damage (placeholder — should come from equipped weapon) */
function getWeaponDamage(player: ResolvedCharacter): readonly import("../types/damage").DamageInstance[] {
  // Default unarmed: 2-6 physical
  return [{ type: DamageType.Physical, min: 2, max: 6 }];
}

/** Extract damage by type from breakdown map */
function extractDamageByType(damageMap: ReadonlyMap<DamageType, number>): HitDamageByType {
  return {
    physical: damageMap.get(DamageType.Physical) ?? 0,
    fire: damageMap.get(DamageType.Fire) ?? 0,
    cold: damageMap.get(DamageType.Cold) ?? 0,
    lightning: damageMap.get(DamageType.Lightning) ?? 0,
    chaos: damageMap.get(DamageType.Chaos) ?? 0,
  };
}
