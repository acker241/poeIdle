import type { CombatState } from "@/engine/types/combat";

interface EnemyPanelProps {
  combatState: CombatState | null;
}

function EnemyHealthBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isLow = pct < 25;
  const isMid = pct < 50 && !isLow;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Life</span>
        <span className="font-mono tabular-nums">
          {Math.round(current)}/{Math.round(max)}
        </span>
      </div>
      <div className="h-4 rounded-sm bg-zinc-800 overflow-hidden border border-zinc-700">
        <div
          className={`h-full transition-all duration-100 ${
            isLow ? "bg-red-600" : isMid ? "bg-red-500" : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EnemyPanel({ combatState }: EnemyPanelProps) {
  if (!combatState) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Enemy
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <span className="text-muted-foreground text-sm italic">
            No enemy encountered
          </span>
        </div>
      </div>
    );
  }

  const { enemy, enemyCurrentLife } = combatState;
  const lifePct = enemy.baseLife > 0 ? (enemyCurrentLife / enemy.baseLife) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Enemy
        </h2>
      </div>

      <div className="flex-1 p-3 space-y-4">
        {/* Enemy Name + Badge */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-bold ${
                enemy.isBoss ? "text-amber-400" : "text-red-400"
              }`}
            >
              {enemy.name}
            </span>
            {enemy.isBoss && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Boss
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">Level {enemy.level}</div>
        </div>

        {/* Health bar */}
        <EnemyHealthBar current={enemyCurrentLife} max={enemy.baseLife} />

        {/* Enemy details */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Stats
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Armour</span>
              <span className="font-mono">{enemy.armour}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Evasion</span>
              <span className="font-mono">{enemy.evasion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-mono">{enemy.accuracy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atk Time</span>
              <span className="font-mono">{(enemy.attackTime / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Resistances */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Resistances
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            {Object.entries(enemy.resistances).map(([type, value]) => {
              const colors: Record<string, string> = {
                physical: "text-zinc-300",
                fire: "text-orange-400",
                cold: "text-blue-400",
                lightning: "text-yellow-400",
                chaos: "text-purple-400",
              };
              const pctValue = Math.round((value as number) * 100);
              return (
                <div key={type} className="flex justify-between">
                  <span className={colors[type] ?? "text-zinc-400"}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                  <span
                    className={`font-mono ${
                      pctValue > 0
                        ? "text-zinc-400"
                        : pctValue < 0
                        ? "text-green-400"
                        : "text-zinc-600"
                    }`}
                  >
                    {pctValue}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Life percentage indicator */}
        <div className="pt-2 border-t border-border">
          <div className="text-center">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                lifePct > 50
                  ? "text-red-400"
                  : lifePct > 25
                  ? "text-orange-400"
                  : "text-red-600"
              }`}
            >
              {Math.round(lifePct)}%
            </span>
            <div className="text-xs text-muted-foreground">HP Remaining</div>
          </div>
        </div>
      </div>
    </div>
  );
}
