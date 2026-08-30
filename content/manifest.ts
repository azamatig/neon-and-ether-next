/**
 * @neon-ether/content
 * Unified game content manifest aggregating all authored data.
 */

import { GameContent, GameContentSchema } from '@neon-ether/game-schema';

import progressionDefinitionsData from './progression/progression.json';
import shopsData from './shops/shops.json';
import itemsData from './items/items.json';
import charactersData from './characters/characters.json';
import enemiesData from './enemies/enemies.json';
import encountersData from './encounters/encounters.json';
import poisData from './pois/pois.json';
import questsData from './quests/quests.json';
import eventsData from './events/events.json';
import mapsData from './maps/maps.json';
import recipesData from './recipes/recipes.json';
import roomsData from './rooms/rooms.json';
import factionsData from './factions/factions.json';
import dialoguesData from './dialogues/dialogues.json';
import abilitiesData from './combat/abilities.json';
import statusEffectsData from './combat/status-effects.json';
import combatAIProfilesData from './combat/ai-profiles.json';
import characterManagementRulesData from './character-management/rules.json';
import baseJobsData from './character-management/jobs.json';
import partySlotsData from './character-management/party-slots.json';
import basesData from './bases/bases.json';
import baseUpgradesData from './bases/upgrades.json';
import weatherDefinitionsData from './weather/weather.json';
import weatherProfilesData from './weather/profiles.json';

export const gameContent: GameContent = GameContentSchema.parse({
  version: '1.0.0',
  items: itemsData,
  shops: shopsData,
  progressionDefinitions: progressionDefinitionsData,
  npcs: charactersData,
  characters: charactersData,
  enemies: enemiesData,
  encounters: encountersData,
  abilities: abilitiesData,
  statusEffects: statusEffectsData,
  combatAIProfiles: combatAIProfilesData,
  characterManagementRules: characterManagementRulesData,
  baseJobs: baseJobsData,
  partySlots: partySlotsData,
  bases: basesData,
  baseUpgrades: baseUpgradesData,
  pois: poisData,
  quests: questsData,
  events: eventsData,
  maps: mapsData,
  recipes: recipesData,
  rooms: roomsData,
  factions: factionsData,
  dialogues: dialoguesData,
  weatherDefinitions: weatherDefinitionsData,
  weatherProfiles: weatherProfilesData,
});

export const GAME_CONTENT_MANIFEST = gameContent;
export const defaultManifest = gameContent;
export default gameContent;
