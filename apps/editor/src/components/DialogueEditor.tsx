import React, { useState } from 'react';
import { DialogueChoiceSchema, type DialogueTree, type GameContent } from '@neon-ether/game-schema';
import { SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';

export const DialogueEditor: React.FC<{ tree: DialogueTree; content: GameContent; onChange: (value: DialogueTree) => void }> = ({ tree, content, onChange }) => {
  const [nodeId, setNodeId] = useState(tree.rootNodeId);
  const node = tree.nodes[nodeId] ?? Object.values(tree.nodes)[0];
  if (!node) return <p className="text-slate-400">Add a dialogue node to begin authoring.</p>;
  const changeNode = (next: typeof node) => onChange({ ...tree, nodes: { ...tree.nodes, [node.id]: next } });
  const addChoice = () => changeNode({ ...node, choices: [...node.choices, { id: `choice_${node.choices.length + 1}`, text: 'New response', playerLine: 'New response', type: 'Normal', conditions: [], unmetBehavior: 'DISABLED', effects: [], targetNodeId: null, intentionalLoop: false }] });
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">{(Object.values(tree.nodes) as Array<typeof node>).map((entry) => <button type="button" className={`rounded border px-3 py-1 ${entry.id === node.id ? 'border-cyan-400 text-cyan-200' : 'border-slate-700'}`} onClick={() => setNodeId(entry.id)} key={entry.id}>{entry.id}</button>)}</div>
    <label className="block text-xs text-slate-400">NPC LINE<textarea className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100" value={node.text} onChange={(event) => changeNode({ ...node, text: event.target.value })} /></label>
    <div className="rounded border border-violet-500/40 bg-slate-950 p-4"><small className="text-violet-300">CONVERSATION PREVIEW</small><h3 className="mt-2 font-bold">{node.speakerName}</h3><p>{node.text}</p><div className="mt-3 space-y-2">{node.choices.map((choice) => <div className="rounded border border-cyan-500/30 p-2" key={choice.id}>{choice.label && <small className="text-cyan-300">[{choice.label}] </small>}{choice.text}</div>)}</div></div>
    {node.choices.map((choice, index) => <details open key={choice.id} className="rounded border border-slate-700 p-3"><summary>Choice {index + 1}: {choice.text}</summary><SchemaPropertyEditor schema={DialogueChoiceSchema} value={choice} content={content} onChange={(next) => changeNode({ ...node, choices: node.choices.map((entry) => entry.id === choice.id ? next as typeof choice : entry) })} /></details>)}
    <button type="button" className="rounded border border-cyan-500 px-3 py-2 text-cyan-200" onClick={addChoice}>ADD PLAYER CHOICE</button>
  </div>;
};
