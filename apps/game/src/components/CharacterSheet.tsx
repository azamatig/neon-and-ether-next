import React, { useMemo, useState } from 'react';
import type { CharacterDefinition, BackgroundDefinition, ClassDefinition, EquipmentSlot, GameState, Item, NpcRuntimeState, PerkDefinition, Quest, RaceDefinition, SpecialPathDefinition } from '@neon-ether/game-schema';
import type { InventoryCommandResult, ProgressionView } from '@neon-ether/game-runtime';
import { ArrowLeft, Check, Coins, PackageOpen, Shield, UserRound } from 'lucide-react';
import { Button, ItemIcon, ProgressBar, Tabs } from '@neon-ether/shared-ui';

type SheetTab = 'character' | 'inventory' | 'equipment' | 'party' | 'quests';
type QuestDossier = { runtime: GameState['quests'][string]; definition?: Quest };
type PartyMember = { runtime: NpcRuntimeState; character?: CharacterDefinition };

interface CharacterSheetProps {
  state: GameState;
  resolvedPlayer: CharacterDefinition;
  playerRace?: RaceDefinition;
  playerBackground?: BackgroundDefinition;
  raceNames: Record<string,string>;
  primaryClass?: ClassDefinition;
  specialPaths: SpecialPathDefinition[];
  items: Item[];
  perks: PerkDefinition[];
  quests: QuestDossier[];
  party: PartyMember[];
  progression: ProgressionView;
  equipmentOptions: Record<string, Record<string, InventoryCommandResult>>;
  equipmentSlots: EquipmentSlot[];
  onClose: () => void;
  onEquip: (entryId: string, slotId: string) => InventoryCommandResult;
  onUnequip: (slotId: string) => void;
  onUse: (itemId: string) => InventoryCommandResult;
  onDrop: (itemId: string) => void;
}

const tabs = [
  { value: 'character', label: 'Character' }, { value: 'inventory', label: 'Inventory' },
  { value: 'equipment', label: 'Equipment' }, { value: 'party', label: 'Party' },
  { value: 'quests', label: 'Quests' },
] as const;

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ state, resolvedPlayer, playerRace, playerBackground, raceNames, primaryClass, specialPaths, items, perks, quests, party, progression, equipmentOptions, equipmentSlots, onClose, onEquip, onUnequip, onUse, onDrop }) => {
  const [tab, setTab] = useState<SheetTab>('character');
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [selectedQuestId, setSelectedQuestId] = useState<string>();
  const itemMap = useMemo(() => new Map<string, Item>(items.map((item) => [item.id, item])), [items]);
  const selectedItem = selectedItemId ? itemMap.get(selectedItemId) : undefined;
  const selectedQuest = quests.find((quest) => quest.runtime.questId === selectedQuestId) ?? quests[0];
  return <section className="ne-character-sheet" data-tab={tab} aria-label="Character sheet">
    <header><div><UserRound/><span><small>Personnel dossier</small><strong>{state.player.name}</strong></span></div><Button variant="ghost" size="sm" onClick={onClose} leftIcon={<ArrowLeft/>}>Close</Button></header>
    <Tabs value={tab} items={tabs} onChange={setTab} label="Character sheet sections" />
    <div className="ne-sheet-body">
      {tab === 'character' && <CharacterTab state={state} resolvedPlayer={resolvedPlayer} progression={progression} playerRace={playerRace} playerBackground={playerBackground} primaryClass={primaryClass} specialPaths={specialPaths} perks={perks}/>}
      {tab === 'inventory' && <InventoryTab state={state} itemMap={itemMap} equipmentOptions={equipmentOptions} selectedId={selectedItemId} onSelect={setSelectedItemId} selected={selectedItem} onEquip={onEquip} onUse={onUse} onDrop={onDrop}/>}
      {tab === 'equipment' && <EquipmentTab state={state} itemMap={itemMap} equipmentSlots={equipmentSlots} onUnequip={onUnequip}/>}
      {tab === 'party' && <PartyTab state={state} party={party} raceNames={raceNames}/>}
      {tab === 'quests' && <QuestTab quests={quests} selected={selectedQuest} onSelect={setSelectedQuestId}/>}
    </div>
  </section>;
};

