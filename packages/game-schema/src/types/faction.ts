import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';

export const FactionRelationValueSchema = z.enum(['hostile','unfriendly','neutral','friendly','allied']);
export type FactionRelationValue = z.infer<typeof FactionRelationValueSchema>;

export const FactionReputationTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  minimumReputation: z.number().int().min(-100).max(100),
  hostile: z.boolean().default(false),
  priceMultiplier: z.number().positive().optional(),
});

export const FactionRelationDefinitionSchema = z.object({
  factionId: z.string().min(1),
  relation: FactionRelationValueSchema.default('neutral'),
});

export const FactionSchema = BaseEntitySchema.extend({
  shortName: z.string().optional(),
  artwork: z.string().optional(),
  logo: z.string().optional(),
  icon: z.string().default('Shield'),
  colorHex: z.string().default('#00f2ff'),
  ideology: z.string().optional(),
  themeMetadata: z.record(z.string(), z.union([z.string(),z.number(),z.boolean()])).default({}),
  headquartersMapId: z.string().optional(),
  leaderNpcId: z.string().optional(),
  defaultPlayerReputation: z.number().int().min(-100).max(100).default(0),
  defaultMembershipStatus: z.string().default('none'),
  discoveredByDefault: z.boolean().default(true),
  defaultHostile: z.boolean().default(false),
  defaultRelations: z.array(FactionRelationDefinitionSchema).default([]),
  reputationTiers: z.array(FactionReputationTierSchema).min(1),
  hostility: z.object({ hostileBelowReputation: z.number().int().min(-100).max(100).optional(), hostileRelationValues: z.array(FactionRelationValueSchema).default(['hostile']) }).default({ hostileRelationValues:['hostile'] }),
  controlledAreaIds: z.array(z.string()).default([]),
  membershipStatuses: z.array(z.string().min(1)).default(['none','member']),
  techTier: z.number().int().min(1).max(5).default(1),
});

export type FactionDefinition = z.infer<typeof FactionSchema>;
export type Faction = FactionDefinition;
