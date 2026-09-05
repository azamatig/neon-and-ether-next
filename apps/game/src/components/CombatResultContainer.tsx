/**
 * @apps/game
 * Unified Combat Result & Post-Combat Resolution Container.
 * Handles: Battle Debriefing → Tactical Salvage/Loot Phase → Incapacitated Enemy Actions (Search, Restrain, Interrogate, Capture).
 */

import React, { useState } from 'react';
import { CombatResolution } from '@neon-ether/game-schema';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  FileSearch,
  Lock,
  Package,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  Unlock,
  User,
  Users,
  Zap,
} from 'lucide-react';

export interface CombatResultContainerProps {
  resolution: CombatResolution;
  onTakeLoot: (selectedItemIds: string[], takeCredits: boolean) => void;
  onExecutePostCombatAction: (
    enemyId: string,
    actionId: 'Search' | 'Restrain' | 'Capture' | 'Interrogate' | 'Release' | 'FinishOff'
  ) => void;
  onDismiss: () => void;
  resolveItemName: (itemId: string) => string;
}

export const CombatResultContainer: React.FC<CombatResultContainerProps> = ({
  resolution,
  onTakeLoot,
  onExecutePostCombatAction,
  onDismiss,
  resolveItemName,
}) => {
  const isVictory = resolution.victoryStatus === 'Victory';
  const [selectedItems, setSelectedItems] = useState<string[]>(
    resolution.availableLoot.map((s) => s.itemId)
  );
  const [activeTab, setActiveTab] = useState<'debrief' | 'loot' | 'prisoners'>('debrief');

  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleLootAll = () => {
    onTakeLoot(
      resolution.availableLoot.map((s) => s.itemId),
      true
    );
  };

  const handleLootSelected = () => {
    onTakeLoot(selectedItems, true);
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 font-mono select-none">
      <Panel
        title={`COMBAT RESOLUTION // ${resolution.encounterName.toUpperCase()}`}
        subtitle={`${isVictory ? 'TACTICAL VICTORY' : 'SQUAD COMPROMISED'} • ${resolution.roundsPlayed} ROUNDS`}
        glow={isVictory ? 'cyan' : 'rose'}
        className="flex-1 flex flex-col"
        headerRight={
          <div className="flex items-center gap-2">
            <Badge variant={isVictory ? 'emerald' : 'rose'} size="xs">
              {resolution.victoryStatus.toUpperCase()}
            </Badge>
            <Badge variant="cyan" size="xs">
              +{resolution.xpGained} XP
            </Badge>
          </div>
        }
      >
        <div className="flex-1 flex flex-col justify-between gap-4">
          {/* Top Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab('debrief')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'debrief'
                  ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40 font-bold'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              1. Combat Debrief
            </button>

            <button
              onClick={() => setActiveTab('loot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'loot'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>2. Tactical Salvage ({resolution.availableLoot.length})</span>
            </button>

            {resolution.incapacitatedEnemies.length > 0 && (
              <button
                onClick={() => setActiveTab('prisoners')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'prisoners'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>3. Hostile Survivors ({resolution.incapacitatedEnemies.length})</span>
              </button>
            )}
          </div>

          {/* Tab 1: Debriefing */}
          {activeTab === 'debrief' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: XP & Rewards */}
              <div className="p-4 bg-black/60 border border-zinc-800 rounded-xl flex flex-col gap-3">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  MISSION PERFORMANCE & REWARDS
                </span>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg">
                    <span className="text-zinc-400">Total Combat XP</span>
                    <span className="text-cyan-400 font-bold">+{resolution.xpGained} XP</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg">
                    <span className="text-zinc-400">Credits Recovered</span>
                    <span className="text-amber-400 font-bold">+{resolution.creditsFound} ¢</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg">
                    <span className="text-zinc-400">Combat Rounds</span>
                    <span className="text-white font-bold">{resolution.roundsPlayed}</span>
                  </div>
                </div>

                {resolution.questProgressSummaries && resolution.questProgressSummaries.length > 0 && (
                  <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-xs text-cyan-200">
                    <div className="font-bold text-[10px] uppercase text-cyan-400 mb-1">
                      Objective Updates:
                    </div>
                    {resolution.questProgressSummaries.map((q, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Casualties & Tactical Status */}
              <div className="p-4 bg-black/60 border border-zinc-800 rounded-xl flex flex-col gap-3">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  HOSTILE CASUALTIES & LOGS
                </span>

                <div className="flex flex-col gap-2">
                  {resolution.enemyCasualties.map((cas, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-rose-950/20 border border-rose-500/20 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 text-rose-300">
                        <Skull className="w-4 h-4" />
                        <span>{cas.name}</span>
                      </div>
                      <Badge variant="rose" size="xs">
                        ×{cas.count} Neutralized
                      </Badge>
                    </div>
                  ))}

                  {resolution.logEntries?.map((log, idx) => (
                    <div key={idx} className="text-[11px] text-zinc-400 font-sans p-2 bg-white/5 rounded">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Loot Phase */}
          {activeTab === 'loot' && (
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="p-4 bg-black/60 border border-zinc-800 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    <span>TACTICAL SALVAGE CONTAINER</span>
                  </span>

                  {resolution.creditsFound > 0 && (
                    <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{resolution.creditsFound} ¢ Available</span>
                    </span>
                  )}
                </div>

                {resolution.availableLoot.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No remaining loot items in container.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {resolution.availableLoot.map((slot) => {
                      const isSelected = selectedItems.includes(slot.itemId);

                      return (
                        <div
                          key={slot.itemId}
                          onClick={() => toggleItemSelection(slot.itemId)}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-amber-950/40 border-amber-500/60 text-white'
                              : 'bg-black/40 border-zinc-800 text-zinc-400 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="accent-amber-400 cursor-pointer"
                            />
                            <div className="text-xs font-bold">{resolveItemName(slot.itemId)}</div>
                          </div>

                          <Badge variant="amber" size="xs">
                            ×{slot.quantity}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Loot Action Buttons */}
              {resolution.availableLoot.length > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLootSelected}
                  >
                    Transfer Selected ({selectedItems.length})
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleLootAll}
                  >
                    Take All Salvage & Credits
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Hostile Survivors / Prisoners */}
          {activeTab === 'prisoners' && (
            <div className="flex-1 flex flex-col gap-3">
              <span className="text-xs text-zinc-400 font-sans">
                Incapacitated hostiles present at the scene. Decide their disposition before concluding:
              </span>

              <div className="grid grid-cols-1 gap-3">
                {resolution.incapacitatedEnemies.map((enemy) => (
                  <div
                    key={enemy.id}
                    className="p-4 bg-black/60 border border-purple-500/30 rounded-xl flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-950/50 border border-purple-500/30 rounded-lg text-purple-300">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{enemy.name}</div>
                          <div className="text-[10px] text-purple-400">Status: {enemy.status}</div>
                        </div>
                      </div>
                      <Badge variant="purple" size="xs">
                        SURVIVOR
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
                      {enemy.canBeSearched && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExecutePostCombatAction(enemy.id, 'Search')}
                          leftIcon={<Search className="w-3.5 h-3.5 text-cyan-400" />}
                        >
                          Search Belongings
                        </Button>
                      )}

                      {enemy.status !== 'Restrained' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExecutePostCombatAction(enemy.id, 'Restrain')}
                          leftIcon={<Lock className="w-3.5 h-3.5 text-amber-400" />}
                        >
                          Apply Restraints
                        </Button>
                      )}

                      {enemy.canBeInterrogated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExecutePostCombatAction(enemy.id, 'Interrogate')}
                          leftIcon={<FileSearch className="w-3.5 h-3.5 text-purple-400" />}
                        >
                          Interrogate
                        </Button>
                      )}

                      {enemy.canBeCaptured && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExecutePostCombatAction(enemy.id, 'Capture')}
                          leftIcon={<Shield className="w-3.5 h-3.5 text-emerald-400" />}
                        >
                          Capture for Safehouse
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExecutePostCombatAction(enemy.id, 'Release')}
                        leftIcon={<Unlock className="w-3.5 h-3.5 text-zinc-400" />}
                      >
                        Release
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExecutePostCombatAction(enemy.id, 'FinishOff')}
                        leftIcon={<Skull className="w-3.5 h-3.5 text-rose-400" />}
                      >
                        Terminate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Proceed Button */}
          <div className="flex justify-end pt-3 border-t border-zinc-800">
            <Button
              variant="primary"
              size="md"
              onClick={onDismiss}
              leftIcon={<ArrowRight className="w-4 h-4" />}
            >
              PROCEED // CONCLUDE ENCOUNTER
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
};
