import React, { useState } from 'react';
import type { GameState, SaveGame, SaveLoadResult } from '@neon-ether/game-runtime';
import { Badge, Button, Panel } from '@neon-ether/shared-ui';
import { Download, FileJson, Save, Upload, X } from 'lucide-react';

type InspectorTab = 'player' | 'world' | 'npcs' | 'quests' | 'inventory' | 'factions' | 'base' | 'time';

interface SaveStateModalProps {
  state: GameState;
  saveStatus: string | null;
  onClose: () => void;
  saveToLocalSlot: (slot: string) => SaveGame;
  loadFromLocalSlot: (slot: string) => SaveLoadResult;
  exportSaveJson: () => string;
  importSaveJson: (json: string) => SaveLoadResult;
}

const slots = ['Slot 1 (Autosave)', 'Slot 2 (Manual)', 'Slot 3 (Manual)'];
const inspectorTabs: Array<{ key: InspectorTab; label: string }> = [
  { key: 'player', label: 'PlayerState' }, { key: 'world', label: 'WorldState' }, { key: 'npcs', label: 'NpcRuntimeState' },
  { key: 'quests', label: 'QuestRuntimeState' }, { key: 'inventory', label: 'InventoryState' }, { key: 'factions', label: 'FactionRuntimeState' },
  { key: 'base', label: 'BaseState' }, { key: 'time', label: 'TimeState' },
];

export const SaveStateModal: React.FC<SaveStateModalProps> = ({ state, saveStatus, onClose, saveToLocalSlot, loadFromLocalSlot, exportSaveJson, importSaveJson }) => {
  const [activeTab, setActiveTab] = useState<'saveLoad' | 'stateInspector'>('saveLoad');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('player');
  const [jsonInput, setJsonInput] = useState('');
  const inspectedState = inspectorTab === 'inventory' ? state.player.inventory : state[inspectorTab];
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportSaveJson()], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `neon_ether_save_${Date.now()}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"><Panel title="SERIALIZABLE GAME STATE // SAVE ENGINE" subtitle="RUNTIME STATE ONLY · CONTENT REMAINS IN CONTENT REGISTRY" glow="cyan" className="max-h-[90vh] w-full max-w-4xl overflow-y-auto shadow-2xl" headerRight={<button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-rose-400"><X className="h-4 w-4"/></button>}><div className="flex flex-col gap-4 font-mono text-xs"><div className="flex items-center justify-between border-b border-white/10 pb-2"><div className="flex gap-2"><button type="button" onClick={() => setActiveTab('saveLoad')} className={activeTab === 'saveLoad' ? 'text-cyan-300' : 'text-slate-500'}>Save & Load</button><button type="button" onClick={() => setActiveTab('stateInspector')} className={activeTab === 'stateInspector' ? 'text-purple-300' : 'text-slate-500'}>State Inspector</button></div>{saveStatus && <Badge variant="cyan" size="xs">{saveStatus}</Badge>}</div>{activeTab === 'saveLoad' ? <><div className="grid gap-3 md:grid-cols-3">{slots.map((slot) => <div key={slot} className="rounded-xl border border-white/10 bg-black/40 p-3"><strong className="flex items-center gap-1 text-white"><Save className="h-3.5 w-3.5 text-cyan-300"/>{slot}</strong><span className="mt-1 block text-[10px] text-slate-500">{localStorage.getItem(`neon_save_${slot}`) ? 'Saved state present' : 'Empty save slot'}</span><div className="mt-3 flex gap-2"><Button size="sm" variant="primary" onClick={() => saveToLocalSlot(slot)} className="flex-1">Save</Button><Button size="sm" variant="secondary" onClick={() => loadFromLocalSlot(slot)} className="flex-1">Load</Button></div></div>)}</div><div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="mb-2 flex items-center justify-between"><strong className="flex items-center gap-1 text-white"><FileJson className="h-4 w-4 text-amber-400"/>SaveGame JSON</strong><Button size="sm" variant="secondary" onClick={download} leftIcon={<Download className="h-3.5 w-3.5"/>}>Download</Button></div><textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} className="h-28 w-full rounded border border-white/10 bg-black/60 p-2 text-[10px] text-emerald-400" placeholder="Paste SaveGame JSON…"/><div className="mt-2 flex justify-end"><Button size="sm" variant="primary" disabled={!jsonInput.trim()} onClick={() => importSaveJson(jsonInput)} leftIcon={<Upload className="h-3.5 w-3.5"/>}>Import & Migrate</Button></div></div></> : <><div className="flex flex-wrap gap-1">{inspectorTabs.map((tab) => <button type="button" key={tab.key} onClick={() => setInspectorTab(tab.key)} className={`rounded px-2 py-1 ${inspectorTab === tab.key ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-500'}`}>{tab.label}</button>)}</div><pre className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 text-[11px] text-emerald-400">{JSON.stringify(inspectedState, null, 2)}</pre></>}<div className="flex justify-end border-t border-white/10 pt-2"><Button variant="primary" size="sm" onClick={onClose}>Close</Button></div></div></Panel></div>;
};