const CharacterTab: React.FC<{state:GameState;resolvedPlayer:CharacterDefinition;progression:ProgressionView;playerRace?:RaceDefinition;playerBackground?:BackgroundDefinition;primaryClass?:ClassDefinition;specialPaths:SpecialPathDefinition[];perks:PerkDefinition[]}> = ({state,resolvedPlayer,progression,playerRace,playerBackground,primaryClass,specialPaths,perks}) => {
 const {player}=state; return <div className="ne-dossier-grid"><aside className="ne-dossier-identity"><div className="ne-dossier-portrait"><UserRound/></div><h1>{player.name}</h1><p>{player.title}</p><span>Level {player.level}</span><small>Race</small><strong>{playerRace?.name??'Unknown'}</strong><small>Class</small><strong>{primaryClass?.name??'Unassigned'}</strong><small>Background</small><strong>{playerBackground?.name??'Unknown'}</strong>{specialPaths.length>0&&<><small>Special path</small>{specialPaths.map(path=><strong key={path.id}>{path.name}</strong>)}</>}<ProgressBar label={`Experience · ${progression.totalXp} total XP`} value={progression.xpIntoLevel} max={progression.xpForNextLevel??Math.max(1,progression.xpIntoLevel)} tone="ether"/><div className="ne-money"><Coins/> {player.inventory.credits} credits</div></aside><section><SheetSection title="Attributes"><div className="ne-attribute-grid">{Object.entries(resolvedPlayer.attributes).map(([name,value])=><div key={name}><small>{humanize(name)}</small><strong>{value}</strong></div>)}</div></SheetSection><SheetSection title="Vitals & derived stats"><div className="ne-stat-grid">{Object.entries(resolvedPlayer.vitals).map(([name,value])=><div key={name}><span>{humanize(name)}</span><strong>{value}</strong></div>)}</div></SheetSection><SheetSection title="Skills"><div className="ne-chip-list">{Object.entries(player.skills).map(([name,value])=><span key={name}>{humanize(name)} <b>{value}</b></span>)}{Object.keys(player.skills).length===0&&<em>No trained skills recorded.</em>}</div></SheetSection><SheetSection title="Traits"><div className="ne-chip-list">{player.traits.map(value=><span key={value}>{value}</span>)}{player.traits.length===0&&<em>No visible traits acquired.</em>}</div></SheetSection><SheetSection title="Perks"><div className="ne-chip-list">{player.perks.map(id=>{const perk=perks.find(value=>value.id===id);return perk?<span key={id} title={perk.description}>{perk.name}</span>:null})}{player.perks.length===0&&<em>No perks acquired.</em>}</div></SheetSection><SheetSection title="Status" tone={player.activeStatusEffects.length+player.statusEffects.length?'danger':'success'}><div className="ne-chip-list">{player.activeStatusEffects.map(status=><span key={status.id}>{status.name} · {status.durationTurns}</span>)}{player.statusEffects.map(status=><span key={status.id}>{humanize(status.id)} · {status.durationTurns}</span>)}{player.activeStatusEffects.length+player.statusEffects.length===0&&<em>Condition stable. No persistent effects.</em>}</div></SheetSection></section></div>;
};

