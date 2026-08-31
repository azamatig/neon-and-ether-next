import type { RecipeDefinition } from '@neon-ether/game-schema';
import type { ContentRegistry } from '../content/content-registry.ts';
import type { GameState } from '../state/game-state.ts';
import { ConditionRegistry, defaultConditionRegistry } from '../conditions/condition-registry.ts';
import { evaluateConditions } from '../conditions/condition-evaluator.ts';
import { EffectExecutor, defaultEffectExecutor } from '../effects/effect-executor.ts';
import { InventorySystem } from '../inventory/inventory-system.ts';
import { CharacterStatsSystem } from '../stats/character-stats-system.ts';
import { DiceRoller, type RandomSource } from '@neon-ether/engine';

export interface CraftingContext { location:'poi'|'base'|'room'; poiId?:string; roomInstanceId?:string }
export interface CraftingResult { success:boolean; recipeId:string; reason?:string; turnsSpent:number }

/** Location-neutral recipe executor shared by POIs, bases, and rooms/stations. */
export class CraftingSystem {
  private inventory:InventorySystem;
  constructor(private readonly content:ContentRegistry,private readonly conditions:ConditionRegistry=defaultConditionRegistry,private readonly effects:EffectExecutor=defaultEffectExecutor,private readonly random:RandomSource=new DiceRoller(1337)){this.inventory=new InventorySystem(content);}
  getAvailable(state:GameState,context:CraftingContext):RecipeDefinition[]{return this.content.recipes.getAll().filter(recipe=>this.canCraft(recipe,state,context).success);}
  canCraft(recipe:RecipeDefinition,state:GameState,context:CraftingContext):CraftingResult {
    const fail=(reason:string):CraftingResult=>({success:false,recipeId:recipe.id,reason,turnsSpent:0});
    if(!recipe.availableAt.includes(context.location))return fail(`Recipe is unavailable at ${context.location}.`);
    const builtRooms=Object.values(state.base.rooms).filter((room)=>room.isBuilt);
    const accessibleRoomIds=context.location==='poi'?[]:context.location==='room'?builtRooms.filter((room)=>room.roomId===context.roomInstanceId).map((room)=>room.definitionId):builtRooms.map((room)=>room.definitionId);
    if(recipe.roomIds.length&&!recipe.roomIds.some(id=>accessibleRoomIds.includes(id)))return fail('Required room or station is unavailable.');
    for(const toolId of recipe.toolItemIds)if(!state.player.inventory.items.some(entry=>entry.itemId===toolId&&entry.quantity>0))return fail(`Required tool '${toolId}' is missing.`);
    const effectiveStats=new CharacterStatsSystem().resolve(state.player);
    for(const requirement of recipe.requirements){if(requirement.type==='level'&&state.player.level<requirement.minimum)return fail(`Requires level ${requirement.minimum}.`);if(requirement.type==='attribute'&&effectiveStats.attributes[requirement.attribute]<requirement.minimum)return fail(`Requires ${requirement.attribute} ${requirement.minimum}.`);if(requirement.type==='skill'&&(state.player.skills[requirement.skillId]??0)<requirement.minimum)return fail(`Requires ${requirement.skillId} ${requirement.minimum}.`);}
    const evaluated=evaluateConditions(recipe.conditions,{state,contentRegistry:this.content,rollRandom:(min,max)=>this.random.integer(min,max)},this.conditions);if(!evaluated.allMet)return fail(evaluated.failedConditions[0]?.reason??'Crafting conditions are not met.');
    for(const input of recipe.inputs){const quantity=state.player.inventory.items.filter(entry=>entry.itemId===input.itemId&&!entry.isEquipped).reduce((sum,entry)=>sum+entry.quantity,0);if(quantity<input.quantity)return fail(`Missing ${input.quantity}x '${input.itemId}'.`);}
    const simulated=structuredClone(state.player.inventory);for(const input of recipe.inputs)this.inventory.remove(simulated,input.itemId,input.quantity);const output=this.inventory.add(simulated,recipe.output.itemId,recipe.output.quantity);if(!output.success)return fail(output.reason??'Output does not fit inventory.');
    return {success:true,recipeId:recipe.id,turnsSpent:0};
  }
  craft(recipeId:string,state:GameState,context:CraftingContext):CraftingResult {
    const recipe=this.content.recipes.get(recipeId);if(!recipe)return {success:false,recipeId,reason:'Recipe not found.',turnsSpent:0};
    const allowed=this.canCraft(recipe,state,context);if(!allowed.success)return allowed;
    for(const input of recipe.inputs)this.inventory.remove(state.player.inventory,input.itemId,input.quantity);
    const output=this.inventory.add(state.player.inventory,recipe.output.itemId,recipe.output.quantity);if(!output.success)return {...allowed,success:false,reason:output.reason};
    state.time.turnCount+=recipe.timeCost.turns;
    this.effects.executeBatch(recipe.effects,{state,contentRegistry:this.content,random:this.random});
    return {success:true,recipeId,turnsSpent:recipe.timeCost.turns};
  }
}
