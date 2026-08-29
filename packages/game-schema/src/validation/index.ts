/**
 * @neon-ether/game-schema
 * Deterministic schema validator & referential integrity checker.
 */

import { GameContent, GameContentSchema } from '../types/content.ts';
import { Item, ItemSchema } from '../types/items.ts';
import { NPC, NPCSchema } from '../types/npc.ts';
import { Enemy, EnemySchema } from '../types/enemy.ts';
import { POI, POISchema } from '../types/poi.ts';
import { Quest, QuestSchema } from '../types/quest.ts';
import { GameEvent, GameEventSchema } from '../types/event.ts';
import { GameMap, GameMapSchema } from '../types/map.ts';
import { Recipe, RecipeSchema } from '../types/recipe.ts';
import { BaseRoomDefinition, BaseRoomDefinitionSchema } from '../types/room.ts';
import { Faction, FactionSchema } from '../types/faction.ts';
import { DialogueTree, DialogueTreeSchema } from '../types/dialogue.ts';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category:
    | 'Item'
    | 'NPC'
    | 'Enemy'
    | 'POI'
    | 'Quest'
    | 'GameEvent'
    | 'CombatEncounter'
    | 'Ability'
    | 'StatusEffect'
    | 'CombatAI'
    | 'CharacterManagementRule'
    | 'BaseJob'
    | 'PartySlot'
    | 'PlayerBase'
    | 'BaseUpgrade'
    | 'Map'
    | 'Recipe'
    | 'Room'
    | 'Faction'
    | 'Dialogue'
    | 'Integrity';
  targetId: string;
  field?: string;
  message: string;
}

export interface ContentValidationReport {
  isValid: boolean;
  errorsCount: number;
  warningsCount: number;
  issues: ValidationIssue[];
}

/**
 * Validates duplicate IDs within each collection and across the entire manifest.
 */
export function validateDuplicateIds(content: GameContent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const globalIdMap = new Map<string, { category: ValidationIssue['category']; id: string }>();

  const checkCollection = <T extends { id: string }>(
    items: T[],
    category: ValidationIssue['category']
  ) => {
    const localSet = new Set<string>();
    for (const item of items) {
      if (!item.id || item.id.trim().length === 0) {
        issues.push({
          severity: 'error',
          category,
          targetId: 'unknown',
          message: `Found entity in ${category} with missing or empty ID`,
        });
        continue;
      }

      // Check duplicate within same collection
      if (localSet.has(item.id)) {
        issues.push({
          severity: 'error',
          category,
          targetId: item.id,
          message: `Duplicate ID '${item.id}' detected within ${category} collection`,
        });
      } else {
        localSet.add(item.id);
      }

      // Check collision across different collections
      if (globalIdMap.has(item.id)) {
        const existing = globalIdMap.get(item.id)!;
        issues.push({
          severity: 'warning',
          category: 'Integrity',
          targetId: item.id,
          message: `ID collision: '${item.id}' is used in both '${existing.category}' and '${category}'`,
        });
      } else {
        globalIdMap.set(item.id, { category, id: item.id });
      }
    }
  };

  checkCollection(content.items ?? [], 'Item');
  checkCollection(content.npcs ?? content.characters ?? [], 'NPC');
  checkCollection(content.enemies ?? [], 'Enemy');
  checkCollection(content.pois ?? [], 'POI');
  checkCollection(content.quests ?? [], 'Quest');
  checkCollection(content.events ?? [], 'GameEvent');
  checkCollection(content.maps ?? [], 'Map');
  checkCollection(content.recipes ?? [], 'Recipe');
  checkCollection(content.rooms ?? [], 'Room');
  checkCollection(content.factions ?? [], 'Faction');
  checkCollection(content.dialogues ?? [], 'Dialogue');
  checkCollection(content.abilities ?? [], 'Ability');
  checkCollection(content.statusEffects ?? [], 'StatusEffect');
  checkCollection(content.combatAIProfiles ?? [], 'CombatAI');
  checkCollection(content.characterManagementRules ?? [], 'CharacterManagementRule');
  checkCollection(content.baseJobs ?? [], 'BaseJob');
  checkCollection(content.partySlots ?? [], 'PartySlot');
  checkCollection(content.bases ?? [], 'PlayerBase');
  checkCollection(content.baseUpgrades ?? [], 'BaseUpgrade');

  return issues;
}

