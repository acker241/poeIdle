import { useEffect, useRef, type ReactNode } from "react";
import type { CombatEvent } from "@/engine/types/combat";

interface CombatLogProps {
  events: CombatEvent[];
}

function formatEvent(event: CombatEvent, idx: number): ReactNode {
  switch (event.type) {
    case "player_hit":
      return (
        <div key={idx} className="text-green-400">
          <span className="text-green-600">{">>>"}</span> You hit for{" "}
          <span className="font-bold text-green-300">{Math.round(event.damage)}</span>{" "}
          damage
          {event.breakdown.wasCrit && (
            <span className="ml-1 text-yellow-400 font-bold">CRIT!</span>
          )}
        </div>
      );
    case "player_miss":
      return (
        <div key={idx} className="text-zinc-500">
          <span className="text-zinc-600">{">>>"}</span> You missed.
        </div>
      );
    case "player_blocked":
      return (
        <div key={idx} className="text-sky-400">
          <span className="text-sky-600">{">>>"}</span> You blocked the attack!
        </div>
      );
    case "enemy_hit":
      return (
        <div key={idx} className="text-red-400">
          <span className="text-red-600">{"<<<"}</span> Enemy hits you for{" "}
          <span className="font-bold text-red-300">{Math.round(event.damage)}</span>{" "}
          damage
        </div>
      );
    case "enemy_miss":
      return (
        <div key={idx} className="text-zinc-500">
          <span className="text-zinc-600">{"<<<"}</span> Enemy missed.
        </div>
      );
    case "enemy_defeated":
      return (
        <div key={idx} className="text-amber-400 font-semibold">
          <span className="text-amber-500">{"***"}</span> Enemy defeated! +
          <span className="text-amber-300">{event.xp}</span> XP
        </div>
      );
    case "player_defeated":
      return (
        <div key={idx} className="text-red-500 font-bold">
          <span>{"!!!"}</span> You have been slain. Respawning...
        </div>
      );
    case "ailment_applied":
      return (
        <div key={idx} className="text-purple-400">
          <span className="text-purple-600">{"~~~"}</span> Applied{" "}
          <span className="font-semibold capitalize">{event.ailment}</span>
        </div>
      );
    case "ailment_expired":
      return (
        <div key={idx} className="text-purple-600">
          <span>{"~~~"}</span>{" "}
          <span className="capitalize">{event.ailment}</span> expired
        </div>
      );
    case "dot_tick":
      return (
        <div key={idx} className="text-orange-400">
          <span className="text-orange-600">{"..."}</span>{" "}
          <span className="capitalize">{event.ailment}</span> deals{" "}
          <span className="font-bold">{Math.round(event.damage)}</span> damage
        </div>
      );
    case "es_recharge_start":
      return (
        <div key={idx} className="text-cyan-400">
          <span className="text-cyan-600">{"+++"}</span> Energy Shield recharge started
        </div>
      );
    default:
      return <div key={idx} className="text-zinc-600">Unknown event</div>;
  }
}

export function CombatLog({ events }: CombatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Combat Log
        </h2>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono text-xs leading-relaxed scrollbar-thin"
      >
        {events.length === 0 ? (
          <div className="text-zinc-600 italic">Waiting for combat...</div>
        ) : (
          events.map((event, idx) => formatEvent(event, idx))
        )}
      </div>
    </div>
  );
}
