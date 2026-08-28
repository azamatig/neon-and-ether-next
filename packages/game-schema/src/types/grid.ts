import { z } from 'zod';

/**
 * Grid coordinate and tile topology definitions.
 */
export const Vector2DSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});

export type Vector2D = z.infer<typeof Vector2DSchema>;

export enum TileType {
  Empty = 'Empty',
  Floor = 'Floor',
  HalfCover = 'HalfCover',
  FullCover = 'FullCover',
  Wall = 'Wall',
  EtherHazard = 'EtherHazard',
  Door = 'Door',
  Console = 'Console',
}

export const TileTypeSchema = z.nativeEnum(TileType);

export const GridTileSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  type: TileTypeSchema,
  movementCost: z.number().min(0).default(1),
  blocksLineOfSight: z.boolean().default(false),
  coverBonus: z.number().min(0).max(100).default(0),
  description: z.string().optional(),
});

export type GridTile = z.infer<typeof GridTileSchema>;
