/**
 * @apps/game
 * Tactical Combat & Vitals HUD.
 */

import React from 'react';
import { CharacterDefinition } from '@neon-ether/game-schema';
import { Badge, Button, Panel, StatBar } from '@neon-ether/shared-ui';
import { Activity, Cpu, Crosshair, Shield, Zap } from 'lucide-react';
import { calculateAttributeModifier } from '@neon-ether/game-runtime';

export interface TacticalHUDProps {
  player: CharacterDefinition;
  onEndTurn: () => void;
  onQuickEtherCast: () => void;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  player,
  onEndTurn,
  onQuickEtherCast,
}) => {
  const { attributes, vitals } = player;

  const stats = [
    { key: 'Body', val: attributes.body, icon: <Activity className="w-3.5 h-3.5 text-rose-400" /> },
    { key: 'Reflexes', val: attributes.reflexes, icon: <Crosshair className="w-3.5 h-3.5 text-amber-400" /> },
    { key: 'Mind', val: attributes.mind, icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" /> },
    { key: 'EtherTech', val: attributes.etherTech, icon: <Zap className="w-3.5 h-3.5 text-purple-400" /> },
    { key: 'Presence', val: attributes.presence, icon: <Shield className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  return (
    <Panel
      title={`${player.name} // ${player.title}`}
      subtitle={`LVL ${player.level} [${player.faction}]`}
      glow="cyan"
      className="w-full"
      headerRight={<Badge variant="cyan">ACT: EXPLORATION</Badge>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vitals Gauges */}
        <div className="flex flex-col gap-2 bg-black/40 p-3 border border-white/10 rounded-xl">
          <StatBar
            label="Vitality (HP)"
            current={vitals.currentHp}
            max={vitals.maxHp}
            variant="hp"
          />
          <StatBar
            label="Ether Conduit"
            current={vitals.currentEther}
            max={vitals.maxEther}
            variant="ether"
          />
          <StatBar
            label="Action Points (AP)"
            current={vitals.actionPointsCurrent}
            max={vitals.actionPointsMax}
            variant="ap"
          />
        </div>

        {/* Primary Attribute Modifiers */}
        <div className="flex flex-col gap-2 bg-black/40 p-3 border border-white/10 rounded-xl">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-0.5">
            Deterministic Attributes
          </div>
          <div className="grid grid-cols-5 gap-2">
            {stats.map((s) => {
              const mod = calculateAttributeModifier(s.val);
              return (
                <div
                  key={s.key}
                  className="flex flex-col items-center justify-center p-2 bg-white/5 border border-white/10 rounded-lg hover:border-[#00f2ff]/40 transition-colors"
                >
                  <div className="flex items-center gap-0.5 text-[9px] text-slate-400 uppercase font-mono">
                    {s.icon}
                  </div>
                  <span className="font-mono font-bold text-xs text-white mt-0.5">{s.val}</span>
                  <span className="font-mono text-[9px] text-[#00f2ff] font-bold">
                    {mod >= 0 ? `+${mod}` : mod}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tactical Actions Quick Dock */}
        <div className="flex flex-col justify-between bg-black/40 p-3 border border-white/10 rounded-xl gap-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Tactical AP Dock
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ether"
              onClick={onQuickEtherCast}
              leftIcon={<Zap className="w-3.5 h-3.5" />}
              className="flex-1"
            >
              Channel (5 Ether)
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={onEndTurn}
              className="flex-1"
            >
              Reset AP
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
};
