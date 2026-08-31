import React, { useState } from 'react';
import {
  GameContent,
  POI,
  POISchema,
  PoiAction,
  PoiActionCheckSchema,
  PoiActionSchema,
} from '@neon-ether/game-schema';
import type { ResolvedPOI } from '@neon-ether/game-runtime';
import { PoiScreen } from '@neon-ether/shared-ui';
import { ArrowDown, ArrowUp, Copy, Eye, ListTree, Plus, Trash2 } from 'lucide-react';
import { GameplayOutcomeEditor } from './GameplayOutcomeEditor.tsx';
import { SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';

const identitySchema = POISchema.pick({ id: true, name: true, category: true, tags: true, stateKey: true });
const placementSchema = POISchema.pick({ mapId: true, mapPosition: true, district: true, regionId: true, travelTimeMinutes: true });
const artworkSchema = POISchema.pick({ image: true, icon: true, description: true });
const environmentSchema = POISchema.pick({ dangerLevel: true, ambientEtherLevel: true, controllingFactionId: true });
const linksSchema = POISchema.pick({ npcIds: true, eventIds: true, questIds: true, encounterIds: true, shopId: true });
const availabilitySchema = POISchema.pick({ visibilityConditions: true, availabilityConditions: true });
const actionFieldsSchema = PoiActionSchema.omit({ check: true, outcome: true });
const checkFieldsSchema = PoiActionCheckSchema.omit({ passOutcome: true, partialOutcome: true, failOutcome: true });

function uniqueActionId(actions: PoiAction[]): string {
  let index = actions.length + 1;
  while (actions.some((action) => action.id === `action_${String(index).padStart(2, '0')}`)) index += 1;
  return `action_${String(index).padStart(2, '0')}`;
}

function move<T>(values: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= values.length) return values;
  const next = [...values];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const PoiEditor: React.FC<{ poi: POI; content: GameContent; onChange: (poi: POI) => void }> = ({ poi, content, onChange }) => {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const map = content.maps.find((candidate) => candidate.id === poi.mapId) ?? content.maps[0];
  const stationedNpcs = content.npcs.filter((npc) => poi.npcIds.includes(npc.id));
  const resolvedPreview: ResolvedPOI = {
    ...poi,
    runtime: { poiId: poi.id, status: 'Discovered', isDiscovered: true, isVisited: false, isLocked: false, completedActionIds: [], disabledActionIds: [], flags: {} },
    isVisible: true,
    isAvailable: true,
    isCurrentLocation: true,
    resolvedActions: poi.actions.map((action) => ({ ...action, isAvailable: true, isVisible: true, isCompleted: false })),
  };
  const updateSection = (next: unknown) => onChange({ ...poi, ...(next as Partial<POI>) });
  const updateAction = (id: string, next: PoiAction) => onChange({ ...poi, actions: poi.actions.map((action) => action.id === id ? next : action) });

  return <div className="space-y-4">
    <header className="flex items-center justify-between rounded border border-zinc-800 bg-black/25 p-2">
      <div><p className="text-[10px] uppercase text-purple-300">POI authoring</p><p className="text-[10px] text-zinc-500">Canonical POI definition · shared runtime screen</p></div>
      <div className="flex rounded border border-zinc-700 p-0.5"><button type="button" onClick={() => setView('edit')} className={`flex items-center gap-1 rounded px-2 py-1.5 text-[10px] ${view === 'edit' ? 'bg-cyan-500/15 text-cyan-300' : 'text-zinc-500'}`}><ListTree className="h-3 w-3"/> Edit</button><button type="button" onClick={() => setView('preview')} disabled={!map} className={`flex items-center gap-1 rounded px-2 py-1.5 text-[10px] disabled:opacity-30 ${view === 'preview' ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-500'}`}><Eye className="h-3 w-3"/> Preview</button></div>
    </header>

    {view === 'preview' && map ? <div className="min-h-[520px] rounded-xl border border-purple-500/30 bg-[#050713] p-4"><PoiScreen poi={resolvedPreview} map={map} stationedNpcs={stationedNpcs} onReturnToMap={() => setView('edit')} onExecuteAction={() => undefined} onTalkNpc={() => undefined}/></div> : <>
      <div className="grid gap-3 xl:grid-cols-2">
        <EditorSection title="Identity"><SchemaPropertyEditor schema={identitySchema as any} value={poi} content={content} onChange={updateSection}/></EditorSection>
        <EditorSection title="Map placement"><SchemaPropertyEditor schema={placementSchema as any} value={poi} content={content} onChange={updateSection}/></EditorSection>
        <EditorSection title="Artwork and description"><SchemaPropertyEditor schema={artworkSchema as any} value={poi} content={content} onChange={updateSection}/></EditorSection>
        <EditorSection title="Visibility and availability"><SchemaPropertyEditor schema={availabilitySchema as any} value={poi} content={content} onChange={updateSection}/></EditorSection>
        <EditorSection title="NPCs, events, quests, encounters and shop"><SchemaPropertyEditor schema={linksSchema as any} value={poi} content={content} onChange={updateSection}/></EditorSection>
        <EditorSection title="Environment metadata"><SchemaPropertyEditor schema={environmentSchema as any} value={poi} content={content} onChange={updateSection}/></EditorSection>
      </div>

      <section className="space-y-3 rounded-lg border border-purple-500/25 bg-purple-950/10 p-4">
        <header className="flex items-center justify-between"><div><p className="text-xs font-bold text-white">POI Actions</p><p className="text-[10px] text-zinc-500">Shared conditions, effects, checks and outcomes</p></div><button type="button" onClick={() => { const id = uniqueActionId(poi.actions); onChange({ ...poi, actions: [...poi.actions, { id, label: 'New action', icon: 'Zap', actionType: 'Interact', conditions: [], effects: [], hideIfUnavailable: false, isRepeatable: true }] }); }} className="flex items-center gap-1 rounded border border-cyan-500/40 px-3 py-2 text-xs text-cyan-300"><Plus className="h-3.5 w-3.5"/> Action</button></header>
        {poi.actions.map((action, index) => <details key={action.id} open={index === 0} className="rounded border border-zinc-700 bg-black/30 p-3"><summary className="cursor-pointer text-xs font-bold text-white">{index + 1}. {action.label}</summary><div className="mt-3 space-y-3">
          <SchemaPropertyEditor schema={actionFieldsSchema as any} value={action} content={content} onChange={(next) => updateAction(action.id, { ...(next as PoiAction), check: action.check, outcome: action.outcome })}/>
          <section className="rounded border border-zinc-800 p-3"><header className="mb-2 flex justify-between"><span className="text-[10px] uppercase text-amber-300">Skill check</span>{action.check && <button type="button" onClick={() => updateAction(action.id, { ...action, check: undefined })} className="text-rose-400"><Trash2 className="h-3.5 w-3.5"/></button>}</header>{action.check ? <><SchemaPropertyEditor schema={checkFieldsSchema as any} value={action.check} content={content} onChange={(check) => updateAction(action.id, { ...action, check: { ...(check as NonNullable<PoiAction['check']>), passOutcome: action.check?.passOutcome, partialOutcome: action.check?.partialOutcome, failOutcome: action.check?.failOutcome } })}/><div className="mt-3 grid gap-2 xl:grid-cols-3"><GameplayOutcomeEditor label="Success outcome" value={action.check.passOutcome} content={content} onChange={(passOutcome) => updateAction(action.id, { ...action, check: { ...action.check!, passOutcome } })}/><GameplayOutcomeEditor label="Partial outcome" value={action.check.partialOutcome} content={content} onChange={(partialOutcome) => updateAction(action.id, { ...action, check: { ...action.check!, partialOutcome } })}/><GameplayOutcomeEditor label="Failure outcome" value={action.check.failOutcome} content={content} onChange={(failOutcome) => updateAction(action.id, { ...action, check: { ...action.check!, failOutcome } })}/></div></> : <button type="button" onClick={() => updateAction(action.id, { ...action, check: { attribute: 'body', difficulty: 'Moderate', modifiers: [], passEffects: [], partialEffects: [], failEffects: [] } })} className="rounded border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400">+ Add data-driven check</button>}</section>
          <GameplayOutcomeEditor label="Action outcome / transition" value={action.outcome} content={content} onChange={(outcome) => updateAction(action.id, { ...action, outcome })}/>
          <div className="flex justify-end gap-1"><button type="button" onClick={() => onChange({ ...poi, actions: move(poi.actions, index, -1) })} disabled={index === 0} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5"/></button><button type="button" onClick={() => onChange({ ...poi, actions: move(poi.actions, index, 1) })} disabled={index === poi.actions.length - 1} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5"/></button><button type="button" onClick={() => { const id = uniqueActionId(poi.actions); onChange({ ...poi, actions: [...poi.actions, { ...structuredClone(action), id }] }); }} className="rounded border border-zinc-700 p-2"><Copy className="h-3.5 w-3.5"/></button><button type="button" onClick={() => onChange({ ...poi, actions: poi.actions.filter((candidate) => candidate.id !== action.id) })} className="rounded border border-rose-500/30 p-2 text-rose-400"><Trash2 className="h-3.5 w-3.5"/></button></div>
        </div></details>)}
      </section>
    </>}
  </div>;
};

const EditorSection: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => <section className="rounded-lg border border-zinc-800 bg-black/20 p-4"><h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-cyan-300">{title}</h3>{children}</section>;
