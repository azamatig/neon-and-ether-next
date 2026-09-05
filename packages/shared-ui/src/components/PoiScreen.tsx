import React, { useState } from 'react';
import type { CharacterDefinition, GameMap, PoiActionType } from '@neon-ether/game-schema';
import type { ResolvedEnvironment, ResolvedPOI } from '@neon-ether/game-runtime';
import { ArrowLeft, Check, ImageOff, Lock, MessageSquare, Sparkles, Terminal, Zap } from 'lucide-react';
import { Badge } from './Badge.tsx';
import { Button } from './Button.tsx';
import { EnvironmentalLayer } from './EnvironmentalLayer.tsx';

export interface PoiScreenProps {
  poi: ResolvedPOI;
  map: GameMap;
  stationedNpcs: CharacterDefinition[];
  onReturnToMap: () => void;
  onExecuteAction: (actionId: string) => void;
  onTalkNpc: (npcId: string, dialogueTreeId?: string) => void;
  playerVitals?: { actionPointsCurrent: number; actionPointsMax: number; currentEther: number; maxEther: number; currentHp: number; maxHp: number; credits: number };
  environment?: ResolvedEnvironment;
}

const actionIcon = (type: PoiActionType) => type === 'Terminal'
  ? <Terminal aria-hidden="true" />
  : type === 'Talk' ? <MessageSquare aria-hidden="true" />
    : type === 'Event' || type === 'Quest' ? <Sparkles aria-hidden="true" />
      : <Zap aria-hidden="true" />;

const actionCheckLabel = (check: ResolvedPOI['resolvedActions'][number]['check']) => {
  if (!check) return null;
  const attribute = String(check.attribute).replace(/([a-z])([A-Z])/g, '$1 $2');
  return `${attribute} · ${check.targetDc ?? check.difficulty}`;
};

const formatCost = (cost: ResolvedPOI['resolvedActions'][number]['cost']) => {
  if (!cost) return [];
  return [cost.ap !== undefined ? `${cost.ap} AP` : null, cost.ether !== undefined ? `${cost.ether} Ether` : null, cost.credits !== undefined ? `${cost.credits} credits` : null].filter(Boolean) as string[];
};

export const PoiScreen: React.FC<PoiScreenProps> = ({ poi, map, stationedNpcs, onReturnToMap, onExecuteAction, onTalkNpc, environment }) => {
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const artwork = poi.image;
  const visibleActions = poi.resolvedActions.filter((action) => action.isVisible);

  const execute = (actionId: string) => {
    setBusyActionId(actionId);
    onExecuteAction(actionId);
    window.setTimeout(() => setBusyActionId(null), 300);
  };

  return (
    <section className="ne-poi-screen" aria-labelledby="poi-screen-title">
      <header className="ne-poi-header">
        <div><CircleIcon /><span>Detailed local scanner</span></div>
        <h2 id="poi-screen-title">{poi.name}</h2>
        <small>{map.name}</small>
      </header>

      <div className="ne-poi-layout">
        <figure className="ne-poi-artwork">
          {artwork && !imageFailed ? (
            <img src={artwork} alt={`${poi.name} location`} onError={() => setImageFailed(true)} />
          ) : (
            <div className="ne-artwork-placeholder"><ImageOff aria-hidden="true" /><span>Locality image unavailable</span></div>
          )}
          <figcaption><span>Node scan complete</span><strong>{poi.name}</strong></figcaption>
        </figure>

        <div className="ne-poi-content">
          <section className="ne-poi-description">
            <div className="ne-poi-kicker"><span>Local descriptor console</span><Badge variant={poi.runtime.isVisited ? 'emerald' : 'cyan'} size="xs">{poi.runtime.isVisited ? 'Visited' : 'Unvisited'}</Badge></div>
            <p>{poi.description}</p>
          </section>

          <section className="ne-poi-actions" aria-labelledby="available-actions-title">
            <h3 id="available-actions-title"><CircleIcon /> Available actions</h3>
            <div className="ne-poi-actions__grid">
              {visibleActions.map((action) => {
                const unavailableReason = action.isCompleted && !action.isRepeatable
                  ? 'Already completed'
                  : action.unmetConditionReason ?? (!action.isAvailable ? 'Requirements not met' : undefined);
                const check = actionCheckLabel(action.check);
                const costs = formatCost(action.cost);
                return (
                  <button
                    type="button"
                    key={action.id}
                    className="ne-poi-action"
                    data-type={action.actionType}
                    disabled={!action.isAvailable || busyActionId === action.id}
                    title={unavailableReason}
                    onClick={() => execute(action.id)}
                  >
                    <span className="ne-poi-action__icon">{action.isAvailable ? actionIcon(action.actionType) : <Lock aria-hidden="true" />}</span>
                    <span className="ne-poi-action__copy">
                      <span className="ne-poi-action__title">{action.actionType === 'Event' && <em>Story event</em>}<strong>{action.label}</strong>{action.isCompleted && <Check aria-label="Completed" />}</span>
                      {action.description && <small>{action.description}</small>}
                      <span className="ne-poi-action__meta">{check && <b>{check}</b>}{costs.map(cost => <i key={cost}>{cost}</i>)}{unavailableReason && <i className="is-unmet">{unavailableReason}</i>}</span>
                    </span>
                  </button>
                );
              })}
              {stationedNpcs.filter((npc) => npc.dialogueTreeId).map((npc) => (
                <button type="button" key={npc.id} className="ne-poi-action" onClick={() => onTalkNpc(npc.id, npc.dialogueTreeId)}>
                  <span className="ne-poi-action__icon"><MessageSquare aria-hidden="true" /></span>
                  <span className="ne-poi-action__copy"><span className="ne-poi-action__title"><em>Contact</em><strong>Talk to {npc.name}</strong></span>{npc.title && <small>{npc.title}</small>}</span>
                </button>
              ))}
              {visibleActions.length === 0 && stationedNpcs.every((npc) => !npc.dialogueTreeId) && <p className="ne-poi-actions__empty">No available actions at this location.</p>}
            </div>
          </section>

          <footer className="ne-poi-footer"><Button variant="secondary" size="sm" onClick={onReturnToMap} leftIcon={<ArrowLeft aria-hidden="true" />}>Return to map</Button></footer>
        </div>
        <EnvironmentalLayer visuals={environment?.definition.visuals} intensity={poi.environmentalExposure === 'indoor' ? 0 : poi.environmentalExposure === 'sheltered' ? .35 : poi.weatherVisualScale ?? 1} label={environment?.definition.name} />
      </div>
    </section>
  );
};

const CircleIcon = () => <span className="ne-circle-icon" aria-hidden="true" />;
