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
  ownerFactionId: z.string().optional(),
  weatherProfileId: z.string().optional(),
  bounds: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().positive().max(100),
    height: z.number().positive().max(100),
  }).default({ x: 10, y: 10, width: 30, height: 30 }),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type MapRegionInfo = z.infer<typeof MapRegionInfoSchema>;

export const MapRouteSchema = z.object({
  id: z.string().min(1),
  fromPoiId: z.string().min(1),
  toPoiId: z.string().min(1),
  bidirectional: z.boolean().default(true),
  travelCost: z.number().min(0).default(1),
  travelTimeMinutes: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type MapRoute = z.infer<typeof MapRouteSchema>;

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
  ownerFactionId: z.string().optional(),
  weatherProfileId: z.string().optional(),
  regions: z.array(MapRegionInfoSchema).default([]),
  routes: z.array(MapRouteSchema).default([]),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  recommendedLevel: z.number().int().min(1).default(1),
  defaultTravelTimeMinutes: z.number().int().min(0).default(30),
});

export type GameMap = z.infer<typeof GameMapSchema>;

/** Backwards-compatible alias */
export type MapDefinition = GameMap;
