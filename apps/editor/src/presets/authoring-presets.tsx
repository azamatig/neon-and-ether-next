import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Condition, Effect, EventChoice, GameplayOutcome, PoiAction, SkillCheckDefinition } from '@neon-ether/game-schema';
import { Copy, Library, Plus, Search, Trash2 } from 'lucide-react';

export type AuthoringPresetKind = 'conditions' | 'effects' | 'outcome' | 'poiAction' | 'eventChoice' | 'rewards' | 'skillCheck';
export type AuthoringPresetPayload = Condition[] | Effect[] | GameplayOutcome | PoiAction | EventChoice | Effect[] | SkillCheckDefinition;
export interface AuthoringPreset { id: string; name: string; kind: AuthoringPresetKind; tags: string[]; payload: AuthoringPresetPayload; }

export const DEFAULT_AUTHORING_PRESETS: AuthoringPreset[] = [
  { id: 'preset_requires_party_member', name: 'Requires Party Member', kind: 'conditions', tags: ['party', 'gate'], payload: [{ type: 'companionPresent', companionId: '', inParty: true }] },
  { id: 'preset_requires_reputation', name: 'Requires Reputation', kind: 'conditions', tags: ['faction', 'gate'], payload: [{ type: 'factionReputation', factionId: '', operator: '>=', value: 20 }] },
  { id: 'preset_set_story_flag', name: 'Set Story Flag', kind: 'effects', tags: ['flag', 'state'], payload: [{ type: 'setFlag', flag: 'configure_me', value: true }] },
  { id: 'preset_standard_loot', name: 'Give Standard Loot', kind: 'rewards', tags: ['reward', 'loot'], payload: [{ type: 'grantRewards', xp: 25, credits: 50, items: [], skillXp: {}, perkPoints: 0 }] },
  { id: 'preset_relationship_choice', name: 'Relationship Choice', kind: 'eventChoice', tags: ['choice', 'relationship'], payload: { id: 'choice_new', text: 'Relationship choice', conditions: [], effects: [{ type: 'changeRelationship', npcId: '', delta: 5 }], hideIfUnavailable: false } },
  { id: 'preset_open_poi', name: 'Open POI', kind: 'outcome', tags: ['navigation', 'poi'], payload: { type: 'poi', poiId: '' } },
  { id: 'preset_start_combat', name: 'Start Combat', kind: 'outcome', tags: ['combat', 'transition'], payload: { type: 'combat', encounterId: '', previewFirst: true } },
  { id: 'preset_investigate_action', name: 'Investigate Action', kind: 'poiAction', tags: ['poi', 'action'], payload: { id: 'action_new', label: 'Investigate', icon: 'Search', actionType: 'Explore', conditions: [], effects: [], hideIfUnavailable: false, isRepeatable: true } },
  { id: 'preset_skill_check_result', name: 'Skill Check + Result', kind: 'skillCheck', tags: ['check', 'result'], payload: { attribute: 'mind', difficulty: 'Moderate', modifiers: [], label: 'Skill check' } },
];

interface PresetContextValue {
  presets: AuthoringPreset[];
  savePreset: (preset: AuthoringPreset) => void;
  deletePreset: (id: string) => void;
  persist: () => Promise<void>;
}
const PresetContext = createContext<PresetContextValue | null>(null);
export const applyPresetAsCopy = <T,>(value: T): T => structuredClone(value);
const makeId = (name: string) => `preset_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}_${Date.now()}`;

