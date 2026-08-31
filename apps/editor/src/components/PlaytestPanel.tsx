import React, { useEffect, useState } from 'react';
import { FactionRelationValueSchema, type CharacterRelationshipStatus, type FactionRelationValue, type GameContent, type QuestStatus } from '@neon-ether/game-schema';
import { Play, RotateCcw, X } from 'lucide-react';
import { PlaytestController } from '../playtest/PlaytestController.ts';

const relationshipStates: CharacterRelationshipStatus[] = ['independent','companion','employee','servant','prisoner','enslaved'];
const questStates: QuestStatus[] = ['Unassigned','Active','Completed','Failed','Abandoned'];
const attributeKeys = ['body','reflexes','mind','etherTech','presence'];
const vitalKeys = ['maxHp','currentHp','maxEther','currentEther','actionPointsMax','actionPointsCurrent','initiative','armorRating','etherResistance'];
const factionRelations=Object.keys((FactionRelationValueSchema as any)._def.entries);

export function PlaytestPanel({ content, onClose }: { content: GameContent; onClose: () => void }) {
  const [controller] = useState(() => new PlaytestController(content));
  const [, refresh] = useState(0);
  const [tab, setTab] = useState<'tools'|'state'|'factions'|'log'>('tools');
  const [mapId, setMapId] = useState(content.maps[0]?.id ?? '');
  const pois = content.pois.filter((poi) => poi.mapId === mapId);
  const [poiId, setPoiId] = useState('');
  const [eventId, setEventId] = useState(content.events[0]?.id ?? '');
  const [questId, setQuestId] = useState(content.quests[0]?.id ?? '');
  const quest = content.quests.find((candidate) => candidate.id === questId);
  const [stageId, setStageId] = useState(quest?.initialStageId ?? '');
  const [encounterId, setEncounterId] = useState(content.encounters[0]?.id ?? '');
  const [itemId, setItemId] = useState(content.items[0]?.id ?? '');
  const [npcId, setNpcId] = useState(content.npcs[0]?.id ?? '');
  const [factionId, setFactionId] = useState(content.factions[0]?.id ?? '');
  const [targetFactionId,setTargetFactionId]=useState(content.factions[1]?.id??content.factions[0]?.id??'');
  const [flag, setFlag] = useState('debug_flag');
  const checkpoints = [
    ...content.pois.flatMap((entity)=>entity.tags.filter((tag)=>tag.startsWith('Checkpoint:')).map((tag)=>({name:tag.slice(11),kind:'poi' as const,id:entity.id}))),
    ...content.events.flatMap((entity)=>entity.tags.filter((tag)=>tag.startsWith('Checkpoint:')).map((tag)=>({name:tag.slice(11),kind:'event' as const,id:entity.id}))),
    ...content.encounters.flatMap((entity)=>entity.tags.filter((tag)=>tag.startsWith('Checkpoint:')).map((tag)=>({name:tag.slice(11),kind:'encounter' as const,id:entity.id}))),
  ];
  useEffect(() => controller.subscribe(() => refresh((value) => value + 1)), [controller]);
  const select = 'w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-xs';
  const button = 'rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300';
  return <div className="fixed inset-0 z-[70] bg-black/90 p-4"><section className="mx-auto flex h-full max-w-7xl flex-col rounded-xl border border-purple-500/40 bg-[#070914] p-4">
    <header className="flex items-center justify-between border-b border-zinc-800 pb-3"><div><p className="text-[9px] tracking-[.3em] text-purple-400">DEVELOPMENT ONLY</p><h2 className="font-bold text-white">PLAYTEST / DEBUG CONSOLE</h2></div><div className="flex gap-2"><button className={button} onClick={() => controller.openGame()}><Play className="mr-1 inline h-3 w-3"/>Open Game</button><button onClick={onClose}><X/></button></div></header>
    <nav className="my-3 flex gap-2">{(['tools','state','factions','log'] as const).map((value) => <button key={value} onClick={() => setTab(value)} className={`rounded px-4 py-2 text-xs uppercase ${tab===value?'bg-purple-500/20 text-purple-300':'text-zinc-500'}`}>{value}{value==='log'?` (${controller.log.length})`:''}</button>)}</nav>
    <div className="flex-1 overflow-auto">
      {tab === 'tools' && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Tool title="Content Checkpoints">{checkpoints.map(checkpoint=><button key={`${checkpoint.kind}:${checkpoint.id}`} className={button} onClick={()=>{if(checkpoint.kind==='poi')controller.teleport(checkpoint.id);if(checkpoint.kind==='event')controller.launchEvent(checkpoint.id);if(checkpoint.kind==='encounter')controller.launchEncounter(checkpoint.id);}}>{checkpoint.name}</button>)}</Tool>
        <Tool title="Launch Map / POI"><select className={select} value={mapId} onChange={e=>{setMapId(e.target.value);setPoiId('')}}>{content.maps.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select className={select} value={poiId} onChange={e=>setPoiId(e.target.value)}><option value="">Map root</option>{pois.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className={button} onClick={()=>controller.launchLocation(mapId,poiId||undefined)}>Prepare</button></Tool>
        <Tool title="Launch Event"><select className={select} value={eventId} onChange={e=>setEventId(e.target.value)}>{content.events.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className={button} onClick={()=>controller.launchEvent(eventId)}>Start</button></Tool>
        <Tool title="Quest Stage"><select className={select} value={questId} onChange={e=>{setQuestId(e.target.value);setStageId(content.quests.find(q=>q.id===e.target.value)?.initialStageId??'')}}>{content.quests.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select className={select} value={stageId} onChange={e=>setStageId(e.target.value)}>{Object.values(quest?.stages??{}).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><button className={button} onClick={()=>controller.launchQuestStage(questId,stageId)}>Start stage</button></Tool>
        <Tool title="Combat Encounter"><select className={select} value={encounterId} onChange={e=>setEncounterId(e.target.value)}>{content.encounters.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className={button} onClick={()=>controller.launchEncounter(encounterId)}>Start combat</button></Tool>
        <Tool title="Player Stats">{[...attributeKeys,...vitalKeys].map(key=><label key={key} className="flex items-center justify-between text-[10px] text-zinc-400">{key}<input type="number" defaultValue={(controller.getState().player.attributes as any)[key]??(controller.getState().player.vitals as any)[key]} onBlur={e=>controller.setPlayerValue(attributeKeys.includes(key)?'attributes':'vitals',key,Number(e.target.value))} className="w-24 rounded bg-zinc-950 p-1"/></label>)}</Tool>
        <Tool title="Inventory / Money"><select className={select} value={itemId} onChange={e=>setItemId(e.target.value)}>{content.items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className={button} onClick={()=>controller.addItem(itemId,1)}>Add item</button><input className={select} type="number" defaultValue={controller.getState().player.inventory.credits} onBlur={e=>controller.setMoney(Number(e.target.value))}/></Tool>
        <Tool title="Flags"><input className={select} value={flag} onChange={e=>setFlag(e.target.value)}/><div className="flex gap-2"><button className={button} onClick={()=>controller.setFlag(flag,true)}>Set</button><button className={button} onClick={()=>controller.setFlag(flag)}>Remove</button></div></Tool>
        <Tool title="NPC / Party / Relationship"><select className={select} value={npcId} onChange={e=>setNpcId(e.target.value)}>{content.npcs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select className={select} onChange={e=>controller.setRelationship(npcId,e.target.value as CharacterRelationshipStatus,0)}>{relationshipStates.map(x=><option key={x}>{x}</option>)}</select><div className="flex gap-2"><button className={button} onClick={()=>controller.setPartyMember(npcId,true)}>Add party</button><button className={button} onClick={()=>controller.setPartyMember(npcId,false)}>Remove</button></div></Tool>
        <Tool title="Faction State"><select className={select} value={factionId} onChange={e=>setFactionId(e.target.value)}>{content.factions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input className={select} type="number" min="-100" max="100" defaultValue={controller.getState().factions[factionId]?.reputation??0} onBlur={e=>controller.setFactionReputation(factionId,Number(e.target.value))}/><select className={select} onChange={e=>controller.setFactionMembership(factionId,e.target.value)}>{(content.factions.find((entry)=>entry.id===factionId)?.membershipStatuses??[]).map(value=><option key={value}>{value}</option>)}</select><select className={select} value={targetFactionId} onChange={e=>setTargetFactionId(e.target.value)}>{content.factions.filter(x=>x.id!==factionId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select className={select} defaultValue="neutral" onChange={e=>controller.setFactionRelation(factionId,targetFactionId,e.target.value as FactionRelationValue)}>{factionRelations.map(value=><option key={value}>{value}</option>)}</select><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>controller.setFactionHostility(factionId,true)}>Hostile</button><button className={button} onClick={()=>controller.setFactionHostility(factionId,false)}>Non-hostile</button><button className={button} onClick={()=>controller.discoverFaction(factionId,true)}>Discover</button></div></Tool>
        <Tool title="Quest State / Teleport"><select className={select} value={questId} onChange={e=>setQuestId(e.target.value)}>{content.quests.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select className={select} onChange={e=>controller.setQuestState(questId,e.target.value as QuestStatus,stageId)}>{questStates.map(x=><option key={x}>{x}</option>)}</select><select className={select} onChange={e=>e.target.value&&controller.teleport(e.target.value)} defaultValue=""><option value="">Teleport to POI…</option>{content.pois.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Tool>
      </div>}
      {tab === 'state' && <pre className="rounded border border-zinc-800 bg-black/50 p-4 text-[10px] text-emerald-300">{JSON.stringify(controller.getState(),null,2)}</pre>}
      {tab === 'factions' && <pre className="rounded border border-zinc-800 bg-black/50 p-4 text-[10px] text-emerald-300">{JSON.stringify(controller.getState().factions,null,2)}</pre>}
      {tab === 'log' && <div><button className="mb-2 flex items-center gap-1 text-xs text-zinc-400" onClick={()=>controller.clearLog()}><RotateCcw className="h-3 w-3"/>Clear</button>{controller.log.map(entry=><article key={entry.id} className="mb-1 grid grid-cols-[80px_150px_1fr] gap-2 rounded border border-zinc-800 p-2 text-[10px]"><span className="text-zinc-600">{entry.timestamp}</span><span className="text-purple-300">{entry.kind}</span><span>{entry.message}</span></article>)}</div>}
    </div>
  </section></div>;
}
function Tool({title,children}:{title:string;children:React.ReactNode}) { return <section className="space-y-2 rounded border border-zinc-800 bg-black/30 p-3"><h3 className="text-xs font-bold uppercase text-cyan-400">{title}</h3>{children}</section>; }
