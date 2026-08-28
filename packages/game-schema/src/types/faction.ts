import { z } from 'zod';
import { BaseEntitySchema } from './base.ts';

export const FactionIdeologySchema = z.enum([
  'CyberTranshumanism',
  'EtherPurity',
  'CorporateAuthoritarianism',
  'AnarchoSyndicalism',
  'MercenaryPragmatism',
  'TechnoMysticism',
  'Neutral',
]);

export type FactionIdeology = z.infer<typeof FactionIdeologySchema>;

export const FactionSchema = BaseEntitySchema.extend({
  ideology: FactionIdeologySchema.default('Neutral'),
  headquartersMapId: z.string().optional(),
  leaderNpcId: z.string().optional(),
  defaultPlayerReputation: z.number().int().min(-100).max(100).default(0),
  rivalFactionIds: z.array(z.string()).default([]),
  allyFactionIds: z.array(z.string()).default([]) ,
  colorHex: z.string().default('#00f2ff'),
  crestIcon: z.string().default('Shield'),
  techTier: z.number().int().min(1).max(5).default(1),
});

export type Faction = z.infer<typeof FactionSchema>;
