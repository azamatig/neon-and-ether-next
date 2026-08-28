/**
 * @neon-ether/shared-ui
 * POI Screen (Location Descriptor & Interactive Actions Console).
 * Renders rich local environment details, stationed NPCs, data-driven actions, and fast return-to-map flow.
 */

import React, { useState } from 'react';
import { CharacterDefinition, GameMap } from '@neon-ether/game-schema';
import { ResolvedPOI } from '@neon-ether/game-runtime';
import { Badge } from './Badge.tsx';
import { Button } from './Button.tsx';
import { Panel } from './Panel.tsx';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bed,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Cpu,
  Eye,
  Home,
  Lock,
  MapPin,
  MessageSquare,
  Radio,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  Terminal,
  User,
  Wrench,
  Zap,
} from 'lucide-react';

export interface PoiScreenProps {
  poi: ResolvedPOI;
  map: GameMap;
  stationedNpcs: CharacterDefinition[];
  onReturnToMap: () => void;
  onExecuteAction: (actionId: string) => void;
  onTalkNpc: (npcId: string, dialogueTreeId?: string) => void;
  playerVitals?: {
    actionPointsCurrent: number;
    actionPointsMax: number;
    currentEther: number;
    maxEther: number;
    currentHp: number;
    maxHp: number;
    credits: number;
  };
}

