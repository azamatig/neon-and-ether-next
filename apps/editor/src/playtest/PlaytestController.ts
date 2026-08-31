import { ContentRegistry, GameSession, type GameState, type RuntimeTraceEvent } from '@neon-ether/game-runtime';
import type { CharacterRelationshipStatus, FactionRelationValue, GameContent, QuestStatus } from '@neon-ether/game-schema';
import { DevelopmentTelemetrySession } from '../telemetry/DevelopmentTelemetry.ts';

export interface PlaytestLogEntry extends RuntimeTraceEvent { id: number; timestamp: string }
type Listener = () => void;

/** Editor-only command facade. React never mutates runtime snapshots directly. */
export class PlaytestController {
  private session: GameSession;
  private listeners = new Set<Listener>();
  private sequence = 0;
  public readonly log: PlaytestLogEntry[] = [];
  public readonly telemetry: DevelopmentTelemetrySession;

  constructor(private readonly content: GameContent) {
    this.telemetry=new DevelopmentTelemetrySession(content);
    this.session=this.createSession(1337);
  }
  private createSession(seed:number):GameSession {
    const registry = new ContentRegistry();
    registry.loadContent(this.content);
    const session = new GameSession(registry, seed, undefined, undefined, (event) => this.record(event));
    session.events.on('STATE_CHANGED', () => this.notify());
    this.telemetry.attach(session);
    return session;
  }

  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  getState(): GameState { return this.session.getState(); }
  clearLog(): void { this.log.length = 0; this.notify(); }
  getRandomState(){return this.session.getRandomState();}
  resetRandomSeed(seed:number):void{this.session.resetRandomSeed(seed);this.record({kind:'EffectExecuted',message:`RNG reset to seed ${seed}`,details:this.session.getRandomState()});}
  restartWithSeed(seed:number):void{this.telemetry.clear();this.session=this.createSession(seed);this.log.length=0;this.record({kind:'EffectExecuted',message:`Scenario restarted with seed ${seed}`,details:this.session.getRandomState()});}

