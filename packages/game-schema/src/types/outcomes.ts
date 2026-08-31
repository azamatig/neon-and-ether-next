/**
 * @neon-ether/game-schema
 * Unified Gameplay Outcome System.
 * Decouples gameplay state transitions (POIs, Events, Combat, Results, Screens) from React navigation.
 */

import { z } from 'zod';

export const OriginContextSchema = z.object({
  type: z.enum(['poi', 'map', 'event', 'combat', 'screen']),
  id: z.string(),
  mapId: z.string().optional(),
  extraData: z.record(z.string(), z.any()).optional(),
});

export type OriginContext = z.infer<typeof OriginContextSchema>;

export interface ShowResultOutcome {
  type: 'showResult';
  title?: string;
  resultText?: string;
  status?: 'Success' | 'Failure' | 'PartialSuccess';
  customSummary?: string;
  nextOutcome?: GameplayOutcome;
}

export interface EventOutcome {
  type: 'event';
  eventId: string;
  stepId?: string;
  originContext?: OriginContext;
}

export interface CombatOutcome {
  type: 'combat';
  encounterId: string;
  previewFirst?: boolean;
  originContext?: OriginContext;
}

export interface PoiOutcome {
  type: 'poi';
  poiId: string;
  mapId?: string;
}

export interface MapOutcome {
  type: 'map';
  mapId?: string;
}

export interface GameplayScreenOutcome {
  type: 'gameplayScreen';
  screen: 'Market' | 'Workbench' | 'Inventory' | 'Base' | 'Journal' | 'Dialogue';
  targetId?: string;
  originContext?: OriginContext;
}

export interface SequenceOutcome {
  type: 'sequence';
  outcomes: GameplayOutcome[];
}

export interface ReturnToOriginOutcome {
  type: 'returnToOrigin';
}

export interface NoPresentationOutcome {
  type: 'noPresentation';
}
export interface MinigameOutcome{type:'minigame';minigameId:string;originContext?:OriginContext}

export type GameplayOutcome =
  | ShowResultOutcome
  | EventOutcome
  | CombatOutcome
  | PoiOutcome
  | MapOutcome
  | GameplayScreenOutcome
  | SequenceOutcome
  | ReturnToOriginOutcome
  | NoPresentationOutcome|MinigameOutcome;

export const ShowResultOutcomeSchema: z.ZodType<ShowResultOutcome> = z.object({
  type: z.literal('showResult'),
  title: z.string().optional(),
  resultText: z.string().optional(),
  status: z.enum(['Success', 'Failure', 'PartialSuccess']).optional(),
  customSummary: z.string().optional(),
  nextOutcome: z.lazy(() => GameplayOutcomeSchema).optional(),
});

export const EventOutcomeSchema: z.ZodType<EventOutcome> = z.object({
  type: z.literal('event'),
  eventId: z.string().min(1),
  stepId: z.string().optional(),
  originContext: OriginContextSchema.optional(),
});

export const CombatOutcomeSchema: z.ZodType<CombatOutcome> = z.object({
  type: z.literal('combat'),
  encounterId: z.string().min(1),
  previewFirst: z.boolean().default(true),
  originContext: OriginContextSchema.optional(),
});

export const PoiOutcomeSchema: z.ZodType<PoiOutcome> = z.object({
  type: z.literal('poi'),
  poiId: z.string().min(1),
  mapId: z.string().optional(),
});

export const MapOutcomeSchema: z.ZodType<MapOutcome> = z.object({
  type: z.literal('map'),
  mapId: z.string().optional(),
});

export const GameplayScreenOutcomeSchema: z.ZodType<GameplayScreenOutcome> = z.object({
  type: z.literal('gameplayScreen'),
  screen: z.enum(['Market', 'Workbench', 'Inventory', 'Base', 'Journal', 'Dialogue']),
  targetId: z.string().optional(),
  originContext: OriginContextSchema.optional(),
});

export const SequenceOutcomeSchema: z.ZodType<SequenceOutcome> = z.object({
  type: z.literal('sequence'),
  outcomes: z.array(z.lazy(() => GameplayOutcomeSchema)).min(1),
});

export const ReturnToOriginOutcomeSchema: z.ZodType<ReturnToOriginOutcome> = z.object({
  type: z.literal('returnToOrigin'),
});

export const NoPresentationOutcomeSchema: z.ZodType<NoPresentationOutcome> = z.object({
  type: z.literal('noPresentation'),
});
export const MinigameOutcomeSchema:z.ZodType<MinigameOutcome>=z.object({type:z.literal('minigame'),minigameId:z.string().min(1),originContext:OriginContextSchema.optional()});

export const GameplayOutcomeSchema: z.ZodType<GameplayOutcome> = z.discriminatedUnion('type', [
  ShowResultOutcomeSchema as any,
  EventOutcomeSchema as any,
  CombatOutcomeSchema as any,
  PoiOutcomeSchema as any,
  MapOutcomeSchema as any,
  GameplayScreenOutcomeSchema as any,
  SequenceOutcomeSchema as any,
  ReturnToOriginOutcomeSchema as any,
  NoPresentationOutcomeSchema as any,
  MinigameOutcomeSchema as any,
]);
