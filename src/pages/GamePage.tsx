import { useGameEngine } from "@/hooks/useGameEngine";
import { CharacterPanel } from "@/components/CharacterPanel";
import { CombatLog } from "@/components/CombatLog";
import { EnemyPanel } from "@/components/EnemyPanel";
import { CharacterClass } from "@/engine/types/character";

interface GamePageProps {
  characterName: string;
  characterClass: string;
}

export function GamePage({ characterName, characterClass }: GamePageProps) {
  const game = useGameEngine({
    characterName,
    characterClass: characterClass as CharacterClass,
  });

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
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <span>
            Kills:{" "}
            <span className="text-amber-400 font-semibold">{game.killCount}</span>
          </span>
          <span>
            XP:{" "}
            <span className="text-amber-400 font-semibold">
              {game.totalXp.toLocaleString()}
            </span>
          </span>
        </div>
      </header>

      {/* Main 3-panel layout */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr_260px] gap-0 overflow-hidden">
        {/* Left sidebar - Character */}
        <aside className="border-r border-border overflow-hidden bg-zinc-950/30">
          <CharacterPanel
            character={game.character}
            characterState={game.characterState}
            skill={game.skill}
            combatState={game.combatState}
            totalXp={game.totalXp}
            killCount={game.killCount}
            elapsedMs={game.elapsedMs}
          />
        </aside>

        {/* Center - Combat Log */}
        <section className="overflow-hidden bg-zinc-950/50 flex flex-col min-h-0">
          <CombatLog events={game.events} />
        </section>

        {/* Right sidebar - Enemy */}
        <aside className="border-l border-border overflow-hidden bg-zinc-950/30">
          <EnemyPanel combatState={game.combatState} />
        </aside>
      </main>
    </div>
  );
}
