import type { Condition, GameContent, GameEvent, GameState, Quest, QuestStage } from '@neon-ether/game-schema';
import { ContentRegistry, GameSession, type ResolvedQuestState } from '@neon-ether/game-runtime';

export interface WalkthroughHistoryEntry { id: number; label: string; kind: 'stage' | 'action' | 'branch' | 'event' | 'poi' | 'combat' | 'debug'; }
export interface PrerequisiteResult { condition: Condition; satisfied: boolean; reason: string; automatic: boolean; }
export interface StageReferences { events: GameEvent[]; pois: GameContent['pois']; encounters: GameContent['encounters']; }

/** Development-only facade over a real isolated GameSession and QuestRuntime. */
export class QuestWalkthroughController {
  private readonly session: GameSession;
  private sequence = 0;
  private previousState: GameState;
  readonly history: WalkthroughHistoryEntry[] = [];
  readonly stateChanges: string[] = [];
  readonly unresolvedPrerequisites: string[] = [];

  constructor(private readonly content: GameContent, readonly quest: Quest, seed = 1337) {
    const registry = new ContentRegistry(); registry.loadContent(content);
    this.session = new GameSession(registry, seed);
    this.previousState = this.session.getState();
    this.start();
  }

  getState(): GameState { return this.session.getState(); }
  getResolved(): ResolvedQuestState | undefined { return this.session.getResolvedQuestState(this.quest.id); }
  evaluate(conditions: Condition[]) { return this.session.evaluateConditions(conditions); }

  start(): void {
    const prerequisites = this.quest.stages[this.quest.initialStageId]?.entryConditions ?? [];
    this.satisfyConditions(prerequisites);
    const result = this.session.startQuest(this.quest.id);
    this.capture(result.message);
    if (result.success) this.push('stage', this.quest.stages[this.quest.initialStageId]?.title ?? this.quest.initialStageId);
  }

  referencesFor(stage: QuestStage): StageReferences {
    const serialized = JSON.stringify(stage);
    const events = this.content.events.filter((event) => serialized.includes(event.id) || JSON.stringify(event).includes(this.quest.id));
    const pois = this.content.pois.filter((poi) => poi.questIds.includes(this.quest.id) || serialized.includes(poi.id) || poi.actions.some((action) => action.questId === this.quest.id));
    const encounters = this.content.encounters.filter((encounter) => serialized.includes(encounter.id) || events.some((event) => JSON.stringify(event).includes(encounter.id)));
    return { events, pois, encounters };
  }

  executeAction(actionId: string): boolean {
    const result = this.session.executeQuestAction(this.quest.id, actionId); this.capture(result.message);
    if (result.success) this.push('action', actionId);
    return result.success;
  }

  completeStage(branchId?: string): boolean {
    const before = this.getResolved();
    const result = this.session.completeQuestStage(this.quest.id, branchId); this.capture(result.message);
    if (result.success) {
      if (branchId) this.push('branch', branchId);
      const next = this.getResolved(); if (next && next.stage.id !== before?.stage.id) this.push('stage', next.stage.title);
    }
    return result.success;
  }

  satisfyCurrentStage(): PrerequisiteResult[] {
    const resolved = this.getResolved(); if (!resolved) return [];
    this.mutate((state) => {
      const runtime = state.quests[this.quest.id];
      for (const objective of resolved.stage.objectives) {
        runtime.objectiveCounters[objective.id] = objective.requiredCount;
        if (!runtime.completedObjectiveIds.includes(objective.id)) runtime.completedObjectiveIds.push(objective.id);
      }
    }, 'Completed current stage objectives');
    return this.satisfyConditions(resolved.stage.completionConditions);
  }

