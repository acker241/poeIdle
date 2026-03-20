import type { DisplayEquipment, EquippedItem, EquipSlot } from "@/engine/items/starter-gear";

const SLOT_ORDER: { slot: EquipSlot; label: string }[] = [
  { slot: "weapon", label: "Weapon" },
  { slot: "offhand", label: "Off Hand" },
  { slot: "helmet", label: "Helmet" },
  { slot: "body", label: "Body Armour" },
  { slot: "gloves", label: "Gloves" },
  { slot: "boots", label: "Boots" },
  { slot: "belt", label: "Belt" },
  { slot: "amulet", label: "Amulet" },
  { slot: "ring1", label: "Ring 1" },
  { slot: "ring2", label: "Ring 2" },
];

function ItemSlot({ label, item }: { label: string; item: EquippedItem | null }) {
  if (!item) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-800 bg-zinc-900/30">
        <span className="text-xs text-zinc-600 w-16 shrink-0">{label}</span>
        <span className="text-xs text-zinc-600 italic">Empty</span>
      </div>
    );
  }

  return (
    <div className="rounded border border-zinc-700 bg-zinc-900/50 px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 w-16 shrink-0">{label}</span>
        <span className="text-xs font-medium text-zinc-200">{item.name}</span>
      </div>
      {/* Weapon stats */}
      {item.physicalDamage && (
        <div className="flex items-center justify-between mt-0.5 text-[10px]">
          <span className="text-zinc-500 ml-16">
            {item.physicalDamage.min}-{item.physicalDamage.max} Physical
          </span>
          {item.attackTime && (
            <span className="text-zinc-500 font-mono">
              {(1000 / item.attackTime).toFixed(2)} aps
            </span>
          )}
        </div>
      )}
      {/* Armor stats */}
      {(item.armour || item.evasion || item.energyShield) && (
        <div className="flex gap-2 mt-0.5 text-[10px] text-zinc-500 ml-16">
          {item.armour ? <span>AR {item.armour}</span> : null}
          {item.evasion ? <span>EV {item.evasion}</span> : null}
          {item.energyShield ? <span>ES {item.energyShield}</span> : null}
        </div>
      )}
      {/* Implicit mods */}
      {item.implicitMods.length > 0 && (
        <div className="mt-0.5 ml-16">
          {item.implicitMods.map((mod, i) => (
            <div key={i} className="text-[10px] text-blue-400">{mod}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EquipmentPanel({ equipment }: { equipment: DisplayEquipment }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Equipment
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {SLOT_ORDER.map(({ slot, label }) => (
          <ItemSlot key={slot} label={label} item={equipment[slot]} />
        ))}
      </div>
    </div>
  );
}
