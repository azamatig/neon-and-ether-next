import type { RewardDefinition } from '@neon-ether/game-schema';
import type { ContentRegistry } from '../content/content-registry.ts';
import type { GameState } from '../state/game-state.ts';
import { InventorySystem } from '../inventory/inventory-system.ts';
export interface ProgressionRewardResult { success:boolean; xpGranted:number; levelsGained:number; skillRanksGained:Record<string,number>; reason?:string }

/** Shared reward/progression service for every gameplay source. */
export class ProgressionSystem {
  constructor(private readonly content:ContentRegistry, private readonly inventory = new InventorySystem(content)) {}
  grant(state:GameState,reward:RewardDefinition):ProgressionRewardResult {
    const isPlayer=!reward.targetCharacterId||reward.targetCharacterId===state.player.characterId;
    const target=isPlayer?state.player:state.npcs[reward.targetCharacterId!];
    if(!target)return {success:false,xpGranted:0,levelsGained:0,skillRanksGained:{},reason:'Reward target not found.'};
    const definitionId=target.progressionDefinitionId;
    const definition=definitionId?this.content.progressionDefinitions.get(definitionId):undefined;
    const previousLevel=target.level; target.experience+=reward.xp;
    if(definition){
      const reached=definition.levels.filter(entry=>entry.totalXp<=target.experience).sort((a,b)=>b.level-a.level)[0];
      if(reached&&reached.level>target.level){
        for(const level of definition.levels.filter(entry=>entry.level>target.level&&entry.level<=reached.level)){ target.skillPointsUnspent+=level.skillPoints;target.perkPointsUnspent+=level.perkPoints;if(isPlayer)state.player.attributePointsUnspent+=level.attributePoints; }
        target.level=reached.level;
      }
    }
    target.perkPointsUnspent+=reward.perkPoints;
    const gained:Record<string,number>={};
    for(const [skillId,xp] of Object.entries(reward.skillXp)){ const before=target.skillExperience[skillId]??0;target.skillExperience[skillId]=before+xp;if(definition){const prior=Math.floor(before/definition.skillXpPerRank);const next=Math.floor((before+xp)/definition.skillXpPerRank);const ranks=Math.max(0,next-prior);const cap=definition.maxSkillRank;const current=target.skills[skillId]??0;const applied=cap===undefined?ranks:Math.min(ranks,Math.max(0,cap-current));target.skills[skillId]=current+applied;gained[skillId]=applied;} }
    if(isPlayer){ state.player.inventory.credits+=reward.credits; for(const item of reward.items){const added=this.inventory.add(state.player.inventory,item.itemId,item.quantity);if(!added.success)return {success:false,xpGranted:reward.xp,levelsGained:target.level-previousLevel,skillRanksGained:gained,reason:added.reason};} }
    return {success:true,xpGranted:reward.xp,levelsGained:target.level-previousLevel,skillRanksGained:gained};
  }
}
