import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
export const ProgressionLevelSchema = z.object({ level:z.number().int().min(1), totalXp:z.number().int().min(0), attributePoints:z.number().int().min(0).default(0), skillPoints:z.number().int().min(0).default(0), perkPoints:z.number().int().min(0).default(0) });
export const ProgressionDefinitionSchema = BaseEntitySchema.extend({ levels:z.array(ProgressionLevelSchema).min(1), skillXpPerRank:z.number().int().min(1).default(100), maxSkillRank:z.number().int().min(1).optional() });
export type ProgressionDefinition = z.infer<typeof ProgressionDefinitionSchema>;
export const RewardItemSchema = z.object({ itemId:z.string().min(1), quantity:z.number().int().min(1).default(1) });
export const RewardDefinitionSchema = z.object({ xp:z.number().int().min(0).default(0), credits:z.number().int().min(0).default(0), items:z.array(RewardItemSchema).default([]), skillXp:z.record(z.string(),z.number().int().min(0)).default({}), perkPoints:z.number().int().min(0).default(0), targetCharacterId:z.string().optional() });
export type RewardDefinition = z.infer<typeof RewardDefinitionSchema>;
