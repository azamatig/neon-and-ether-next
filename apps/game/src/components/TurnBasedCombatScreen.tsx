import React, { useMemo, useState } from 'react';
import { Ability, CombatAction, Combatant, CombatState } from '@neon-ether/game-schema';
import { Activity, Shield, SkipForward, Swords, Zap } from 'lucide-react';

export interface TurnBasedCombatScreenProps {
  state: CombatState;
  abilities: Ability[];
  onCommand: (command: CombatAction) => void;
}

/** Pure combat presentation: renders a snapshot and dispatches typed commands. */
export const TurnBasedCombatScreen: React.FC<TurnBasedCombatScreenProps> = ({ state, abilities, onCommand }) => {
  const [targetId, setTargetId] = useState<string | null>(null);
  const activeId = state.turnOrder[state.activeTurnIndex];
  const actor = state.combatants[activeId];
  const abilityMap = useMemo(() => new Map(abilities.map((ability) => [ability.id, ability])), [abilities]);
  const combatants = Object.values(state.combatants) as Combatant[];
  const enemies = combatants.filter((unit) => unit.team === 'Enemy' && !unit.isDefeated);
  const selectedTarget = targetId && state.combatants[targetId] && !state.combatants[targetId].isDefeated
    ? targetId : enemies[0]?.id;
  const canCommand = actor?.team === 'Player' && state.isActive;

  return (
    <section className="h-full min-h-[520px] rounded-xl border border-rose-500/40 bg-[#050713] p-4 font-mono text-zinc-100 shadow-[0_0_40px_rgba(244,63,94,0.08)]">
      <header className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
        <div><p className="text-[10px] tracking-[0.28em] text-rose-400">TURN-BASED COMBAT MODULE</p><h2 className="font-bold">ROUND {state.roundNumber} // {actor?.name ?? 'RESOLVING'}</h2></div>
        <div className="text-xs text-zinc-400">TURN {state.activeTurnIndex + 1}/{state.turnOrder.length}</div>
      </header>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {combatants.map((unit) => (
            <button key={unit.id} type="button" onClick={() => unit.team === 'Enemy' && setTargetId(unit.id)}
              className={`rounded-xl border p-4 text-left transition ${unit.isDefeated ? 'opacity-35' : ''} ${selectedTarget === unit.id ? 'border-rose-400 bg-rose-950/30' : unit.team === 'Player' ? 'border-cyan-500/40 bg-cyan-950/15' : 'border-zinc-700 bg-zinc-950'}`}>
              <div className="mb-3 flex items-center justify-between"><strong>{unit.name}</strong><span className={unit.team === 'Player' ? 'text-cyan-400' : 'text-rose-400'}>{unit.team.toUpperCase()}</span></div>
              <div className="mb-1 flex justify-between text-xs"><span>HP</span><span>{unit.currentHp}/{unit.maxHp}</span></div>
              <div className="h-2 overflow-hidden rounded bg-zinc-800"><div className="h-full bg-rose-500" style={{ width: `${unit.currentHp / unit.maxHp * 100}%` }} /></div>
              <div className="mt-3 flex gap-4 text-xs text-zinc-400"><span className="flex gap-1"><Activity className="h-3.5 w-3.5"/> AP {unit.currentAp}</span><span className="flex gap-1"><Zap className="h-3.5 w-3.5"/> ETH {unit.currentEther}</span><span className="flex gap-1"><Shield className="h-3.5 w-3.5"/> {unit.armor}</span></div>
              {unit.statuses.length > 0 && <div className="mt-3 flex gap-1">{unit.statuses.map((status) => <span key={`${status.statusEffectId}-${status.remainingTurns}`} className="rounded border border-amber-500/40 px-2 py-1 text-[10px] text-amber-300">{status.statusEffectId} · {status.remainingTurns}</span>)}</div>}
            </button>
          ))}
        </div>
        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-3"><div className="mb-2 text-xs text-cyan-400">AVAILABLE COMMANDS</div>
            <button disabled={!canCommand || !selectedTarget} onClick={() => selectedTarget && onCommand({ type: 'Attack', actorId: activeId, targetId: selectedTarget })} className="mb-2 flex w-full items-center gap-2 rounded border border-zinc-700 p-3 text-left text-xs hover:border-rose-400 disabled:opacity-40"><Swords className="h-4 w-4 text-rose-400"/> Weapon Attack</button>
            {actor?.abilityIds.map((id) => { const ability = abilityMap.get(id); if (!ability) return null; const target = ability.target === 'Self' || ability.target === 'Ally' ? actor.id : selectedTarget; return <button key={id} disabled={!canCommand || !target || actor.currentAp < ability.apCost || actor.currentEther < ability.etherCost} onClick={() => target && onCommand({ type: 'Ability', actorId: activeId, targetId: target, abilityId: id })} className="mb-2 w-full rounded border border-zinc-700 p-3 text-left text-xs hover:border-cyan-400 disabled:opacity-40"><span className="text-cyan-300">{ability.name}</span><span className="mt-1 block text-[10px] text-zinc-500">{ability.apCost} AP · {ability.etherCost} ETH</span></button>; })}
            <button disabled={!canCommand} onClick={() => onCommand({ type: 'EndTurn', actorId: activeId })} className="flex w-full items-center gap-2 rounded border border-zinc-700 p-3 text-left text-xs hover:border-amber-400 disabled:opacity-40"><SkipForward className="h-4 w-4 text-amber-400"/> End Turn</button>
          </div>
          <div className="max-h-64 overflow-auto rounded-xl border border-zinc-800 bg-black/40 p-3"><div className="mb-2 text-xs text-zinc-400">COMBAT LOG</div>{state.log.slice(-8).reverse().map((entry) => <p key={entry.id} className="border-b border-zinc-900 py-2 text-[10px] text-zinc-400"><span className="text-zinc-600">R{entry.round}</span> {entry.message}</p>)}</div>
        </aside>
      </div>
    </section>
  );
};
