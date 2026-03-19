interface ProcessedNode {
  id: string;
  skill: number;
  name: string;
  icon: string;
  stats: string[];
  type:
    | "small"
    | "notable"
    | "keystone"
    | "mastery"
    | "jewel_socket"
    | "class_start"
    | "ascendancy_small"
    | "ascendancy_notable"
    | "ascendancy_start";
  x: number;
  y: number;
  connections: string[];
  group: number | null;
  orbit: number | null;
  orbitIndex: number | null;
  grantedStrength: number;
  grantedDexterity: number;
  grantedIntelligence: number;
  classStartIndex: number | null;
  ascendancyName: string | null;
  isAscendancyStart: boolean;
  masteryEffects: Array<{ effect: number; stats: string[] }> | null;
}

interface SkillTreeTooltipProps {
  node: ProcessedNode;
  x: number;
  y: number;
  allocated: boolean;
}

const typeBadgeColors: Record<string, { bg: string; text: string }> = {
  small: { bg: "bg-zinc-700", text: "text-zinc-300" },
  notable: { bg: "bg-amber-900/80", text: "text-amber-300" },
  keystone: { bg: "bg-purple-900/80", text: "text-purple-300" },
  mastery: { bg: "bg-zinc-700", text: "text-zinc-300" },
  jewel_socket: { bg: "bg-green-900/80", text: "text-green-300" },
  class_start: { bg: "bg-blue-900/80", text: "text-blue-300" },
  ascendancy_small: { bg: "bg-red-900/80", text: "text-red-300" },
  ascendancy_notable: { bg: "bg-red-900/80", text: "text-red-300" },
  ascendancy_start: { bg: "bg-red-900/80", text: "text-red-300" },
};

const typeLabels: Record<string, string> = {
  small: "Small",
  notable: "Notable",
  keystone: "Keystone",
  mastery: "Mastery",
  jewel_socket: "Jewel Socket",
  class_start: "Class Start",
  ascendancy_small: "Ascendancy",
  ascendancy_notable: "Ascendancy Notable",
  ascendancy_start: "Ascendancy Start",
};

export function SkillTreeTooltip({ node, x, y, allocated }: SkillTreeTooltipProps) {
  const badge = typeBadgeColors[node.type] ?? typeBadgeColors.small;
  const label = typeLabels[node.type] ?? node.type;

  // Offset tooltip so it doesn't overlap the cursor
  const tooltipX = x + 16;
  const tooltipY = y + 16;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: tooltipX, top: tooltipY }}
    >
      <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl max-w-xs">
        {/* Node name */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-zinc-100">{node.name}</span>
          {allocated && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-700/60 text-amber-300">
              Allocated
            </span>
          )}
        </div>

        {/* Type badge */}
        <span
          className={`inline-block text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${badge.bg} ${badge.text} mb-1.5`}
        >
          {label}
        </span>

        {/* Ascendancy name */}
        {node.ascendancyName && (
          <div className="text-[11px] text-red-400 mb-1">{node.ascendancyName}</div>
        )}

        {/* Stats */}
        {node.stats.length > 0 && (
          <div className="border-t border-zinc-700/60 pt-1.5 mt-1 space-y-0.5">
            {node.stats.map((stat, i) => (
              <div key={i} className="text-xs text-zinc-300 leading-tight">
                {stat}
              </div>
            ))}
          </div>
        )}

        {/* Mastery effects */}
        {node.masteryEffects && node.masteryEffects.length > 0 && (
          <div className="border-t border-zinc-700/60 pt-1.5 mt-1.5 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
              Mastery Options
            </div>
            {node.masteryEffects.map((me, i) => (
              <div key={i} className="text-xs text-zinc-400 leading-tight">
                {me.stats.join(", ")}
              </div>
            ))}
          </div>
        )}

        {/* Attribute grants */}
        {(node.grantedStrength > 0 ||
          node.grantedDexterity > 0 ||
          node.grantedIntelligence > 0) && (
          <div className="border-t border-zinc-700/60 pt-1.5 mt-1.5 flex gap-3 text-[11px]">
            {node.grantedStrength > 0 && (
              <span className="text-red-400">+{node.grantedStrength} Str</span>
            )}
            {node.grantedDexterity > 0 && (
              <span className="text-green-400">+{node.grantedDexterity} Dex</span>
            )}
            {node.grantedIntelligence > 0 && (
              <span className="text-blue-400">+{node.grantedIntelligence} Int</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type { ProcessedNode };
