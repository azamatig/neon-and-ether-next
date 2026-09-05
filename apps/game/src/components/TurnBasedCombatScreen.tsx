import React, { useEffect, useMemo, useState } from 'react';
import { Ability, CombatAction, Combatant, CombatState } from '@neon-ether/game-schema';
import { type ResolvedCombatCommands } from '@neon-ether/game-runtime';
import { Activity, Crosshair, Footprints, Shield, SkipForward, Swords, Zap } from 'lucide-react';

export interface TurnBasedCombatScreenProps {
  state: CombatState;
  commands: ResolvedCombatCommands;
  abilities: Ability[];
  onCommand: (command: CombatAction) => void;
}

type SelectedCommand = { type: 'Attack' } | { type: 'Ability'; abilityId: string } | { type: 'Move' };

/** Pure tactical presentation: legal cells and targets are resolved by the combat runtime. */
export const TurnBasedCombatScreen: React.FC<TurnBasedCombatScreenProps> = ({ state, commands, abilities, onCommand }) => {
  const [selected, setSelected] = useState<SelectedCommand>({ type: 'Attack' });
  const activeId = state.activeCombatantId ?? state.turnOrder[state.activeTurnIndex];
  const actor = state.combatants[activeId];
  const abilityMap = useMemo(() => new Map(abilities.map((ability) => [ability.id, ability])), [abilities]);
  const moveKeys = useMemo(() => new Set(commands.legalMoves.map((cell) => `${cell.x}:${cell.y}`)), [commands.legalMoves]);
  const targetIds = selected.type === 'Attack' ? commands.attackTargetIds : selected.type === 'Ability' ? commands.abilityTargetIds[selected.abilityId] ?? [] : [];
  const targetSet = useMemo(() => new Set(targetIds), [targetIds]);
  const occupants = useMemo(() => new Map((Object.values(state.combatants) as Combatant[]).map((unit) => [`${unit.position.x}:${unit.position.y}`, unit])), [state.combatants]);
  const tiles = useMemo(() => new Map(state.grid.tiles.map((tile) => [`${tile.x}:${tile.y}`, tile])), [state.grid.tiles]);
  const blockingCells = useMemo(() => new Set(state.grid.blockingCells.map((cell) => `${cell.x}:${cell.y}`)), [state.grid.blockingCells]);
  useEffect(() => { setSelected({ type: 'Attack' }); }, [activeId]);

  const selectCell = (x: number, y: number) => {
    if (!actor || actor.team !== 'Player') return;
    const occupant = occupants.get(`${x}:${y}`);
    if (selected.type === 'Move' && moveKeys.has(`${x}:${y}`)) onCommand({ type: 'Move', actorId: actor.id, position: { x, y } });
    if (occupant && targetSet.has(occupant.id)) {
      onCommand(selected.type === 'Attack'
        ? { type: 'Attack', actorId: actor.id, targetId: occupant.id }
        : { type: 'Ability', actorId: actor.id, targetId: occupant.id, abilityId: selected.abilityId });
    }
  };

  return <section className="combat-grid-screen">
    <header className="combat-grid-header">
      <div><p>COMBAT GRID</p><h2>{state.encounterId?.replaceAll('_', ' ')}</h2></div>
      <span>ROUND {state.roundNumber} · TURN {state.activeTurnIndex + 1}/{state.turnOrder.length}</span>
    </header>
    <div className="combat-turn-order"><strong>TURN ORDER</strong>{state.turnOrder.map((id) => { const unit=state.combatants[id]; return <span key={id} className={`${id===activeId?'is-active':''} ${unit?.team==='Enemy'?'is-enemy':''}`}>{unit?.name}{unit?.isDefeated?' · DOWN':''}</span>; })}</div>
    <div className="combat-grid-layout">
      <div className="combat-board" style={{ gridTemplateColumns: `repeat(${state.grid.width}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.grid.height}, minmax(58px, 1fr))` }}>
        {Array.from({ length: state.grid.width * state.grid.height }, (_, index) => {
          const x=index%state.grid.width; const y=Math.floor(index/state.grid.width); const key=`${x}:${y}`; const unit=occupants.get(key); const tile=tiles.get(key);
          const legalMove=selected.type==='Move'&&moveKeys.has(key); const legalTarget=Boolean(unit&&targetSet.has(unit.id));
          return <button key={key} type="button" className={`combat-cell tile-${tile?.type?.toLowerCase()??'floor'} ${blockingCells.has(key)?'is-blocking':''} ${legalMove?'is-move':''} ${legalTarget?'is-target':''} ${unit?.team==='Player'?'has-player':''} ${unit?.team==='Enemy'?'has-enemy':''}`} onClick={()=>selectCell(x,y)} disabled={!legalMove&&!legalTarget} aria-label={unit ? `${unit.name}, ${unit.currentHp} HP` : `${tile?.description ?? tile?.type ?? 'Floor'}, grid ${x + 1}, ${y + 1}`}>
            <small>{tile?.type==='Console'||tile?.type==='Door'?tile.type.toUpperCase():`${x+1},${y+1}`}</small>{unit&&<div className={`combat-unit ${unit.isDefeated?'is-defeated':''}`}><div className="combat-unit-icon">{unit.team==='Player'?<Shield/>:<Crosshair/>}</div><strong>{unit.name}</strong><span>{unit.currentHp}/{unit.maxHp} HP</span><i style={{width:`${unit.currentHp/unit.maxHp*100}%`}}/></div>}
          </button>;
        })}
      </div>
      <aside className="combat-interface">
        <div className="combat-actor"><span>{actor?.team==='Player'?'ACTIVE OPERATIVE':'HOSTILE TURN'}</span><strong>{actor?.name??'Resolving'}</strong><div><Activity/> AP {actor?.currentAp??0} <Footprints/> MOV {actor?.movementRemaining??0}/{actor?.movementRange??0} <Zap/> ETH {actor?.currentEther??0} <Shield/> ARM {actor?.armor??0}</div></div>
        <div className="combat-commands"><h3>TACTICAL INTERFACE</h3>
          <button className={selected.type==='Attack'?'is-selected':''} disabled={!commands.attackTargetIds.length} onClick={()=>setSelected({type:'Attack'})}><Swords/> WEAPON ATTACK</button>
          <button className={selected.type==='Move'?'is-selected':''} disabled={!commands.legalMoves.length} onClick={()=>setSelected({type:'Move'})}><Footprints/> MOVE <small>{state.grid.movementApCost} AP</small></button>
          {actor?.abilityIds.map((id)=>{const ability=abilityMap.get(id);if(!ability)return null;return <button key={id} className={selected.type==='Ability'&&selected.abilityId===id?'is-selected':''} disabled={!commands.abilityTargetIds[id]?.length} onClick={()=>setSelected({type:'Ability',abilityId:id})}><Zap/> {ability.name}<small>{ability.apCost} AP · {ability.etherCost} ETH</small></button>})}
          <button disabled={actor?.team!=='Player'||!state.isActive} onClick={()=>actor&&onCommand({type:'EndTurn',actorId:actor.id})}><SkipForward/> END TURN</button>
        </div>
        <div className="combat-status"><strong>{selected.type==='Move'?'SELECT A HIGHLIGHTED CELL':'SELECT A HIGHLIGHTED TARGET'}</strong><span>{targetIds.length || commands.legalMoves.length} valid options</span></div>
        <div className="combat-log"><h3>COMBAT LOG</h3>{state.log.slice(-6).reverse().map((entry)=><p key={entry.id}><span>R{entry.round}</span> {entry.message}</p>)}</div>
      </aside>
    </div>
  </section>;
};
