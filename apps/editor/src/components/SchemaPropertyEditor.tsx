import React, { useMemo, useState } from 'react';
import { ConditionSchema, EffectSchema, GameContent } from '@neon-ether/game-schema';
import { Plus, Search, Trash2, X } from 'lucide-react';

type SchemaLike = { _def: Record<string, any>; safeParse?: (value: unknown) => any };

export interface SchemaPropertyEditorProps {
  schema: SchemaLike;
  value: unknown;
  path?: string[];
  content: GameContent;
  onChange: (value: unknown) => void;
}

function unwrap(schema: SchemaLike): { schema: SchemaLike; optional: boolean } {
  let current = schema;
  let optional = false;
  while (['optional', 'default', 'nullable'].includes(current._def.type)) {
    optional ||= current._def.type === 'optional' || current._def.type === 'nullable';
    current = current._def.innerType;
  }
  if (current._def.type === 'lazy') current = current._def.getter();
  return { schema: current, optional };
}

function labelFor(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function literalValue(schema: SchemaLike): unknown {
  return schema._def.type === 'literal' ? schema._def.values?.[0] : undefined;
}

function createValue(source: SchemaLike): unknown {
  const { schema, optional } = unwrap(source);
  if (optional) return undefined;
  if (schema._def.type === 'string') return '';
  if (schema._def.type === 'number') return 0;
  if (schema._def.type === 'boolean') return false;
  if (schema._def.type === 'enum') return Object.keys(schema._def.entries)[0];
  if (schema._def.type === 'literal') return literalValue(schema);
  if (schema._def.type === 'array') return [];
  if (schema._def.type === 'tuple') return schema._def.items.map((item: SchemaLike) => createValue(item));
  if (schema._def.type === 'object') return Object.fromEntries(Object.entries(schema._def.shape).flatMap(([key, child]) => {
    const value = createValue(child as SchemaLike);
    return value === undefined ? [] : [[key, value]];
  }));
  if (schema._def.type === 'union') return createValue(schema._def.options[0]);
  return null;
}

function referenceCollection(path: string[], content: GameContent): Array<{ id: string; name: string }> | null {
  const field = path.at(-1) ?? '';
  if (/factionId$/i.test(field)) return content.factions;
  if (/dialogueTreeId$/i.test(field)) return content.dialogues.map((entity) => ({ id: entity.id, name: entity.title }));
  if (/abilityId(s)?$/i.test(field)) return content.abilities;
  if (/combatAIProfileId$/i.test(field)) return content.combatAIProfiles;
  if (/itemId$|equippedWeaponId$|resultItemId$/i.test(field)) return content.items;
  if (/enemyId$/i.test(field)) return content.enemies;
  if (/npcId$|characterId$/i.test(field)) return content.npcs;
  if (/questId$/i.test(field)) return content.quests;
  if (/poiId$/i.test(field)) return content.pois;
  if (/mapId$/i.test(field)) return content.maps;
  if (/roomId$/i.test(field)) return content.rooms;
  return null;
}

const inputClass = 'w-full rounded border border-zinc-700 bg-[#060812] px-3 py-2 text-xs text-cyan-100 outline-none focus:border-cyan-500';

export const EntityReferenceEditor: React.FC<{
  value: string; entities: Array<{ id: string; name: string }>; optional?: boolean; onChange: (value: string | undefined) => void;
}> = ({ value, entities, optional, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = entities.find((entity) => entity.id === value);
  const matches = entities.filter((entity) => `${entity.name} ${entity.id}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30);
  return <div className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} className={`${inputClass} flex items-center justify-between text-left`}>
      <span>{selected ? `${selected.name} · ${selected.id}` : value || 'Select entity…'}</span><Search className="h-3.5 w-3.5 text-zinc-500"/>
    </button>
    {open && <div className="absolute z-40 mt-1 w-full rounded border border-zinc-700 bg-[#080a12] p-2 shadow-2xl">
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search real entities…" className={`${inputClass} mb-2`}/>
      <div className="max-h-48 overflow-auto">{optional && <button type="button" onClick={() => { onChange(undefined); setOpen(false); }} className="w-full p-2 text-left text-xs text-zinc-500">None</button>}{matches.map((entity) => <button type="button" key={entity.id} onClick={() => { onChange(entity.id); setOpen(false); setQuery(''); }} className="w-full rounded p-2 text-left text-xs hover:bg-cyan-950/40"><span className="block text-white">{entity.name}</span><span className="text-[10px] text-zinc-500">{entity.id}</span></button>)}</div>
    </div>}
  </div>;
};

export const TagsEditor: React.FC<{ value: string[]; onChange: (value: string[]) => void }> = ({ value, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => { const tag = draft.trim(); if (tag && !value.includes(tag)) onChange([...value, tag]); setDraft(''); };
  return <div className="rounded border border-zinc-700 bg-[#060812] p-2"><div className="mb-2 flex flex-wrap gap-1">{value.map((tag) => <span key={tag} className="flex items-center gap-1 rounded bg-purple-500/15 px-2 py-1 text-[10px] text-purple-300">{tag}<button type="button" onClick={() => onChange(value.filter((item) => item !== tag))}><X className="h-3 w-3"/></button></span>)}</div><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} onBlur={add} placeholder="Add tag and press Enter" className="w-full bg-transparent text-xs outline-none"/></div>;
};

function flattenVariants(schema: SchemaLike): SchemaLike[] {
  const resolved = unwrap(schema).schema;
  if (resolved._def.type === 'union') return resolved._def.options.flatMap((option: SchemaLike) => flattenVariants(option));
  return resolved._def.type === 'object' && resolved._def.shape?.type ? [resolved] : [];
}

export const VariantListEditor: React.FC<{ kind: 'condition' | 'effect'; value: unknown[]; content: GameContent; path: string[]; onChange: (value: unknown[]) => void }> = ({ kind, value, content, path, onChange }) => {
  const variants = useMemo(() => flattenVariants(kind === 'condition' ? ConditionSchema as unknown as SchemaLike : EffectSchema as unknown as SchemaLike), [kind]);
  const [newType, setNewType] = useState(String(literalValue(variants[0]?._def.shape.type) ?? ''));
  const add = () => { const variant = variants.find((schema) => literalValue(schema._def.shape.type) === newType); if (variant) onChange([...value, createValue(variant)]); };
  return <div className="space-y-2 rounded border border-zinc-800 bg-black/20 p-2">{value.map((entry, index) => {
    const type = (entry as { type?: string })?.type;
    const variant = variants.find((schema) => literalValue(schema._def.shape.type) === type);
    return <div key={`${type}-${index}`} className="rounded border border-zinc-700 p-3"><div className="mb-2 flex justify-between text-[10px] text-amber-300">{type ?? `Unknown ${kind}`}<button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-3.5 w-3.5"/></button></div>{variant ? <SchemaPropertyEditor schema={variant} value={entry} path={[...path, String(index)]} content={content} onChange={(next) => onChange(value.map((item, itemIndex) => itemIndex === index ? next : item))}/> : <pre className="text-[10px] text-zinc-500">{JSON.stringify(entry, null, 2)}</pre>}</div>;
  })}<div className="flex gap-2"><select value={newType} onChange={(event) => setNewType(event.target.value)} className={inputClass}>{variants.map((variant) => { const type = String(literalValue(variant._def.shape.type)); return <option key={type} value={type}>{type}</option>; })}</select><button type="button" onClick={add} className="rounded border border-cyan-500/40 px-3 text-cyan-300"><Plus className="h-4 w-4"/></button></div></div>;
};

export const SchemaPropertyEditor: React.FC<SchemaPropertyEditorProps> = ({ schema: source, value, path = [], content, onChange }) => {
  const { schema, optional } = unwrap(source);
  const type = schema._def.type;
  const field = path.at(-1) ?? '';
  if (value === undefined || value === null) return <button type="button" onClick={() => onChange(createValue(schema))} className="rounded border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400">+ Add {labelFor(field)}</button>;
  const reference = referenceCollection(path, content);
  if (type === 'string' && reference) return <EntityReferenceEditor value={String(value)} entities={reference} optional={optional} onChange={onChange}/>;
  if (type === 'string') return <input value={String(value)} onChange={(event) => onChange(event.target.value)} className={inputClass}/>;
  if (type === 'number') return <input type="number" value={Number(value)} onChange={(event) => onChange(Number(event.target.value))} className={inputClass}/>;
  if (type === 'boolean') return <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="accent-cyan-400"/>{value ? 'Enabled' : 'Disabled'}</label>;
  if (type === 'enum') return <select value={String(value)} onChange={(event) => onChange(event.target.value)} className={inputClass}>{Object.keys(schema._def.entries).map((entry) => <option key={entry}>{entry}</option>)}</select>;
  if (type === 'tuple') return <div className="grid grid-cols-2 gap-2">{schema._def.items.map((item: SchemaLike, index: number) => <SchemaPropertyEditor key={index} schema={item} value={(value as unknown[])[index]} path={[...path, String(index)]} content={content} onChange={(next) => onChange((value as unknown[]).map((current, itemIndex) => itemIndex === index ? next : current))}/>)}</div>;
  if (type === 'array') {
    const list = value as unknown[];
    if (['tags', 'traits', 'behaviorFlags'].includes(field)) return <TagsEditor value={list as string[]} onChange={onChange}/>;
    if (['conditions', 'requirements'].includes(field)) return <VariantListEditor kind="condition" value={list} content={content} path={path} onChange={onChange}/>;
    if (field === 'effects') return <VariantListEditor kind="effect" value={list} content={content} path={path} onChange={onChange}/>;
    const element = schema._def.element as SchemaLike;
    const elementReference = referenceCollection([...path, field.endsWith('Ids') ? field.slice(0, -1) : ''], content);
    return <div className="space-y-2">{list.map((entry, index) => <div key={index} className="flex items-start gap-2 rounded border border-zinc-800 p-2"><div className="min-w-0 flex-1">{elementReference && unwrap(element).schema._def.type === 'string' ? <EntityReferenceEditor value={String(entry)} entities={elementReference} onChange={(next) => onChange(list.map((item, itemIndex) => itemIndex === index ? next : item))}/> : <SchemaPropertyEditor schema={element} value={entry} path={[...path, String(index)]} content={content} onChange={(next) => onChange(list.map((item, itemIndex) => itemIndex === index ? next : item))}/>}</div><button type="button" onClick={() => onChange(list.filter((_, itemIndex) => itemIndex !== index))} className="p-2 text-rose-400"><Trash2 className="h-4 w-4"/></button></div>)}<button type="button" onClick={() => onChange([...list, elementReference ? '' : createValue(element)])} className="flex items-center gap-1 rounded border border-cyan-500/30 px-3 py-2 text-xs text-cyan-300"><Plus className="h-3.5 w-3.5"/> Add entry</button></div>;
  }
  if (type === 'object') {
    const objectValue = value as Record<string, unknown>;
    return <div className="space-y-3 rounded border border-zinc-800 bg-black/20 p-3">{Object.entries(schema._def.shape).map(([key, child]) => <label key={key} className="block"><span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">{labelFor(key)}</span><SchemaPropertyEditor schema={child as SchemaLike} value={objectValue[key]} path={[...path, key]} content={content} onChange={(next) => { const copy = { ...objectValue }; if (next === undefined) delete copy[key]; else copy[key] = next; onChange(copy); }}/></label>)}</div>;
  }
  return <textarea value={JSON.stringify(value, null, 2)} onChange={(event) => { try { onChange(JSON.parse(event.target.value)); } catch {} }} className={`${inputClass} min-h-24`}/>;
};
