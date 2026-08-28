/**
 * @apps/editor
 * Item Catalog, Weapon Stats & Cyberware Inspector.
 */

import React, { useState } from 'react';
import { ItemDefinition } from '@neon-ether/game-schema';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';
import { Badge, Panel } from '@neon-ether/shared-ui';
import { Cpu, Crosshair, Package, Shield, Zap } from 'lucide-react';

export const ItemCatalogViewer: React.FC = () => {
  const [items] = useState<ItemDefinition[]>(() => GAME_CONTENT_MANIFEST.items);
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id ?? '');

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const getRarityBadgeVariant = (rarity: ItemDefinition['rarity']) => {
    switch (rarity) {
      case 'Prototype':
      case 'EtherArtifact':
        return 'purple';
      case 'MilitarySpec':
        return 'rose';
      case 'StreetGrade':
        return 'cyan';
      default:
        return 'zinc';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Item List */}
      <div className="w-full lg:w-72 flex flex-col gap-2">
        <Panel
          title="ITEM ARCHIVES"
          subtitle={`${items.length} DEFINITIONS`}
        >
          <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto">
            {items.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-2 text-left border font-mono text-xs transition-colors cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100">{item.name}</span>
                    <Badge variant={getRarityBadgeVariant(item.rarity)} size="xs">
                      {item.rarity}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{item.category}</span>
                    <span>{item.valueCredits} CR</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Item Detail Inspector */}
      <div className="flex-1 flex flex-col">
        {selectedItem ? (
          <Panel
            title={`ITEM BLUEPRINT // ${selectedItem.name}`}
            subtitle={`ID: ${selectedItem.id}`}
            glow="cyan"
            headerRight={
              <Badge variant={getRarityBadgeVariant(selectedItem.rarity)}>
                {selectedItem.rarity}
              </Badge>
            }
          >
            <div className="flex flex-col gap-4">
              <p className="font-sans text-sm text-zinc-200 bg-zinc-900/60 p-3 border border-zinc-800">
                {selectedItem.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-2.5 bg-black/40 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">CATEGORY</span>
                  <span className="font-bold text-zinc-100">{selectedItem.category}</span>
                </div>
                <div className="p-2.5 bg-black/40 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">VALUE (CREDITS)</span>
                  <span className="font-bold text-amber-400">{selectedItem.valueCredits} CR</span>
                </div>
                <div className="p-2.5 bg-black/40 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">WEIGHT</span>
                  <span className="font-bold text-zinc-100">{selectedItem.weightKg} kg</span>
                </div>
                <div className="p-2.5 bg-black/40 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">ACTION COST</span>
                  <span className="font-bold text-cyan-400">
                    {selectedItem.apUseCost ? `${selectedItem.apUseCost} AP` : 'N/A'}
                  </span>
                </div>
              </div>

              {selectedItem.damageRange && (
                <div className="p-3 bg-rose-950/20 border border-rose-500/30 flex items-center justify-between font-mono text-xs">
                  <span className="text-rose-300 font-semibold">COMBAT DAMAGE RANGE:</span>
                  <span className="text-rose-200 font-bold text-sm">
                    {selectedItem.damageRange[0]} - {selectedItem.damageRange[1]} Physical/Thermal
                  </span>
                </div>
              )}

              {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
                <div className="p-3 bg-purple-950/20 border border-purple-500/30 flex flex-col gap-1.5 font-mono text-xs">
                  <span className="text-purple-300 font-semibold uppercase text-[10px]">
                    Implant Stat Boosts:
                  </span>
                  <div className="flex gap-2">
                    {selectedItem.modifiers.map((mod, i) => (
                      <Badge key={i} variant="purple">
                        +{mod.value} {mod.stat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        ) : (
          <div className="p-8 text-center text-zinc-500 font-mono">No item selected</div>
        )}
      </div>
    </div>
  );
};
