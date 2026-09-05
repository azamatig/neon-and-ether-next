import type { CharacterCreationSelection, GameState, NewGameDefinition } from '@neon-ether/game-schema';
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

export class NewGameInitializer {
  constructor(private readonly content:ContentRegistry) {}
  getDefinition():NewGameDefinition|undefined { return this.content.newGameDefinitions.getAll()[0]; }
  validate(selection:CharacterCreationSelection):CharacterCreationValidation {
    const config=this.getDefinition(), reasons:string[]=[];if(!config)return {valid:false,reasons:['New game configuration is unavailable.'],attributePointsRemaining:0,skillPointsRemaining:0};
    const parsed=CharacterCreationSelectionSchema.safeParse(selection);if(!parsed.success)reasons.push('Character identity is incomplete.');
    if(selection.age<config.minimumAge||selection.age>config.maximumAge)reasons.push(`Age must be between ${config.minimumAge} and ${config.maximumAge}.`);
    let attributeSpent=0;for(const rule of config.attributeRules){const value=selection.attributes[rule.attribute];if(value<rule.minimum||value>rule.maximum)reasons.push(`${rule.attribute} must be ${rule.minimum}–${rule.maximum}.`);attributeSpent+=(value-rule.minimum)*rule.costPerPoint;}
    let skillSpent=0;for(const rule of config.skillRules){const value=selection.skills[rule.skillId]??rule.minimum;if(value<rule.minimum||value>rule.maximum)reasons.push(`${rule.name} must be ${rule.minimum}–${rule.maximum}.`);skillSpent+=(value-rule.minimum)*rule.costPerRank;}
    const attributeRemaining=config.attributePointBudget-attributeSpent,skillRemaining=config.skillPointBudget-skillSpent;if(attributeRemaining<0)reasons.push('Attribute budget exceeded.');if(skillRemaining<0)reasons.push('Skill budget exceeded.');if(config.requireAllPointsSpent&&(attributeRemaining!==0||skillRemaining!==0))reasons.push('Spend all starting points.');
    const background=this.content.backgrounds.get(selection.backgroundId);if(!background)reasons.push('Select a valid background.');
    if(selection.perkIds.length!==config.startingPerkCount)reasons.push(`Select ${config.startingPerkCount} starting perk${config.startingPerkCount===1?'':'s'}.`);
    if(new Set(selection.perkIds).size!==selection.perkIds.length)reasons.push('Starting perks must be unique.');
    const provisional=createInitialGameStateFromContent(this.content.exportSnapshot());provisional.player.attributes={...selection.attributes};provisional.player.skills={...selection.skills};provisional.player.perks=[...selection.perkIds];if(background)provisional.world.flags={...provisional.world.flags,...background.startingFlags};
    const registry=new ConditionRegistry(true),random=new DiceRoller(1337);if(background){const result=evaluateConditions(background.requirements,{state:provisional,contentRegistry:this.content,rollRandom:(min,max)=>random.integer(min,max)},registry);if(!result.allMet)reasons.push(result.failedConditions[0]?.reason??`${background.name} requirements are not met.`);}
    for(const id of selection.perkIds){const perk=this.content.perks.get(id);if(!perk){reasons.push('A selected perk is unavailable.');continue;}if(perk.requiredBackgroundIds.length&&!perk.requiredBackgroundIds.includes(selection.backgroundId))reasons.push(`${perk.name} requires a different background.`);if(perk.excludedPerkIds.some(blocked=>selection.perkIds.includes(blocked)))reasons.push(`${perk.name} conflicts with another selected perk.`);const result=evaluateConditions(perk.requirements,{state:provisional,contentRegistry:this.content,rollRandom:(min,max)=>random.integer(min,max)},registry);if(!result.allMet)reasons.push(result.failedConditions[0]?.reason??`${perk.name} requirements are not met.`);}
    return {valid:reasons.length===0,reasons,attributePointsRemaining:attributeRemaining,skillPointsRemaining:skillRemaining};
  }
  initialize(selection:CharacterCreationSelection):GameState {
    const validation=this.validate(selection),config=this.getDefinition();if(!validation.valid||!config)throw new Error(validation.reasons.join(' '));
    const state=createInitialGameStateFromContent(this.content.exportSnapshot()),background=this.content.backgrounds.get(selection.backgroundId)!;
    state.player.name=selection.name.trim();state.player.age=selection.age;state.player.portraitId=selection.portraitId;state.player.backgroundId=background.id;state.player.attributes={...selection.attributes};state.player.skills={...selection.skills};
    for(const [skill,value] of Object.entries(background.startingSkills))state.player.skills[skill]=(state.player.skills[skill]??0)+value;
    state.player.perks=[...selection.perkIds];state.player.traits=[...new Set([...state.player.traits,...background.tags])];state.player.temporaryModifiers=[...state.player.temporaryModifiers,...background.startingModifiers,...selection.perkIds.flatMap(id=>this.content.perks.get(id)?.modifiers??[])];state.player.inventory.credits=background.startingMoney;
    state.world.currentMapId=config.startingMapId;state.world.currentPoiId=config.startingPoiId??null;state.world.selectedPoiId=config.startingPoiId??null;state.world.flags={...state.world.flags,...background.startingFlags};if(config.startingTime)Object.assign(state.time,config.startingTime);
    const inventory=new InventorySystem(this.content);for(const item of background.startingItems)inventory.add(state.player.inventory,item.itemId,item.quantity);for(const [id,value] of Object.entries(background.startingFactionReputation)){const factionState=state.factions[id],definition=this.content.factions.get(id);if(factionState&&definition){factionState.reputation=value;refreshFactionRuntime(definition,factionState);}}
    for(const questId of config.startingQuestIds){const quest=this.content.quests.get(questId);if(quest)state.quests[questId]=createInitialQuestRuntimeState(questId,{status:'Active',currentStageId:quest.initialStageId});}
    const random=new DiceRoller(1337),executor=new EffectExecutor(new EffectRegistry(true));executor.executeBatch([...background.startingEffects,...selection.perkIds.flatMap(id=>this.content.perks.get(id)?.startingEffects??[])],{state,contentRegistry:this.content,random});
    const resolved=new CharacterStatsSystem().resolve(state.player);state.player.vitals={...resolved.derivedStats,currentHp:resolved.derivedStats.maxHp,currentEther:resolved.derivedStats.maxEther};return state;
  }
  preview(selection:CharacterCreationSelection){const state=this.initialize(selection);return new CharacterStatsSystem().resolve(state.player);}
}
