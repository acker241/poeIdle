import { useGameEngine } from "@/hooks/useGameEngine";
import { CharacterPanel } from "@/components/CharacterPanel";
import { CombatLog } from "@/components/CombatLog";
import { EnemyPanel } from "@/components/EnemyPanel";
import { EquipmentPanel } from "@/components/EquipmentPanel";
import { SkillTreePage } from "@/pages/SkillTreePage";
import { CharacterClass } from "@/engine/types/character";
import { ACT1_ZONES } from "@/engine/data/zones/act1-zones";
import { ACT1_QUEST_MAP } from "@/engine/data/quests/act1-quests";
import type { GameLogEntry } from "@/engine/game/game-state";

interface GamePageProps {
  characterName: string;
  characterClass: string;
}

// ---------------------------------------------------------------------------
// Navigation tab button
// ---------------------------------------------------------------------------

function NavTab({
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
        ${
          active
            ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
            : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 border border-transparent"
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-black text-[10px] font-bold leading-none px-1">
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Zone progress bar
// ---------------------------------------------------------------------------

function ZoneProgressBar({
  zoneName,
  zoneLevel,
  encountersRemaining,
  encountersTotal,
  isBoss,
  isTown,
  act1Complete,
}: {
  zoneName: string;
  zoneLevel: number;
  encountersRemaining: number;
  encountersTotal: number;
  isBoss: boolean;
  isTown: boolean;
  act1Complete: boolean;
}) {
  const encountersDone = encountersTotal - encountersRemaining;
  const pct = encountersTotal > 0 ? (encountersDone / encountersTotal) * 100 : 100;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{zoneName}</span>
          <span className="text-xs text-muted-foreground">(Level {zoneLevel})</span>
          {isTown && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Town
            </span>
          )}
          {isBoss && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
              Boss Fight
            </span>
          )}
          {act1Complete && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Act 1 Complete
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {isTown ? "Safe zone" : `${encountersDone}/${encountersTotal} cleared`}
        </span>
      </div>
      {!isTown && (
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              isBoss ? "bg-red-500" : "bg-orange-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Town / Quest log view
// ---------------------------------------------------------------------------

function TownView({
  completedQuests,
  pendingRewards,
  gameLog,
  availableSkillPoints,
}: {
  completedQuests: string[];
  pendingRewards: number;
  gameLog: GameLogEntry[];
  availableSkillPoints: number;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-6">
      {/* Skill points */}
      {availableSkillPoints > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="text-sm font-semibold text-amber-400">
            Unspent Passive Skill Points: {availableSkillPoints}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Switch to the Passive Tree tab to allocate points.
          </div>
        </div>
      )}

      {/* Pending rewards notification */}
      {pendingRewards > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="text-sm font-semibold text-amber-400">
            Unclaimed Quest Rewards: {pendingRewards}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            (Rewards are auto-applied in MVP)
          </div>
        </div>
      )}

      {/* Completed quests */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Completed Quests
        </h3>
        {completedQuests.length === 0 ? (
          <div className="text-xs text-zinc-600 italic">No quests completed yet.</div>
        ) : (
          <div className="space-y-1">
            {completedQuests.map((qId) => {
              const q = ACT1_QUEST_MAP.get(qId);
              return (
                <div
                  key={qId}
                  className="flex items-center gap-2 rounded border border-border bg-zinc-900/50 px-3 py-2"
                >
                  <span className="text-green-400 text-sm">&#10003;</span>
                  <div>
                    <div className="text-sm font-medium">{q?.name ?? qId}</div>
                    <div className="text-xs text-muted-foreground">{q?.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Game log */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Game Log
        </h3>
        <div className="space-y-0.5 font-mono text-xs">
          {gameLog
            .slice()
            .reverse()
            .slice(0, 30)
            .map((entry, i) => {
              const colors: Record<string, string> = {
                zone: "text-sky-400",
                quest: "text-amber-400",
                level_up: "text-green-400",
                death: "text-red-400",
                boss: "text-red-500",
                reward: "text-amber-300",
              };
              return (
                <div key={i} className={colors[entry.type] ?? "text-zinc-400"}>
                  {entry.message}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main GamePage
// ---------------------------------------------------------------------------

export function GamePage({ characterName, characterClass }: GamePageProps) {
  const game = useGameEngine({
    characterName,
    characterClass: characterClass as CharacterClass,
  });

  const { gameState, currentZone } = game;
  const zone = currentZone ?? ACT1_ZONES[0];
  const zoneTotal = zone.encountersToComplete;

  // Pending rewards badge count
  const pendingBadge = gameState.pendingQuestRewards.length;

  // --- Render skill tree view ---
  if (gameState.currentView === "tree") {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col">
        <SkillTreePage
          characterClass={characterClass}
          characterLevel={gameState.character.level}
          onBack={() => game.setView("combat")}
        />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-orange-400">poe</span>
            <span className="text-muted-foreground">Idle</span>
          </h1>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {game.running ? "Engine running" : "Initializing..."}
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-1">
          <NavTab
            label="Combat"
            icon="&#9876;"
            active={gameState.currentView === "combat"}
            onClick={() => game.setView("combat")}
          />
          <NavTab
            label="Passive Tree"
            icon="&#127795;"
            active={false /* tree view returns early above */}
            badge={gameState.availableSkillPoints > 0 ? gameState.availableSkillPoints : undefined}
            onClick={() => game.setView("tree")}
          />
          <NavTab
            label="Equipment"
            icon="&#128737;"
            active={gameState.currentView === "equipment"}
            onClick={() => game.setView("equipment")}
          />
          <NavTab
            label="Town"
            icon="&#127968;"
            active={gameState.currentView === "town"}
            badge={pendingBadge > 0 ? pendingBadge : undefined}
            onClick={() => game.setView("town")}
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <span>
            Kills:{" "}
            <span className="text-amber-400 font-semibold">{gameState.totalKills}</span>
          </span>
          <span>
            XP:{" "}
            <span className="text-amber-400 font-semibold">
              {gameState.totalXp.toLocaleString()}
            </span>
          </span>
          {gameState.totalDeaths > 0 && (
            <span>
              Deaths:{" "}
              <span className="text-red-400 font-semibold">{gameState.totalDeaths}</span>
            </span>
          )}
        </div>
      </header>

      {/* Zone progress bar + strategy toggle */}
      <div className="flex items-center border-b border-border bg-zinc-950/60">
        <div className="flex-1">
          <ZoneProgressBar
            zoneName={zone.name}
            zoneLevel={zone.level}
            encountersRemaining={gameState.encountersRemaining}
            encountersTotal={zoneTotal}
            isBoss={gameState.isFightingBoss}
            isTown={zone.isTown}
            act1Complete={gameState.act1Complete}
          />
        </div>
        {!zone.isTown && (
          <button
            onClick={() =>
              game.setStrategy(gameState.strategy === "advance" ? "farm" : "advance")
            }
            className={`
              mx-3 px-3 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap
              ${
                gameState.strategy === "farm"
                  ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25"
                  : "bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25"
              }
            `}
          >
            {gameState.strategy === "farm" ? "Farming" : "Advancing"}
          </button>
        )}
      </div>

      {/* Main content area */}
      {gameState.currentView === "equipment" ? (
        <main className="flex-1 overflow-hidden bg-zinc-950/50 max-w-lg mx-auto w-full">
          <EquipmentPanel equipment={gameState.equipment} />
        </main>
      ) : gameState.currentView === "town" ? (
        <main className="flex-1 overflow-hidden bg-zinc-950/50">
          <TownView
            completedQuests={gameState.completedQuests}
            pendingRewards={gameState.pendingQuestRewards.length}
            gameLog={gameState.gameLog}
            availableSkillPoints={gameState.availableSkillPoints}
          />
        </main>
      ) : (
        /* Combat view: 3-panel layout */
        <main className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr_260px] gap-0 overflow-hidden">
          {/* Left sidebar - Character */}
          <aside className="border-r border-border overflow-hidden bg-zinc-950/30">
            <CharacterPanel
              character={game.resolvedCharacter}
              characterState={gameState.character}
              skill={game.skill}
              combatState={game.combatState}
              totalXp={gameState.totalXp}
              killCount={gameState.totalKills}
              elapsedMs={0}
              zoneName={zone.name}
              availableSkillPoints={gameState.availableSkillPoints}
              questsCompleted={gameState.completedQuests.length}
              flasks={gameState.flasks}
            />
          </aside>

          {/* Center - Combat Log */}
          <section className="overflow-hidden bg-zinc-950/50 flex flex-col min-h-0">
            <CombatLog events={game.combatEvents} />
          </section>

          {/* Right sidebar - Enemy */}
          <aside className="border-l border-border overflow-hidden bg-zinc-950/30">
            <EnemyPanel combatState={game.combatState} />
          </aside>
        </main>
      )}
    </div>
  );
}
