/** Development-only schema-driven content editor. */
import React, { useEffect, useMemo, useState } from 'react';
import { ContentRegistry } from '@neon-ether/game-runtime';
import { BaseRoomDefinitionSchema, CombatEncounterSchema, EnemySchema, GameContent, GameEventSchema, GameMap, GameMapSchema, ItemSchema, NPCSchema, PlayerBaseDefinitionSchema, POISchema, RecipeSchema, Quest, QuestSchema, ValidationIssue } from '@neon-ether/game-schema';
import { AlertTriangle, Bug, CheckCircle2, Copy, ListTree, Network, Plus, Save, Search, Trash2 } from 'lucide-react';
import { SchemaPropertyEditor } from './components/SchemaPropertyEditor.tsx';
import { QuestGraphEditor } from './components/QuestGraphEditor.tsx';
import { MapEditor } from './components/MapEditor.tsx';
import { ValidationPanel } from './components/ValidationPanel.tsx';
import { PlaytestPanel } from './components/PlaytestPanel.tsx';

type Category = 'items' | 'npcs' | 'enemies' | 'pois' | 'events' | 'quests' | 'maps' | 'encounters' | 'rooms' | 'bases' | 'recipes';
type EditableEntity = GameContent[Category][number];

const CATEGORY_LABELS: Record<Category, string> = { items: 'Items', npcs: 'NPCs', enemies: 'Enemies', pois: 'POIs', events: 'Events', quests: 'Quests', maps: 'Maps', encounters: 'Encounters', rooms: 'Rooms', bases: 'Bases', recipes: 'Recipes' };
const CATEGORY_SCHEMAS = { items: ItemSchema, npcs: NPCSchema, enemies: EnemySchema, pois: POISchema, events: GameEventSchema, quests: QuestSchema, maps: GameMapSchema, encounters: CombatEncounterSchema, rooms: BaseRoomDefinitionSchema, bases: PlayerBaseDefinitionSchema, recipes: RecipeSchema } as const;

function nextId(category: Category, entities: EditableEntity[]): string {
  const prefix = `${category.replace(/s$/, '')}_editor`;
  let index = entities.length + 1;
  while (entities.some((entity) => entity.id === `${prefix}_${String(index).padStart(3, '0')}`)) index += 1;
  return `${prefix}_${String(index).padStart(3, '0')}`;
}

function createTemplate(category: Category, id: string): EditableEntity {
  const vitals = { maxHp: 30, currentHp: 30, maxEther: 0, currentEther: 0, actionPointsMax: 6, actionPointsCurrent: 6, initiative: 10, armorRating: 0, etherResistance: 0 };
  const attributes = { body: 10, reflexes: 10, mind: 10, etherTech: 10, presence: 10 };
  if (category === 'items') return { id, name: 'New Item', description: '', tags: [], category: 'material', rarity: 'Common', weightKg: 0.1, valueCredits: 10, stackable: false, maxStack: 1, equipmentSlots: [], requirements: [], modifiers: [], equipEffects: [], unequipEffects: [], grantedAbilityIds: [], icon: 'Box' } as EditableEntity;
  if (category === 'npcs') return { id, name: 'New NPC', description: '', tags: [], title: 'Citizen', factionId: 'Neutral', isPlayer: false, isMerchant: false, isCompanion: false, level: 1, attributes, vitals, position: { x: 0, y: 0 }, facing: 'South', inventory: [], portraitIcon: 'User', defaultBehavior: 'Idle', abilityIds: [], traits: [] } as EditableEntity;
  if (category === 'enemies') return { id, name: 'New Enemy', description: '', tags: [], factionId: 'Hostile', level: 1, tier: 'Standard', attributes, vitals, aiArchetype: 'MeleeRusher', lootTable: [], grantedXp: 25, bountyCredits: 50, behaviorFlags: [], abilityIds: [], portraitIcon: 'Skull' } as EditableEntity;
  if (category === 'pois') return { id, name: 'New POI', description: '', tags: [], mapId: '', mapPosition: { x: 50, y: 50 }, icon: 'MapPin', category: 'Landmark', visibilityConditions: [], availabilityConditions: [], actions: [], npcIds: [], questIds: [], eventIds: [], encounterIds: [], dangerLevel: 1, ambientEtherLevel: 20 } as EditableEntity;
  if (category === 'events') return { id, name: 'New Game Event', description: '', tags: [], type: 'choice', conditions: [], triggerConditions: [], availabilityConditions: [], presentation: { layoutStyle: 'standard', ambientGlow: 'cyan' }, steps: [{ id: 'step_01', type: 'choice', text: '', conditions: [], effects: [], choices: [] }], entryEffects: [], completionEffects: [], isOneShot: false } as EditableEntity;
  if (category === 'quests') return { id, name: 'New Quest', description: '', tags: [], factionId: 'Neutral', recommendedLevel: 1, initialStageId: 'stage_01', stages: { stage_01: { id: 'stage_01', stageNumber: 1, title: 'First Stage', journalEntry: '', objectives: [], entryConditions: [], completionConditions: [], actions: [], entryEffects: [], completionEffects: [], branches: [] } }, rewardCredits: 0, rewardXp: 0, rewardItemIds: [], isMainQuest: false, isRepeatable: false } as EditableEntity;
  if (category === 'maps') return { id, name: 'New Map', description: '', tags: [], district: 'New District', backgroundImage: '', poiIds: [], connectedMapIds: [], ambientEtherLevel: 25, securityLevel: 1, regions: [], routes: [], metadata: {}, recommendedLevel: 1 } as EditableEntity;
  if (category === 'encounters') return { id, name: 'New Encounter', description: '', tags: [], enemyGroups: [], environment: { ambientEtherLevel: 20, lighting: 'Normal' }, threatLevel: 1, escapeRules: { allowed: true, conditions: [] }, lootTable: [], creditsReward: { min: 0, max: 0 }, xpReward: 0, survivingEnemyActions: [] } as EditableEntity;
  if (category === 'rooms') return { id, name: 'New Room', description: '', tags: [], roomType: 'Corridor', width: 6, height: 6, doorways: [], recommendedEnemies: [], recommendedPois: [], minSecurityLevel: 1, isHazardous: false, ambientEtherBonus: 0, buildCost: {}, requirements: [], capacity: { residents: 0, workers: 0, storage: 0 }, effects: [], allowedSlotTypes: ['Standard'], maxInstances: 1 } as EditableEntity;
  if (category === 'recipes') return { id, name: 'New Recipe', description: '', tags: [], category: 'misc', inputs: [], requirements: [], toolItemIds: [], roomIds: [], availableAt: ['poi', 'base', 'room'], output: { itemId: '', quantity: 1 }, timeCost: { turns: 1 }, conditions: [], effects: [], discoveredByDefault: true } as EditableEntity;
  return { id, name: 'New Base', description: '', tags: [], roomSlots: [{ id: 'slot_01', slotType: 'Standard', allowedRoomTypes: [] }], startingRooms: [], startingResources: {}, storageCapacity: 20 } as EditableEntity;
}

