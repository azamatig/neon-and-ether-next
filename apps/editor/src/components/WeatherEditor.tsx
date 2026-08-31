import React, { useState } from 'react';
import type { GameContent, WeatherDefinition } from '@neon-ether/game-schema';
import { EnvironmentalLayer } from '@neon-ether/shared-ui';
import { SchemaPropertyEditor } from './SchemaPropertyEditor.tsx';
import { WeatherDefinitionSchema } from '@neon-ether/game-schema';
export const WeatherEditor:React.FC<{definition:WeatherDefinition;content:GameContent;onChange:(value:unknown)=>void}>=({definition,content,onChange})=>{
 const [previewId,setPreviewId]=useState(definition.id);const preview=content.weatherDefinitions.find((value)=>value.id===previewId)??definition;
 return <div className="space-y-4"><section className="relative min-h-48 overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-800 via-zinc-900 to-purple-950 p-5"><EnvironmentalLayer visuals={preview.visuals} label={`${preview.name} preview`}/><div className="relative z-30"><p className="text-[10px] uppercase tracking-widest text-cyan-300">Development-only visual preview</p><h3 className="mt-2 text-xl font-bold text-white">{preview.name}</h3><p className="max-w-lg text-xs text-zinc-300">{preview.description}</p></div><select className="absolute bottom-3 right-3 z-30 rounded border border-zinc-700 bg-black/80 p-2 text-xs" value={previewId} onChange={(event)=>setPreviewId(event.target.value)}>{content.weatherDefinitions.map((value)=><option key={value.id} value={value.id}>{value.name}</option>)}</select></section><SchemaPropertyEditor schema={WeatherDefinitionSchema} value={definition} content={content} onChange={onChange}/></div>;
};
