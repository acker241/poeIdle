import type {
  ActiveSkillDef,
  SupportGemDef,
  SkillLink,
  ResolvedSkill,
} from "../types/skills";
import type { DamageInstance } from "../types/damage";
import type { StatModifier } from "../types/stats";
import { canSupportSkill, getFinalTags } from "./gem-tags";

/**
 * Resolve a skill link: determine which supports apply,
 * compute combined modifiers, added damage, mana cost, etc.
 */
export function resolveSkillLink(
  link: SkillLink,
  skillDefs: ReadonlyMap<string, ActiveSkillDef>,
  supportDefs: ReadonlyMap<string, SupportGemDef>,
): ResolvedSkill | null {
  const active = skillDefs.get(link.activeSkillId);
  if (!active) return null;

  // Filter supports to only applicable ones (max 5)
  const applicableSupports: SupportGemDef[] = [];
  for (const supportId of link.supportGemIds.slice(0, 5)) {
    const support = supportDefs.get(supportId);
    if (support && canSupportSkill(support, active)) {
      applicableSupports.push(support);
    }
  }

  // Combine tags
  const finalTags = getFinalTags(active, applicableSupports);

  // Combine stat modifiers
  const totalStatModifiers: StatModifier[] = [...active.statModifiers];
  for (const support of applicableSupports) {
    totalStatModifiers.push(...support.statModifiers);
  }

  // Combine added damage
  const totalAddedDamage: DamageInstance[] = [];
  for (const support of applicableSupports) {
    if (support.addedDamage) {
      totalAddedDamage.push(...support.addedDamage);
    }
  }

  // Calculate mana cost (base × product of support multipliers)
  let effectiveManaCost = active.manaCost;
  for (const support of applicableSupports) {
    effectiveManaCost *= support.manaCostMultiplier;
  }
  effectiveManaCost = Math.round(effectiveManaCost);

  return {
    active,
    supports: applicableSupports,
    finalTags,
    totalStatModifiers,
    totalAddedDamage,
    effectiveManaCost,
    effectiveCritChance: active.critChance,
  };
}

/**
 * Resolve all skill links for a character.
 */
export function resolveAllSkillLinks(
  links: readonly SkillLink[],
  skillDefs: ReadonlyMap<string, ActiveSkillDef>,
  supportDefs: ReadonlyMap<string, SupportGemDef>,
): readonly ResolvedSkill[] {
  const resolved: ResolvedSkill[] = [];
  for (const link of links) {
    const skill = resolveSkillLink(link, skillDefs, supportDefs);
    if (skill) resolved.push(skill);
  }
  return resolved;
}
