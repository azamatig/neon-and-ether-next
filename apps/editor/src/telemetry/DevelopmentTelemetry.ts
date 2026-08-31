import type { GameContent, GameState } from '@neon-ether/game-schema';
import type { GameSession, RuntimeTraceEvent, StatCheckResolution } from '@neon-ether/game-runtime';

export type TelemetrySystem = 'combat'|'economy'|'progression'|'quest'|'event'|'faction'|'base'|'environment'|'condition';
export interface DevelopmentTelemetryEvent { id:number;at:string;system:TelemetrySystem;type:string;entityId?:string;seed:number;weatherId?:string;source?:string;data:Record<string,unknown>; }
export interface TelemetrySummary { eventCount:number; elapsedSeconds:number; combats:number; victories:number; defeats:number; moneyGained:number; moneySpent:number; skillChecks:number; skillCheckSuccessRate:number; questsCompleted:number; }

/** Local Editor-only observer. It never writes to GameState or dispatches commands. */
export class DevelopmentTelemetrySession {
  readonly sessionId=`telemetry_${Date.now()}`;
  readonly startedAt=new Date().toISOString();
  readonly events:DevelopmentTelemetryEvent[]=[];
  private sequence=0; private previous?:GameState; private detachCallbacks:Array<()=>void>=[]; private lastSource='playtest';
  constructor(private readonly content:GameContent) {}

  attach(session:GameSession):void {
    this.detach(); this.previous=session.getState();
    this.detachCallbacks.push(
      session.events.on('RUNTIME_TRACED',(trace)=>this.onTrace(trace,session.getState())),
      session.events.on('STAT_CHECK_TRIGGERED',(resolution)=>this.onSkillCheck(resolution,session.getState())),
      session.events.on('POI_ACTION_EXECUTED',(event)=>this.record('event','poiAction',event.poiId,{actionId:event.actionId,label:event.actionLabel,status:event.resolution.status},session.getState())),
      session.events.on('STATE_CHANGED',(state)=>this.onState(structuredClone(state))),
    );
  }
  detach():void { this.detachCallbacks.splice(0).forEach((detach)=>detach()); }
  clear():void { this.events.length=0;this.sequence=0; }

  getSummary():TelemetrySummary { const checks=this.events.filter((event)=>event.type==='skillCheck');return{eventCount:this.events.length,elapsedSeconds:Math.max(0,(Date.now()-Date.parse(this.startedAt))/1000),combats:this.events.filter((event)=>event.type==='combatCompleted').length,victories:this.events.filter((event)=>event.type==='combatCompleted'&&event.data.outcome==='Victory').length,defeats:this.events.filter((event)=>event.type==='combatCompleted'&&event.data.outcome==='Defeat').length,moneyGained:this.events.filter((event)=>event.type==='moneyChanged'&&Number(event.data.delta)>0).reduce((sum,event)=>sum+Number(event.data.delta),0),moneySpent:-this.events.filter((event)=>event.type==='moneyChanged'&&Number(event.data.delta)<0).reduce((sum,event)=>sum+Number(event.data.delta),0),skillChecks:checks.length,skillCheckSuccessRate:checks.length?checks.filter((event)=>event.data.passed).length/checks.length:0,questsCompleted:this.events.filter((event)=>event.type==='questStatus'&&event.data.current==='Completed').length}; }
  getEncounterComparison(){const ids=[...new Set(this.events.filter((event)=>event.type==='combatCompleted').map((event)=>event.entityId).filter(Boolean))] as string[];return ids.map((encounterId)=>{const runs=this.events.filter((event)=>event.type==='combatCompleted'&&event.entityId===encounterId);return{encounterId,runs:runs.length,victories:runs.filter((event)=>event.data.outcome==='Victory').length,averageTurns:runs.reduce((sum,event)=>sum+Number(event.data.turns??0),0)/runs.length,averageDamageDealt:runs.reduce((sum,event)=>sum+Number(event.data.damageDealt??0),0)/runs.length,averageDamageReceived:runs.reduce((sum,event)=>sum+Number(event.data.damageReceived??0),0)/runs.length,averageLootValue:runs.reduce((sum,event)=>sum+Number(event.data.lootValue??0),0)/runs.length};});}
  getChoiceDistribution(){const choices=this.events.filter((event)=>event.type==='choiceSelected'||(event.type==='questTransition'&&(event.data.branchId||event.data.actionId)));const keyOf=(event:DevelopmentTelemetryEvent)=>`${event.entityId}:${event.data.choiceId??event.data.branchId??event.data.actionId}`;const keys=[...new Set(choices.map(keyOf))];return keys.map((key)=>{const [entityId,choiceId]=key.split(':');return{entityId,choiceId,count:choices.filter((event)=>keyOf(event)===key).length};});}
  exportJson():string{return JSON.stringify({sessionId:this.sessionId,startedAt:this.startedAt,summary:this.getSummary(),events:this.events},null,2);}
  exportCsv():string { const quote=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;return ['id,at,system,type,entityId,seed,weatherId,source,data',...this.events.map((event)=>[event.id,event.at,event.system,event.type,event.entityId,event.seed,event.weatherId,event.source,JSON.stringify(event.data)].map(quote).join(','))].join('\n'); }

