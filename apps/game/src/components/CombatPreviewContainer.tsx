/**
 * @apps/game
 * Pre-Combat Encounter Preview Screen.
 * Renders detected hostiles, party battle-readiness, environmental hazards, and retreat/engage actions.
 */

import React from 'react';
import { ResolvedCombatPreview } from '@neon-ether/game-runtime';
import { Badge, Button, Panel, StatBar } from '@neon-ether/shared-ui';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Flame,
  Radio,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  User,
  Users,
  Zap,
} from 'lucide-react';

export interface CombatPreviewContainerProps {
  preview: ResolvedCombatPreview;
  onEngage: () => void;
  onEscape: () => void;
}

export const CombatPreviewContainer: React.FC<CombatPreviewContainerProps> = ({
  preview,
  onEngage,
  onEscape,
}) => {
  const { encounter, party, enemies, environment, threatLevel, escape } = preview;

  return (
    <div className="w-full h-full flex flex-col gap-4 font-mono select-none">
      <Panel
        title={`TACTICAL RECON // ${encounter.name.toUpperCase()}`}
        subtitle={`THREAT LEVEL ${threatLevel} • COMBAT ENGAGEMENT DETECTED`}
        glow="rose"
        className="flex-1 flex flex-col"
        headerRight={
          <div className="flex items-center gap-2">
            <Badge variant="rose" size="xs">
              HOSTILE ENCOUNTER
            </Badge>
            <Badge variant="purple" size="xs">
              ETHER: {environment.ambientEtherLevel}%
            </Badge>
          </div>
        }
      >
        <div className="flex-1 flex flex-col justify-between gap-4">
          {/* Top Environment & Tactical Briefing */}
          <div className="p-3.5 bg-black/60 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300 font-sans">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{encounter.description}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">Lighting: <strong className="text-white">{environment.lighting}</strong></span>
              {environment.hazardDescription && (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{environment.hazardDescription}</span>
                </span>
              )}
            </div>
          </div>

          {/* Grid of Opposing Forces: Player Squad vs Enemy Units */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* Player Squad Side */}
            <div className="p-3.5 bg-zinc-950/80 border border-cyan-500/30 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>TACTICAL SQUAD // READY UNITS ({party.length})</span>
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {party.map((unit) => (
                  <div
                    key={unit.id}
                    className="p-3 bg-black/50 border border-zinc-800 rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded text-cyan-300">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{unit.name}</div>
                          <div className="text-[10px] text-zinc-400">{unit.title}</div>
                        </div>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="text-cyan-400 font-bold">{unit.actionPoints} AP</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <div className="flex justify-between text-zinc-400 mb-0.5">
                          <span>HP</span>
                          <span className="text-emerald-400 font-bold">{unit.currentHp}/{unit.maxHp}</span>
                        </div>
                        <StatBar current={unit.currentHp} max={unit.maxHp} variant="hp" size="sm" />
                      </div>
                      <div>
                        <div className="flex justify-between text-zinc-400 mb-0.5">
                          <span>ETHER</span>
                          <span className="text-purple-400 font-bold">{unit.currentEther}/{unit.maxEther}</span>
                        </div>
                        <StatBar current={unit.currentEther} max={unit.maxEther} variant="ether" size="sm" />
                      </div>
                    </div>

                    {unit.injuries.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {unit.injuries.map((inj) => (
                          <span key={inj} className="px-1.5 py-0.5 bg-rose-950/50 text-rose-300 border border-rose-500/30 text-[9px] rounded">
                            {inj}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Hostile Forces Side */}
            <div className="p-3.5 bg-zinc-950/80 border border-rose-500/30 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <Swords className="w-4 h-4" />
                  <span>DETECTED HOSTILES // THREATS ({enemies.reduce((acc, e) => acc + e.count, 0)})</span>
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {enemies.map((enemy) => (
                  <div
                    key={enemy.id}
                    className="p-3 bg-black/50 border border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-400">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{enemy.name}</span>
                          {enemy.count > 1 && (
                            <Badge variant="zinc" size="xs">
                              ×{enemy.count}
                            </Badge>
                          )}
                          {enemy.isBoss && (
                            <Badge variant="rose" size="xs">
                              BOSS
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-sans">
                          Threat: {enemy.threatTier} • Est. HP: ~{enemy.estimatedHp}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={enemy.threatTier === 'Boss' ? 'rose' : enemy.threatTier === 'Elite' ? 'amber' : 'zinc'}
                      size="xs"
                    >
                      {enemy.threatTier}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Tactical Engagement Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            {/* Escape / Retreat Option */}
            <div>
              <Button
                variant="outline"
                size="md"
                disabled={!escape.allowed}
                onClick={onEscape}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                {escape.allowed ? (
                  <span>
                    DISENGAGE / RETREAT
                    {escape.checkInfo && ` [${escape.checkInfo.stat} DC ${escape.checkInfo.difficulty}]`}
                  </span>
                ) : (
                  <span>{escape.disabledReason ?? 'ESCAPE BLOCKED'}</span>
                )}
              </Button>
            </div>

            {/* Engage Battle Button */}
            <div>
              <Button
                variant="primary"
                size="md"
                onClick={onEngage}
                leftIcon={<Swords className="w-4 h-4 text-rose-400" />}
              >
                ENGAGE COMBAT PROTOCOL
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};