  /** Builds a checkpoint from inferable prerequisites, then switches the real QuestRuntime state to the selected stage. */
  jumpToStage(stageId: string): PrerequisiteResult[] {
    const target = this.quest.stages[stageId]; if (!target) return [];
    const stageOrder = Object.values(this.quest.stages).sort((a, b) => a.stageNumber - b.stageNumber);
    const previousStages = stageOrder.filter((stage) => stage.stageNumber < target.stageNumber);
    const prerequisites = [...previousStages.flatMap((stage) => [...stage.entryConditions, ...stage.completionConditions]), ...target.entryConditions];
    const results = this.satisfyConditions(prerequisites);
    this.unresolvedPrerequisites.length = 0;
    for (const previous of previousStages) {
      if (previous.branches.length > 1) this.unresolvedPrerequisites.push(`${previous.title}: choose one of ${previous.branches.length} branch-specific effect paths manually.`);
      else if (previous.actions.some((action) => action.effects.length > 0)) this.unresolvedPrerequisites.push(`${previous.title}: optional action effects are ambiguous and were not inferred.`);
    }
    // Target entry effects are unambiguous and normally execute on transition.
    // Earlier branch/action effects are intentionally not guessed.
    this.session.executeEffects(target.entryEffects);
    this.mutate((state) => {
      const current = state.quests[this.quest.id];
      const completedObjectiveIds = [...new Set([...(current?.completedObjectiveIds ?? []), ...previousStages.flatMap((stage) => stage.objectives.map((objective) => objective.id))])];
      const objectiveCounters = { ...(current?.objectiveCounters ?? {}), ...Object.fromEntries(previousStages.flatMap((stage) => stage.objectives.map((objective) => [objective.id, objective.requiredCount]))) };
      state.quests[this.quest.id] = { questId: this.quest.id, status: 'Active', currentStageId: stageId, completedObjectiveIds, failedObjectiveIds: [], objectiveCounters, startedAtTurn: current?.startedAtTurn ?? state.time.turnCount, customVariables: { ...(current?.customVariables ?? {}), walkthroughCheckpoint: stageId } };
    }, `Checkpoint prepared for ${target.title}`);
    this.push('stage', target.title);
    return results;
  }

  playEvent(eventId: string): boolean { const ok=this.session.startEvent(eventId);this.capture(`Play Event: ${eventId}`);if(ok)this.push('event',eventId);return ok; }
  openPoi(poiId: string): boolean { const ok=this.session.openPoi(poiId);this.capture(`Open POI: ${poiId}`);if(ok)this.push('poi',poiId);return ok; }
  startEncounter(encounterId: string): boolean { const ok=this.session.startCombatEncounter(encounterId,true);this.capture(`Start Encounter: ${encounterId}`);if(ok)this.push('combat',encounterId);return ok; }
  setDebugFlag(flag:string,value:string|number|boolean):void { this.session.executeEffect({type:'setFlag',flag,value});this.capture(`Debug flag ${flag}`); }
  addDebugItem(itemId:string,quantity=1):void { this.session.executeEffect({type:'addItem',itemId,quantity,isEquipped:false,autoEquip:false});this.capture(`Debug item ${itemId}`); }
  setDebugRelationship(npcId:string,value:number):void { const current=this.getState().npcs[npcId]?.relationship.affinity;if(current===undefined)return;this.session.executeEffect({type:'changeRelationship',npcId,delta:value-current});this.capture(`Debug relationship ${npcId}`); }
  setDebugFactionReputation(factionId:string,value:number):void { this.session.executeEffect({type:'setFactionReputation',factionId,value:Math.max(-100,Math.min(100,value))});this.capture(`Debug reputation ${factionId}`); }

  satisfyConditions(conditions: Condition[]): PrerequisiteResult[] {
    const results: PrerequisiteResult[] = [];
    for (const condition of conditions) {
      const before = this.session.evaluateCondition(condition);
      if (before.isMet) { results.push({ condition, satisfied: true, reason: before.reason ?? 'Already satisfied', automatic: true }); continue; }
      const automatic = this.applyCondition(condition);
      const after = this.session.evaluateCondition(condition);
      results.push({ condition, satisfied: after.isMet, reason: after.isMet ? 'Satisfied in isolated runtime state' : (after.reason ?? 'Requires a manual Debug Inspector value'), automatic });
    }
    this.capture('Satisfy Conditions');
    return results;
  }

