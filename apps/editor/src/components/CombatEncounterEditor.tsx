import React, { useState } from 'react';
import {
  CombatEncounter,
  CombatEncounterSchema,
  EnemyGroupSetupSchema,
  EncounterModifierSchema,
  EscapeRulesSchema,
  GameContent,
} from '@neon-ether/game-schema';
import { ArrowDown, ArrowUp, Copy, Play, Plus, Trash2 } from 'lucide-react';
import { PlaytestController } from '../playtest/PlaytestController.ts';
import { GameplayOutcomeEditor } from './GameplayOutcomeEditor.tsx';
import { SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';

const identitySchema = CombatEncounterSchema.pick({ id: true, name: true, description: true, tags: true, threatLevel: true });
const environmentSchema = CombatEncounterSchema.shape.environment;
const initialConditionsSchema = CombatEncounterSchema.shape.initialConditions;
const escapeFieldsSchema = EscapeRulesSchema.omit({ outcomeOnEscape: true });
const rewardsSchema = CombatEncounterSchema.pick({ lootTable: true, creditsReward: true, xpReward: true, survivingEnemyActions: true, surrenderOutcome: true });

function move<T>(values: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= values.length) return values;
  const next = [...values];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function uniqueModifierId(encounter: CombatEncounter): string {
  let index = encounter.modifiers.length + 1;
  while (encounter.modifiers.some((modifier) => modifier.id === `modifier_${String(index).padStart(2, '0')}`)) index += 1;
  return `modifier_${String(index).padStart(2, '0')}`;
}

export const CombatEncounterEditor: React.FC<{ encounter: CombatEncounter; content: GameContent; onChange: (encounter: CombatEncounter) => void }> = ({ encounter, content, onChange }) => {
  const [playtestStatus, setPlaytestStatus] = useState('');
  const updateSection = (next: unknown) => onChange({ ...encounter, ...(next as Partial<CombatEncounter>) });
  const quickPlaytest = () => {
    const started = new PlaytestController(content).launchEncounterInGame(encounter.id);
    setPlaytestStatus(started ? 'Encounter launched in Game.' : 'Encounter is unavailable: check initial conditions and references.');
  };

  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-500/25 bg-purple-950/10 p-4"><div><p className="text-[10px] uppercase text-purple-300">Canonical CombatEncounter</p><p className="text-xs text-zinc-400">Edit and playtest the same definition consumed by combat runtime.</p>{playtestStatus && <p className="mt-1 text-[10px] text-amber-300">{playtestStatus}</p>}</div><button type="button" onClick={quickPlaytest} className="flex items-center gap-2 rounded border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-xs text-purple-300"><Play className="h-3.5 w-3.5"/> Quick playtest</button></header>

    <div className="grid gap-3 xl:grid-cols-2">
      <EditorSection title="Identity and threat"><SchemaPropertyEditor schema={identitySchema as any} value={encounter} content={content} onChange={updateSection}/></EditorSection>
      <EditorSection title="Environment"><SchemaPropertyEditor schema={environmentSchema as any} value={encounter.environment} content={content} onChange={(environment) => onChange({ ...encounter, environment: environment as CombatEncounter['environment'] })}/></EditorSection>
      <EditorSection title="Initial conditions"><SchemaPropertyEditor schema={initialConditionsSchema as any} value={encounter.initialConditions} path={['initialConditions']} content={content} onChange={(initialConditions) => onChange({ ...encounter, initialConditions: initialConditions as CombatEncounter['initialConditions'] })}/></EditorSection>
      <EditorSection title="Escape rules"><SchemaPropertyEditor schema={escapeFieldsSchema as any} value={encounter.escapeRules} content={content} onChange={(escapeRules) => onChange({ ...encounter, escapeRules: { ...(escapeRules as CombatEncounter['escapeRules']), outcomeOnEscape: encounter.escapeRules.outcomeOnEscape } })}/><div className="mt-3"><GameplayOutcomeEditor label="Escape outcome" value={encounter.escapeRules.outcomeOnEscape} content={content} onChange={(outcomeOnEscape) => onChange({ ...encounter, escapeRules: { ...encounter.escapeRules, outcomeOnEscape } })}/></div></EditorSection>
    </div>

    <EditorSection title="Enemy groups and quantities"><div className="space-y-2">{encounter.enemyGroups.map((group, index) => <section key={`${group.enemyId}-${index}`} className="rounded border border-zinc-700 p-3"><SchemaPropertyEditor schema={EnemyGroupSetupSchema as any} value={group} content={content} onChange={(next) => onChange({ ...encounter, enemyGroups: encounter.enemyGroups.map((candidate, groupIndex) => groupIndex === index ? next as typeof group : candidate) })}/><div className="mt-2 flex justify-end gap-1"><button type="button" onClick={() => onChange({ ...encounter, enemyGroups: move(encounter.enemyGroups, index, -1) })} disabled={index === 0} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5"/></button><button type="button" onClick={() => onChange({ ...encounter, enemyGroups: move(encounter.enemyGroups, index, 1) })} disabled={index === encounter.enemyGroups.length - 1} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5"/></button><button type="button" onClick={() => onChange({ ...encounter, enemyGroups: [...encounter.enemyGroups, structuredClone(group)] })} className="rounded border border-zinc-700 p-2"><Copy className="h-3.5 w-3.5"/></button><button type="button" onClick={() => onChange({ ...encounter, enemyGroups: encounter.enemyGroups.filter((_, groupIndex) => groupIndex !== index) })} disabled={encounter.enemyGroups.length === 1} className="rounded border border-rose-500/30 p-2 text-rose-400 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5"/></button></div></section>)}<button type="button" onClick={() => onChange({ ...encounter, enemyGroups: [...encounter.enemyGroups, { enemyId: '', count: 1, threatTier: 'Standard', isBoss: false, isUnknown: false }] })} className="flex items-center gap-1 rounded border border-cyan-500/40 px-3 py-2 text-xs text-cyan-300"><Plus className="h-3.5 w-3.5"/> Enemy group</button></div></EditorSection>

    <section className="space-y-3 rounded-lg border border-zinc-800 bg-black/20 p-4"><header className="flex items-center justify-between"><div><h3 className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Special encounter modifiers</h3><p className="text-[10px] text-zinc-500">Conditional effects executed by the shared runtime when combat starts.</p></div><button type="button" onClick={() => { const id=uniqueModifierId(encounter);onChange({ ...encounter, modifiers: [...encounter.modifiers, { id, label: 'New modifier', conditions: [], effects: [] }] }); }} className="flex items-center gap-1 rounded border border-cyan-500/40 px-3 py-2 text-xs text-cyan-300"><Plus className="h-3.5 w-3.5"/> Modifier</button></header>{encounter.modifiers.map((modifier, index) => <section key={modifier.id} className="rounded border border-zinc-700 p-3"><SchemaPropertyEditor schema={EncounterModifierSchema as any} value={modifier} content={content} onChange={(next) => onChange({ ...encounter, modifiers: encounter.modifiers.map((candidate) => candidate.id === modifier.id ? next as typeof modifier : candidate) })}/><div className="mt-2 flex justify-end gap-1"><button type="button" onClick={() => onChange({ ...encounter, modifiers: move(encounter.modifiers, index, -1) })} disabled={index === 0} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5"/></button><button type="button" onClick={() => onChange({ ...encounter, modifiers: move(encounter.modifiers, index, 1) })} disabled={index === encounter.modifiers.length - 1} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5"/></button><button type="button" onClick={() => onChange({ ...encounter, modifiers: encounter.modifiers.filter((candidate) => candidate.id !== modifier.id) })} className="rounded border border-rose-500/30 p-2 text-rose-400"><Trash2 className="h-3.5 w-3.5"/></button></div></section>)}</section>

    <div className="grid gap-3 xl:grid-cols-2"><GameplayOutcomeEditor label="Victory outcome" value={encounter.victoryOutcome} content={content} onChange={(victoryOutcome) => onChange({ ...encounter, victoryOutcome })}/><GameplayOutcomeEditor label="Defeat outcome" value={encounter.defeatOutcome} content={content} onChange={(defeatOutcome) => onChange({ ...encounter, defeatOutcome })}/></div>
    <EditorSection title="Loot, rewards and post-combat actions"><SchemaPropertyEditor schema={rewardsSchema as any} value={encounter} content={content} onChange={updateSection}/></EditorSection>
  </div>;
};

const EditorSection: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => <section className="rounded-lg border border-zinc-800 bg-black/20 p-4"><h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-cyan-300">{title}</h3>{children}</section>;
