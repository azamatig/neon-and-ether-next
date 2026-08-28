import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';

export const ActionCostSchema = z.object({
  ap: z.number().int().min(0).optional(),
  ether: z.number().int().min(0).optional(),
  credits: z.number().int().min(0).optional(),
  hp: z.number().int().min(0).optional(),
});

export type ActionCost = z.infer<typeof ActionCostSchema>;

export const ActionDefinitionSchema = BaseEntitySchema.extend({
  icon: z.string().default('Zap'),
  cost: ActionCostSchema.optional(),
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).min(1, 'Action must contain at least one effect'),
  category: z.enum(['Interaction', 'Combat', 'Dialogue', 'Crafting', 'Technomancy', 'Exploration', 'Custom']).default('Interaction'),
  cooldownTurns: z.number().int().min(0).default(0),
  isRepeatable: z.boolean().default(true),
});

export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;