export const AuthoringPresetProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [presets, setPresets] = useState<AuthoringPreset[]>(DEFAULT_AUTHORING_PRESETS);
  useEffect(() => { fetch('/__editor/presets').then((response) => response.ok ? response.json() : null).then((data) => { if (data?.presets) setPresets(data.presets); }).catch(() => undefined); }, []);
  const value = useMemo<PresetContextValue>(() => ({
    presets,
    savePreset: (preset) => setPresets((current) => [...current.filter((item) => item.id !== preset.id), applyPresetAsCopy(preset)]),
    deletePreset: (id) => setPresets((current) => current.filter((preset) => preset.id !== id)),
    persist: async () => { await fetch('/__editor/presets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presets }) }); },
  }), [presets]);
  return <PresetContext.Provider value={value}>{children}</PresetContext.Provider>;
};

function usePresets() { const value = useContext(PresetContext); if (!value) throw new Error('Preset controls require AuthoringPresetProvider'); return value; }

export const PresetControl: React.FC<{ kind: AuthoringPresetKind; value: AuthoringPresetPayload; onApply: (value: any) => void }> = ({ kind, value, onApply }) => {
  const { presets, savePreset } = usePresets();
  const [open, setOpen] = useState(false);
  const matches = presets.filter((preset) => preset.kind === kind || (kind === 'effects' && preset.kind === 'rewards'));
  const createFromSelection = () => {
    const name = window.prompt('Preset name')?.trim(); if (!name) return;
    const tags = window.prompt('Tags (comma separated)', '')?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
    const presetKind = kind === 'effects' && Array.isArray(value) && value.length > 0 && value.every((entry) => (entry as { type?: string }).type === 'grantRewards') ? 'rewards' : kind;
    savePreset({ id: makeId(name), name, kind: presetKind, tags, payload: applyPresetAsCopy(value) });
  };
  return <div className="relative flex gap-1">
    <button type="button" title="Create Preset from Selection" onClick={createFromSelection} className="rounded border border-purple-500/30 px-2 py-1 text-[9px] text-purple-300"><Plus className="inline h-3 w-3"/> Preset</button>
    <button type="button" onClick={() => setOpen((current) => !current)} className="rounded border border-cyan-500/30 px-2 py-1 text-[9px] text-cyan-300"><Library className="inline h-3 w-3"/> Apply</button>
    {open && <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded border border-zinc-700 bg-[#070914] p-2 shadow-2xl"><p className="mb-2 text-[9px] uppercase text-zinc-500">Apply as Copy</p>{matches.length ? matches.map((preset) => <button type="button" key={preset.id} onClick={() => { onApply(applyPresetAsCopy(preset.payload)); setOpen(false); }} className="mb-1 w-full rounded border border-zinc-800 p-2 text-left hover:border-cyan-500/40"><span className="block text-xs text-white">{preset.name}</span><span className="text-[9px] text-zinc-500">{preset.tags.join(' · ') || preset.kind}</span></button>) : <p className="p-2 text-[10px] text-zinc-500">No matching presets.</p>}</div>}
  </div>;
};

export const PresetLibraryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { presets, savePreset, deletePreset, persist } = usePresets();
  const [query, setQuery] = useState('');
  const filtered = presets.filter((preset) => `${preset.name} ${preset.kind} ${preset.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><section className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-xl border border-purple-500/30 bg-[#050713] p-4"><header className="mb-3 flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-widest text-purple-300">Authoring templates</p><h2 className="font-bold text-white">Preset Library</h2></div><div className="flex gap-2"><button type="button" onClick={() => void persist()} className="rounded border border-cyan-500/40 px-3 py-2 text-xs text-cyan-300">Save Presets</button><button type="button" onClick={onClose}>×</button></div></header><label className="mb-3 flex items-center gap-2 rounded border border-zinc-800 px-3"><Search className="h-4 w-4 text-zinc-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, kind or tags…" className="w-full bg-transparent py-2 text-xs outline-none"/></label><div className="grid gap-2 md:grid-cols-2">{filtered.map((preset) => <article key={preset.id} className="rounded border border-zinc-800 bg-black/30 p-3"><header className="mb-2 flex justify-between"><div><p className="text-xs font-bold text-white">{preset.name}</p><p className="text-[9px] uppercase text-purple-300">{preset.kind} · {preset.tags.join(' · ')}</p></div><div className="flex gap-1"><button type="button" title="Rename" onClick={() => { const name=window.prompt('Preset name',preset.name)?.trim(); if(name) savePreset({...preset,name}); }} className="rounded border border-zinc-700 p-1 text-[9px]">Rename</button><button type="button" title="Duplicate" onClick={() => savePreset({...applyPresetAsCopy(preset),id:makeId(preset.name),name:`${preset.name} Copy`})} className="rounded border border-zinc-700 p-1"><Copy className="h-3 w-3"/></button><button type="button" title="Delete" onClick={() => deletePreset(preset.id)} className="rounded border border-rose-500/30 p-1 text-rose-400"><Trash2 className="h-3 w-3"/></button></div></header><pre className="max-h-40 overflow-auto rounded bg-black/40 p-2 text-[9px] text-emerald-300">{JSON.stringify(preset.payload, null, 2)}</pre></article>)}</div></section></div>;
};