const InventoryTab:React.FC<{state:GameState;itemMap:Map<string,Item>;equipmentOptions:Record<string,Record<string,InventoryCommandResult>>;selectedId?:string;selected?:Item;onSelect:(id:string)=>void;onEquip:(entry:string,slot:string)=>InventoryCommandResult;onUse:(id:string)=>InventoryCommandResult;onDrop:(id:string)=>void}>=({state,itemMap,equipmentOptions,selectedId,selected,onSelect,onEquip,onUse,onDrop})=>{
 const [feedback,setFeedback]=useState<string>();const entry=selected?state.player.inventory.items.find(value=>value.itemId===selected.id&&!value.isEquipped):undefined;
 return <div className="ne-inventory-layout"><section className="ne-sheet-list"><header><span>Carried items</span><small>{state.player.inventory.items.length}{state.player.inventory.maxSlots?` / ${state.player.inventory.maxSlots} slots`:''}</small></header>{state.player.inventory.items.map(inventoryEntry=>{const item=itemMap.get(inventoryEntry.itemId);return item?<button type="button" key={inventoryEntry.entryId} data-category={item.category} data-rarity={item.rarity} data-equipped={inventoryEntry.isEquipped} data-selected={selectedId===item.id} onClick={()=>{onSelect(item.id);setFeedback(undefined)}}><ItemIcon item={item}/><span><strong>{item.name}</strong><small>{item.category} · {item.rarity}{inventoryEntry.isEquipped?` · Equipped (${humanize(inventoryEntry.slotId??'slot')})`:''}</small></span><em>×{inventoryEntry.quantity}</em></button>:null})}</section><ItemDetails item={selected}>{selected&&<><div className="ne-detail-actions">{selected.equipmentSlots.map(slot=>{const option=entry?equipmentOptions[entry.entryId??entry.itemId]?.[slot]:undefined;return <Button key={slot} size="sm" disabled={!entry||option?.success===false} title={option?.reason} onClick={()=>{if(entry){const result=onEquip(entry.entryId??entry.itemId,slot);setFeedback(result.success?`${selected.name} equipped.`:result.reason)}}}>Equip · {humanize(slot)}</Button>})}{selected.category==='consumable'&&selected.usableContexts.includes('Exploration')&&<Button size="sm" variant="secondary" onClick={()=>{const result=onUse(selected.id);setFeedback(result.success?`${selected.name} used.`:result.reason)}}>Use</Button>}<Button size="sm" variant="danger" onClick={()=>onDrop(selected.id)}>Drop one</Button></div>{feedback&&<p className="ne-item-feedback" role="status">{feedback}</p>}{entry&&selected.equipmentSlots.map(slot=>{const reason=equipmentOptions[entry.entryId??entry.itemId]?.[slot]?.reason;return reason?<p key={slot} className="ne-item-feedback is-error">Cannot equip: {reason}</p>:null})}</>}</ItemDetails></div>;
};
const EquipmentTab:React.FC<{state:GameState;itemMap:Map<string,Item>;equipmentSlots:EquipmentSlot[];onUnequip:(id:string)=>void}>=({state,itemMap,equipmentSlots,onUnequip})=><div className="ne-equipment-grid">{equipmentSlots.map(slot=>{const entryId=state.player.equipment.slots[slot.id];const entry=state.player.inventory.items.find(item=>item.entryId===entryId);const item=entry?itemMap.get(entry.itemId):undefined;return <article key={slot.id} data-slot={slot.id} data-category={item?.category} data-rarity={item?.rarity} data-equipped={Boolean(item)}><small>{slot.name??humanize(slot.id)}</small>{item?<ItemIcon item={item}/>:<Shield/>}{item?<><strong>{item.name}</strong><span>{item.modifiers.map(mod=>`${humanize(mod.target)} ${mod.value>0?'+':''}${mod.value}`).join(' · ')||item.rarity}</span><Button variant="ghost" size="sm" onClick={()=>onUnequip(slot.id)}>Unequip</Button></>:<em>Empty slot</em>}</article>})}{equipmentSlots.length===0&&<div className="ne-sheet-empty">No equipment slots are currently configured.</div>}</div>;
const PartyTab:React.FC<{state:GameState;party:PartyMember[];raceNames:Record<string,string>}>=({state,party,raceNames})=><div className="ne-party-grid"><PartyCard name={state.player.name} role={state.player.title} hp={state.player.vitals.currentHp} maxHp={state.player.vitals.maxHp}/>{party.map(({runtime,character})=><PartyCard key={runtime.npcId} name={character?.name??'Companion'} role={`${character?.title??runtime.relationship.status}${character?.raceId?` · ${raceNames[character.raceId]??'Unknown lineage'}`:''}`} hp={runtime.currentHp} maxHp={runtime.maxHp??runtime.currentHp} status={`${runtime.relationship.status} · affinity ${runtime.relationship.affinity}`}/>)}</div>;
const PartyCard:React.FC<{name:string;role:string;hp:number;maxHp:number;status?:string}>=({name,role,hp,maxHp,status})=><article className="ne-party-card" data-member={status?'companion':'player'} data-health={hp/maxHp<=.25?'critical':hp/maxHp<=.6?'wounded':'healthy'}><UserRound/><div><h3>{name}</h3><p>{role}</p><ProgressBar label="HP" value={hp} max={maxHp} tone="danger"/>{status&&<small>{status}</small>}</div></article>;
const QuestTab:React.FC<{quests:QuestDossier[];selected?:QuestDossier;onSelect:(id:string)=>void}>=({quests,selected,onSelect})=><div className="ne-quest-layout"><section className="ne-sheet-list"><header><span>Quest journal</span></header>{(['Active','Completed','Failed'] as const).map(status=><div key={status} data-status={status}><h3>{status}</h3>{quests.filter(q=>q.runtime.status===status).map(q=><button type="button" key={q.runtime.questId} data-main={q.definition?.isMainQuest} data-selected={selected?.runtime.questId===q.runtime.questId} onClick={()=>onSelect(q.runtime.questId)}><Check/><span><strong>{q.definition?.title??q.definition?.name}</strong><small>{q.definition?.isMainQuest?'Main quest':'Quest'}</small></span></button>)}</div>)}</section><section className="ne-quest-detail" data-status={selected?.runtime.status}>{selected?.definition?<><small>{selected.runtime.status}</small><h2>{selected.definition.title??selected.definition.name}</h2><p>{selected.definition.summary??selected.definition.description}</p>{(()=>{const stage=selected.definition.stages[selected.runtime.currentStageId];return stage?<><h3>{stage.title}</h3><p>{stage.journalEntry}</p><ul>{stage.objectives.map(objective=><li key={objective.id} data-complete={selected.runtime.completedObjectiveIds.includes(objective.id)}><Check/>{objective.description}</li>)}</ul></>:null})()}<div className="ne-quest-reward">Rewards · {selected.definition.rewardXp} XP · {selected.definition.rewardCredits} credits</div></>:<div className="ne-sheet-empty">No quest selected.</div>}</section></div>;
const ItemDetails:React.FC<{item?:Item;children?:React.ReactNode}>=({item,children})=><section className="ne-item-details" data-category={item?.category} data-rarity={item?.rarity}>{item?<><ItemIcon item={item}/><small>{item.category} · {item.rarity}</small><h2>{item.name}</h2><p>{item.description}</p><div className="ne-stat-grid"><div><span>Value</span><strong>{item.valueCredits}</strong></div>{item.weightKg!==undefined&&<div><span>Weight</span><strong>{item.weightKg} kg</strong></div>}</div>{item.modifiers.length>0&&<ul>{item.modifiers.map((mod,index)=><li key={index}>{humanize(mod.target)} · {mod.operation} {mod.value}</li>)}</ul>}{children}</>:<div className="ne-sheet-empty">Select an item to inspect.</div>}</section>;
const SheetSection:React.FC<{title:string;tone?:'success'|'danger';children:React.ReactNode}>=({title,tone,children})=><section className="ne-sheet-section" data-tone={tone}><h2>{title}</h2>{children}</section>;
const humanize=(value:string)=>value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ');
