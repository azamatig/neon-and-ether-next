import React from 'react';
import { GameContent, GameplayOutcome, GameplayOutcomeSchema } from '@neon-ether/game-schema';
import { Trash2 } from 'lucide-react';
import { EntityReferenceEditor, SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';

export interface OutcomeStepReference {
  id: string;
  name: string;
}

export const GameplayOutcomeEditor: React.FC<{
  label: string;
  value?: GameplayOutcome;
  content: GameContent;
  fallbackSteps?: OutcomeStepReference[];
  onChange: (value: GameplayOutcome | undefined) => void;
}> = ({ label, value, content, fallbackSteps = [], onChange }) => {
  const targetSteps = value?.type === 'event'
    ? (content.events.find((event) => event.id === value.eventId)?.steps ?? []).map((step) => ({ id: step.id, name: step.title || step.text || step.id }))
    : [];
  const selectableSteps = targetSteps.length ? targetSteps : fallbackSteps;

  return <section className="rounded border border-zinc-800 bg-black/20 p-3">
    <header className="mb-2 flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-wider text-amber-300">{label}</span>
      {value && <button type="button" onClick={() => onChange(undefined)} className="text-rose-400"><Trash2 className="h-3.5 w-3.5"/></button>}
    </header>
    {value ? <>
      <SchemaPropertyEditor schema={GameplayOutcomeSchema as any} value={value} content={content} onChange={(next) => onChange(next as GameplayOutcome)}/>
      {value.type === 'event' && selectableSteps.length > 0 && <label className="mt-2 block">
        <span className="mb-1 block text-[10px] uppercase text-zinc-500">Target event step</span>
        <EntityReferenceEditor value={value.stepId ?? ''} entities={selectableSteps} optional onChange={(stepId) => onChange({ ...value, stepId })}/>
      </label>}
    </> : <button type="button" onClick={() => onChange({ type: 'noPresentation' })} className="rounded border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400">+ Add outcome / transition</button>}
  </section>;
};
