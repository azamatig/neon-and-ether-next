import {
  CharacterManagementCommand,
  CharacterManagementRule,
  CharacterRelationship,
  NpcRuntimeState,
} from '@neon-ether/game-schema';
import { ContentRegistry } from '../content/content-registry.ts';
import { GameState } from '../state/game-state.ts';

export interface ResolvedCharacterAction {
  rule: CharacterManagementRule;
  isAvailable: boolean;
  unavailableReasons: string[];
}

export interface CharacterManagementResult {
  success: boolean;
  npcId: string;
  reason?: string;
  relationship?: CharacterRelationship;
  assignment?: NpcRuntimeState['assignment'];
}

/** One rules engine for every player-to-NPC relationship and assignment. */
export class CharacterManagementSystem {
  constructor(private readonly content: ContentRegistry) {}

  public getAvailableActions(npcId: string, state: GameState): ResolvedCharacterAction[] {
    const runtime = state.npcs[npcId];
    const definition = this.content.getNPC(npcId);
    if (!runtime || !definition) return [];
    return this.content.characterManagementRules.getAll().map((rule) => {
      const unavailableReasons: string[] = [];
      if (!rule.allowedFromStatuses.includes(runtime.relationship.status)) unavailableReasons.push(`Requires status: ${rule.allowedFromStatuses.join(', ')}`);
      for (const trait of rule.requiredTraits) if (!definition.traits.includes(trait)) unavailableReasons.push(`Requires trait: ${trait}`);
      for (const trait of rule.forbiddenTraits) if (definition.traits.includes(trait)) unavailableReasons.push(`Blocked by trait: ${trait}`);
      if (rule.minAffinity !== undefined && runtime.relationship.affinity < rule.minAffinity) unavailableReasons.push(`Requires affinity ${rule.minAffinity}`);
      if (rule.minTrust !== undefined && runtime.relationship.trust < rule.minTrust) unavailableReasons.push(`Requires trust ${rule.minTrust}`);
      if (rule.minLoyalty !== undefined && runtime.relationship.loyalty < rule.minLoyalty) unavailableReasons.push(`Requires loyalty ${rule.minLoyalty}`);
      return { rule, isAvailable: unavailableReasons.length === 0, unavailableReasons };
    });
  }

