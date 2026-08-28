/**
 * @neon-ether/content
 * Unified game content manifest aggregating all authored data.
 */

import { GameContent, GameContentSchema } from '@neon-ether/game-schema';

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

export const gameContent: GameContent = GameContentSchema.parse({
  version: '1.0.0',
  items: itemsData,
  npcs: charactersData,
  characters: charactersData,
  enemies: enemiesData,
  encounters: encountersData,
  pois: poisData,
  quests: questsData,
  events: eventsData,
  maps: mapsData,
  recipes: recipesData,
  rooms: roomsData,
  factions: factionsData,
  dialogues: dialoguesData,
});

export const GAME_CONTENT_MANIFEST = gameContent;
export const defaultManifest = gameContent;
export default gameContent;
