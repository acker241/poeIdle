import type { ResolvedCharacter, CharacterState } from "@/engine/types/character";
import type { ResolvedSkill } from "@/engine/types/skills";
import type { CombatState } from "@/engine/types/combat";
import type { FlaskState } from "@/engine/items/flasks";

interface CharacterPanelProps {
  character: ResolvedCharacter | null;
  characterState: CharacterState | null;
  skill: ResolvedSkill | null;
  combatState: CombatState | null;
  totalXp: number;
  killCount: number;
  elapsedMs: number;
  zoneName?: string;
  availableSkillPoints?: number;
  questsCompleted?: number;
  flasks?: FlaskState[];
}

function HealthBar({
  current,
  max,
  color,
  label,
}: {
  current: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">
          {Math.round(current)}/{Math.round(max)}
        </span>
      </div>
      <div className="h-3 rounded-sm bg-zinc-800 overflow-hidden border border-zinc-700">
        <div
          className={`h-full transition-all duration-100 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ResistanceRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pctStr = `${Math.round(value * 100)}%`;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={color}>{label}</span>
      <span className="font-mono tabular-nums">{pctStr}</span>
    </div>
  );
}

export function CharacterPanel({
  character,
  characterState,
  skill,
  combatState,
  totalXp,
  killCount,
  zoneName,
  availableSkillPoints,
  questsCompleted,
  flasks,
}: CharacterPanelProps) {
  if (!character || !characterState) {
    return (
      <div className="p-4 text-muted-foreground text-sm">Loading character...</div>
    );
  }

  const currentLife = combatState?.playerCurrentLife ?? character.maxLife;
  const currentMana = combatState?.playerCurrentMana ?? character.maxMana;
  const currentES = combatState?.playerCurrentES ?? character.maxEnergyShield;
  const className =
    characterState.classId.charAt(0).toUpperCase() + characterState.classId.slice(1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Character
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Class + Level */}
        <div>
          <div className="text-lg font-bold">{characterState.name}</div>
          <div className="text-sm text-muted-foreground">
            {className} &middot; Level {characterState.level}
          </div>
          {zoneName && (
            <div className="text-xs text-sky-400 mt-0.5">{zoneName}</div>
          )}
        </div>

        {/* Skill points banner */}
        {availableSkillPoints != null && availableSkillPoints > 0 && (
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
            <div className="text-xs font-semibold text-amber-400">
              +{availableSkillPoints} Passive Point{availableSkillPoints > 1 ? "s" : ""} available
            </div>
          </div>
        )}

        {/* Resource bars */}
        <div className="space-y-2">
          <HealthBar
            current={currentLife}
            max={character.maxLife}
            color="bg-green-500"
            label="Life"
          />
          <HealthBar
            current={currentMana}
            max={character.maxMana}
            color="bg-blue-500"
            label="Mana"
          />
          {character.maxEnergyShield > 0 && (
            <HealthBar
              current={currentES}
              max={character.maxEnergyShield}
              color="bg-cyan-400"
              label="ES"
            />
          )}
        </div>

        {/* Flasks */}
        {flasks && flasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Flasks
            </div>
            {flasks.map((f) => {
              const chargesPct = f.maxCharges > 0 ? (f.currentCharges / f.maxCharges) * 100 : 0;
              const flaskColor = f.type === "life" ? "bg-red-500" : f.type === "mana" ? "bg-blue-500" : "bg-purple-500";
              const textColor = f.type === "life" ? "text-red-400" : f.type === "mana" ? "text-blue-400" : "text-purple-400";
              return (
                <div key={f.id} className="rounded border border-border bg-zinc-900/50 px-2 py-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${textColor}`}>{f.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {f.currentCharges}/{f.maxCharges}
                    </span>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 rounded-full ${flaskColor}`}
                      style={{ width: `${chargesPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resistances */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Resistances
          </div>
          <ResistanceRow
            label="Fire"
            value={character.resistances.fire}
            color="text-orange-400"
          />
          <ResistanceRow
            label="Cold"
            value={character.resistances.cold}
            color="text-blue-400"
          />
          <ResistanceRow
            label="Lightning"
            value={character.resistances.lightning}
            color="text-yellow-400"
          />
          <ResistanceRow
            label="Chaos"
            value={character.resistances.chaos}
            color="text-purple-400"
          />
        </div>

        {/* Combat Stats */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Combat
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Attacks/sec</span>
            <span className="font-mono">{character.attacksPerSecond.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Casts/sec</span>
            <span className="font-mono">{character.castsPerSecond.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Move Speed</span>
            <span className="font-mono">{(character.movementSpeed * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Active Skill */}
        {skill && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Active Skill
            </div>
            <div className="rounded border border-border bg-zinc-900/50 p-2">
              <div className="text-sm font-semibold text-orange-400">
                {skill.active.name}
              </div>
              {skill.supports.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {skill.supports.map((s) => s.name).join(", ")}
                </div>
              )}
              <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mana</span>
                  <span className="text-blue-400 font-mono">
                    {skill.effectiveManaCost}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crit</span>
                  <span className="text-yellow-400 font-mono">
                    {(skill.effectiveCritChance * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Stats */}
        <div className="space-y-1 pt-2 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Session
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Kills</span>
            <span className="font-mono text-amber-400">{killCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total XP</span>
            <span className="font-mono text-amber-400">
              {totalXp.toLocaleString()}
            </span>
          </div>
          {questsCompleted != null && questsCompleted > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Quests</span>
              <span className="font-mono text-green-400">{questsCompleted}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
