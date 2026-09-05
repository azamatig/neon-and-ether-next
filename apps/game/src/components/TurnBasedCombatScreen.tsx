import React, { useEffect, useMemo, useState } from 'react';
import { Ability, CombatAction, Combatant, CombatState, Item } from '@neon-ether/game-schema';
import { type ResolvedCombatAction, type ResolvedCombatCommands } from '@neon-ether/game-runtime';
import { Activity, Crosshair, Footprints, Shield, SkipForward, Swords, Zap } from 'lucide-react';

export interface TurnBasedCombatScreenProps {
  state: CombatState;
  commands: ResolvedCombatCommands;
  abilities: Ability[];
  items: Item[];
  onCommand: (command: CombatAction) => void;
  onAttemptFlee: () => void;
}

type ActionCategory = 'Attacks' | 'Skills' | 'Support';

const dispositionLabel = (unit: Combatant): string | undefined => {
  if (unit.resolutionState === 'Destroyed') return 'DESTROYED';
  if (unit.resolutionState === 'Surrendered') return 'SURRENDERED';
  if (unit.resolutionState === 'Escaped') return 'ESCAPED';
  if (unit.resolutionState === 'Incapacitated' || unit.isIncapacitated) return 'INCAPACITATED';
  if (unit.resolutionState === 'Dead' || unit.isDefeated) return 'DEAD';
};

const actionIcon = (action: ResolvedCombatAction) => {
  if (action.type === 'Move' || action.type === 'AttemptFlee') return <Footprints />;
  if (action.type === 'EndTurn') return <SkipForward />;
  if (action.type === 'Ability') return <Zap />;
  return <Swords />;
};

