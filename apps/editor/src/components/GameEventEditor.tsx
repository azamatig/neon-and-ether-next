import React, { useEffect, useState } from 'react';
import {
  EventChoiceCheckSchema,
  EventChoiceSchema,
  EventPresentationSchema,
  EventStepSchema,
  GameContent,
  GameEvent,
  GameEventTypeSchema,
} from '@neon-ether/game-schema';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { EntityReferenceEditor, SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';
import { GameplayOutcomeEditor } from './GameplayOutcomeEditor.tsx';
import { PresetControl } from '../presets/authoring-presets.tsx';

type Step = GameEvent['steps'][number];
type Choice = Step['choices'][number];

const checkFieldsSchema = EventChoiceCheckSchema.omit({ passOutcome: true, partialOutcome: true, failOutcome: true });
const choiceFieldsSchema = EventChoiceSchema.omit({ check: true, outcome: true, nextStepId: true });
const stepFieldsSchema = EventStepSchema.omit({ choices: true, outcome: true, nextStepId: true });

function uniqueId(prefix: string, ids: string[]): string {
  let index = ids.length + 1;
  while (ids.includes(`${prefix}_${String(index).padStart(2, '0')}`)) index += 1;
  return `${prefix}_${String(index).padStart(2, '0')}`;
}

function move<T>(values: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= values.length) return values;
  const next = [...values];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const StepTargetEditor: React.FC<{ value?: string | null; steps: Step[]; excludedId?: string; onChange: (value: string | undefined) => void }> = ({ value, steps, excludedId, onChange }) => (
  <EntityReferenceEditor value={value ?? ''} entities={steps.filter((step) => step.id !== excludedId).map((step) => ({ id: step.id, name: step.title || step.text || step.id }))} optional onChange={onChange}/>
);

export const GameEventEditor: React.FC<{ event: GameEvent; content: GameContent; onChange: (event: GameEvent) => void }> = ({ event, content, onChange }) => {
  const [selectedStepId, setSelectedStepId] = useState(event.steps[0]?.id ?? '');
  const selectedIndex = Math.max(0, event.steps.findIndex((step) => step.id === selectedStepId));
  const selectedStep = event.steps[selectedIndex];

  useEffect(() => {
    if (!event.steps.some((step) => step.id === selectedStepId)) setSelectedStepId(event.steps[0]?.id ?? '');
  }, [event.steps, selectedStepId]);

  const updateStep = (next: Step) => onChange({ ...event, steps: event.steps.map((step) => step.id === selectedStepId ? next : step) });
  const addStep = () => {
    const id = uniqueId('step', event.steps.map((step) => step.id));
    onChange({ ...event, steps: [...event.steps, { id, type: 'narration', text: '', conditions: [], effects: [], choices: [] }] });
    setSelectedStepId(id);
  };
  const duplicateStep = () => {
    if (!selectedStep) return;
    const id = uniqueId('step', event.steps.map((step) => step.id));
    const choices = selectedStep.choices.map((choice, index) => ({ ...structuredClone(choice), id: `${id}_choice_${index + 1}` }));
    onChange({ ...event, steps: [...event.steps, { ...structuredClone(selectedStep), id, choices }] });
    setSelectedStepId(id);
  };
  const deleteStep = () => {
    if (!selectedStep || event.steps.length === 1) return;
    const next = event.steps.filter((step) => step.id !== selectedStep.id).map((step) => ({ ...step, nextStepId: step.nextStepId === selectedStep.id ? undefined : step.nextStepId, choices: step.choices.map((choice) => choice.nextStepId === selectedStep.id ? { ...choice, nextStepId: undefined } : choice) }));
    onChange({ ...event, steps: next });
    setSelectedStepId(next[Math.min(selectedIndex, next.length - 1)].id);
  };
  const updateChoice = (choiceId: string, next: Choice) => selectedStep && updateStep({ ...selectedStep, choices: selectedStep.choices.map((choice) => choice.id === choiceId ? next : choice) });
  const outcomeSteps = event.steps.map((step) => ({ id: step.id, name: step.title || step.text || step.id }));

  return <div className="space-y-4">
    <section className="grid gap-3 rounded-lg border border-purple-500/25 bg-purple-950/10 p-4 lg:grid-cols-2">
      <label><span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Event type</span><SchemaPropertyEditor schema={GameEventTypeSchema as any} value={event.type} content={content} onChange={(type) => onChange({ ...event, type: type as GameEvent['type'] })}/></label>
      <label><span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">One shot</span><input type="checkbox" checked={event.isOneShot} onChange={(e) => onChange({ ...event, isOneShot: e.target.checked })} className="mt-2 accent-purple-400"/></label>
      <div className="lg:col-span-2"><span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Presentation / background / image</span><SchemaPropertyEditor schema={EventPresentationSchema as any} value={event.presentation} content={content} onChange={(presentation) => onChange({ ...event, presentation: presentation as GameEvent['presentation'] })}/></div>
    </section>

    <section className="grid min-h-[480px] gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border border-zinc-800 bg-black/25 p-3">
        <header className="mb-3 flex items-center justify-between"><div><p className="text-[10px] uppercase text-purple-300">Ordered scene</p><p className="text-[10px] text-zinc-500">{event.steps.length} steps</p></div><button type="button" onClick={addStep} className="rounded border border-cyan-500/40 p-2 text-cyan-300"><Plus className="h-4 w-4"/></button></header>
        <div className="space-y-1">{event.steps.map((step, index) => <button type="button" key={step.id} onClick={() => setSelectedStepId(step.id)} className={`w-full rounded border p-2 text-left ${step.id === selectedStepId ? 'border-purple-400 bg-purple-950/40' : 'border-zinc-800 bg-zinc-950/50'}`}><span className="flex items-center gap-2 text-[10px] uppercase text-purple-300"><b>{index + 1}</b> {step.type}</span><span className="block truncate text-xs text-white">{step.title || step.text || 'Untitled step'}</span><span className="block truncate text-[9px] text-zinc-600">{step.id}</span></button>)}</div>
      </aside>

      {selectedStep && <article className="space-y-3 rounded-lg border border-zinc-800 bg-black/20 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] uppercase text-cyan-400">Step {selectedIndex + 1}</p><h3 className="text-sm font-bold text-white">{selectedStep.title || selectedStep.id}</h3></div><div className="flex gap-1"><button type="button" title="Move up" onClick={() => onChange({ ...event, steps: move(event.steps, selectedIndex, -1) })} disabled={selectedIndex === 0} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5"/></button><button type="button" title="Move down" onClick={() => onChange({ ...event, steps: move(event.steps, selectedIndex, 1) })} disabled={selectedIndex === event.steps.length - 1} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5"/></button><button type="button" title="Duplicate" onClick={duplicateStep} className="rounded border border-zinc-700 p-2"><Copy className="h-3.5 w-3.5"/></button><button type="button" title="Delete" onClick={deleteStep} disabled={event.steps.length === 1} className="rounded border border-rose-500/30 p-2 text-rose-400 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5"/></button></div></header>
        <SchemaPropertyEditor schema={stepFieldsSchema as any} value={selectedStep} content={content} onChange={(next) => updateStep({ ...(next as Step), choices: selectedStep.choices, nextStepId: selectedStep.nextStepId, outcome: selectedStep.outcome })}/>
        <label className="block"><span className="mb-1 block text-[10px] uppercase text-zinc-500">Automatic next step</span><StepTargetEditor value={selectedStep.nextStepId} steps={event.steps} excludedId={selectedStep.id} onChange={(nextStepId) => updateStep({ ...selectedStep, nextStepId })}/></label>
        <GameplayOutcomeEditor label="Step outcome / event chaining" value={selectedStep.outcome} content={content} fallbackSteps={outcomeSteps} onChange={(outcome) => updateStep({ ...selectedStep, outcome })}/>

        <section className="space-y-3 border-t border-zinc-800 pt-3"><header className="flex items-center justify-between"><div><p className="text-[10px] uppercase text-purple-300">Choices</p><p className="text-[10px] text-zinc-500">Ordered options, checks, effects and outcomes</p></div><button type="button" onClick={() => { const id = uniqueId('choice', selectedStep.choices.map((choice) => choice.id)); updateStep({ ...selectedStep, choices: [...selectedStep.choices, { id, text: 'New choice', conditions: [], effects: [], hideIfUnavailable: false }] }); }} className="flex items-center gap-1 rounded border border-cyan-500/40 px-3 py-2 text-xs text-cyan-300"><Plus className="h-3.5 w-3.5"/> Choice</button></header>
          {selectedStep.choices.map((choice, choiceIndex) => <details key={choice.id} open={choiceIndex === 0} className="rounded border border-zinc-700 bg-zinc-950/40 p-3"><summary className="cursor-pointer text-xs font-bold text-white">{choiceIndex + 1}. {choice.text || choice.id}</summary><div className="mt-3 space-y-3">
            <div className="flex justify-end"><PresetControl kind="eventChoice" value={choice} onApply={(payload: Choice) => updateChoice(choice.id, { ...payload, id: choice.id })}/></div>
            <SchemaPropertyEditor schema={choiceFieldsSchema as any} value={choice} content={content} onChange={(next) => updateChoice(choice.id, { ...(next as Choice), check: choice.check, outcome: choice.outcome, nextStepId: choice.nextStepId })}/>
            <label className="block"><span className="mb-1 block text-[10px] uppercase text-zinc-500">Next step</span><StepTargetEditor value={choice.nextStepId} steps={event.steps} excludedId={selectedStep.id} onChange={(nextStepId) => updateChoice(choice.id, { ...choice, nextStepId })}/></label>
            <div className="flex justify-end"><PresetControl kind="skillCheck" value={choice.check ?? { attribute: 'body', difficulty: 'Moderate', modifiers: [] }} onApply={(check) => updateChoice(choice.id, { ...choice, check: { ...check, passEffects: [], partialEffects: [], failEffects: [] } })}/></div><section className="rounded border border-zinc-800 p-3"><header className="mb-2 flex justify-between"><span className="text-[10px] uppercase text-amber-300">Skill check</span>{choice.check && <button type="button" onClick={() => updateChoice(choice.id, { ...choice, check: undefined })} className="text-rose-400"><Trash2 className="h-3.5 w-3.5"/></button>}</header>{choice.check ? <><SchemaPropertyEditor schema={checkFieldsSchema as any} value={choice.check} content={content} onChange={(check) => updateChoice(choice.id, { ...choice, check: { ...(check as NonNullable<Choice['check']>), passOutcome: choice.check?.passOutcome, partialOutcome: choice.check?.partialOutcome, failOutcome: choice.check?.failOutcome } })}/><div className="mt-3 grid gap-2 xl:grid-cols-3"><GameplayOutcomeEditor label="Success outcome" value={choice.check.passOutcome} content={content} fallbackSteps={outcomeSteps} onChange={(passOutcome) => updateChoice(choice.id, { ...choice, check: { ...choice.check!, passOutcome } })}/><GameplayOutcomeEditor label="Partial outcome" value={choice.check.partialOutcome} content={content} fallbackSteps={outcomeSteps} onChange={(partialOutcome) => updateChoice(choice.id, { ...choice, check: { ...choice.check!, partialOutcome } })}/><GameplayOutcomeEditor label="Failure outcome" value={choice.check.failOutcome} content={content} fallbackSteps={outcomeSteps} onChange={(failOutcome) => updateChoice(choice.id, { ...choice, check: { ...choice.check!, failOutcome } })}/></div></> : <button type="button" onClick={() => updateChoice(choice.id, { ...choice, check: { attribute: 'body', difficulty: 'Moderate', modifiers: [], passEffects: [], partialEffects: [], failEffects: [] } })} className="rounded border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400">+ Add data-driven check</button>}</section>
            <GameplayOutcomeEditor label="Choice outcome / event chaining" value={choice.outcome} content={content} fallbackSteps={outcomeSteps} onChange={(outcome) => updateChoice(choice.id, { ...choice, outcome })}/>
            <div className="flex justify-end gap-1"><button type="button" onClick={() => updateStep({ ...selectedStep, choices: move(selectedStep.choices, choiceIndex, -1) })} disabled={choiceIndex === 0} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5"/></button><button type="button" onClick={() => updateStep({ ...selectedStep, choices: move(selectedStep.choices, choiceIndex, 1) })} disabled={choiceIndex === selectedStep.choices.length - 1} className="rounded border border-zinc-700 p-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5"/></button><button type="button" onClick={() => { const id = uniqueId('choice', selectedStep.choices.map((item) => item.id)); updateStep({ ...selectedStep, choices: [...selectedStep.choices, { ...structuredClone(choice), id }] }); }} className="rounded border border-zinc-700 p-2"><Copy className="h-3.5 w-3.5"/></button><button type="button" onClick={() => updateStep({ ...selectedStep, choices: selectedStep.choices.filter((item) => item.id !== choice.id) })} className="rounded border border-rose-500/30 p-2 text-rose-400"><Trash2 className="h-3.5 w-3.5"/></button></div>
          </div></details>)}
        </section>
      </article>}
    </section>

    <details className="rounded-lg border border-zinc-800 bg-black/20 p-4"><summary className="cursor-pointer text-xs font-bold text-white">Event lifecycle conditions and effects</summary><div className="mt-3 grid gap-3 lg:grid-cols-2">{(['conditions','triggerConditions','availabilityConditions','entryEffects','completionEffects'] as const).map((field) => <label key={field}><span className="mb-1 block text-[10px] uppercase text-zinc-500">{field}</span><SchemaPropertyEditor schema={(GameEventSchemaShape[field] as any)} value={event[field]} content={content} onChange={(value) => onChange({ ...event, [field]: value })}/></label>)}</div><div className="mt-3"><GameplayOutcomeEditor label="Completion outcome / event chaining" value={event.completionOutcome} content={content} fallbackSteps={outcomeSteps} onChange={(completionOutcome) => onChange({ ...event, completionOutcome })}/></div></details>
  </div>;
};

const GameEventSchemaShape = {
  conditions: EventStepSchema.shape.conditions,
  triggerConditions: EventStepSchema.shape.conditions,
  availabilityConditions: EventStepSchema.shape.conditions,
  entryEffects: EventStepSchema.shape.effects,
  completionEffects: EventStepSchema.shape.effects,
};
