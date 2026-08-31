import React, { useEffect, useMemo, useState } from 'react';
import type { Quest, QuestStage } from '@neon-ether/game-schema';
import { GitBranch, Plus, Trash2 } from 'lucide-react';

interface QuestGraphEditorProps {
  quest: Quest;
  onChange: (quest: Quest) => void;
}

interface PositionedStage {
  stage: QuestStage;
  x: number;
  y: number;
}

const NODE_WIDTH = 210;
const NODE_HEIGHT = 104;
const COLUMN_GAP = 90;
const ROW_GAP = 42;
const PADDING = 40;

/** A projection of Quest.stages: graph layout is derived and is never persisted. */
export const QuestGraphEditor: React.FC<QuestGraphEditorProps> = ({ quest, onChange }) => {
  const [selectedStageId, setSelectedStageId] = useState(quest.initialStageId);
  const [branchTargetId, setBranchTargetId] = useState('');
  const stages = quest.stages as Record<string, QuestStage>;

  useEffect(() => {
    if (!stages[selectedStageId]) setSelectedStageId(quest.initialStageId);
  }, [quest, selectedStageId]);

  const positioned = useMemo<PositionedStage[]>(() => {
    const levels = new Map<number, QuestStage[]>();
    Object.values(stages).sort((a, b) => a.stageNumber - b.stageNumber || a.id.localeCompare(b.id)).forEach((stage) => {
      const group = levels.get(stage.stageNumber) ?? [];
      group.push(stage);
      levels.set(stage.stageNumber, group);
    });
    const orderedLevels = [...levels.keys()].sort((a, b) => a - b);
    return orderedLevels.flatMap((level, column) => (levels.get(level) ?? []).map((stage, row) => ({
      stage,
      x: PADDING + column * (NODE_WIDTH + COLUMN_GAP),
      y: PADDING + row * (NODE_HEIGHT + ROW_GAP),
    })));
  }, [stages]);

  const positionById = new Map<string, PositionedStage>(positioned.map((node) => [node.stage.id, node]));
  const width = Math.max(720, ...positioned.map((node) => node.x + NODE_WIDTH + PADDING));
  const height = Math.max(360, ...positioned.map((node) => node.y + NODE_HEIGHT + PADDING));
  const selectedStage = stages[selectedStageId];

  const updateStage = (stageId: string, update: (stage: QuestStage) => QuestStage) => {
    onChange({ ...quest, stages: { ...stages, [stageId]: update(stages[stageId]) } });
  };

  const addStage = () => {
    let index = Object.keys(stages).length + 1;
    while (stages[`stage_${String(index).padStart(2, '0')}`]) index += 1;
    const id = `stage_${String(index).padStart(2, '0')}`;
    const stageNumber = Math.max(0, ...Object.values(stages).map((stage) => stage.stageNumber)) + 1;
    const stage: QuestStage = { id, stageNumber, title: 'New Stage', journalEntry: '', objectives: [], entryConditions: [], completionConditions: [], actions: [], entryEffects: [], completionEffects: [], branches: [] };
    onChange({ ...quest, stages: { ...stages, [id]: stage } });
    setSelectedStageId(id);
  };

  const deleteStage = () => {
    if (!selectedStage || selectedStage.id === quest.initialStageId || Object.keys(stages).length === 1) return;
    const nextStages = Object.fromEntries(Object.entries(stages).filter(([id]) => id !== selectedStage.id).map(([id, stage]) => [id, {
      ...stage,
      nextStageId: stage.nextStageId === selectedStage.id ? undefined : stage.nextStageId,
      actions: stage.actions.map((action) => action.targetStageId === selectedStage.id ? { ...action, targetStageId: undefined } : action),
      branches: stage.branches.filter((branch) => branch.targetStageId !== selectedStage.id),
    }])) as Quest['stages'];
    onChange({ ...quest, stages: nextStages });
    setSelectedStageId(quest.initialStageId);
  };

  const addBranch = () => {
    if (!selectedStage || !branchTargetId || branchTargetId === selectedStage.id) return;
    let index = selectedStage.branches.length + 1;
    while (selectedStage.branches.some((branch) => branch.id === `branch_${index}`)) index += 1;
    updateStage(selectedStage.id, (stage) => ({ ...stage, branches: [...stage.branches, { id: `branch_${index}`, label: `Branch to ${stages[branchTargetId].title}`, conditions: [], effects: [], targetStageId: branchTargetId }] }));
    setBranchTargetId('');
  };

  const edges = positioned.flatMap(({ stage }) => [
    ...(stage.nextStageId ? [{ id: `${stage.id}:next`, source: stage.id, target: stage.nextStageId, kind: 'next' }] : []),
    ...stage.actions.flatMap((action) => action.targetStageId ? [{ id: `${stage.id}:action:${action.id}`, source: stage.id, target: action.targetStageId, kind: 'action' }] : []),
    ...stage.branches.map((branch) => ({ id: `${stage.id}:branch:${branch.id}`, source: stage.id, target: branch.targetStageId, kind: 'branch' })),
  ]).filter((edge) => positionById.has(edge.target));

  return <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
    <div className="overflow-auto rounded border border-cyan-500/20 bg-[#030610]">
      <div className="relative" style={{ width, height }}>
        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-label="Quest stage connections">
          <defs><marker id="quest-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#22d3ee"/></marker></defs>
          {edges.map((edge) => {
            const source = positionById.get(edge.source)!; const target = positionById.get(edge.target)!;
            const x1 = source.x + NODE_WIDTH; const y1 = source.y + NODE_HEIGHT / 2; const x2 = target.x; const y2 = target.y + NODE_HEIGHT / 2;
            return <path key={edge.id} d={`M ${x1} ${y1} C ${x1 + 44} ${y1}, ${x2 - 44} ${y2}, ${x2} ${y2}`} fill="none" stroke={edge.kind === 'branch' ? '#a855f7' : edge.kind === 'action' ? '#f59e0b' : '#22d3ee'} strokeWidth="2" strokeDasharray={edge.kind === 'next' ? undefined : '5 4'} markerEnd="url(#quest-arrow)"/>;
          })}
        </svg>
        {positioned.map(({ stage, x, y }) => <button type="button" key={stage.id} onClick={() => setSelectedStageId(stage.id)} style={{ left: x, top: y, width: NODE_WIDTH, height: NODE_HEIGHT }} className={`absolute rounded-lg border p-3 text-left shadow-xl transition ${selectedStageId === stage.id ? 'border-cyan-300 bg-cyan-950/70' : 'border-zinc-700 bg-[#090c18] hover:border-cyan-700'}`}>
          <span className="block text-[9px] uppercase tracking-widest text-cyan-400">Stage {stage.stageNumber}{stage.id === quest.initialStageId ? ' · Entry' : ''}</span>
          <strong className="mt-1 block truncate text-xs text-white">{stage.title}</strong>
          <span className="mt-2 block text-[9px] text-zinc-500">{stage.objectives.length} objectives · {stage.actions.length} actions · {stage.branches.length} branches</span>
          <span className="mt-1 block truncate text-[9px] text-zinc-600">{stage.id}</span>
        </button>)}
      </div>
    </div>
    <aside className="rounded border border-zinc-800 bg-black/30 p-3">
      <div className="mb-3 flex gap-2"><button type="button" onClick={addStage} className="flex flex-1 items-center justify-center gap-1 rounded border border-cyan-500/40 p-2 text-xs text-cyan-300"><Plus className="h-3.5 w-3.5"/> Stage</button><button type="button" onClick={deleteStage} disabled={!selectedStage || selectedStage.id === quest.initialStageId} className="rounded border border-rose-500/30 p-2 text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div>
      {selectedStage && <div className="space-y-3"><div><span className="text-[9px] uppercase text-zinc-500">Selected node</span><div className="text-xs text-cyan-300">{selectedStage.id}</div></div><label className="block text-[9px] uppercase text-zinc-500">Title<input value={selectedStage.title} onChange={(event) => updateStage(selectedStage.id, (stage) => ({ ...stage, title: event.target.value }))} className="mt-1 w-full rounded border border-zinc-700 bg-[#060812] p-2 text-xs text-white"/></label><label className="block text-[9px] uppercase text-zinc-500">Journal entry<textarea value={selectedStage.journalEntry} onChange={(event) => updateStage(selectedStage.id, (stage) => ({ ...stage, journalEntry: event.target.value }))} className="mt-1 min-h-20 w-full rounded border border-zinc-700 bg-[#060812] p-2 text-xs normal-case text-white"/></label><label className="block text-[9px] uppercase text-zinc-500">Default next stage<select value={selectedStage.nextStageId ?? ''} onChange={(event) => updateStage(selectedStage.id, (stage) => ({ ...stage, nextStageId: event.target.value || undefined }))} className="mt-1 w-full rounded border border-zinc-700 bg-[#060812] p-2 text-xs normal-case text-white"><option value="">Complete quest / branch only</option>{Object.values(stages).filter((stage) => stage.id !== selectedStage.id).map((stage) => <option key={stage.id} value={stage.id}>{stage.title} · {stage.id}</option>)}</select></label><div className="border-t border-zinc-800 pt-3"><span className="text-[9px] uppercase text-zinc-500">Add unconditional branch</span><div className="mt-1 flex gap-1"><select value={branchTargetId} onChange={(event) => setBranchTargetId(event.target.value)} className="min-w-0 flex-1 rounded border border-zinc-700 bg-[#060812] p-2 text-xs text-white"><option value="">Target…</option>{Object.values(stages).filter((stage) => stage.id !== selectedStage.id).map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select><button type="button" onClick={addBranch} disabled={!branchTargetId} className="rounded border border-purple-500/40 p-2 text-purple-300 disabled:opacity-30"><GitBranch className="h-4 w-4"/></button></div><p className="mt-2 text-[9px] leading-relaxed text-zinc-600">Edit branch conditions and effects in Inspector. Both views mutate the same Quest definition.</p></div></div>}
    </aside>
  </div>;
};