export const EditorApp: React.FC = () => {
  const [content, setContent] = useState<GameContent | null>(null);
  const [category, setCategory] = useState<Category>('items');
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState<Set<Category>>(new Set());
  const [status, setStatus] = useState('Loading content files…');
  const [questView, setQuestView] = useState<'inspector' | 'graph'>('inspector');
  const [mapView, setMapView] = useState<'inspector' | 'visual'>('visual');
  const [validationOpen, setValidationOpen] = useState(false);
  const [knownAssets, setKnownAssets] = useState<string[]>([]);
  const [validationPreview, setValidationPreview] = useState<{ issue: ValidationIssue; entity: unknown } | null>(null);
  const [playtestOpen, setPlaytestOpen] = useState(false);

  useEffect(() => {
    fetch('/__editor/content').then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to load content.');
      return response.json();
    }).then(({ content: loaded, knownAssets: assets = [] }: { content: GameContent; knownAssets?: string[] }) => {
      setContent(loaded); setKnownAssets(assets); setSelectedId(loaded.items[0]?.id ?? ''); setStatus('Content files loaded.');
    }).catch((error) => setStatus(`API error: ${error.message}`));
  }, []);

  const entities = content ? content[category] as EditableEntity[] : [];
  const selected = entities.find((entity) => entity.id === selectedId);
  const filtered = entities.filter((entity) => `${entity.name} ${entity.id} ${entity.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const report = useMemo(() => {
    if (!content) return null;
    const registry = new ContentRegistry();
    return registry.loadContent(content, { validation: { knownAssets: new Set(knownAssets) } });
  }, [content, knownAssets]);

  const markDirty = (target: Category) => setDirty((current) => new Set(current).add(target));
  const updateCollection = (target: Category, next: EditableEntity[]) => {
    setContent((current) => current ? { ...current, [target]: next, ...(target === 'npcs' ? { characters: next } : {}) } as GameContent : current);
    markDirty(target);
  };
  const selectCategory = (next: Category) => { setCategory(next); setSelectedId(content?.[next][0]?.id ?? ''); };
  const createEntity = () => { const id = nextId(category, entities); updateCollection(category, [...entities, createTemplate(category, id)]); setSelectedId(id); };
  const duplicateEntity = () => {
    if (!selected) return;
    const id = nextId(category, entities);
    updateCollection(category, [...entities, { ...structuredClone(selected), id, name: `${selected.name} Copy` }]); setSelectedId(id);
  };
  const renameEntity = () => {
    if (!selected) return;
    const name = window.prompt('Entity display name', selected.name)?.trim();
    if (!name) return;
    updateCollection(category, entities.map((entity) => entity.id === selected.id ? { ...entity, name } : entity));
  };
  const deleteEntity = () => {
    if (!selected || !window.confirm(`Delete ${selected.name}? Validation will catch broken references.`)) return;
    const next = entities.filter((entity) => entity.id !== selected.id); updateCollection(category, next); setSelectedId(next[0]?.id ?? '');
  };
  const selectedValidation = selected ? CATEGORY_SCHEMAS[category].safeParse(selected) : null;
  const editEntity = (next: unknown) => {
    const parsed = next as EditableEntity;
    if (!parsed.id || (parsed.id !== selectedId && entities.some((entity) => entity.id === parsed.id))) return;
    updateCollection(category, entities.map((entity) => entity.id === selectedId ? parsed : entity));
    if (parsed.id !== selectedId) setSelectedId(parsed.id);
  };
  const save = async () => {
    if (!content || report?.errorsCount) { setStatus('Save blocked by validation errors.'); return; }
    setStatus('Saving content files…');
    try {
      const categories = [...dirty];
      const collections = Object.fromEntries(categories.map((target) => [target, content[target]]));
      const response = await fetch('/__editor/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categories, collections }) });
      if (!response.ok) throw new Error((await response.json()).error ?? 'Failed to save content files.');
      setDirty(new Set()); setStatus('Saved to physical content JSON files.');
    } catch (error) { setStatus(`Save failed: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const navigateToIssue = (issue: ValidationIssue) => {
    if (!content) return;
    const targetId = issue.targetId.split('#')[0];
    const target = (Object.keys(CATEGORY_LABELS) as Category[]).find((candidate) => content[candidate].some((entity) => entity.id === targetId));
    if (!target) {
      const entity = Object.values(content).filter(Array.isArray).flatMap((collection) => collection).find((candidate) => candidate && typeof candidate === 'object' && 'id' in candidate && candidate.id === targetId);
      if (entity) { setValidationPreview({ issue, entity }); setValidationOpen(false); return; }
      setStatus(`Validation target '${targetId}' is not an entity.`); return;
    }
    setCategory(target); setSelectedId(targetId); setValidationOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050713] p-4 text-zinc-200 font-mono">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-purple-500/30 bg-black/50 p-4 rounded-xl">
        <div><p className="text-[10px] tracking-[0.3em] text-purple-400">DEVELOPMENT APPLICATION</p><h1 className="text-lg font-bold text-white">NEON & ETHER // CONTENT EDITOR MVP</h1></div>
        <div className="flex gap-2"><button type="button" onClick={() => setPlaytestOpen(true)} disabled={!content || Boolean(report?.errorsCount)} className="flex items-center gap-2 rounded border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-xs text-purple-300 disabled:opacity-40"><Bug className="h-4 w-4"/> Playtest</button><button onClick={save} disabled={!dirty.size || Boolean(report?.errorsCount)} className="flex items-center gap-2 rounded border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300 disabled:opacity-40"><Save className="h-4 w-4"/> Save {dirty.size ? `(${dirty.size})` : ''}</button></div>
      </header>
      <div className="grid min-h-[680px] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="mb-3 grid grid-cols-5 gap-1">{(['items','npcs','enemies','pois','events','quests','maps','encounters','rooms','bases','recipes'] as Category[]).map((target) => <button key={target} onClick={() => selectCategory(target)} className={`rounded border p-2 text-[9px] uppercase ${category === target ? 'border-purple-400 bg-purple-500/15 text-purple-300' : 'border-zinc-800 text-zinc-500'}`}>{CATEGORY_LABELS[target]} <span className="block text-sm">{content?.[target].length ?? 0}</span></button>)}</div>
          <label className="mb-3 flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950 px-3"><Search className="h-4 w-4 text-zinc-500"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, tags…" className="w-full bg-transparent py-2 text-xs outline-none"/></label>
          <div className="mb-3 grid grid-cols-2 gap-2"><button onClick={createEntity} className="flex items-center justify-center gap-1 rounded border border-cyan-500/40 p-2 text-xs text-cyan-300"><Plus className="h-3 w-3"/> Create</button><button onClick={duplicateEntity} disabled={!selected} className="flex items-center justify-center gap-1 rounded border border-zinc-700 p-2 text-xs disabled:opacity-40"><Copy className="h-3 w-3"/> Duplicate</button></div>
          <div className="max-h-[520px] space-y-1 overflow-auto">{filtered.map((entity) => <button key={entity.id} onClick={() => setSelectedId(entity.id)} className={`w-full rounded border p-2 text-left ${selectedId === entity.id ? 'border-purple-400 bg-purple-950/40' : 'border-zinc-800 bg-zinc-950/50'}`}><span className="block truncate text-xs text-white">{entity.name}</span><span className="block truncate text-[10px] text-zinc-500">{entity.id}</span></button>)}</div>
        </aside>
        <main className="flex min-h-0 flex-col rounded-xl border border-zinc-800 bg-black/40 p-4">
          {selected ? <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div><p className="text-[10px] text-cyan-400">{category === 'quests' && questView === 'graph' ? 'VISUAL QUEST GRAPH' : category === 'maps' && mapView === 'visual' ? 'VISUAL MAP EDITOR' : 'SCHEMA-DRIVEN INSPECTOR'} // {category.toUpperCase()}</p><h2 className="font-bold text-white">{selected.name}</h2></div>
              <div className="flex gap-2">
                {category === 'quests' && <div className="flex rounded border border-zinc-700 p-0.5"><button type="button" onClick={() => setQuestView('inspector')} className={`flex items-center gap-1 rounded px-2 py-1.5 text-[10px] ${questView === 'inspector' ? 'bg-cyan-500/15 text-cyan-300' : 'text-zinc-500'}`}><ListTree className="h-3 w-3"/> Inspector</button><button type="button" onClick={() => setQuestView('graph')} className={`flex items-center gap-1 rounded px-2 py-1.5 text-[10px] ${questView === 'graph' ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-500'}`}><Network className="h-3 w-3"/> Graph</button></div>}
                {category === 'maps' && <div className="flex rounded border border-zinc-700 p-0.5"><button type="button" onClick={() => setMapView('inspector')} className={`flex items-center gap-1 rounded px-2 py-1.5 text-[10px] ${mapView === 'inspector' ? 'bg-cyan-500/15 text-cyan-300' : 'text-zinc-500'}`}><ListTree className="h-3 w-3"/> Inspector</button><button type="button" onClick={() => setMapView('visual')} className={`flex items-center gap-1 rounded px-2 py-1.5 text-[10px] ${mapView === 'visual' ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-500'}`}><Network className="h-3 w-3"/> Map</button></div>}
                <button onClick={renameEntity} className="rounded border border-zinc-700 px-3 py-2 text-xs">Rename</button><button onClick={deleteEntity} className="flex items-center gap-1 rounded border border-rose-500/40 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-3 w-3"/> Delete</button>
              </div>
            </div>
            <div className="max-h-[570px] flex-1 overflow-auto pr-2">{category === 'quests' && questView === 'graph' ? <QuestGraphEditor quest={selected as Quest} onChange={editEntity}/> : category === 'maps' && mapView === 'visual' ? <MapEditor map={selected as GameMap} pois={content!.pois} onChangeMap={editEntity} onChangePois={(pois) => updateCollection('pois', pois)}/> : <SchemaPropertyEditor schema={CATEGORY_SCHEMAS[category]} value={selected} content={content!} onChange={editEntity}/>}</div>
            {selectedValidation && !selectedValidation.success && <div className="mt-2 rounded border border-rose-500/30 bg-rose-950/20 p-2 text-[10px] text-rose-300">{selectedValidation.error.issues.slice(0, 5).map((issue) => <div key={`${issue.path.join('.')}-${issue.message}`}>{issue.path.join('.')}: {issue.message}</div>)}</div>}
          </> : <div className="m-auto text-zinc-600">Select or create an entity.</div>}
          <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs"><span className="text-zinc-500">{status}</span><button type="button" onClick={() => setValidationOpen(true)} className={`flex items-center gap-2 ${report?.errorsCount ? 'text-rose-400' : 'text-emerald-400'}`}>{report?.errorsCount ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle2 className="h-4 w-4"/>} Validation: {report?.errorsCount ?? 0} errors · {report?.warningsCount ?? 0} warnings · {report?.infoCount ?? 0} info</button></footer>
        </main>
      </div>
      {validationOpen && report && <ValidationPanel report={report} onNavigate={navigateToIssue} onClose={() => setValidationOpen(false)}/>}
      {playtestOpen && content && <PlaytestPanel content={content} onClose={() => setPlaytestOpen(false)}/>}
      {validationPreview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><section className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl border border-cyan-500/30 bg-[#050713] p-4"><header className="mb-3 flex justify-between"><div><p className="text-[9px] uppercase text-cyan-400">{validationPreview.issue.category} · {validationPreview.issue.field}</p><h2 className="font-bold text-white">{validationPreview.issue.targetId}</h2></div><button type="button" onClick={() => setValidationPreview(null)}>×</button></header><p className="mb-3 text-xs text-rose-300">{validationPreview.issue.message}</p><pre className="rounded border border-zinc-800 bg-black/40 p-3 text-[10px] text-emerald-300">{JSON.stringify(validationPreview.entity, null, 2)}</pre></section></div>}
    </div>
  );
};
