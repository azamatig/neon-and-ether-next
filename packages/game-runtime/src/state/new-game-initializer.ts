import type { CharacterCreationSelection, Effect, GameState, NewGameDefinition } from '@neon-ether/game-schema';
import { CharacterCreationSelectionSchema } from '@neon-ether/game-schema';
import { ConditionRegistry } from '../conditions/condition-registry.ts';
import { evaluateConditions } from '../conditions/condition-evaluator.ts';
import { EffectExecutor } from '../effects/effect-executor.ts';
import { EffectRegistry } from '../effects/effect-registry.ts';
import { InventorySystem } from '../inventory/inventory-system.ts';
import { DiceRoller } from '@neon-ether/engine';
import type { ContentRegistry } from '../content/content-registry.ts';
import { CharacterStatsSystem } from '../stats/character-stats-system.ts';
import { refreshFactionRuntime } from '../factions/faction-state.ts';
import { createInitialGameStateFromContent, createInitialQuestRuntimeState } from './game-state.ts';

export interface CharacterCreationValidation { valid:boolean; reasons:string[]; attributePointsRemaining:number; skillPointsRemaining:number }
export interface CharacterCreationPreview { stats:ReturnType<CharacterStatsSystem['resolve']>; skills:Record<string,number>; abilityIds:string[]; inventory:Array<{itemId:string;quantity:number;isEquipped:boolean;slotId?:string}> }