/**
 * Validates referential integrity to detect missing ID references across all game entities.
 */
export function validateMissingReferentialIds(content: GameContent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const itemIds = new Set((content.items ?? []).map((i) => i.id));
  const npcList = content.npcs ?? content.characters ?? [];
  const npcIds = new Set(npcList.map((n) => n.id));
  const enemyIds = new Set((content.enemies ?? []).map((e) => e.id));
  const factionIds = new Set((content.factions ?? []).map((f) => f.id));
  const mapIds = new Set((content.maps ?? []).map((m) => m.id));
  const questIds = new Set((content.quests ?? []).map((q) => q.id));
  const dialogueIds = new Set((content.dialogues ?? []).map((d) => d.id));
  const poiIds = new Set((content.pois ?? []).map((p) => p.id));
  const abilityIds = new Set((content.abilities ?? []).map((ability) => ability.id));
  const statusEffectIds = new Set((content.statusEffects ?? []).map((effect) => effect.id));
  const aiProfileIds = new Set((content.combatAIProfiles ?? []).map((profile) => profile.id));
  const roomIds = new Set((content.rooms ?? []).map((room) => room.id));

  // 1. Validate NPC references
  for (const npc of npcList) {
    if (npc.factionId && npc.factionId !== 'Neutral' && !factionIds.has(npc.factionId)) {
      issues.push({
        severity: 'warning',
        category: 'NPC',
        targetId: npc.id,
        field: 'factionId',
        message: `NPC '${npc.name}' references non-existent factionId '${npc.factionId}'`,
      });
    }

    if (npc.dialogueTreeId && !dialogueIds.has(npc.dialogueTreeId)) {
      issues.push({
        severity: 'error',
        category: 'NPC',
        targetId: npc.id,
        field: 'dialogueTreeId',
        message: `NPC '${npc.name}' references missing dialogueTreeId '${npc.dialogueTreeId}'`,
      });
    }

    if (npc.inventory) {
      for (const slot of npc.inventory) {
        if (!itemIds.has(slot.itemId)) {
          issues.push({
            severity: 'error',
            category: 'NPC',
            targetId: npc.id,
            field: 'inventory',
            message: `NPC '${npc.name}' inventory contains missing itemId '${slot.itemId}'`,
          });
        }
      }
    }
    for (const abilityId of npc.abilityIds ?? []) {
      if (!abilityIds.has(abilityId)) issues.push({ severity: 'error', category: 'NPC', targetId: npc.id, field: 'abilityIds', message: `NPC '${npc.name}' references missing abilityId '${abilityId}'` });
    }
  }

  for (const item of content.items ?? []) {
    for (const abilityId of item.grantedAbilityIds ?? []) {
      if (!abilityIds.has(abilityId)) issues.push({ severity: 'error', category: 'Item', targetId: item.id, field: 'grantedAbilityIds', message: `Item '${item.name}' references missing abilityId '${abilityId}'` });
    }
  }

  // 2. Validate Enemy references
  for (const enemy of content.enemies ?? []) {
    if (enemy.factionId && enemy.factionId !== 'Hostile' && !factionIds.has(enemy.factionId)) {
      issues.push({
        severity: 'warning',
        category: 'Enemy',
        targetId: enemy.id,
        field: 'factionId',
        message: `Enemy '${enemy.name}' references missing factionId '${enemy.factionId}'`,
      });
    }

    if (enemy.equippedWeaponId && !itemIds.has(enemy.equippedWeaponId)) {
      issues.push({
        severity: 'error',
        category: 'Enemy',
        targetId: enemy.id,
        field: 'equippedWeaponId',
        message: `Enemy '${enemy.name}' references missing equippedWeaponId '${enemy.equippedWeaponId}'`,
      });
    }

    for (const loot of enemy.lootTable ?? []) {
      if (!itemIds.has(loot.itemId)) {
        issues.push({
          severity: 'error',
          category: 'Enemy',
          targetId: enemy.id,
          field: 'lootTable',
          message: `Enemy '${enemy.name}' loot table contains missing itemId '${loot.itemId}'`,
        });
      }
    }
    for (const abilityId of enemy.abilityIds ?? []) {
      if (!abilityIds.has(abilityId)) issues.push({ severity: 'error', category: 'Enemy', targetId: enemy.id, field: 'abilityIds', message: `Enemy '${enemy.name}' references missing abilityId '${abilityId}'` });
    }
    if (enemy.combatAIProfileId && !aiProfileIds.has(enemy.combatAIProfileId)) {
      issues.push({ severity: 'error', category: 'Enemy', targetId: enemy.id, field: 'combatAIProfileId', message: `Enemy '${enemy.name}' references missing combatAIProfileId '${enemy.combatAIProfileId}'` });
    }
  }

  for (const ability of content.abilities ?? []) {
    for (const effect of ability.effects) {
      if (effect.statusEffectId && !statusEffectIds.has(effect.statusEffectId)) {
        issues.push({ severity: 'error', category: 'Ability', targetId: ability.id, field: 'effects.statusEffectId', message: `Ability '${ability.name}' references missing statusEffectId '${effect.statusEffectId}'` });
      }
    }
  }
  for (const profile of content.combatAIProfiles ?? []) {
    for (const abilityId of profile.abilityPriority) {
      if (!abilityIds.has(abilityId)) issues.push({ severity: 'error', category: 'CombatAI', targetId: profile.id, field: 'abilityPriority', message: `Combat AI '${profile.name}' references missing abilityId '${abilityId}'` });
    }
  }

  for (const base of content.bases ?? []) {
    const slotIds = new Set(base.roomSlots.map((slot) => slot.id));
    if (base.poiId && !poiIds.has(base.poiId)) issues.push({ severity: 'error', category: 'PlayerBase', targetId: base.id, field: 'poiId', message: `Base '${base.name}' references missing poiId '${base.poiId}'` });
    for (const startingRoom of base.startingRooms) {
      if (!slotIds.has(startingRoom.slotId)) issues.push({ severity: 'error', category: 'PlayerBase', targetId: base.id, field: 'startingRooms.slotId', message: `Base '${base.name}' references missing slotId '${startingRoom.slotId}'` });
      if (!roomIds.has(startingRoom.roomDefinitionId)) issues.push({ severity: 'error', category: 'PlayerBase', targetId: base.id, field: 'startingRooms.roomDefinitionId', message: `Base '${base.name}' references missing roomDefinitionId '${startingRoom.roomDefinitionId}'` });
    }
  }

  // 3. Validate POI references
  for (const poi of content.pois ?? []) {
    if (poi.mapId && !mapIds.has(poi.mapId)) {
      issues.push({
        severity: 'warning',
        category: 'POI',
        targetId: poi.id,
        field: 'mapId',
        message: `POI '${poi.name}' references missing mapId '${poi.mapId}'`,
      });
    }

    for (const npcId of poi.npcIds ?? []) {
      if (!npcIds.has(npcId)) {
        issues.push({
          severity: 'warning',
          category: 'POI',
          targetId: poi.id,
          field: 'npcIds',
          message: `POI '${poi.name}' references missing npcId '${npcId}'`,
        });
      }
    }

    for (const qId of poi.questIds ?? []) {
      if (!questIds.has(qId)) {
        issues.push({
          severity: 'warning',
          category: 'POI',
          targetId: poi.id,
          field: 'questIds',
          message: `POI '${poi.name}' references missing questId '${qId}'`,
        });
      }
    }

    for (const action of poi.actions ?? []) {
      if (action.dialogueTreeId && !dialogueIds.has(action.dialogueTreeId)) {
        issues.push({
          severity: 'error',
          category: 'POI',
          targetId: `${poi.id}#${action.id}`,
          field: 'action.dialogueTreeId',
          message: `POI action '${action.label}' references missing dialogueTreeId '${action.dialogueTreeId}'`,
        });
      }
      if (action.targetMapId && !mapIds.has(action.targetMapId)) {
        issues.push({
          severity: 'error',
          category: 'POI',
          targetId: `${poi.id}#${action.id}`,
          field: 'action.targetMapId',
          message: `POI action '${action.label}' references missing targetMapId '${action.targetMapId}'`,
        });
      }
      if (action.questId && !questIds.has(action.questId)) {
        issues.push({
          severity: 'warning',
          category: 'POI',
          targetId: `${poi.id}#${action.id}`,
          field: 'action.questId',
          message: `POI action '${action.label}' references missing questId '${action.questId}'`,
        });
      }
    }
  }

  // 4. Validate Quest references
  for (const quest of content.quests ?? []) {
    const qFaction = quest.factionId || quest.faction;
    if (qFaction && qFaction !== 'Neutral' && !factionIds.has(qFaction)) {
      issues.push({
        severity: 'warning',
        category: 'Quest',
        targetId: quest.id,
        field: 'factionId',
        message: `Quest '${quest.name || quest.title}' references missing factionId '${qFaction}'`,
      });
    }

    if (!quest.stages || !quest.stages[quest.initialStageId]) {
      issues.push({
        severity: 'error',
        category: 'Quest',
        targetId: quest.id,
        field: 'initialStageId',
        message: `Quest initialStageId '${quest.initialStageId}' not found in quest stages`,
      });
    }

    for (const stage of Object.values(quest.stages ?? {})) {
      if (stage.nextStageId && !quest.stages[stage.nextStageId]) {
        issues.push({
          severity: 'error',
          category: 'Quest',
          targetId: quest.id,
          field: `stages.${stage.id}.nextStageId`,
          message: `Quest stage '${stage.id}' references missing nextStageId '${stage.nextStageId}'`,
        });
      }
    }

    for (const rewardItemId of quest.rewardItemIds ?? []) {
      if (!itemIds.has(rewardItemId)) {
        issues.push({
          severity: 'error',
          category: 'Quest',
          targetId: quest.id,
          field: 'rewardItemIds',
          message: `Quest reward contains missing itemId '${rewardItemId}'`,
        });
      }
    }

    for (const reqQuestId of quest.prerequisites?.requiredQuestIds ?? []) {
      if (!questIds.has(reqQuestId)) {
        issues.push({
          severity: 'error',
          category: 'Quest',
          targetId: quest.id,
          field: 'prerequisites.requiredQuestIds',
          message: `Quest prerequisite references missing questId '${reqQuestId}'`,
        });
      }
    }
  }

  // 5. Validate Recipe references
  for (const recipe of content.recipes ?? []) {
    if (!itemIds.has(recipe.resultItemId)) {
      issues.push({
        severity: 'error',
        category: 'Recipe',
        targetId: recipe.id,
        field: 'resultItemId',
        message: `Recipe '${recipe.name}' result references missing itemId '${recipe.resultItemId}'`,
      });
    }
    for (const ing of recipe.ingredients ?? []) {
      if (!itemIds.has(ing.itemId)) {
        issues.push({
          severity: 'error',
          category: 'Recipe',
          targetId: recipe.id,
          field: 'ingredients',
          message: `Recipe '${recipe.name}' ingredient references missing itemId '${ing.itemId}'`,
        });
      }
    }
  }

  // 6. Validate GameEvent references
  for (const event of content.events ?? []) {
    for (const step of event.steps ?? []) {
      if (step.speaker?.npcId && !npcIds.has(step.speaker.npcId)) {
        issues.push({
          severity: 'warning',
          category: 'GameEvent',
          targetId: event.id,
          field: `steps.${step.id}.speaker.npcId`,
          message: `Event '${event.name}' step '${step.id}' speaker references missing npcId '${step.speaker.npcId}'`,
        });
      }
    }
  }

  // 7. Validate CombatEncounter references
  for (const encounter of content.encounters ?? []) {
    for (const group of encounter.enemyGroups ?? []) {
      if (!enemyIds.has(group.enemyId)) {
        issues.push({
          severity: 'error',
          category: 'CombatEncounter',
          targetId: encounter.id,
          field: 'enemyGroups',
          message: `Encounter '${encounter.name}' references missing enemyId '${group.enemyId}'`,
        });
      }
    }
    for (const drop of encounter.lootTable ?? []) {
      if (!itemIds.has(drop.itemId)) {
        issues.push({
          severity: 'error',
          category: 'CombatEncounter',
          targetId: encounter.id,
          field: 'lootTable',
          message: `Encounter '${encounter.name}' loot table references missing itemId '${drop.itemId}'`,
        });
      }
    }
  }

  // 8. Validate Map references
  for (const map of content.maps ?? []) {
    for (const connMapId of map.connectedMapIds ?? []) {
      if (!mapIds.has(connMapId)) {
        issues.push({
          severity: 'warning',
          category: 'Map',
          targetId: map.id,
          field: 'connectedMapIds',
          message: `Map '${map.name}' references missing connectedMapId '${connMapId}'`,
        });
      }
    }
    for (const poiId of map.poiIds ?? []) {
      if (!poiIds.has(poiId)) {
        issues.push({
          severity: 'error',
          category: 'Map',
          targetId: map.id,
          field: 'poiIds',
          message: `Map '${map.name}' references missing poiId '${poiId}'`,
        });
      }
    }
    if (map.defaultPoiId && !poiIds.has(map.defaultPoiId)) {
      issues.push({
        severity: 'warning',
        category: 'Map',
        targetId: map.id,
        field: 'defaultPoiId',
        message: `Map '${map.name}' references missing defaultPoiId '${map.defaultPoiId}'`,
      });
    }
  }

  // 8. Validate Faction references
  for (const faction of content.factions ?? []) {
    if (faction.headquartersMapId && !mapIds.has(faction.headquartersMapId)) {
      issues.push({
        severity: 'warning',
        category: 'Faction',
        targetId: faction.id,
        field: 'headquartersMapId',
        message: `Faction '${faction.name}' headquarters refers to missing mapId '${faction.headquartersMapId}'`,
      });
    }
    if (faction.leaderNpcId && !npcIds.has(faction.leaderNpcId)) {
      issues.push({
        severity: 'warning',
        category: 'Faction',
        targetId: faction.id,
        field: 'leaderNpcId',
        message: `Faction '${faction.name}' leader refers to missing npcId '${faction.leaderNpcId}'`,
      });
    }
    for (const rivalId of faction.rivalFactionIds ?? []) {
      if (!factionIds.has(rivalId)) {
        issues.push({
          severity: 'warning',
          category: 'Faction',
          targetId: faction.id,
          field: 'rivalFactionIds',
          message: `Faction '${faction.name}' references missing rival faction '${rivalId}'`,
        });
      }
    }
    for (const allyId of faction.allyFactionIds ?? []) {
      if (!factionIds.has(allyId)) {
        issues.push({
          severity: 'warning',
          category: 'Faction',
          targetId: faction.id,
          field: 'allyFactionIds',
          message: `Faction '${faction.name}' references missing ally faction '${allyId}'`,
        });
      }
    }
  }

  // 9. Validate Dialogue references
  for (const tree of content.dialogues ?? []) {
    if (!tree.nodes || !tree.nodes[tree.rootNodeId]) {
      issues.push({
        severity: 'error',
        category: 'Dialogue',
        targetId: tree.id,
        field: 'rootNodeId',
        message: `Dialogue tree '${tree.id}' root node '${tree.rootNodeId}' not found`,
      });
    }
    for (const [nodeId, node] of Object.entries(tree.nodes ?? {})) {
      for (const choice of node.choices ?? []) {
        if (choice.targetNodeId !== null && !tree.nodes[choice.targetNodeId]) {
          issues.push({
            severity: 'error',
            category: 'Dialogue',
            targetId: `${tree.id}#${nodeId}`,
            field: `choices.${choice.id}.targetNodeId`,
            message: `Choice '${choice.id}' points to missing target node '${choice.targetNodeId}'`,
          });
        }
        if (choice.questTriggerId && !questIds.has(choice.questTriggerId)) {
          issues.push({
            severity: 'warning',
            category: 'Dialogue',
            targetId: `${tree.id}#${nodeId}`,
            field: `choices.${choice.id}.questTriggerId`,
            message: `Choice '${choice.id}' triggers missing questId '${choice.questTriggerId}'`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Complete validator running Zod schema validation, duplicate ID checks, and missing referential checks.
 */
export function validateGameContent(rawContent: unknown): ContentValidationReport {
  const issues: ValidationIssue[] = [];

  const parsed = GameContentSchema.safeParse(rawContent);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        severity: 'error',
        category: 'Integrity',
        targetId: issue.path.join('.'),
        field: issue.path.join('.'),
        message: `Schema error at ${issue.path.join('.')}: ${issue.message}`,
      });
    }
  }

  // If parsed data is available or can be coerced
  const content = (parsed.success ? parsed.data : (rawContent as GameContent)) ?? {
    version: '1.0.0',
    items: [],
    npcs: [],
    enemies: [],
    pois: [],
    quests: [],
    events: [],
    encounters: [],
    abilities: [],
    statusEffects: [],
    combatAIProfiles: [],
    characterManagementRules: [],
    baseJobs: [],
    partySlots: [],
    bases: [],
    baseUpgrades: [],
    maps: [],
    recipes: [],
    rooms: [],
    factions: [],
    dialogues: [],
  };

  // Run Duplicate ID validation
  issues.push(...validateDuplicateIds(content));

  // Run Missing ID / Referential integrity validation
  issues.push(...validateMissingReferentialIds(content));

  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    isValid: errorsCount === 0,
    errorsCount,
    warningsCount,
    issues,
  };
}

// Individual schema validators for single entity validation (e.g. editor inspection)
export function validateItem(item: Item): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = ItemSchema.safeParse(item);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Item', targetId: item.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateNPC(npc: NPC): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = NPCSchema.safeParse(npc);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'NPC', targetId: npc.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateCharacter(char: NPC): ValidationIssue[] {
  return validateNPC(char);
}

export function validateEnemy(enemy: Enemy): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = EnemySchema.safeParse(enemy);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Enemy', targetId: enemy.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validatePOI(poi: POI): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = POISchema.safeParse(poi);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'POI', targetId: poi.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateQuest(quest: Quest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = QuestSchema.safeParse(quest);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Quest', targetId: quest.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateGameEvent(event: GameEvent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = GameEventSchema.safeParse(event);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'GameEvent', targetId: event.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateMap(map: GameMap): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = GameMapSchema.safeParse(map);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Map', targetId: map.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateRecipe(recipe: Recipe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = RecipeSchema.safeParse(recipe);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Recipe', targetId: recipe.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateRoom(room: BaseRoomDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = BaseRoomDefinitionSchema.safeParse(room);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Room', targetId: room.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateFaction(faction: Faction): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = FactionSchema.safeParse(faction);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Faction', targetId: faction.id || 'unknown', message: i.message });
    });
  }
  return issues;
}

export function validateDialogueTree(tree: DialogueTree): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = DialogueTreeSchema.safeParse(tree);
  if (!parsed.success) {
    parsed.error.issues.forEach((i) => {
      issues.push({ severity: 'error', category: 'Dialogue', targetId: tree.id || 'unknown', message: i.message });
    });
  }
  return issues;
}
