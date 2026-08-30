/**
 * @neon-ether/game-schema
 * Unified GameEvent Architecture.
 * Handles Flavor, Choice, Dialogue, Scene, and Encounter events under a single data-driven schema.
 */

import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';
import { ConditionSchema } from './conditions.ts';
import { EffectSchema } from './effects.ts';
import { SkillCheckDefinitionSchema } from './stats.ts';
import { GameplayOutcome, GameplayOutcomeSchema, OriginContextSchema } from './outcomes.ts';

export const GameEventTypeSchema = z.enum([
  'flavor',
  'choice',
  'dialogue',
  'scene',
  'encounter',
  'custom',
]);

export type GameEventType = z.infer<typeof GameEventTypeSchema>;

export const EventSpeakerSchema = z.object({
  type: z.enum(['npc', 'player', 'system', 'companion', 'narrator']).default('narrator'),
  npcId: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  portrait: z.string().optional(),
});

export type EventSpeaker = z.infer<typeof EventSpeakerSchema>;

export const EventChoiceCheckSchema = SkillCheckDefinitionSchema.extend({
  passEffects: z.array(EffectSchema).default([]),
  partialEffects: z.array(EffectSchema).default([]),
  failEffects: z.array(EffectSchema).default([]),
  passOutcome: z.custom<GameplayOutcome>().optional(),
  partialOutcome: z.custom<GameplayOutcome>().optional(),
  failOutcome: z.custom<GameplayOutcome>().optional(),
  passText: z.string().optional(), partialText: z.string().optional(), failText: z.string().optional(),
});

export type EventChoiceCheck = z.infer<typeof EventChoiceCheckSchema>;

export const EventChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  icon: z.string().optional(),
  conditions: z.array(ConditionSchema).default([]),
  check: EventChoiceCheckSchema.optional(),
  effects: z.array(EffectSchema).default([]),
  outcome: z.custom<GameplayOutcome>().optional(),
  nextStepId: z.string().optional(),
  hideIfUnavailable: z.boolean().default(false),
  disabledReason: z.string().optional(),
});

export type EventChoice = z.infer<typeof EventChoiceSchema>;

export const EventStepTypeSchema = z.enum([
  'narration',
  'text',
  'dialogue',
  'image',
  'choice',
  'check',
  'effect',
  'combat',
  'transition',
]);

export type EventStepType = z.infer<typeof EventStepTypeSchema>;

export const EventStepSchema = z.object({
  id: z.string().min(1),
  type: EventStepTypeSchema.default('text'),
  title: z.string().optional(),
  speaker: EventSpeakerSchema.optional(),
  text: z.string().default(''),
  image: z.string().optional(),
  sound: z.string().optional(),
  ambientColor: z.string().optional(),
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
  choices: z.array(EventChoiceSchema).default([]),
  nextStepId: z.string().nullable().optional(),
  outcome: z.custom<GameplayOutcome>().optional(),
});

export type EventStep = z.infer<typeof EventStepSchema>;

export const EventPresentationSchema = z.object({
  layoutStyle: z.enum(['standard', 'cinematic', 'terminal', 'dialogue', 'fullscreenScene']).default('standard'),
  backgroundImage: z.string().optional(),
  ambientGlow: z.enum(['cyan', 'purple', 'rose', 'amber', 'emerald', 'none']).default('cyan'),
  icon: z.string().optional(),
  themeMood: z.string().optional(),
});

export type EventPresentation = z.infer<typeof EventPresentationSchema>;

export const GameEventSchema = BaseEntitySchema.extend({
  type: GameEventTypeSchema.default('flavor'),
  tags: z.array(z.string()).default([]),
  conditions: z.array(ConditionSchema).default([]),
  triggerConditions: z.array(ConditionSchema).default([]),
  availabilityConditions: z.array(ConditionSchema).default([]),
  presentation: EventPresentationSchema.default({ layoutStyle: 'standard', ambientGlow: 'cyan' }),
  steps: z.array(EventStepSchema).min(1, 'Event must contain at least one step'),
  entryEffects: z.array(EffectSchema).default([]),
  completionEffects: z.array(EffectSchema).default([]),
  completionOutcome: z.custom<GameplayOutcome>().optional(),
  isOneShot: z.boolean().default(false),
});

export type GameEvent = z.infer<typeof GameEventSchema>;
