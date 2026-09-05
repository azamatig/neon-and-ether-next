import React, { useEffect, useMemo, useState } from 'react';
import { Ability, CombatAction, Combatant, CombatState, Item } from '@neon-ether/game-schema';
import { type ResolvedCombatCommands } from '@neon-ether/game-runtime';
import { Activity, Crosshair, Footprints, Shield, SkipForward, Swords, Zap } from 'lucide-react';

export interface TurnBasedCombatScreenProps {
  state: CombatState;
  commands: ResolvedCombatCommands;
  abilities: Ability[];
  items: Item[];
  onCommand: (command: CombatAction) => void;
}

type ActionCategory = 'Attacks' | 'Skills' | 'Support';

/** Pure tactical presentation: legal cells and targets are resolved by the combat runtime. */
export const TurnBasedCombatScreen: React.FC<TurnBasedCombatScreenProps> = ({ state, commands, abilities, items, onCommand }) => {
  const [category, setCategory] = useState<ActionCategory>('Attacks');
  const [selectedActionId, setSelectedActionId] = useState('attack.weapon');
  const activeId = state.activeCombatantId ?? state.turnOrder[state.activeTurnIndex];
  const actor = state.combatants[activeId];
  const abilityMap = useMemo(() => new Map(abilities.map((ability) => [ability.id, ability])), [abilities]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selectedAction = commands.actions.find((action) => action.id === selectedActionId);
  const moveKeys = useMemo(() => new Set(commands.legalMoves.map((cell) => `${cell.x}:${cell.y}`)), [commands.legalMoves]);
  const targetIds = selectedAction?.targetIds ?? [];
  const targetSet = useMemo(() => new Set(targetIds), [targetIds]);
  const occupants = useMemo(() => new Map((Object.values(state.combatants) as Combatant[]).map((unit) => [`${unit.position.x}:${unit.position.y}`, unit])), [state.combatants]);
  const tiles = useMemo(() => new Map(state.grid.tiles.map((tile) => [`${tile.x}:${tile.y}`, tile])), [state.grid.tiles]);
  const blockingCells = useMemo(() => new Set(state.grid.blockingCells.map((cell) => `${cell.x}:${cell.y}`)), [state.grid.blockingCells]);
  useEffect(() => { setCategory('Attacks'); setSelectedActionId('attack.weapon'); }, [activeId]);

  const selectCell = (x: number, y: number) => {
    if (!actor || actor.team !== 'Player') return;
    const occupant = occupants.get(`${x}:${y}`);
    if (selectedAction?.type === 'Move' && moveKeys.has(`${x}:${y}`)) onCommand({ type: 'Move', actorId: actor.id, position: { x, y } });
    if (occupant && targetSet.has(occupant.id)) {
      if (selectedAction?.type === 'WeaponAttack' && selectedAction.weaponId) onCommand({ type: 'RangedAttack', weaponId: selectedAction.weaponId, actorId: actor.id, targetId: occupant.id });
      if (selectedAction?.type === 'MeleeAttack') onCommand({ type: 'MeleeAttack', weaponId: selectedAction.weaponId, actorId: actor.id, targetId: occupant.id });
      if (selectedAction?.type === 'Ability' && selectedAction.abilityId) onCommand({ type: 'Ability', actorId: actor.id, targetId: occupant.id, abilityId: selectedAction.abilityId });
    }
  };

  return <section className="combat-grid-screen">
    <header className="combat-grid-header">
      <div><p>COMBAT GRID</p><h2>{state.encounterId?.replaceAll('_', ' ')}</h2></div>
      <span>ROUND {state.roundNumber} · TURN {state.activeTurnIndex + 1}/{state.turnOrder.length}</span>
    </header>
    <div className="combat-turn-order"><strong>TURN ORDER</strong>{state.turnOrder.map((id) => { const unit=state.combatants[id]; return <span key={id} className={`${id===activeId?'is-active':''} ${unit?.team==='Enemy'?'is-enemy':''} ${unit?.isDefeated?'is-defeated':''} ${unit?.isIncapacitated?'is-incapacitated':''}`}>{unit?.name}{unit?.defeatType==='NonLethal'?' · INCAPACITATED':unit?.isDefeated?' · DEAD':unit?.isIncapacitated?' · INCAPACITATED':''}</span>; })}</div>
    <div className="combat-grid-layout">
      <div className="combat-board" style={{ gridTemplateColumns: `repeat(${state.grid.width}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.grid.height}, minmax(58px, 1fr))` }}>
        {Array.from({ length: state.grid.width * state.grid.height }, (_, index) => {
          const x=index%state.grid.width; const y=Math.floor(index/state.grid.width); const key=`${x}:${y}`; const unit=occupants.get(key); const tile=tiles.get(key);
          const legalMove=selectedAction?.type==='Move'&&moveKeys.has(key); const legalTarget=Boolean(unit&&targetSet.has(unit.id)); const rejection=unit?selectedAction?.targetRejections?.[unit.id]:undefined;
          return <button key={key} type="button" className={`combat-cell tile-${tile?.type?.toLowerCase()??'floor'} ${blockingCells.has(key)?'is-blocking':''} ${legalMove?'is-move':''} ${legalTarget?'is-target':''} ${rejection?'is-invalid-target':''} ${unit?.team==='Player'?'has-player':''} ${unit?.team==='Enemy'?'has-enemy':''}`} onClick={()=>selectCell(x,y)} disabled={!legalMove&&!legalTarget} title={rejection} aria-label={unit ? `${unit.name}, ${unit.currentHp} HP${rejection?`, ${rejection}`:''}` : `${tile?.description ?? tile?.type ?? 'Floor'}, grid ${x + 1}, ${y + 1}`}>
            <small>{tile?.type==='Console'||tile?.type==='Door'?tile.type.toUpperCase():`${x+1},${y+1}`}</small>{unit&&<div className={`combat-unit ${unit.isDefeated?'is-defeated':''} ${unit.isIncapacitated?'is-incapacitated':''}`} title={`${unit.name} · ${unit.abilityIds.map((id)=>abilityMap.get(id)?.name??id).join(', ')}`}>
              <div className="combat-unit-icon">{unit.bodyImage?<img src={unit.bodyImage} alt=""/>:unit.team==='Player'?<Shield/>:<Crosshair/>}</div><strong>{unit.name}</strong>
              <span>{unit.currentHp}/{unit.maxHp} HP · {unit.currentAp} AP · {unit.currentEther} ETH</span>
              <span>{unit.weaponId?itemMap.get(unit.weaponId)?.name??'Equipped weapon':'Unarmed'}{unit.armorItemIds.length?` · ARMOR ${unit.armorItemIds.length}`:''}</span>
              {unit.statuses.length>0&&<em>{unit.statuses.map((status)=>`${status.statusEffectId} ${status.remainingTurns}`).join(' · ')}</em>}
              {rejection&&<em className="combat-target-rejection">{rejection}</em>}
              <i style={{width:`${unit.currentHp/unit.maxHp*100}%`}}/>
            </div>}
          </button>;
        })}
      </div>
      <aside className="combat-interface">
        <div className="combat-actor"><span>{actor?.team==='Player'?'ACTIVE OPERATIVE':'HOSTILE TURN'}</span><strong>{actor?.name??'Resolving'}</strong><div><Activity/> AP {actor?.currentAp??0} <Footprints/> MOV {actor?.movementRemaining??0}/{actor?.movementRange??0} <Zap/> ETH {actor?.currentEther??0} <Shield/> ARM {actor?.armor??0}</div></div>
        <div className="combat-commands"><h3>TACTICAL INTERFACE</h3>
          <nav>{(['Attacks','Skills','Support'] as ActionCategory[]).map((value)=><button key={value} className={category===value?'is-selected':''} onClick={()=>setCategory(value)}>{value.toUpperCase()}</button>)}</nav>
          {commands.actions.filter((action)=>action.category===category).map((action)=><button key={action.id} className={selectedActionId===action.id?'is-selected':''} disabled={actor?.team!=='Player'||!state.isActive||Boolean(action.disabledReason)} title={action.disabledReason} onClick={()=>{
            if(action.type==='EndTurn'){if(actor)onCommand({type:'EndTurn',actorId:actor.id});return} setSelectedActionId(action.id);
          }}>{action.type==='Move'?<Footprints/>:action.type==='EndTurn'?<SkipForward/>:action.type==='Ability'?<Zap/>:<Swords/>}{action.label}<small>{action.apCost} AP{action.etherCost?` · ${action.etherCost} ETH`:''}</small></button>)}
        </div>
        <div className="combat-status"><strong>{selectedAction?.type==='Move'?'SELECT A HIGHLIGHTED CELL':'SELECT A HIGHLIGHTED TARGET'}</strong><span>{selectedAction?.type==='Move'?commands.legalMoves.length:targetIds.length} valid options</span></div>
        <div className="combat-log"><h3>COMBAT LOG</h3>{state.log.slice(-6).reverse().map((entry)=><p key={entry.id}><span>R{entry.round}</span> {entry.message}</p>)}</div>
      </aside>
    </div>
  </section>;
};