export const PoiScreen: React.FC<PoiScreenProps> = ({
  poi,
  map,
  stationedNpcs,
  onReturnToMap,
  onExecuteAction,
  onTalkNpc,
  playerVitals,
}) => {
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const handleActionClick = (actionId: string) => {
    setExecutingActionId(actionId);
    onExecuteAction(actionId);
    setTimeout(() => {
      setExecutingActionId(null);
    }, 400);
  };

  const getActionIcon = (actionType: string, iconName?: string) => {
    switch (iconName || actionType) {
      case 'MessageSquare':
      case 'Talk':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'ShoppingBag':
      case 'Market':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'Terminal':
      case 'Cpu':
        return <Terminal className="w-4 h-4 text-blue-400" />;
      case 'Bed':
      case 'Rest':
        return <Bed className="w-4 h-4 text-emerald-400" />;
      case 'Wrench':
      case 'Crafting':
        return <Wrench className="w-4 h-4 text-orange-400" />;
      case 'Eye':
      case 'Explore':
        return <Eye className="w-4 h-4 text-purple-400" />;
      case 'Radio':
        return <Radio className="w-4 h-4 text-cyan-400" />;
      case 'CreditCard':
        return <Coins className="w-4 h-4 text-yellow-400" />;
      default:
        return <Zap className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 font-mono select-none">
      {/* Navigation Breadcrumbs & Return Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/90 border border-zinc-800 p-3 rounded-xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onReturnToMap}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-cyan-400 text-zinc-300 hover:text-cyan-300 rounded-lg transition-all cursor-pointer font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO MAP</span>
          </button>

          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{map.name}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-cyan-300 font-bold">{poi.name}</span>
        </div>

        {/* Player Available AP & Resources Header Pill */}
        {playerVitals && (
          <div className="flex items-center gap-3 text-xs bg-black/60 px-3 py-1.5 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">AP:</span>
              <span className="text-cyan-400 font-bold">
                {playerVitals.actionPointsCurrent} / {playerVitals.actionPointsMax}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Ether:</span>
              <span className="text-purple-400 font-bold">
                {playerVitals.currentEther} / {playerVitals.maxEther}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Credits:</span>
              <span className="text-amber-400 font-bold">
                {playerVitals.credits} ¢
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main POI Content Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Location Lore, Atmosphere, & Stationed NPCs */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Panel
            title={poi.name}
            subtitle={`${poi.category.toUpperCase()} // ${poi.district || 'SECTOR 09'}`}
            glow={poi.category === 'EtherRift' ? 'purple' : 'cyan'}
          >
            <div className="flex flex-col gap-3">
              {/* Category Badges & Threat Indicators */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge variant="cyan" size="xs">
                    {poi.category}
                  </Badge>
                  {poi.runtime.isVisited && (
                    <Badge variant="emerald" size="xs">
                      VISITED
                    </Badge>
                  )}
                  {poi.runtime.status === 'Completed' && (
                    <Badge variant="purple" size="xs">
                      RESOLVED
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-rose-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Hazard: {poi.dangerLevel}/5</span>
                  </span>
                  <span className="flex items-center gap-1 text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ether: {poi.ambientEtherLevel}%</span>
                  </span>
                </div>
              </div>

              {/* Evocative Narrative Atmosphere */}
              <div className="bg-black/50 border border-zinc-800/80 p-3.5 rounded-xl text-zinc-300 font-sans text-xs leading-relaxed space-y-2">
                <p>{poi.description}</p>
                {poi.dangerLevel >= 3 && (
                  <div className="flex items-center gap-2 p-2 bg-rose-950/30 border border-rose-500/30 rounded text-[11px] text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Elevated security protocols and hostile surveillance detected.</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {poi.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] uppercase tracking-wider rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          {/* Stationed NPCs Card */}
          <Panel
            title="STATIONED CONTACTS & RESIDENTS"
            subtitle={`${stationedNpcs.length} INDIVIDUAL(S) PRESENT`}
          >
            {stationedNpcs.length === 0 ? (
              <div className="p-3 bg-black/40 border border-zinc-900 rounded-lg text-xs text-zinc-500 text-center font-sans">
                No active contacts currently in the immediate area.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {stationedNpcs.map((npc) => (
                  <div
                    key={npc.id}
                    className="p-3 bg-black/50 border border-zinc-800 hover:border-cyan-500/40 rounded-xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-cyan-300">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{npc.name}</span>
                          {npc.isMerchant && (
                            <Badge variant="amber" size="xs">
                              VENDOR
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 line-clamp-1 font-sans">
                          {npc.title}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTalkNpc(npc.id, npc.dialogueTreeId)}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>COMM LINK</span>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right Column: Data-Driven Interactive POI Actions */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <Panel
            title="LOCATION OPERATIONS & INTERACTIONS"
            subtitle="DATA-DRIVEN TACTICAL CHOICES"
            glow="cyan"
            className="flex-1"
          >
            <div className="flex flex-col gap-3">
              <span className="text-xs text-zinc-400 font-sans">
                Execute local protocols, hack encrypted nodes, trade, or advance mission objectives:
              </span>

              <div className="grid grid-cols-1 gap-3">
                {poi.resolvedActions.map((action) => {
                  const isBusy = executingActionId === action.id;

                  return (
                    <div
                      key={action.id}
                      id={`poi-action-${action.id}`}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        action.isAvailable
                          ? 'bg-zinc-950/80 border-zinc-700/80 hover:border-cyan-400/80 shadow-lg'
                          : 'bg-black/40 border-zinc-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-lg shrink-0 mt-0.5">
                            {getActionIcon(action.actionType, action.icon)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{action.label}</span>
                              {action.isCompleted && (
                                <Badge variant="emerald" size="xs">
                                  COMPLETED
                                </Badge>
                              )}
                            </div>
                            {action.description && (
                              <p className="text-xs text-zinc-400 font-sans mt-1 leading-relaxed">
                                {action.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Footer: Costs, Requirements, & Execute Trigger */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                        {/* Costs & Requirements Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {action.cost?.ap !== undefined && (
                            <span className="px-2 py-0.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[10px] rounded font-bold">
                              {action.cost.ap} AP
                            </span>
                          )}
                          {action.cost?.ether !== undefined && (
                            <span className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[10px] rounded font-bold">
                              {action.cost.ether} Ether
                            </span>
                          )}
                          {action.cost?.credits !== undefined && (
                            <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] rounded font-bold">
                              {action.cost.credits} Credits
                            </span>
                          )}

                          {!action.isAvailable && action.unmetConditionReason && (
                            <span className="text-[10px] text-rose-400 font-sans flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {action.unmetConditionReason}
                            </span>
                          )}
                        </div>

                        {/* Execute Action Button */}
                        <Button
                          variant={action.isAvailable ? 'primary' : 'outline'}
                          size="sm"
                          disabled={!action.isAvailable || isBusy}
                          onClick={() => handleActionClick(action.id)}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{isBusy ? 'EXECUTING...' : 'EXECUTE'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