  private onTrace(trace:RuntimeTraceEvent,state:GameState):void { this.lastSource=trace.message;const map:Partial<Record<RuntimeTraceEvent['kind'],[TelemetrySystem,string]>>={ConditionChecked:['condition','conditionChecked'],EffectStarted:['progression','effectStarted'],EffectExecuted:['progression','effectExecuted'],EventTransition:['event','eventTransition'],QuestTransition:['quest','questTransition'],CombatStarted:['combat','combatStarted'],CombatCompleted:['combat','combatCompleted'],CombatAction:['combat','combatAction'],EconomyTransaction:['economy','transaction'],CraftingCompleted:['economy','crafting'],EventChoice:['event','choiceSelected'],BaseCommand:['base','baseCommand'],CharacterCommand:['base','characterCommand'],SkillCheck:['progression','skillCheck']};const mapped=map[trace.kind];if(!mapped)return;const details=trace.details??{};const entityId=String(details.encounterId??details.questId??details.eventId??details.shopId??details.recipeId??details.roomDefinitionId??'')||undefined;this.record(mapped[0],mapped[1],entityId,{message:trace.message,...details},state);}
  private onSkillCheck(resolution:StatCheckResolution,state:GameState):void { this.record('progression','skillCheck',resolution.stat,{difficulty:resolution.difficulty,outcome:resolution.outcome,passed:resolution.isPassed,roll:resolution.diceRoll.total,target:resolution.targetDc},state); }
  private onState(state:GameState):void { const before=this.previous;if(!before){this.previous=state;return;}const source=this.lastSource;
    const money=state.player.inventory.credits-before.player.inventory.credits;if(money)this.record('economy','moneyChanged',undefined,{delta:money,current:state.player.inventory.credits},state,source);
    const xp=state.player.experience-before.player.experience;if(xp)this.record('progression','xpChanged',state.player.characterId,{delta:xp,current:state.player.experience},state,source);
    if(state.player.level!==before.player.level)this.record('progression','levelChanged',state.player.characterId,{previous:before.player.level,current:state.player.level},state,source);
    for(const [id,faction] of Object.entries(state.factions)){const prior=before.factions[id];if(prior&&prior.reputation!==faction.reputation)this.record('faction','reputationChanged',id,{previous:prior.reputation,current:faction.reputation,delta:faction.reputation-prior.reputation},state,source);}
    for(const [id,quest] of Object.entries(state.quests)){const prior=before.quests[id];if(!prior||prior.currentStageId!==quest.currentStageId)this.record('quest','questStage',id,{previous:prior?.currentStageId,current:quest.currentStageId},state,source);if(prior&&prior.status!==quest.status)this.record('quest','questStatus',id,{previous:prior.status,current:quest.status},state,source);}
    for(const [id,room] of Object.entries(state.base.rooms))if(!before.base.rooms[id])this.record('base','roomBuilt',room.definitionId,{roomInstanceId:id,slotId:room.slotId},state,source);else{const installed=room.installedUpgradeIds.filter((upgrade)=>!before.base.rooms[id].installedUpgradeIds.includes(upgrade));for(const upgradeId of installed)this.record('base','upgradeInstalled',upgradeId,{roomInstanceId:id},state,source);}
    for(const [id,npc] of Object.entries(state.npcs)){const prior=before.npcs[id];if(prior&&prior.assignment.jobId!==npc.assignment.jobId)this.record('base','jobAssigned',npc.assignment.jobId??undefined,{npcId:id,previous:prior.assignment.jobId},state,source);}
    for(const [resourceId,current] of Object.entries(state.base.resources)){const previous=before.base.resources[resourceId]??0;if(current!==previous)this.record('base',current>previous?'resourceProduced':'resourceSpent',resourceId,{previous,current,delta:current-previous},state,source);}
    for(const [skillId,current] of Object.entries(state.player.skills)){const previous=before.player.skills[skillId]??0;if(current!==previous)this.record('progression','skillChanged',skillId,{previous,current,delta:current-previous},state,source);}
    for(const [itemId,quantity] of this.inventoryDelta(before,state))this.record('economy',quantity>0?'itemGained':'itemSpent',itemId,{quantity:Math.abs(quantity),delta:quantity},state,source);
    this.previous=state;this.lastSource='playtest'; }
  private inventoryDelta(before:GameState,after:GameState):Array<[string,number]>{const total=(state:GameState)=>Object.fromEntries(this.content.items.map((item)=>[item.id,state.player.inventory.items.filter((entry)=>entry.itemId===item.id).reduce((sum,entry)=>sum+entry.quantity,0)]));const a=total(before),b=total(after);return Object.keys(b).flatMap((id)=>a[id]===b[id]?[]:[[id,b[id]-a[id]] as [string,number]]);}
  private record(system:TelemetrySystem,type:string,entityId:string|undefined,data:Record<string,unknown>,state:GameState,source=this.lastSource):void { const weather=state.world.weatherByScope[state.world.currentMapId]?.currentWeatherId;this.events.push({id:++this.sequence,at:new Date().toISOString(),system,type,entityId,seed:state.rng.initialSeed,weatherId:weather,source,data}); }
}
