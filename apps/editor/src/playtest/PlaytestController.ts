import { ContentRegistry, GameSession, type GameState, type RuntimeTraceEvent } from '@neon-ether/game-runtime';
import type { CharacterRelationshipStatus, GameContent, QuestStatus } from '@neon-ether/game-schema';

export interface PlaytestLogEntry extends RuntimeTraceEvent { id: number; timestamp: string }
type Listener = () => void;

/** Editor-only command facade. React never mutates runtime snapshots directly. */
export class PlaytestController {
  private session: GameSession;
  private listeners = new Set<Listener>();
  private sequence = 0;
  public readonly log: PlaytestLogEntry[] = [];

  constructor(private readonly content: GameContent) {
    const registry = new ContentRegistry();
    registry.loadContent(content);
    this.session = new GameSession(registry, 1337, undefined, undefined, (event) => this.record(event));
    this.session.events.on('STATE_CHANGED', () => this.notify());
  }

  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  getState(): GameState { return this.session.getState(); }
  clearLog(): void { this.log.length = 0; this.notify(); }

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
  setPlayerValue(group: 'attributes' | 'vitals', key: string, value: number): void { this.mutate((state) => { (state.player[group] as unknown as Record<string, number>)[key] = value; }); }
  addItem(itemId: string, quantity: number): void { this.mutate((state) => { const slot = state.player.inventory.items.find((item) => item.itemId === itemId); if (slot) slot.quantity += quantity; else state.player.inventory.items.push({ itemId, quantity, isEquipped: false }); }); }
  setMoney(credits: number): void { this.mutate((state) => { state.player.inventory.credits = Math.max(0, Math.trunc(credits)); }); }
  setFlag(flag: string, value?: string | number | boolean): void { this.mutate((state) => { if (value === undefined) delete state.world.flags[flag]; else state.world.flags[flag] = value; }); }
  setRelationship(npcId: string, status: CharacterRelationshipStatus, affinity: number): void { this.mutate((state) => { const npc = state.npcs[npcId]; if (npc) { npc.relationship.status = status; npc.relationship.affinity = Math.max(-100, Math.min(100, Math.trunc(affinity))); npc.isCompanion = status === 'companion'; } }); }
  setFactionReputation(factionId: string, reputation: number): void { this.mutate((state) => { const faction = state.factions[factionId]; if (faction) faction.reputation = Math.max(-100, Math.min(100, Math.trunc(reputation))); }); }
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
