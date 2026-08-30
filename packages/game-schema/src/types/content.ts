import { z } from 'zod';
import { ShopDefinitionSchema } from './shop.ts';
import { ItemSchema } from './items.ts';
import { NPCSchema } from './npc.ts';
import { EnemySchema } from './enemy.ts';
import { POISchema } from './poi.ts';
import { QuestSchema } from './quest.ts';
import { GameEventSchema } from './event.ts';
import { GameMapSchema } from './map.ts';
import { RecipeSchema } from './recipe.ts';
import { BaseRoomDefinitionSchema } from './room.ts';
import { FactionSchema } from './faction.ts';
import { DialogueTreeSchema } from './dialogue.ts';
import { CombatEncounterSchema } from './combat-encounter.ts';
import { AbilitySchema, CombatAIProfileSchema, StatusEffectDefinitionSchema } from './combat.ts';
import { BaseJobDefinitionSchema, CharacterManagementRuleSchema, PartySlotDefinitionSchema } from './character-management.ts';
import { ProgressionDefinitionSchema } from './progression.ts';
import { BaseUpgradeDefinitionSchema, PlayerBaseDefinitionSchema } from './base-management.ts';

export const GameContentSchema = z.object({
  version: z.string().default('1.0.0'),
  items: z.array(ItemSchema).default([]),
  shops: z.array(ShopDefinitionSchema).default([]),
  progressionDefinitions: z.array(ProgressionDefinitionSchema).default([]),
  npcs: z.array(NPCSchema).default([]),
  enemies: z.array(EnemySchema).default([]),
  encounters: z.array(CombatEncounterSchema).default([]),
  abilities: z.array(AbilitySchema).default([]),
  statusEffects: z.array(StatusEffectDefinitionSchema).default([]),
  combatAIProfiles: z.array(CombatAIProfileSchema).default([]),
  characterManagementRules: z.array(CharacterManagementRuleSchema).default([]),
  baseJobs: z.array(BaseJobDefinitionSchema).default([]),
  partySlots: z.array(PartySlotDefinitionSchema).default([]),
  bases: z.array(PlayerBaseDefinitionSchema).default([]),
  baseUpgrades: z.array(BaseUpgradeDefinitionSchema).default([]),
  pois: z.array(POISchema).default([]),
  quests: z.array(QuestSchema).default([]),
  events: z.array(GameEventSchema).default([]),
  maps: z.array(GameMapSchema).default([]),
  recipes: z.array(RecipeSchema).default([]),
  rooms: z.array(BaseRoomDefinitionSchema).default([]),
  factions: z.array(FactionSchema).default([]),
  dialogues: z.array(DialogueTreeSchema).default([]),
  // Backward compatibility alias for characters
  characters: z.array(NPCSchema).optional(),
});

export type GameContent = z.infer<typeof GameContentSchema>;

/** Backwards-compatible alias */
export type ContentManifest = GameContent;
