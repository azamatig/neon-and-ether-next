import type { GameContent } from '../types/content.ts';
import { ConditionSchema, type Condition } from '../types/conditions.ts';
import { EffectSchema, type Effect } from '../types/effects.ts';
import { GameplayOutcomeSchema, type GameplayOutcome } from '../types/outcomes.ts';
import { RoomTypeSchema } from '../types/room.ts';
import type { ContentValidationOptions, ValidationCategory, ValidationIssue } from './types.ts';

interface Owner { category: ValidationCategory; targetId: string; field: string }

export function validateContentGraph(content: GameContent, options: ContentValidationOptions = {}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = {
    item: new Set(content.items.map((value) => value.id)), npc: new Set(content.npcs.map((value) => value.id)),
    enemy: new Set(content.enemies.map((value) => value.id)), quest: new Set(content.quests.map((value) => value.id)),
    event: new Set(content.events.map((value) => value.id)), poi: new Set(content.pois.map((value) => value.id)),
    map: new Set(content.maps.map((value) => value.id)), encounter: new Set(content.encounters.map((value) => value.id)),
    faction: new Set(content.factions.map((value) => value.id)), room: new Set(content.rooms.map((value) => value.id)),
    dialogue: new Set(content.dialogues.map((value) => value.id)),
    progression: new Set(content.progressionDefinitions.map((value) => value.id)),
    shop: new Set(content.shops.map((value) => value.id)),
  };
  const missing = (set: ReadonlySet<string>, id: string | undefined, kind: string, owner: Owner) => {
    if (id && !set.has(id)) issues.push({ severity: 'error', category: owner.category, targetId: owner.targetId, field: owner.field, message: `Missing ${kind} reference '${id}'` });
  };
  const condition = (value: Condition, owner: Owner): void => {
    const parsed = ConditionSchema.safeParse(value);
    if (!parsed.success) { issues.push({ severity: 'error', category: owner.category, targetId: owner.targetId, field: owner.field, message: `Invalid condition: ${parsed.error.issues[0]?.message}` }); return; }
    const current = parsed.data;
    if (current.type === 'and' || current.type === 'or') return current.conditions.forEach((entry, index) => condition(entry, { ...owner, field: `${owner.field}.${index}` }));
    if (current.type === 'not') return condition(current.condition, { ...owner, field: `${owner.field}.condition` });
    if (current.type === 'hasItem') missing(ids.item, current.itemId, 'item', owner);
    if (current.type === 'questState') missing(ids.quest, current.questId, 'quest', owner);
    if (current.type === 'npcState' || current.type === 'relationship') missing(ids.npc, current.npcId, 'NPC', owner);
    if (current.type === 'companionPresent') missing(ids.npc, current.companionId, 'NPC', owner);
    if (current.type === 'factionReputation') missing(ids.faction, current.factionId, 'faction', owner);
    if (current.type === 'baseRoomExists') missing(ids.room, current.roomId, 'room', owner);
  };
  const effect = (value: Effect, owner: Owner): void => {
    const parsed = EffectSchema.safeParse(value);
    if (!parsed.success) { issues.push({ severity: 'error', category: owner.category, targetId: owner.targetId, field: owner.field, message: `Invalid effect: ${parsed.error.issues[0]?.message}` }); return; }
    const current = parsed.data;
    if (current.type === 'addItem' || current.type === 'removeItem') missing(ids.item, current.itemId, 'item', owner);
    if (current.type === 'startQuest' || current.type === 'advanceQuest' || current.type === 'completeQuest') missing(ids.quest, current.questId, 'quest', owner);
    if (current.type === 'startQuest' || current.type === 'advanceQuest') {
      const quest=content.quests.find((entry)=>entry.id===current.questId); const stageId=current.type==='startQuest'?current.initialStageId:current.targetStageId;
      if(stageId&&quest&&!quest.stages[stageId])issues.push({severity:'error',category:owner.category,targetId:owner.targetId,field:owner.field,message:`Quest '${current.questId}' has no stage '${stageId}'`});
      if(current.type==='advanceQuest'&&current.completeObjectiveId&&quest&&!Object.values(quest.stages).some((stage)=>stage.objectives.some((objective)=>objective.id===current.completeObjectiveId)))issues.push({severity:'error',category:owner.category,targetId:owner.targetId,field:owner.field,message:`Quest '${current.questId}' has no objective '${current.completeObjectiveId}'`});
    }
    if (current.type === 'changeNpcState' || current.type === 'changeRelationship' || current.type === 'recruitNpc') missing(ids.npc, current.npcId, 'NPC', owner);
    if (current.type === 'changeFactionReputation') missing(ids.faction, current.factionId, 'faction', owner);
    if (current.type === 'startCombat') { missing(ids.encounter, current.encounterId, 'encounter', owner); current.enemyIds?.forEach((id) => missing(ids.enemy, id, 'enemy', owner)); missing(ids.map, current.mapId, 'map', owner); missing(ids.poi, current.poiId, 'POI', owner); }
    if (current.type === 'triggerEvent') missing(ids.event, current.eventId, 'event', owner);
    if (current.type === 'movePlayer') { missing(ids.map, current.mapId, 'map', owner); missing(ids.poi, current.poiId, 'POI', owner); }
    if (current.type === 'travelPoi' || current.type === 'changePoiState') missing(ids.poi, current.poiId, 'POI', owner);
    if(current.type==='changePoiState'&&current.completeActionId){const poi=content.pois.find((entry)=>entry.id===current.poiId);if(poi&&!poi.actions.some((action)=>action.id===current.completeActionId))issues.push({severity:'error',category:owner.category,targetId:owner.targetId,field:owner.field,message:`POI '${current.poiId}' has no action '${current.completeActionId}'`});}
    if (current.type === 'travelPoi') missing(ids.map, current.mapId, 'map', owner);
    if (current.type === 'grantRewards') current.items.forEach((item) => missing(ids.item, item.itemId, 'item', owner));
  };
  const outcome = (value: GameplayOutcome | undefined, owner: Owner): void => {
    if (!value) return;
    const parsed = GameplayOutcomeSchema.safeParse(value);
    if (!parsed.success) { issues.push({ severity: 'error', category: owner.category, targetId: owner.targetId, field: owner.field, message: `Invalid outcome: ${parsed.error.issues[0]?.message}` }); return; }
    const current = parsed.data;
    if (current.type === 'showResult') outcome(current.nextOutcome, { ...owner, field: `${owner.field}.nextOutcome` });
    if (current.type === 'sequence') current.outcomes.forEach((entry, index) => outcome(entry, { ...owner, field: `${owner.field}.${index}` }));
    if (current.type === 'event') { missing(ids.event, current.eventId, 'event', owner); const event=content.events.find((entry)=>entry.id===current.eventId); if (current.stepId && event && !event.steps.some((step)=>step.id===current.stepId)) issues.push({ severity:'error',category:owner.category,targetId:owner.targetId,field:owner.field,message:`Event '${current.eventId}' has no step '${current.stepId}'` }); }
    if (current.type === 'combat') missing(ids.encounter, current.encounterId, 'encounter', owner);
    if (current.type === 'poi') { missing(ids.poi, current.poiId, 'POI', owner); missing(ids.map, current.mapId, 'map', owner); }
    if (current.type === 'map') missing(ids.map, current.mapId, 'map', owner);
  };
  const lists = (conditions: Condition[], effects: Effect[], owner: Owner) => { conditions.forEach((entry,index)=>condition(entry,{...owner,field:`${owner.field}.conditions.${index}`})); effects.forEach((entry,index)=>effect(entry,{...owner,field:`${owner.field}.effects.${index}`})); };

  for (const poi of content.pois) {
    lists([...poi.visibilityConditions, ...poi.availabilityConditions], [], { category:'POI',targetId:poi.id,field:'availability' });
    for (const action of poi.actions) { const owner={category:'POI' as const,targetId:poi.id,field:`actions.${action.id}`}; lists(action.conditions,action.effects,owner); action.check?.passEffects.forEach((entry,index)=>effect(entry,{...owner,field:`${owner.field}.check.passEffects.${index}`})); action.check?.failEffects.forEach((entry,index)=>effect(entry,{...owner,field:`${owner.field}.check.failEffects.${index}`})); outcome(action.check?.passOutcome,{...owner,field:`${owner.field}.check.passOutcome`});outcome(action.check?.failOutcome,{...owner,field:`${owner.field}.check.failOutcome`});outcome(action.outcome,owner); }
  }
  for (const quest of content.quests) { const objectiveIds=new Set<string>(),actionIds=new Set<string>(),branchIds=new Set<string>(); for (const stage of Object.values(quest.stages)) {
    const owner={category:'Quest' as const,targetId:quest.id,field:`stages.${stage.id}`}; lists([...stage.entryConditions,...stage.completionConditions],[...stage.entryEffects,...stage.completionEffects],owner);
    for(const objective of stage.objectives){if(objectiveIds.has(objective.id))issues.push({severity:'error',category:'Quest',targetId:quest.id,field:`${owner.field}.objectives`,message:`Duplicate objective ID '${objective.id}'`});objectiveIds.add(objective.id);}
    for (const action of stage.actions) { if(actionIds.has(action.id))issues.push({severity:'error',category:'Quest',targetId:quest.id,field:`${owner.field}.actions`,message:`Duplicate quest action ID '${action.id}'`});actionIds.add(action.id);lists(action.conditions,action.effects,{...owner,field:`${owner.field}.actions.${action.id}`}); if(action.targetStageId&&!quest.stages[action.targetStageId]) issues.push({severity:'error',category:'Quest',targetId:quest.id,field:`${owner.field}.actions.${action.id}.targetStageId`,message:`Missing quest stage '${action.targetStageId}'`}); }
    for (const branch of stage.branches) {if(branchIds.has(branch.id))issues.push({severity:'error',category:'Quest',targetId:quest.id,field:`${owner.field}.branches`,message:`Duplicate quest branch ID '${branch.id}'`});branchIds.add(branch.id);lists(branch.conditions,branch.effects,{...owner,field:`${owner.field}.branches.${branch.id}`});}
  }}
  const automaticEventEdges = new Map<string,string[]>();
  for (const event of content.events) {
    const stepIds=new Set(event.steps.map((step)=>step.id)); const seenSteps=new Set<string>(); automaticEventEdges.set(event.id,[]);
    lists([...event.conditions,...event.triggerConditions,...event.availabilityConditions],[...event.entryEffects,...event.completionEffects],{category:'GameEvent',targetId:event.id,field:'event'});
    for(const entry of [...event.entryEffects,...event.completionEffects]) if(entry.type==='triggerEvent') automaticEventEdges.get(event.id)!.push(entry.eventId);
    outcome(event.completionOutcome,{category:'GameEvent',targetId:event.id,field:'completionOutcome'}); if(event.completionOutcome?.type==='event') automaticEventEdges.get(event.id)!.push(event.completionOutcome.eventId);
    for(const step of event.steps){ if(seenSteps.has(step.id)) issues.push({severity:'error',category:'GameEvent',targetId:event.id,field:`steps.${step.id}`,message:`Duplicate event step ID '${step.id}'`}); seenSteps.add(step.id); if(step.nextStepId&&!stepIds.has(step.nextStepId)) issues.push({severity:'error',category:'GameEvent',targetId:event.id,field:`steps.${step.id}.nextStepId`,message:`Missing event step '${step.nextStepId}'`}); lists(step.conditions,step.effects,{category:'GameEvent',targetId:event.id,field:`steps.${step.id}`}); outcome(step.outcome,{category:'GameEvent',targetId:event.id,field:`steps.${step.id}.outcome`}); const choices=new Set<string>(); for(const choice of step.choices){ if(choices.has(choice.id)) issues.push({severity:'error',category:'GameEvent',targetId:event.id,field:`steps.${step.id}.choices.${choice.id}`,message:`Duplicate event choice ID '${choice.id}'`}); choices.add(choice.id); if(choice.nextStepId&&!stepIds.has(choice.nextStepId)) issues.push({severity:'error',category:'GameEvent',targetId:event.id,field:`steps.${step.id}.choices.${choice.id}.nextStepId`,message:`Missing event step '${choice.nextStepId}'`}); const choiceOwner={category:'GameEvent' as const,targetId:event.id,field:`steps.${step.id}.choices.${choice.id}`};lists(choice.conditions,choice.effects,choiceOwner);choice.check?.passEffects.forEach((entry,index)=>effect(entry,{...choiceOwner,field:`${choiceOwner.field}.check.passEffects.${index}`}));choice.check?.failEffects.forEach((entry,index)=>effect(entry,{...choiceOwner,field:`${choiceOwner.field}.check.failEffects.${index}`}));outcome(choice.check?.passOutcome,{...choiceOwner,field:`${choiceOwner.field}.check.passOutcome`});outcome(choice.check?.failOutcome,{...choiceOwner,field:`${choiceOwner.field}.check.failOutcome`});outcome(choice.outcome,{...choiceOwner,field:`${choiceOwner.field}.outcome`}); } }
    const autoSteps=new Map(event.steps.map((step)=>[step.id,step.nextStepId?[step.nextStepId]:[]])); detectCycles(autoSteps,(cycle)=>issues.push({severity:'error',category:'GameEvent',targetId:event.id,field:'steps',message:`Circular automatic event transition: ${cycle.join(' -> ')}`}));
  }
  detectCycles(automaticEventEdges,(cycle)=>issues.push({severity:'error',category:'GameEvent',targetId:cycle[0],field:'automaticTransitions',message:`Circular automatic event chain: ${cycle.join(' -> ')}`}));

  for(const encounter of content.encounters){ const owner={category:'CombatEncounter' as const,targetId:encounter.id,field:'encounter'}; lists([...encounter.initialConditions,...encounter.escapeRules.conditions],[],owner); for(const modifier of encounter.modifiers) lists(modifier.conditions,modifier.effects,{...owner,field:`modifiers.${modifier.id}`}); outcome(encounter.escapeRules.outcomeOnEscape,owner); outcome(encounter.victoryOutcome,owner); outcome(encounter.defeatOutcome,owner); outcome(encounter.surrenderOutcome,owner);for(const action of encounter.survivingEnemyActions){const actionOwner={...owner,field:`survivingEnemyActions.${action.id}`};lists(action.conditions,action.effects,actionOwner);outcome(action.outcome,actionOwner);}if(encounter.creditsReward.min>encounter.creditsReward.max) issues.push({severity:'error',category:'CombatEncounter',targetId:encounter.id,field:'creditsReward',message:'creditsReward.min must not exceed max'}); for(const drop of encounter.lootTable) if(drop.minQuantity>drop.maxQuantity) issues.push({severity:'error',category:'CombatEncounter',targetId:encounter.id,field:'lootTable',message:`Loot '${drop.itemId}' minQuantity exceeds maxQuantity`}); }
  for(const room of content.rooms){ room.recommendedEnemies.forEach((id)=>missing(ids.enemy,id,'enemy',{category:'Room',targetId:room.id,field:'recommendedEnemies'})); room.recommendedPois.forEach((id)=>missing(ids.poi,id,'POI',{category:'Room',targetId:room.id,field:'recommendedPois'})); lists(room.requirements,room.effects,{category:'Room',targetId:room.id,field:'room'}); }
  for(const upgrade of content.baseUpgrades) lists(upgrade.requirements,upgrade.effects,{category:'BaseUpgrade',targetId:upgrade.id,field:'upgrade'});
  for(const recipe of content.recipes) lists(recipe.conditions,recipe.effects,{category:'Recipe',targetId:recipe.id,field:'recipe'});
  for(const npc of content.npcs) missing(ids.progression,npc.progressionDefinitionId,'progression definition',{category:'NPC',targetId:npc.id,field:'progressionDefinitionId'});
  for(const npc of content.npcs) missing(ids.shop,npc.shopId,'shop',{category:'NPC',targetId:npc.id,field:'shopId'});
  for(const poi of content.pois) missing(ids.shop,poi.shopId,'shop',{category:'POI',targetId:poi.id,field:'shopId'});
  for(const shop of content.shops){const owner={category:'Shop' as const,targetId:shop.id,field:'shop'};lists(shop.availabilityConditions,[],owner);lists(shop.buyRules.conditions,[],{...owner,field:'buyRules'});lists(shop.sellRules.conditions,[],{...owner,field:'sellRules'});shop.inventory.forEach((entry)=>missing(ids.item,entry.itemId,'item',{...owner,field:'inventory'}));shop.priceModifiers.forEach((modifier)=>lists(modifier.conditions,[],{...owner,field:`priceModifiers.${modifier.id}`}));}
  for(const enemy of content.enemies) missing(ids.progression,enemy.progressionDefinitionId,'progression definition',{category:'Enemy',targetId:enemy.id,field:'progressionDefinitionId'});
  for(const job of content.baseJobs)for(const roomType of job.roomTypes)if(!RoomTypeSchema.safeParse(roomType).success)issues.push({severity:'error',category:'BaseJob',targetId:job.id,field:'roomTypes',message:`Unknown room type '${roomType}'`});
  for(const base of content.bases){ const roomCounts=new Map<string,number>(), instances=new Set<string>(); for(const starting of base.startingRooms){if(instances.has(starting.roomInstanceId))issues.push({severity:'error',category:'PlayerBase',targetId:base.id,field:'startingRooms.roomInstanceId',message:`Duplicate room instance ID '${starting.roomInstanceId}'`});instances.add(starting.roomInstanceId);roomCounts.set(starting.roomDefinitionId,(roomCounts.get(starting.roomDefinitionId)??0)+1); const room=content.rooms.find((entry)=>entry.id===starting.roomDefinitionId); const slot=base.roomSlots.find((entry)=>entry.id===starting.slotId); if(room&&slot&&!room.allowedSlotTypes.includes(slot.slotType)) issues.push({severity:'error',category:'PlayerBase',targetId:base.id,field:'startingRooms',message:`Room '${room.id}' does not allow slot type '${slot.slotType}'`});if(room&&slot&&slot.allowedRoomTypes.length&&!slot.allowedRoomTypes.includes(room.roomType))issues.push({severity:'error',category:'PlayerBase',targetId:base.id,field:'startingRooms',message:`Slot '${slot.id}' does not allow room type '${room.roomType}'`});} for(const [roomId,count] of roomCounts){const room=content.rooms.find((entry)=>entry.id===roomId);if(room&&count>room.maxInstances)issues.push({severity:'error',category:'PlayerBase',targetId:base.id,field:'startingRooms',message:`Room '${roomId}' exceeds maxInstances (${count}/${room.maxInstances})`});} }
  for(const map of content.maps){ const member=new Set(map.poiIds),regionIds=new Set<string>(),routeIds=new Set<string>();if(map.defaultPoiId&&!member.has(map.defaultPoiId))issues.push({severity:'error',category:'Map',targetId:map.id,field:'defaultPoiId',message:`Default POI '${map.defaultPoiId}' is not part of map.poiIds`});for(const region of map.regions){if(regionIds.has(region.id))issues.push({severity:'error',category:'Map',targetId:map.id,field:'regions',message:`Duplicate region ID '${region.id}'`});regionIds.add(region.id);}for(const poiId of map.poiIds){const poi=content.pois.find((entry)=>entry.id===poiId);if(poi&&poi.mapId!==map.id)issues.push({severity:'error',category:'Map',targetId:map.id,field:'poiIds',message:`POI '${poiId}' belongs to map '${poi.mapId}', not '${map.id}'`});} for(const route of map.routes){if(routeIds.has(route.id))issues.push({severity:'error',category:'Map',targetId:map.id,field:'routes',message:`Duplicate route ID '${route.id}'`});routeIds.add(route.id);if(!member.has(route.fromPoiId)||!member.has(route.toPoiId)) issues.push({severity:'error',category:'Map',targetId:map.id,field:`routes.${route.id}`,message:`Route '${route.id}' leaves the map's POI set`});} validateAsset(map.backgroundImage,true,{category:'Map',targetId:map.id,field:'backgroundImage'},options,issues); }
  for(const poi of content.pois){const map=content.maps.find((entry)=>entry.id===poi.mapId);if(map&&!map.poiIds.includes(poi.id))issues.push({severity:'error',category:'POI',targetId:poi.id,field:'mapId',message:`POI is not listed in map '${map.id}'.poiIds`});validateAsset(poi.image,false,{category:'POI',targetId:poi.id,field:'image'},options,issues);}
  for(const event of content.events){validateAsset(event.presentation.backgroundImage,event.presentation.layoutStyle==='fullscreenScene',{category:'GameEvent',targetId:event.id,field:'presentation.backgroundImage'},options,issues);event.steps.forEach((step)=>validateAsset(step.image,false,{category:'GameEvent',targetId:event.id,field:`steps.${step.id}.image`},options,issues));}
  issues.push({severity:'info',category:'Integrity',targetId:'content',message:`Validated ${Object.values(ids).reduce((sum,set)=>sum+set.size,0)} graph entities across ${content.events.length} events and ${content.quests.length} quests.`});
  return deduplicate(issues);
}

