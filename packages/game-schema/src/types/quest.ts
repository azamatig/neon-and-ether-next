import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';

export const QuestStatusSchema = z.enum([
  'Unassigned',
  'Active',
  'Completed',
  'Failed',
  'Abandoned',
]);

export type QuestStatus = z.infer<typeof QuestStatusSchema>;

export const QuestObjectiveTypeSchema = z.enum([
  'TalkToNPC',
  'KillTarget',
  'InteractPOI',
  'CollectItem',
  'HackNode',
  'ReachLocation',
  'Custom',
]);

export type QuestObjectiveType = z.infer<typeof QuestObjectiveTypeSchema>;

export const QuestObjectiveSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  objectiveType: QuestObjectiveTypeSchema.default('Custom'),
  targetId: z.string().optional(),
  requiredCount: z.number().int().min(1).default(1),
  currentCount: z.number().int().min(0).default(0),
  isOptional: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  approachType: z.enum(['Combat', 'Infiltration', 'Social', 'EtherTech']).optional(),
});

export type QuestObjective = z.infer<typeof QuestObjectiveSchema>;

export const QuestStageSchema = z.object({
  id: z.string().min(1),
  stageNumber: z.number().int().default(1),
  title: z.string().min(1),
  journalEntry: z.string().default(''),
  objectives: z.array(QuestObjectiveSchema).default([]),
  nextStageId: z.string().optional(),
});

export type QuestStage = z.infer<typeof QuestStageSchema>;

export const QuestRewardSchema = z.object({
  credits: z.number().int().min(0).default(0),
  xp: z.number().int().min(0).default(0),
  itemIds: z.array(z.string()).default([]),
  reputationChanges: z.record(z.string(), z.number().int()).default({}),
});

export type QuestReward = z.infer<typeof QuestRewardSchema>;

export const QuestPrerequisitesSchema = z.object({
  minLevel: z.number().int().min(1).optional(),
  requiredQuestIds: z.array(z.string()).default([]),
  requiredFactionId: z.string().optional(),
  minFactionReputation: z.number().int().optional(),
});

export type QuestPrerequisites = z.infer<typeof QuestPrerequisitesSchema>;

export const QuestSchema = BaseEntitySchema.extend({
  factionId: z.string().default('Neutral'),
  recommendedLevel: z.number().int().min(1).default(1),
  stages: z.record(z.string(), QuestStageSchema),
  initialStageId: z.string().min(1),
  rewardCredits: z.number().int().min(0).default(0),
  rewardXp: z.number().int().min(0).default(0),
  rewardItemIds: z.array(z.string()).default([]),
  reputationChanges: z.record(z.string(), z.number().int()).optional(),
  prerequisites: QuestPrerequisitesSchema.optional(),
  isMainQuest: z.boolean().default(false),
  isRepeatable: z.boolean().default(false),
  // Backward compatibility alias properties
  title: z.string().optional(),
  summary: z.string().optional(),
  faction: z.string().optional(),
});

export type Quest = z.infer<typeof QuestSchema>;

/** Backwards-compatible alias */
export type QuestDefinition = Quest;