  launchLocation(mapId: string, poiId?: string): void {
    this.mutate((state) => {
      state.world.currentMapId = mapId;
      state.world.currentPoiId = poiId ?? null;
      state.world.selectedPoiId = poiId ?? null;
      state.world.mode = poiId ? 'POI' : 'Map';
      if (!state.world.discoveredMapIds.includes(mapId)) state.world.discoveredMapIds.push(mapId);
    });
  }
  launchEvent(eventId: string): boolean {
    if (this.session.startEvent(eventId)) return true;
    const event = this.content.events.find((candidate) => candidate.id === eventId);
    if (!event) return false;
    this.mutate((state) => { state.world.activeEventId = event.id; state.world.activeEventStepId = event.steps[0]?.id ?? null; state.world.mode = 'Event'; });
    this.record({ kind: 'EventTransition', message: `Playtest forced event: ${eventId}`, details: { eventId, bypassedAvailability: true } });
    return true;
  }
  launchQuestStage(questId: string, stageId: string): void {
    this.mutate((state) => { state.quests[questId] = { questId, status: 'Active', currentStageId: stageId, completedObjectiveIds: [], failedObjectiveIds: [], objectiveCounters: {}, startedAtTurn: state.time.turnCount, customVariables: {} }; });
    this.record({ kind: 'QuestTransition', message: `Playtest quest stage: ${questId} / ${stageId}`, details: { questId, stageId } });
  }
  launchEncounter(encounterId: string): boolean { return this.session.startCombatEncounter(encounterId, false) && this.session.startTacticalCombat(encounterId); }
  launchEncounterInGame(encounterId: string): boolean { const started=this.launchEncounter(encounterId);if(started)this.openGame();return started; }
  prepareBase(baseId: string): boolean {
    const base=this.content.bases.find((entry)=>entry.id===baseId);if(!base)return false;
    this.mutate((state)=>{state.base.baseId=base.id;state.base.name=base.name;state.base.resources={...base.startingResources};state.base.rooms={};state.base.roomSlots=Object.fromEntries(base.roomSlots.map((slot)=>[slot.id,{slotId:slot.id,slotType:slot.slotType,roomInstanceId:null,isLocked:!slot.unlockedByDefault}]));state.base.storage={items:[],capacity:base.storageCapacity};});
    return true;
  }
  addBaseResources(resources: Record<string,number>): void { this.mutate((state)=>{for(const [id,amount] of Object.entries(resources))state.base.resources[id]=(state.base.resources[id]??0)+Math.max(0,Math.trunc(amount));}); }
  unlockBaseSlot(slotId: string): void { this.mutate((state)=>{if(state.base.roomSlots[slotId])state.base.roomSlots[slotId].isLocked=false;}); }
  buildBaseRoom(slotId:string,roomDefinitionId:string): boolean { return this.session.executeBaseManagementCommand({type:'BuildRoom',slotId,roomDefinitionId,roomInstanceId:`playtest_${slotId}`}).success; }
  installBaseUpgrade(roomInstanceId:string,upgradeId:string): boolean { const definition=this.content.baseUpgrades.find((entry)=>entry.id===upgradeId);return this.session.executeBaseManagementCommand(definition?.target==='base'?{type:'InstallBaseUpgrade',upgradeId}:{type:'InstallUpgrade',roomInstanceId,upgradeId}).success; }
  assignBaseJob(npcId:string,jobId:string,roomInstanceId?:string): boolean { this.mutate((state)=>{if(state.npcs[npcId])state.npcs[npcId].relationship.status='employee';});const job=this.session.executeCharacterManagementCommand({type:'AssignJob',npcId,jobId});if(!job.success)return false;return roomInstanceId?this.session.executeCharacterManagementCommand({type:'AssignRoom',npcId,roomId:roomInstanceId}).success:true; }
  openBaseInGame(): void { this.mutate((state)=>{state.world.mode='Screen';state.world.activeScreen='Base';});this.openGame(); }
  setPlayerValue(group: 'attributes' | 'vitals', key: string, value: number): void { this.mutate((state) => { (state.player[group] as unknown as Record<string, number>)[key] = value; }); }
  addItem(itemId: string, quantity: number): void { this.mutate((state) => { const slot = state.player.inventory.items.find((item) => item.itemId === itemId); if (slot) slot.quantity += quantity; else state.player.inventory.items.push({ itemId, quantity, isEquipped: false }); }); }
  setMoney(credits: number): void { this.mutate((state) => { state.player.inventory.credits = Math.max(0, Math.trunc(credits)); }); }
  setFlag(flag: string, value?: string | number | boolean): void { this.mutate((state) => { if (value === undefined) delete state.world.flags[flag]; else state.world.flags[flag] = value; }); }
  setRelationship(npcId: string, status: CharacterRelationshipStatus, affinity: number): void { this.mutate((state) => { const npc = state.npcs[npcId]; if (npc) { npc.relationship.status = status; npc.relationship.affinity = Math.max(-100, Math.min(100, Math.trunc(affinity))); npc.isCompanion = status === 'companion'; } }); }
  setFactionReputation(factionId: string, reputation: number): void { this.session.executeEffect({type:'setFactionReputation',factionId,value:Math.max(-100,Math.min(100,Math.trunc(reputation)))}); }
  setFactionMembership(factionId:string,membershipStatus:string):void { this.session.executeEffect({type:'setFactionMembership',factionId,membershipStatus}); }
  setFactionRelation(factionId:string,targetFactionId:string,relation:FactionRelationValue):void { this.session.executeEffect({type:'changeFactionRelation',factionId,targetFactionId,relation}); }
  setFactionHostility(factionId:string,hostile:boolean):void { this.session.executeEffect({type:'setFactionHostility',factionId,hostile}); }
  discoverFaction(factionId:string,discovered:boolean):void { this.session.executeEffect({type:'discoverFaction',factionId,discovered}); }
  setPartyMember(npcId: string, enabled: boolean): void { this.mutate((state) => { const npc = state.npcs[npcId]; if (!npc) return; npc.isCompanion = enabled; npc.relationship.status = enabled ? 'companion' : 'independent'; npc.assignment.partySlotId = enabled ? (this.content.partySlots.find((slot) => !Object.values(state.npcs).some((other) => other.assignment.partySlotId === slot.id))?.id ?? null) : null; }); }
  setQuestState(questId: string, status: QuestStatus, stageId: string): void { this.mutate((state) => { const current = state.quests[questId]; state.quests[questId] = { questId, status, currentStageId: stageId, completedObjectiveIds: current?.completedObjectiveIds ?? [], failedObjectiveIds: current?.failedObjectiveIds ?? [], objectiveCounters: current?.objectiveCounters ?? {}, customVariables: current?.customVariables ?? {} }; }); }
  teleport(poiId: string): void { const poi = this.content.pois.find((candidate) => candidate.id === poiId); if (poi) this.launchLocation(poi.mapId, poi.id); }

  openGame(): void {
    localStorage.setItem('__neon_editor_playtest', this.session.serializeSave(false));
    window.open('/?editorPlaytest=1', 'neon-ether-playtest');
  }

  private mutate(change: (state: GameState) => void): void {
    const save = this.session.createSaveGame('Editor Playtest'); change(save.state);
    const result = this.session.loadSave(save);
    if (!result.success) throw new Error(result.error ?? 'Invalid playtest state mutation');
  }
  private record(event: RuntimeTraceEvent): void { this.log.unshift({ ...event, id: ++this.sequence, timestamp: new Date().toLocaleTimeString() }); if (this.log.length > 500) this.log.pop(); this.notify(); }
  private notify(): void { this.listeners.forEach((listener) => listener()); }
}
