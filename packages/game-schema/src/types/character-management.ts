import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';

export const CharacterRelationshipStatusSchema = z.enum([
  'independent', 'companion', 'employee', 'servant', 'prisoner', 'enslaved',
]);
export type CharacterRelationshipStatus = z.infer<typeof CharacterRelationshipStatusSchema>;

export const CharacterRelationshipSchema = z.object({
  status: CharacterRelationshipStatusSchema.default('independent'),
  affinity: z.number().int().min(-100).max(100).default(0),
  trust: z.number().int().min(-100).max(100).default(0),
  fear: z.number().int().min(0).max(100).default(0),
  loyalty: z.number().int().min(0).max(100).default(0),
});
export type CharacterRelationship = z.infer<typeof CharacterRelationshipSchema>;

export const CharacterAssignmentSchema = z.object({
  jobId: z.string().nullable().default(null),
  roomId: z.string().nullable().default(null),
  partySlotId: z.string().nullable().default(null),
});
export type CharacterAssignment = z.infer<typeof CharacterAssignmentSchema>;

export const CharacterManagementRuleSchema = BaseEntitySchema.extend({
  actionLabel: z.string().min(1),
  allowedFromStatuses: z.array(CharacterRelationshipStatusSchema).min(1),
  resultStatus: CharacterRelationshipStatusSchema.optional(),
  requiredTraits: z.array(z.string()).default([]),
  forbiddenTraits: z.array(z.string()).default([]),
  minAffinity: z.number().int().min(-100).max(100).optional(),
  minTrust: z.number().int().min(-100).max(100).optional(),
  minLoyalty: z.number().int().min(0).max(100).optional(),
  affinityDelta: z.number().int().default(0),
  trustDelta: z.number().int().default(0),
  fearDelta: z.number().int().default(0),
  loyaltyDelta: z.number().int().default(0),
  clearsAssignments: z.boolean().default(false),
});
export type CharacterManagementRule = z.infer<typeof CharacterManagementRuleSchema>;

export const BaseJobDefinitionSchema = BaseEntitySchema.extend({
  allowedStatuses: z.array(CharacterRelationshipStatusSchema).default(['companion', 'employee', 'servant']),
  requiredTraits: z.array(z.string()).default([]),
  roomTypes: z.array(z.string()).default([]),
  maxWorkers: z.number().int().min(1).default(1),
});
export type BaseJobDefinition = z.infer<typeof BaseJobDefinitionSchema>;

export const PartySlotDefinitionSchema = BaseEntitySchema.extend({
  allowedStatuses: z.array(CharacterRelationshipStatusSchema).default(['companion']),
  requiredTraits: z.array(z.string()).default([]),
});
export type PartySlotDefinition = z.infer<typeof PartySlotDefinitionSchema>;

export const CharacterManagementCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ApplyRule'), npcId: z.string(), ruleId: z.string() }),
  z.object({ type: z.literal('AssignJob'), npcId: z.string(), jobId: z.string() }),
  z.object({ type: z.literal('AssignRoom'), npcId: z.string(), roomId: z.string() }),
  z.object({ type: z.literal('AssignPartySlot'), npcId: z.string(), partySlotId: z.string() }),
  z.object({ type: z.literal('ClearAssignment'), npcId: z.string(), assignment: z.enum(['job', 'room', 'party']) }),
]);
export type CharacterManagementCommand = z.infer<typeof CharacterManagementCommandSchema>;
