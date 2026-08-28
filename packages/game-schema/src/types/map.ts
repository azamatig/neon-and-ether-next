/**
 * @neon-ether/game-schema
 * World / District Map Blueprint Schema.
 * Represents a high-level district overview with background illustration and interactive POIs.
 */

import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';

export const MapRegionInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  securityLevel: z.number().int().min(1).max(5).default(1),
  controllingFactionId: z.string().optional(),
});

export type MapRegionInfo = z.infer<typeof MapRegionInfoSchema>;

export const GameMapSchema = BaseEntitySchema.extend({
  district: z.string().default('Sector 04'),
  subregion: z.string().optional(),
  backgroundImage: z.string().default('bg_sector09_slums'),
  poiIds: z.array(z.string()).default([]),
  defaultPoiId: z.string().optional(),
  connectedMapIds: z.array(z.string()).default([]),
  ambientEtherLevel: z.number().int().min(0).max(100).default(25),
  securityLevel: z.number().int().min(1).max(5).default(1),
  controllingFactionId: z.string().optional(),
  regions: z.array(MapRegionInfoSchema).default([]),
  recommendedLevel: z.number().int().min(1).default(1),
});

export type GameMap = z.infer<typeof GameMapSchema>;

/** Backwards-compatible alias */
export type MapDefinition = GameMap;
