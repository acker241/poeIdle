import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CharacterClass } from "@/engine/types/character";
import { CLASS_BASE_STATS } from "@/engine/data/stats/class-base-stats";

interface CharacterCreateProps {
  onCreateCharacter: (name: string, classId: string) => void;
}

interface ClassCardData {
  classId: CharacterClass;
  name: string;
  description: string;
  primaryColor: string;
  borderColor: string;
  selectedBg: string;
  glowColor: string;
}

const CLASS_CARDS: ClassCardData[] = [
  {
    classId: CharacterClass.Marauder,
    name: "Marauder",
    description: "Pure strength. Melee combat and physical fortitude.",
    primaryColor: "text-red-400",
    borderColor: "border-red-500/50",
    selectedBg: "bg-red-500/10",
    glowColor: "shadow-red-500/20",
  },
  {
    classId: CharacterClass.Ranger,
    name: "Ranger",
    description: "Pure dexterity. Ranged attacks and evasion.",
    primaryColor: "text-green-400",
    borderColor: "border-green-500/50",
    selectedBg: "bg-green-500/10",
    glowColor: "shadow-green-500/20",
  },
  {
    classId: CharacterClass.Witch,
    name: "Witch",
    description: "Pure intelligence. Spells and energy shield.",
    primaryColor: "text-blue-400",
    borderColor: "border-blue-500/50",
    selectedBg: "bg-blue-500/10",
    glowColor: "shadow-blue-500/20",
  },
  {
    classId: CharacterClass.Duelist,
    name: "Duelist",
    description: "Strength/Dexterity. Versatile melee fighter.",
    primaryColor: "text-yellow-400",
    borderColor: "border-yellow-500/50",
    selectedBg: "bg-yellow-500/10",
    glowColor: "shadow-yellow-500/20",
  },
  {
    classId: CharacterClass.Templar,
    name: "Templar",
    description: "Strength/Intelligence. Holy magic and resilience.",
    primaryColor: "text-purple-400",
    borderColor: "border-purple-500/50",
    selectedBg: "bg-purple-500/10",
    glowColor: "shadow-purple-500/20",
  },
  {
    classId: CharacterClass.Shadow,
    name: "Shadow",
    description: "Dexterity/Intelligence. Traps, mines, and critical strikes.",
    primaryColor: "text-cyan-400",
    borderColor: "border-cyan-500/50",
    selectedBg: "bg-cyan-500/10",
    glowColor: "shadow-cyan-500/20",
  },
  {
    classId: CharacterClass.Scion,
    name: "Scion",
    description: "Balanced. Starts at the center of the passive tree.",
    primaryColor: "text-amber-300",
    borderColor: "border-amber-400/50",
    selectedBg: "bg-amber-400/10",
    glowColor: "shadow-amber-400/20",
  },
];

const statsMap = new Map(CLASS_BASE_STATS.map((s) => [s.classId, s]));

function AttributeBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
      <span className="text-xs font-mono text-foreground">{value}</span>
    </div>
  );
}

export function CharacterCreate({ onCreateCharacter }: CharacterCreateProps) {
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [characterName, setCharacterName] = useState("");

  const canStart = selectedClass !== null && characterName.trim().length > 0;

  const handleStart = () => {
    if (!canStart || !selectedClass) return;
    onCreateCharacter(characterName.trim(), selectedClass);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-center shrink-0">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-orange-400">poe</span>
          <span className="text-muted-foreground">Idle</span>
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Create Your Exile</h2>
        <p className="text-muted-foreground text-sm mb-8">
          Choose a class and name your character
        </p>

        {/* Class Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mb-4">
          {CLASS_CARDS.slice(0, 6).map((card) => {
            const stats = statsMap.get(card.classId);
            const isSelected = selectedClass === card.classId;
            return (
              <button
                key={card.classId}
                onClick={() => setSelectedClass(card.classId)}
                className={`
                  relative rounded-lg border p-4 text-left transition-all duration-150
                  hover:shadow-lg cursor-pointer
                  ${
                    isSelected
                      ? `${card.borderColor} ${card.selectedBg} shadow-lg ${card.glowColor}`
                      : "border-border bg-zinc-950/50 hover:border-zinc-600"
                  }
                `}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${card.primaryColor.replace("text-", "bg-")} animate-pulse`} />
                  </div>
                )}
                <div className={`text-lg font-bold mb-1 ${card.primaryColor}`}>
                  {card.name}
                </div>
                <p className="text-xs text-muted-foreground mb-3">{card.description}</p>
                {stats && (
                  <div className="flex items-center gap-3">
                    <AttributeBadge label="STR" value={stats.strength} color="text-red-400" />
                    <AttributeBadge label="DEX" value={stats.dexterity} color="text-green-400" />
                    <AttributeBadge label="INT" value={stats.intelligence} color="text-blue-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Scion - centered below the 3x2 grid */}
        <div className="w-full max-w-4xl flex justify-center mb-8">
          {(() => {
            const card = CLASS_CARDS[6];
            const stats = statsMap.get(card.classId);
            const isSelected = selectedClass === card.classId;
            return (
              <button
                key={card.classId}
                onClick={() => setSelectedClass(card.classId)}
                className={`
                  relative rounded-lg border p-4 text-left transition-all duration-150
                  hover:shadow-lg cursor-pointer w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]
                  ${
                    isSelected
                      ? `${card.borderColor} ${card.selectedBg} shadow-lg ${card.glowColor}`
                      : "border-border bg-zinc-950/50 hover:border-zinc-600"
                  }
                `}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${card.primaryColor.replace("text-", "bg-")} animate-pulse`} />
                  </div>
                )}
                <div className={`text-lg font-bold mb-1 ${card.primaryColor}`}>
                  {card.name}
                </div>
                <p className="text-xs text-muted-foreground mb-3">{card.description}</p>
                {stats && (
                  <div className="flex items-center gap-3">
                    <AttributeBadge label="STR" value={stats.strength} color="text-red-400" />
                    <AttributeBadge label="DEX" value={stats.dexterity} color="text-green-400" />
                    <AttributeBadge label="INT" value={stats.intelligence} color="text-blue-400" />
                  </div>
                )}
              </button>
            );
          })()}
        </div>

        {/* Name Input + Start Button */}
        <div className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="character-name"
              className="text-sm font-medium text-muted-foreground"
            >
              Character Name
            </label>
            <input
              id="character-name"
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canStart) handleStart();
              }}
              placeholder="Enter a name for your exile..."
              maxLength={24}
              className="
                w-full rounded-lg border border-border bg-zinc-950/50 px-3 py-2
                text-sm text-foreground placeholder:text-muted-foreground/50
                outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30
                transition-colors
              "
            />
          </div>

          <Button
            size="lg"
            disabled={!canStart}
            onClick={handleStart}
            className="w-full text-sm font-semibold"
          >
            Start Journey
          </Button>
        </div>
      </main>
    </div>
  );
}