  public execute(command: CharacterManagementCommand, state: GameState): CharacterManagementResult {
    const runtime = state.npcs[command.npcId];
    const definition = this.content.getNPC(command.npcId);
    if (!runtime || !definition) return { success: false, npcId: command.npcId, reason: 'NPC is not available.' };
    if (command.type === 'ApplyRule') {
      const resolved = this.getAvailableActions(command.npcId, state).find((action) => action.rule.id === command.ruleId);
      if (!resolved) return { success: false, npcId: command.npcId, reason: 'Character action rule was not found.' };
      if (!resolved.isAvailable) return { success: false, npcId: command.npcId, reason: resolved.unavailableReasons.join('; ') };
      const rule = resolved.rule;
      if (rule.resultStatus) runtime.relationship.status = rule.resultStatus;
      runtime.relationship.affinity = this.clampSigned(runtime.relationship.affinity + rule.affinityDelta);
      runtime.relationship.trust = this.clampSigned(runtime.relationship.trust + rule.trustDelta);
      runtime.relationship.fear = this.clampUnsigned(runtime.relationship.fear + rule.fearDelta);
      runtime.relationship.loyalty = this.clampUnsigned(runtime.relationship.loyalty + rule.loyaltyDelta);
      if (rule.clearsAssignments) runtime.assignment = { jobId: null, roomId: null, partySlotId: null };
      this.syncLegacyProjections(state);
      return { success: true, npcId: command.npcId, relationship: { ...runtime.relationship }, assignment: { ...runtime.assignment } };
    }
    if (command.type === 'AssignJob') {
      const job = this.content.getBaseJob(command.jobId);
      if (!job) return { success: false, npcId: command.npcId, reason: 'Base job was not found.' };
      if (!job.allowedStatuses.includes(runtime.relationship.status)) return { success: false, npcId: command.npcId, reason: `Status '${runtime.relationship.status}' cannot perform this job.` };
      const missingTrait = job.requiredTraits.find((trait) => !definition.traits.includes(trait));
      if (missingTrait) return { success: false, npcId: command.npcId, reason: `Missing required trait '${missingTrait}'.` };
      const assignedCount = Object.values(state.npcs).filter((npc) => npc.assignment.jobId === job.id && npc.npcId !== command.npcId).length;
      if (assignedCount >= job.maxWorkers) return { success: false, npcId: command.npcId, reason: 'Job capacity is full.' };
      if (runtime.assignment.roomId && !this.isJobCompatibleWithRoom(job.roomTypes, runtime.assignment.roomId, state)) return { success: false, npcId: command.npcId, reason: 'Assigned room is incompatible with this job.' };
      runtime.assignment.jobId = job.id;
    }
    if (command.type === 'AssignRoom') {
      const roomState = state.base.rooms[command.roomId];
      const room = roomState ? this.content.getRoom(roomState.definitionId) : undefined;
      if (!roomState?.isBuilt || !room) return { success: false, npcId: command.npcId, reason: 'Base room is not built.' };
      const job = runtime.assignment.jobId ? this.content.getBaseJob(runtime.assignment.jobId) : undefined;
      if (job && !this.isJobCompatibleWithRoom(job.roomTypes, command.roomId, state)) return { success: false, npcId: command.npcId, reason: 'Room is incompatible with the assigned job.' };
      const residents = Object.values(state.npcs).filter((npc) => npc.assignment.roomId === command.roomId && npc.npcId !== command.npcId).length;
      const workers = Object.values(state.npcs).filter((npc) => npc.assignment.roomId === command.roomId && npc.assignment.jobId && npc.npcId !== command.npcId).length;
      if (residents >= roomState.capacity.residents) return { success: false, npcId: command.npcId, reason: 'Room resident capacity is full.' };
      if (runtime.assignment.jobId && workers >= roomState.capacity.workers) return { success: false, npcId: command.npcId, reason: 'Room worker capacity is full.' };
      runtime.assignment.roomId = command.roomId;
    }
    if (command.type === 'AssignPartySlot') {
      const slot = this.content.getPartySlot(command.partySlotId);
      if (!slot) return { success: false, npcId: command.npcId, reason: 'Party slot was not found.' };
      if (!slot.allowedStatuses.includes(runtime.relationship.status)) return { success: false, npcId: command.npcId, reason: `Status '${runtime.relationship.status}' cannot join the party.` };
      const missingTrait = slot.requiredTraits.find((trait) => !definition.traits.includes(trait));
      if (missingTrait) return { success: false, npcId: command.npcId, reason: `Missing required trait '${missingTrait}'.` };
      const occupant = Object.values(state.npcs).find((npc) => npc.assignment.partySlotId === slot.id && npc.npcId !== command.npcId);
      if (occupant) return { success: false, npcId: command.npcId, reason: 'Party slot is occupied.' };
      runtime.assignment.partySlotId = slot.id;
    }
    if (command.type === 'ClearAssignment') {
      if (command.assignment === 'job') runtime.assignment.jobId = null;
      if (command.assignment === 'room') runtime.assignment.roomId = null;
      if (command.assignment === 'party') runtime.assignment.partySlotId = null;
    }
    this.syncLegacyProjections(state);
    return { success: true, npcId: command.npcId, relationship: { ...runtime.relationship }, assignment: { ...runtime.assignment } };
  }

  private isJobCompatibleWithRoom(roomTypes: string[], roomId: string, state: GameState): boolean {
    const runtimeRoom = state.base.rooms[roomId];
    const room = runtimeRoom ? this.content.getRoom(runtimeRoom.definitionId) : undefined;
    return Boolean(room && (roomTypes.length === 0 || roomTypes.includes(room.roomType)));
  }

  private syncLegacyProjections(state: GameState): void {
    state.companions = Object.values(state.npcs).filter((npc) => npc.assignment.partySlotId !== null).map((npc) => npc.npcId);
    state.base.stationedCompanionIds = Object.values(state.npcs).filter((npc) => npc.assignment.roomId !== null).map((npc) => npc.npcId);
    state.base.residentNpcIds = [...state.base.stationedCompanionIds];
    for (const room of Object.values(state.base.rooms)) {
      room.assignedNpcIds = Object.values(state.npcs).filter((npc) => npc.assignment.roomId === room.roomId).map((npc) => npc.npcId);
    }
    for (const npc of Object.values(state.npcs)) npc.isCompanion = npc.relationship.status === 'companion';
  }

  private clampSigned(value: number): number { return Math.max(-100, Math.min(100, value)); }
  private clampUnsigned(value: number): number { return Math.max(0, Math.min(100, value)); }
}