function detectCycles(graph: Map<string,string[]>, report:(cycle:string[])=>void):void { const visited=new Set<string>(),active=new Set<string>(),stack:string[]=[]; const visit=(node:string)=>{visited.add(node);active.add(node);stack.push(node);for(const next of graph.get(node)??[]){if(!graph.has(next))continue;if(!visited.has(next))visit(next);else if(active.has(next))report([...stack.slice(stack.indexOf(next)),next]);}stack.pop();active.delete(node);};for(const node of graph.keys())if(!visited.has(node))visit(node); }
function validateAsset(asset:string|undefined,required:boolean,owner:Owner,options:ContentValidationOptions,issues:ValidationIssue[]):void { if(required&&!asset?.trim()){issues.push({severity:'error',category:owner.category,targetId:owner.targetId,field:owner.field,message:'Required image/asset is missing'});return;} if(asset&&options.knownAssets&&/^(?:\.?\/|assets\/)/.test(asset)&&!options.knownAssets.has(asset.replace(/^\.?\//,'')))issues.push({severity:required?'error':'warning',category:'Asset',targetId:owner.targetId,field:owner.field,message:`Asset '${asset}' does not exist`}); }
function deduplicate(issues:ValidationIssue[]):ValidationIssue[]{const keys=new Set<string>();return issues.filter((issue)=>{const key=`${issue.severity}|${issue.category}|${issue.targetId}|${issue.field}|${issue.message}`;if(keys.has(key))return false;keys.add(key);return true;});}
