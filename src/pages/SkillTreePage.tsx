import { useState, useCallback } from "react";
import { SkillTree } from "@/components/SkillTree";

interface SkillTreePageProps {
  characterClass?: string;
  characterLevel?: number;
  onBack?: () => void;
}

export function SkillTreePage({
  characterClass,
  characterLevel = 1,
  onBack,
}: SkillTreePageProps) {
  const [allocatedCount, setAllocatedCount] = useState(0);

  const availablePoints = Math.max(0, characterLevel - 1);

  const handleAllocate = useCallback((nodeIds: string[]) => {
    setAllocatedCount(nodeIds.length);
  }, []);

  return (
    <div className="dark flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between bg-zinc-950/80">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
          )}
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-orange-400">Passive</span>{" "}
            <span className="text-muted-foreground">Skill Tree</span>
          </h1>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {/* Points counter */}
          <div className="flex items-center gap-2 font-mono">
            <span className="text-muted-foreground">Points:</span>
            <span
              className={
                allocatedCount > availablePoints
                  ? "text-red-400 font-semibold"
                  : "text-amber-400 font-semibold"
              }
            >
              {allocatedCount}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-zinc-400">{availablePoints}</span>
          </div>

          {/* Level display */}
          <div className="text-xs text-muted-foreground">
            Level {characterLevel}
          </div>
        </div>
      </header>

      {/* Skill Tree Canvas */}
      <main className="flex-1 min-h-0">
        <SkillTree
          characterClass={characterClass}
          onAllocate={handleAllocate}
        />
      </main>
    </div>
  );
}
