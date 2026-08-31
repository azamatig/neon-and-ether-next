import React, { useMemo, useState } from 'react';
import type { CharacterDefinition, GameState, Item, NpcRuntimeState, Quest } from '@neon-ether/game-schema';
import { ArrowLeft, Check, Coins, PackageOpen, Shield, UserRound } from 'lucide-react';
import { Button, ProgressBar, Tabs } from '@neon-ether/shared-ui';

type SheetTab = 'character' | 'inventory' | 'equipment' | 'party' | 'quests';
type QuestDossier = { runtime: GameState['quests'][string]; definition?: Quest };
type PartyMember = { runtime: NpcRuntimeState; character?: CharacterDefinition };

interface CharacterSheetProps {
  state: GameState;
  items: Item[];
  quests: QuestDossier[];
  party: PartyMember[];
  onClose: () => void;
  onEquip: (entryId: string, slotId: string) => void;
  onUnequip: (slotId: string) => void;
  onDrop: (itemId: string) => void;
}

const tabs = [
  { value: 'character', label: 'Character' }, { value: 'inventory', label: 'Inventory' },
  { value: 'equipment', label: 'Equipment' }, { value: 'party', label: 'Party' },
  { value: 'quests', label: 'Quests' },
] as const;

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ state, items, quests, party, onClose, onEquip, onUnequip, onDrop }) => {
  const [tab, setTab] = useState<SheetTab>('character');
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [selectedQuestId, setSelectedQuestId] = useState<string>();
  const itemMap = useMemo(() => new Map<string, Item>(items.map((item) => [item.id, item])), [items]);
  const selectedItem = selectedItemId ? itemMap.get(selectedItemId) : undefined;
  const selectedQuest = quests.find((quest) => quest.runtime.questId === selectedQuestId) ?? quests[0];
  return <section className="ne-character-sheet" aria-label="Character sheet">
    <header><div><UserRound/><span><small>Personnel dossier</small><strong>{state.player.name}</strong></span></div><Button variant="ghost" size="sm" onClick={onClose} leftIcon={<ArrowLeft/>}>Close</Button></header>
    <Tabs value={tab} items={tabs} onChange={setTab} label="Character sheet sections" />
    <div className="ne-sheet-body">
      {tab === 'character' && <CharacterTab state={state}/>} 
      {tab === 'inventory' && <InventoryTab state={state} itemMap={itemMap} selectedId={selectedItemId} onSelect={setSelectedItemId} selected={selectedItem} onEquip={onEquip} onDrop={onDrop}/>} 
      {tab === 'equipment' && <EquipmentTab state={state} itemMap={itemMap} onUnequip={onUnequip}/>} 
      {tab === 'party' && <PartyTab state={state} party={party}/>} 
      {tab === 'quests' && <QuestTab quests={quests} selected={selectedQuest} onSelect={setSelectedQuestId}/>} 
    </div>
  </section>;
};

const CharacterTab: React.FC<{state:GameState}> = ({state}) => {
 const {player}=state; return <div className="ne-dossier-grid"><aside className="ne-dossier-identity"><div className="ne-dossier-portrait"><UserRound/></div><h1>{player.name}</h1><p>{player.title}</p><span>Level {player.level}</span><ProgressBar label="Experience" value={player.experience} max={Math.max(player.experience,100)} tone="ether"/><div className="ne-money"><Coins/> {player.inventory.credits} credits</div></aside><section><SheetSection title="Attributes"><div className="ne-attribute-grid">{Object.entries(player.attributes).map(([name,value])=><div key={name}><small>{humanize(name)}</small><strong>{value}</strong></div>)}</div></SheetSection><SheetSection title="Vitals & derived stats"><div className="ne-stat-grid">{Object.entries(player.vitals).map(([name,value])=><div key={name}><span>{humanize(name)}</span><strong>{value}</strong></div>)}</div></SheetSection><SheetSection title="Skills"><div className="ne-chip-list">{Object.entries(player.skills).map(([name,value])=><span key={name}>{humanize(name)} <b>{value}</b></span>)}{Object.keys(player.skills).length===0&&<em>No trained skills recorded.</em>}</div></SheetSection><SheetSection title="Traits & perks"><div className="ne-chip-list">{[...player.traits,...player.perks].map(value=><span key={value}>{value}</span>)}{player.traits.length+player.perks.length===0&&<em>No traits or perks acquired.</em>}</div></SheetSection><SheetSection title="Status"><div className="ne-chip-list">{player.activeStatusEffects.map(status=><span key={status.id}>{status.name} · {status.durationTurns}</span>)}{player.statusEffects.map(status=><span key={status.id}>{humanize(status.id)} · {status.durationTurns}</span>)}{player.activeStatusEffects.length+player.statusEffects.length===0&&<em>Condition stable. No persistent effects.</em>}</div></SheetSection></section></div>;
};