export class NewGameInitializer {
  constructor(private readonly content:ContentRegistry) {}
  getDefinition():NewGameDefinition|undefined { return this.content.newGameDefinitions.getAll()[0]; }
  generateName(seed=Date.now()):string {
    const config=this.getDefinition(),pools=config?.namePoolIds.map(id=>this.content.namePools.get(id)).filter(pool=>pool!==undefined)??[];
    if(!pools.length)return 'Player';const random=new DiceRoller(seed),pool=pools[random.integer(0,pools.length-1)];
    const first=pool.firstNames[random.integer(0,pool.firstNames.length-1)],surname=pool.surnames.length?pool.surnames[random.integer(0,pool.surnames.length-1)]:undefined;
    return surname?`${first} ${surname}`:first;
  }
  adjustAttribute(selection:CharacterCreationSelection,attribute:keyof CharacterCreationSelection['attributes'],delta:number):CharacterCreationSelection {
    const config=this.getDefinition(),rule=config?.attributeRules.find(value=>value.attribute===attribute);if(!config||!rule)return selection;
    const next=(selection.attributes[attribute]??rule.minimum)+delta;if(next<rule.minimum||next>rule.maximum)return selection;
    if(delta>0&&this.validate(selection).attributePointsRemaining<delta*rule.costPerPoint)return selection;
    return {...selection,attributes:{...selection.attributes,[attribute]:next}};
  }
  adjustSkill(selection:CharacterCreationSelection,skillId:string,delta:number):CharacterCreationSelection {
    const config=this.getDefinition(),rule=config?.skillRules.find(value=>value.skillId===skillId);if(!config||!rule)return selection;
    const next=(selection.skills[skillId]??rule.minimum)+delta;if(next<rule.minimum||next>rule.maximum)return selection;
    if(delta>0&&this.validate(selection).skillPointsRemaining<delta*rule.costPerRank)return selection;
    return {...selection,skills:{...selection.skills,[skillId]:next}};
  }
  validate(selection:CharacterCreationSelection):CharacterCreationValidation {
    const config=this.getDefinition(), reasons:string[]=[];if(!config)return {valid:false,reasons:['New game configuration is unavailable.'],attributePointsRemaining:0,skillPointsRemaining:0};
    const parsed=CharacterCreationSelectionSchema.safeParse(selection);if(!parsed.success)reasons.push('Character identity is incomplete.');
    if(selection.age<config.minimumAge||selection.age>config.maximumAge)reasons.push(`Age must be between ${config.minimumAge} and ${config.maximumAge}.`);
    let attributeSpent=0;for(const rule of config.attributeRules){const value=selection.attributes[rule.attribute]??rule.minimum;if(value<rule.minimum||value>rule.maximum)reasons.push(`${rule.attribute} must be ${rule.minimum}–${rule.maximum}.`);attributeSpent+=(value-rule.minimum)*rule.costPerPoint;}
    let skillSpent=0;for(const rule of config.skillRules){const value=selection.skills[rule.skillId]??rule.minimum;if(value<rule.minimum||value>rule.maximum)reasons.push(`${rule.name} must be ${rule.minimum}–${rule.maximum}.`);skillSpent+=(value-rule.minimum)*rule.costPerRank;}
    const rawAttributeRemaining=config.attributePointBudget-attributeSpent,rawSkillRemaining=config.skillPointBudget-skillSpent;if(rawAttributeRemaining<0)reasons.push('Attribute budget exceeded.');if(rawSkillRemaining<0)reasons.push('Skill budget exceeded.');if(config.requireAllPointsSpent&&(rawAttributeRemaining!==0||rawSkillRemaining!==0))reasons.push('Spend all starting points.');
    const race=this.content.races.get(selection.raceId);if(!race||race.availability==='NPC')reasons.push('Select a Player-available race.');
    const playerClass=this.content.classes.get(selection.classId);if(!playerClass||playerClass.availability==='NPC')reasons.push('Select a Player-available class.');
    const background=this.content.backgrounds.get(selection.backgroundId);if(!background)reasons.push('Select a valid background.');
    if(selection.perkIds.length!==config.startingPerkCount)reasons.push(`Select ${config.startingPerkCount} starting perk${config.startingPerkCount===1?'':'s'}.`);
    if(new Set(selection.perkIds).size!==selection.perkIds.length)reasons.push('Starting perks must be unique.');
    const provisional=createInitialGameStateFromContent(this.content.exportSnapshot());provisional.player.raceId=selection.raceId;provisional.player.classId=selection.classId;provisional.player.backgroundId=selection.backgroundId;provisional.player.attributes={...selection.attributes};provisional.player.skills={...selection.skills};provisional.player.perks=[...selection.perkIds];if(background)provisional.world.flags={...provisional.world.flags,...background.startingFlags};
    const registry=new ConditionRegistry(true),random=new DiceRoller(1337);if(background){const result=evaluateConditions(background.requirements,{state:provisional,contentRegistry:this.content,rollRandom:(min,max)=>random.integer(min,max)},registry);if(!result.allMet)reasons.push(result.failedConditions[0]?.reason??`${background.name} requirements are not met.`);}
    for(const definition of [race,playerClass])if(definition){const result=evaluateConditions(definition.requirements,{state:provisional,contentRegistry:this.content,rollRandom:(min,max)=>random.integer(min,max)},registry);if(!result.allMet)reasons.push(result.failedConditions[0]?.reason??`${definition.name} requirements are not met.`);}
    for(const id of selection.perkIds){const perk=this.content.perks.get(id);if(!perk){reasons.push('A selected perk is unavailable.');continue;}if(perk.requiredBackgroundIds.length&&!perk.requiredBackgroundIds.includes(selection.backgroundId))reasons.push(`${perk.name} requires a different background.`);if(perk.excludedPerkIds.some(blocked=>selection.perkIds.includes(blocked)))reasons.push(`${perk.name} conflicts with another selected perk.`);const result=evaluateConditions(perk.requirements,{state:provisional,contentRegistry:this.content,rollRandom:(min,max)=>random.integer(min,max)},registry);if(!result.allMet)reasons.push(result.failedConditions[0]?.reason??`${perk.name} requirements are not met.`);}
    return {valid:reasons.length===0,reasons,attributePointsRemaining:Math.max(0,rawAttributeRemaining),skillPointsRemaining:Math.max(0,rawSkillRemaining)};
  }
  initialize(selection:CharacterCreationSelection):GameState {
    const validation=this.validate(selection),config=this.getDefinition();if(!validation.valid||!config)throw new Error(validation.reasons.join(' '));
    const state=createInitialGameStateFromContent(this.content.exportSnapshot()),background=this.content.backgrounds.get(selection.backgroundId)!,race=this.content.races.get(selection.raceId)!,playerClass=this.content.classes.get(selection.classId)!;
    state.player.abilityIds=[];state.player.traits=[];state.player.capabilityTags=[];state.player.temporaryModifiers=[];state.player.inventory.items=[];
    state.player.name=selection.name.trim();state.player.age=selection.age;state.player.portraitId=selection.portraitId;state.player.raceId=race.id;state.player.classId=playerClass.id;state.player.backgroundId=background.id;state.player.attributes={...selection.attributes};state.player.skills={...selection.skills};
    for(const skills of [race.skillModifiers,playerClass.startingSkillModifiers,background.startingSkills])for(const [skill,value] of Object.entries(skills))state.player.skills[skill]=(state.player.skills[skill]??0)+value;
    state.player.perks=[...selection.perkIds];state.player.traits=[...new Set([...state.player.traits,...race.grantedTraits,...playerClass.grantedTraits])];state.player.capabilityTags=[...new Set([...state.player.capabilityTags,...race.capabilityTags])];state.player.temporaryModifiers=[...state.player.temporaryModifiers,...race.attributeModifiers,...playerClass.startingModifiers,...background.startingModifiers,...selection.perkIds.flatMap(id=>this.content.perks.get(id)?.modifiers??[])];state.player.inventory.credits=background.startingMoney;
    state.world.currentMapId=config.startingMapId;state.world.currentPoiId=config.startingPoiId??null;state.world.selectedPoiId=config.startingPoiId??null;state.world.flags={...state.world.flags,...background.startingFlags};if(config.startingTime)Object.assign(state.time,config.startingTime);
    const inventory=new InventorySystem(this.content);for(const item of [...playerClass.startingEquipment,...background.startingItems])inventory.add(state.player.inventory,item.itemId,item.quantity);inventory.hydrate(state);for(const entry of state.player.inventory.items){const item=this.content.getItem(entry.itemId),slotId=item?.equipmentSlots[0],slot=slotId?config.equipmentSlots.find(value=>value.id===slotId):undefined;if(slot&&!state.player.equipment.slots[slot.id])inventory.equip(state,entry.entryId??entry.itemId,slot);}for(const [id,value] of Object.entries(background.startingFactionReputation)){const factionState=state.factions[id],definition=this.content.factions.get(id);if(factionState&&definition){factionState.reputation=value;refreshFactionRuntime(definition,factionState);}}
    for(const questId of config.startingQuestIds){const quest=this.content.quests.get(questId);if(quest)state.quests[questId]=createInitialQuestRuntimeState(questId,{status:'Active',currentStageId:quest.initialStageId});}
    const abilityEffects:Effect[]=[...race.grantedAbilityIds,...playerClass.startingAbilityIds].map(abilityId=>({type:'setAbilityUnlocked',abilityId,unlocked:true}));
    const random=new DiceRoller(1337),executor=new EffectExecutor(new EffectRegistry(true));executor.executeBatch([...race.startingEffects,...playerClass.startingEffects,...abilityEffects,...background.startingEffects,...selection.perkIds.flatMap(id=>this.content.perks.get(id)?.startingEffects??[])],{state,contentRegistry:this.content,random});
    const resolved=new CharacterStatsSystem().resolve(state.player);state.player.vitals={...resolved.derivedStats,currentHp:resolved.derivedStats.maxHp,currentEther:resolved.derivedStats.maxEther};return state;
  }
  preview(selection:CharacterCreationSelection):CharacterCreationPreview {const state=this.initialize(selection);return {stats:new CharacterStatsSystem().resolve(state.player),skills:{...state.player.skills},abilityIds:[...state.player.abilityIds],inventory:state.player.inventory.items.map(entry=>({itemId:entry.itemId,quantity:entry.quantity,isEquipped:entry.isEquipped,slotId:entry.slotId}))};}
}
