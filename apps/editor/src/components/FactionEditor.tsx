import React from 'react';
import { Faction, FactionRelationValue, FactionRelationValueSchema, FactionSchema, GameContent } from '@neon-ether/game-schema';
import { SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';

const fieldsSchema=FactionSchema.omit({defaultRelations:true});
const relationValues=Object.keys((FactionRelationValueSchema as any)._def.entries) as FactionRelationValue[];

export const FactionEditor:React.FC<{faction:Faction;content:GameContent;onChange:(value:Faction)=>void;onChangeFactions:(value:Faction[])=>void}>=({faction,content,onChange,onChangeFactions})=>{
  const relationTo=(source:Faction,targetId:string)=>source.defaultRelations.find((entry)=>entry.factionId===targetId)?.relation??'neutral';
  const setRelation=(sourceId:string,targetId:string,relation:FactionRelationValue)=>onChangeFactions(content.factions.map((source)=>{if(source.id!==sourceId)return source;const exists=source.defaultRelations.some((entry)=>entry.factionId===targetId);return{...source,defaultRelations:exists?source.defaultRelations.map((entry)=>entry.factionId===targetId?{...entry,relation}:entry):[...source.defaultRelations,{factionId:targetId,relation}]};}));
  return <div className="space-y-4">
    <header className="rounded border border-purple-500/30 bg-purple-950/10 p-4"><p className="text-xs font-bold text-white">Faction Definition</p><p className="text-[10px] text-zinc-500">Content defaults; player reputation and diplomacy changes remain runtime state.</p></header>
    <SchemaPropertyEditor schema={fieldsSchema as any} value={faction} content={content} onChange={(next)=>onChange({...next as Faction,defaultRelations:faction.defaultRelations})}/>
    <section className="overflow-auto rounded border border-zinc-800 bg-black/20 p-4"><h3 className="mb-3 text-xs font-bold text-cyan-300">Initial faction relations matrix</h3><table className="w-full min-w-[560px] text-xs"><thead><tr><th className="p-2 text-left text-zinc-500">Source</th>{content.factions.map((target)=><th key={target.id} className="p-2 text-left text-[9px] text-zinc-500">{target.shortName??target.name}</th>)}</tr></thead><tbody>{content.factions.map((source)=><tr key={source.id}><td className="p-2 font-bold text-white">{source.shortName??source.name}</td>{content.factions.map((target)=><td key={target.id} className="p-2">{target.id===source.id?<span className="text-zinc-700">—</span>:<select value={relationTo(source,target.id)} onChange={(event)=>setRelation(source.id,target.id,event.target.value as FactionRelationValue)} className="w-full rounded border border-zinc-700 bg-zinc-950 p-2">{relationValues.map((value)=><option key={value}>{value}</option>)}</select>}</td>)}</tr>)}</tbody></table></section>
    <section className="rounded border border-zinc-800 p-4"><h3 className="mb-2 text-xs font-bold text-cyan-300">Reputation tier preview</h3><div className="flex flex-wrap gap-2">{[...faction.reputationTiers].sort((a,b)=>a.minimumReputation-b.minimumReputation).map((tier)=><article key={tier.id} className={`rounded border p-3 ${tier.hostile?'border-rose-500/40 bg-rose-950/20':'border-zinc-700'}`}><p className="font-bold text-white">{tier.name}</p><p className="text-[9px] text-zinc-500">≥ {tier.minimumReputation} · {tier.id}</p></article>)}</div></section>
  </div>;
};