const InventoryTab:React.FC<{state:GameState;itemMap:Map<string,Item>;selectedId?:string;selected?:Item;onSelect:(id:string)=>void;onEquip:(entry:string,slot:string)=>void;onDrop:(id:string)=>void}>=({state,itemMap,selectedId,selected,onSelect,onEquip,onDrop})=><div className="ne-inventory-layout"><section className="ne-sheet-list"><header><span>Carried items</span><small>{state.player.inventory.items.length}{state.player.inventory.maxSlots?` / ${state.player.inventory.maxSlots} slots`:''}</small></header>{state.player.inventory.items.map(entry=>{const item=itemMap.get(entry.itemId);return item?<button type="button" key={entry.entryId} data-selected={selectedId===item.id} onClick={()=>onSelect(item.id)}><PackageOpen/><span><strong>{item.name}</strong><small>{item.category} · {item.rarity}</small></span><em>×{entry.quantity}</em></button>:null})}</section><ItemDetails item={selected}>{selected&&<><div className="ne-detail-actions">{selected.equipmentSlots.map(slot=><Button key={slot} size="sm" onClick={()=>{const entry=state.player.inventory.items.find(value=>value.itemId===selected.id&&!value.isEquipped);if(entry)onEquip(entry.entryId,slot)}}>Equip · {humanize(slot)}</Button>)}<Button size="sm" variant="danger" onClick={()=>onDrop(selected.id)}>Drop one</Button></div></>}</ItemDetails></div>;
const EquipmentTab:React.FC<{state:GameState;itemMap:Map<string,Item>;onUnequip:(id:string)=>void}>=({state,itemMap,onUnequip})=><div className="ne-equipment-grid">{Object.entries(state.player.equipment.slots).map(([slot,entryId])=>{const entry=state.player.inventory.items.find(item=>item.entryId===entryId);const item=entry?itemMap.get(entry.itemId):undefined;return <article key={slot}><small>{humanize(slot)}</small><Shield/>{item?<><strong>{item.name}</strong><span>{item.modifiers.map(mod=>`${humanize(mod.target)} ${mod.value>0?'+':''}${mod.value}`).join(' · ')||item.rarity}</span><Button variant="ghost" size="sm" onClick={()=>onUnequip(slot)}>Unequip</Button></>:<em>Empty slot</em>}</article>})}{Object.keys(state.player.equipment.slots).length===0&&<div className="ne-sheet-empty">No equipment slots are currently configured.</div>}</div>;
const PartyTab:React.FC<{state:GameState;party:PartyMember[]}>=({state,party})=><div className="ne-party-grid"><PartyCard name={state.player.name} role={state.player.title} hp={state.player.vitals.currentHp} maxHp={state.player.vitals.maxHp}/>{party.map(({runtime,character})=><PartyCard key={runtime.npcId} name={character?.name??'Companion'} role={character?.title??runtime.relationship.status} hp={runtime.currentHp} maxHp={runtime.maxHp??runtime.currentHp} status={`${runtime.relationship.status} · affinity ${runtime.relationship.affinity}`}/>)}</div>;
const PartyCard:React.FC<{name:string;role:string;hp:number;maxHp:number;status?:string}>=({name,role,hp,maxHp,status})=><article className="ne-party-card"><UserRound/><div><h3>{name}</h3><p>{role}</p><ProgressBar label="HP" value={hp} max={maxHp} tone="danger"/>{status&&<small>{status}</small>}</div></article>;
const QuestTab:React.FC<{quests:QuestDossier[];selected?:QuestDossier;onSelect:(id:string)=>void}>=({quests,selected,onSelect})=><div className="ne-quest-layout"><section className="ne-sheet-list"><header><span>Quest journal</span></header>{(['Active','Completed','Failed'] as const).map(status=><div key={status}><h3>{status}</h3>{quests.filter(q=>q.runtime.status===status).map(q=><button type="button" key={q.runtime.questId} data-selected={selected?.runtime.questId===q.runtime.questId} onClick={()=>onSelect(q.runtime.questId)}><Check/><span><strong>{q.definition?.title??q.definition?.name}</strong><small>{q.definition?.isMainQuest?'Main quest':'Quest'}</small></span></button>)}</div>)}</section><section className="ne-quest-detail">{selected?.definition?<><small>{selected.runtime.status}</small><h2>{selected.definition.title??selected.definition.name}</h2><p>{selected.definition.summary??selected.definition.description}</p>{(()=>{const stage=selected.definition.stages[selected.runtime.currentStageId];return stage?<><h3>{stage.title}</h3><p>{stage.journalEntry}</p><ul>{stage.objectives.map(objective=><li key={objective.id} data-complete={selected.runtime.completedObjectiveIds.includes(objective.id)}><Check/>{objective.description}</li>)}</ul></>:null})()}<div className="ne-quest-reward">Rewards · {selected.definition.rewardXp} XP · {selected.definition.rewardCredits} credits</div></>:<div className="ne-sheet-empty">No quest selected.</div>}</section></div>;
const ItemDetails:React.FC<{item?:Item;children?:React.ReactNode}>=({item,children})=><section className="ne-item-details">{item?<><small>{item.category} · {item.rarity}</small><h2>{item.name}</h2><p>{item.description}</p><div className="ne-stat-grid"><div><span>Value</span><strong>{item.valueCredits}</strong></div>{item.weightKg!==undefined&&<div><span>Weight</span><strong>{item.weightKg} kg</strong></div>}</div>{item.modifiers.length>0&&<ul>{item.modifiers.map((mod,index)=><li key={index}>{humanize(mod.target)} · {mod.operation} {mod.value}</li>)}</ul>}{children}</>:<div className="ne-sheet-empty">Select an item to inspect.</div>}</section>;
const SheetSection:React.FC<{title:string;children:React.ReactNode}>=({title,children})=><section className="ne-sheet-section"><h2>{title}</h2>{children}</section>;
const humanize=(value:string)=>value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ');