/** Pure tactical presentation: legal cells, targets, actions, and costs are resolved by the combat runtime. */
export const TurnBasedCombatScreen: React.FC<TurnBasedCombatScreenProps> = ({ state, commands, abilities, items, onCommand, onAttemptFlee }) => {
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
    if (!occupant || !targetSet.has(occupant.id)) return;
    if (selectedAction?.type === 'WeaponAttack' && selectedAction.weaponId) onCommand({ type: 'RangedAttack', weaponId: selectedAction.weaponId, actorId: actor.id, targetId: occupant.id });
    if (selectedAction?.type === 'MeleeAttack') onCommand({ type: 'MeleeAttack', weaponId: selectedAction.weaponId, actorId: actor.id, targetId: occupant.id });
    if (selectedAction?.type === 'Ability' && selectedAction.abilityId) onCommand({ type: 'Ability', actorId: actor.id, targetId: occupant.id, abilityId: selectedAction.abilityId });
  };

  return <section className="combat-grid-screen">
    <header className="combat-grid-header">
      <div><p>TACTICAL COMBAT</p><h2>{state.encounterId?.replaceAll('_', ' ')}</h2></div>
      <span>ROUND {state.roundNumber} · TURN {state.activeTurnIndex + 1}/{state.turnOrder.length}</span>
    </header>

    <div className="combat-turn-order" aria-label="Combat turn order">
      <strong><Activity /> TURN ORDER</strong>
      {state.turnOrder.map((id, index) => {
        const unit = state.combatants[id];
        if (!unit) return null;
        const disposition = dispositionLabel(unit);
        return <div key={id} className={`combat-turn-chip ${id === activeId ? 'is-active' : ''} ${unit.team === 'Enemy' ? 'is-enemy' : 'is-player'} ${disposition ? 'is-defeated' : ''}`}>
          <span>{index + 1}</span>
          <div className="combat-turn-portrait">{unit.bodyImage ? <img src={unit.bodyImage} alt="" /> : unit.team === 'Player' ? <Shield /> : <Crosshair />}</div>
          <b>{unit.name}</b>
          {disposition && <em>{disposition}</em>}
        </div>;
      })}
    </div>

    <div className="combat-grid-layout">
      <main className="combat-board-wrap">
        <div className="combat-board-label"><span>TACTICAL GRID · {state.grid.width}×{state.grid.height}</span><span>{actor ? `ACTIVE: ${actor.name}` : 'CONFLICT RESOLVED'}</span></div>
        <div className="combat-board" style={{ gridTemplateColumns: `repeat(${state.grid.width}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.grid.height}, minmax(72px, 1fr))` }}>
          {Array.from({ length: state.grid.width * state.grid.height }, (_, index) => {
            const x = index % state.grid.width;
            const y = Math.floor(index / state.grid.width);
            const key = `${x}:${y}`;
            const unit = occupants.get(key);
            const tile = tiles.get(key);
            const legalMove = selectedAction?.type === 'Move' && moveKeys.has(key);
            const legalTarget = Boolean(unit && targetSet.has(unit.id));
            const rejection = unit ? selectedAction?.targetRejections?.[unit.id] : undefined;
            const disposition = unit ? dispositionLabel(unit) : undefined;
            return <button key={key} type="button" className={`combat-cell tile-${tile?.type?.toLowerCase() ?? 'floor'} ${blockingCells.has(key) ? 'is-blocking' : ''} ${legalMove ? 'is-move' : ''} ${legalTarget ? 'is-target' : ''} ${rejection ? 'is-invalid-target' : ''} ${unit?.team === 'Player' ? 'has-player' : ''} ${unit?.team === 'Enemy' ? 'has-enemy' : ''}`} onClick={() => selectCell(x, y)} disabled={!legalMove && !legalTarget} title={rejection} aria-label={unit ? `${unit.name}, ${unit.currentHp} HP${rejection ? `, ${rejection}` : ''}` : `${tile?.description ?? tile?.type ?? 'Floor'}, grid ${x + 1}, ${y + 1}`}>
              <small>{tile?.type === 'Console' || tile?.type === 'Door' ? tile.type.toUpperCase() : `${x + 1},${y + 1}`}</small>
              {unit && <article className={`combat-unit ${unit.isDefeated ? 'is-defeated' : ''} ${unit.isIncapacitated ? 'is-incapacitated' : ''}`} title={`${unit.name} · ${unit.abilityIds.map((id) => abilityMap.get(id)?.name ?? id).join(', ')}`}>
                <div className="combat-unit-image">{unit.bodyImage ? <img src={unit.bodyImage} alt="" /> : unit.team === 'Player' ? <Shield /> : <Crosshair />}</div>
                <div className="combat-unit-copy">
                  <span className="combat-unit-team">{unit.team === 'Player' ? 'SQUAD' : 'HOSTILE'}{unit.id === activeId ? ' · ACTIVE' : ''}</span>
                  <strong>{unit.name}</strong>
                  <span className="combat-unit-vitals">HP {unit.currentHp}/{unit.maxHp}</span>
                  <div className="combat-hp-track"><i style={{ width: `${unit.currentHp / unit.maxHp * 100}%` }} /></div>
                </div>
                {(disposition || unit.statuses.length > 0 || rejection) && <div className="combat-unit-statuses">
                  {disposition && <em>{disposition}</em>}
                  {!disposition && unit.statuses.slice(0, 1).map((status) => <em key={status.statusEffectId}>{status.statusEffectId.replace(/^status_/, '').replaceAll('_', ' ').toUpperCase()}</em>)}
                  {rejection && <em className="combat-target-rejection">{rejection}</em>}
                </div>}
              </article>}
            </button>;
          })}
        </div>
      </main>

      <aside className="combat-interface">
        <div className="combat-commands">
          <div className="combat-interface-heading"><div><p>TACTICAL INTERFACE</p><h3>COMMANDS</h3></div><span>{actor?.team === 'Player' ? 'READY' : 'WAIT'}</span></div>
          <nav>{(['Attacks', 'Skills', 'Support'] as ActionCategory[]).map((value) => <button key={value} aria-pressed={category === value} className={category === value ? 'is-selected' : ''} onClick={() => setCategory(value)}>{value.toUpperCase()}</button>)}</nav>
          <div className="combat-action-list">{commands.actions.filter((action) => action.category === category).map((action) => <button key={action.id} className={selectedActionId === action.id ? 'is-selected' : ''} disabled={actor?.team !== 'Player' || !state.isActive || Boolean(action.disabledReason)} title={action.disabledReason} onClick={() => {
            if (action.type === 'EndTurn') { if (actor) onCommand({ type: 'EndTurn', actorId: actor.id }); return; }
            if (action.type === 'AttemptFlee') { onAttemptFlee(); return; }
            setSelectedActionId(action.id);
          }}>{actionIcon(action)}<span>{action.label}<small>{action.disabledReason ?? `${action.apCost} AP${action.etherCost ? ` · ${action.etherCost} ETH` : ''}`}</small></span></button>)}</div>
        </div>

        <div className="combat-status"><strong>{selectedAction?.type === 'Move' ? 'SELECT A HIGHLIGHTED CELL' : 'SELECT A HIGHLIGHTED TARGET'}</strong><span>{selectedAction?.type === 'Move' ? commands.legalMoves.length : targetIds.length} VALID</span></div>

        <section className={`combat-actor ${actor?.team === 'Enemy' ? 'is-enemy' : ''}`}>
          <div className="combat-actor-portrait">{actor?.bodyImage ? <img src={actor.bodyImage} alt="" /> : actor?.team === 'Enemy' ? <Crosshair /> : <Shield />}</div>
          <div><span>{actor?.team === 'Player' ? 'CURRENT OPERATIVE' : 'HOSTILE ACTING'}</span><strong>{actor?.name ?? 'Resolving'}</strong><small>{actor?.weaponId ? itemMap.get(actor.weaponId)?.name ?? 'Equipped weapon' : 'Unarmed'}</small></div>
          <dl><div><dt>HP</dt><dd>{actor?.currentHp ?? 0}/{actor?.maxHp ?? 0}</dd></div><div><dt>AP</dt><dd>{actor?.currentAp ?? 0}</dd></div><div><dt>MOV</dt><dd>{actor?.movementRemaining ?? 0}</dd></div><div><dt>ETH</dt><dd>{actor?.currentEther ?? 0}</dd></div></dl>
        </section>

        <div className="combat-log"><h3>COMBAT LOG</h3>{state.log.slice(-5).reverse().map((entry) => <p key={entry.id}><span>R{entry.round}</span> {entry.message}</p>)}</div>
      </aside>
    </div>
  </section>;
};