  private applyCondition(condition: Condition): boolean {
    switch (condition.type) {
      case 'flag': this.session.executeEffect({ type: 'setFlag', flag: condition.flag, value: condition.operator === '!=' ? (typeof condition.value === 'boolean' ? !condition.value : `not_${condition.value}`) : condition.value }); return true;
      case 'hasItem': this.session.executeEffect({ type: 'addItem', itemId: condition.itemId, quantity: condition.quantity, isEquipped: condition.requireEquipped, autoEquip: condition.requireEquipped }); return true;
      case 'playerStat': this.session.executeEffect({ type: 'changeStat', stat: condition.stat, value: condition.value, mode: 'set', targetCharacterId: condition.targetCharacterId }); return ['>=','>','=='].includes(condition.operator);
      case 'relationship': { const current=this.getState().npcs[condition.npcId]?.relationship.affinity; if(current===undefined)return false; this.session.executeEffect({type:'changeRelationship',npcId:condition.npcId,delta:condition.value-current}); return ['>=','>','=='].includes(condition.operator); }
      case 'factionReputation': this.session.executeEffect({type:'setFactionReputation',factionId:condition.factionId,value:Math.max(-100,Math.min(100,condition.value))}); return ['>=','>','=='].includes(condition.operator);
      case 'factionMembership': this.session.executeEffect({type:'setFactionMembership',factionId:condition.factionId,membershipStatus:condition.membershipStatus}); return true;
      case 'factionHostile': this.session.executeEffect({type:'setFactionHostility',factionId:condition.factionId,hostile:condition.hostile}); return true;
      case 'factionDiscovered': this.session.executeEffect({type:'discoverFaction',factionId:condition.factionId,discovered:condition.discovered}); return true;
      case 'npcState': if(!this.getState().npcs[condition.npcId])return false; this.session.executeEffect({type:'changeNpcState',npcId:condition.npcId,isAlive:condition.isAlive,isMerchant:condition.isMerchant,isCompanion:condition.isCompanion,behavior:condition.behavior as any}); return true;
      case 'questState': this.mutate((state)=>{state.quests[condition.questId]={questId:condition.questId,status:condition.status==='NotStarted'?'Unassigned':condition.status ?? 'Active',currentStageId:condition.stageId ?? this.content.quests.find((quest)=>quest.id===condition.questId)?.initialStageId ?? '',completedObjectiveIds:[],failedObjectiveIds:[],objectiveCounters:{},customVariables:{}};},`Prepared prerequisite quest ${condition.questId}`);return condition.operator==='==';
      default: return false;
    }
  }

  private mutate(change: (state: GameState) => void, label: string): void { const save=this.session.createSaveGame('Quest Walkthrough');change(save.state);const loaded=this.session.loadSave(save);if(!loaded.success)throw new Error(loaded.error);this.push('debug',label); }
  private push(kind: WalkthroughHistoryEntry['kind'], label: string): void { this.history.push({ id: ++this.sequence, kind, label }); }
  private capture(label: string): void { const next=this.session.getState();const changes=this.diff(this.previousState,next);this.stateChanges.unshift(`${label}${changes.length ? `\n${changes.join('\n')}` : '\n(no state changes)'}`);this.stateChanges.splice(30);this.previousState=next; }
  private diff(before: GameState, after: GameState): string[] { const paths=['world.mode','world.currentPoiId','world.activeEventId','world.activeEncounterId',`quests.${this.quest.id}.status`,`quests.${this.quest.id}.currentStageId`,'player.inventory.credits'];const read=(source:any,path:string)=>path.split('.').reduce((value,key)=>value?.[key],source);return paths.flatMap((path)=>JSON.stringify(read(before,path))===JSON.stringify(read(after,path))?[]:[`${path}: ${JSON.stringify(read(before,path))} → ${JSON.stringify(read(after,path))}`]); }
}
