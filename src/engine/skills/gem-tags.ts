import type { ActiveSkillDef, SupportGemDef } from "../types/skills";
import { GemTag } from "../types/skills";

/**
 * Check if a support gem can be linked to an active skill.
 * Support requires ALL requiredTags and NONE of excludedTags.
 */
export function canSupportSkill(support: SupportGemDef, skill: ActiveSkillDef): boolean {
  // Check required tags (support must have all)
  for (const tag of support.requiredTags) {
    if (!skill.tags.includes(tag)) return false;
  }
  // Check excluded tags (skill must have none)
  for (const tag of support.excludedTags) {
    if (skill.tags.includes(tag)) return false;
  }
  return true;
}

/**
 * Get the final tags of a skill after applying support gems.
 */
export function getFinalTags(
  skill: ActiveSkillDef,
  supports: readonly SupportGemDef[],
): readonly GemTag[] {
  const tags = new Set<GemTag>(skill.tags);
  for (const support of supports) {
    for (const tag of support.addedTags) {
      tags.add(tag);
    }
  }
  return [...tags];
}
