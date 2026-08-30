/**
 * @neon-ether/game-runtime
 * Central Content Registry indexing all game schemas and authored data.
 * Provides high-speed O(1) indexed lookups (content.items.get(id), content.npcs.get(id), etc.)
 * along with schema validation, duplicate ID detection, and missing referential integrity checks.
 */

import {
  BaseRoomDefinition,
  Ability,
  BaseJobDefinition,
  BaseUpgradeDefinition,
  CharacterManagementRule,
  CombatAI,
  CombatEncounter,
  ContentValidationReport,
  ContentValidationOptions,
  DialogueTree,
  Enemy,
  Faction,
  GameContent,
  GameContentSchema,
  GameEvent,
  GameMap,
  Item,
  NPC,
  POI,
  PartySlotDefinition,
  PlayerBaseDefinition,
  ProgressionDefinition,
  Quest,
  Recipe,
  StatusEffectDefinition,
  ValidationIssue,
  validateGameContent,
} from '@neon-ether/game-schema';

/**
 * Generic indexed collection wrapper providing fast lookup and filtering capabilities.
 */
export class RegistryCollection<T extends { id: string; name?: string; tags?: string[] }> {
  private map = new Map<string, T>();
  public readonly categoryName: string;

  constructor(categoryName: string) {
    this.categoryName = categoryName;
  }

  public get(id: string): T | undefined {
    return this.map.get(id);
  }

  public require(id: string): T {
    const item = this.map.get(id);
    if (!item) {
      throw new Error(`[ContentRegistry] Required ${this.categoryName} entity with id '${id}' not found in registry`);
    }
    return item;
  }

  public has(id: string): boolean {
    return this.map.has(id);
  }

  public set(id: string, item: T): void {
    this.map.set(id, item);
  }

  public delete(id: string): boolean {
    return this.map.delete(id);
  }

  public clear(): void {
    this.map.clear();
  }

  public getAll(): T[] {
    return Array.from(this.map.values());
  }

  public filter(predicate: (item: T) => boolean): T[] {
    const results: T[] = [];
    for (const item of this.map.values()) {
      if (predicate(item)) {
        results.push(item);
      }
    }
    return results;
  }

  public findByTag(tag: string): T[] {
    return this.filter((item) => item.tags?.includes(tag) ?? false);
  }

  public findByName(name: string): T | undefined {
    for (const item of this.map.values()) {
      if (item.name?.toLowerCase() === name.toLowerCase()) {
        return item;
      }
    }
    return undefined;
  }

  public get size(): number {
    return this.map.size;
  }

  public [Symbol.iterator](): IterableIterator<T> {
    return this.map.values();
  }
}

export interface ContentLoadingOptions {
  strict?: boolean;
  clearExisting?: boolean;
  validation?: ContentValidationOptions;
}

export class ContentRegistry {
  public readonly items = new RegistryCollection<Item>('Item');
  public readonly progressionDefinitions = new RegistryCollection<ProgressionDefinition>('ProgressionDefinition');
  public readonly npcs = new RegistryCollection<NPC>('NPC');
  public readonly enemies = new RegistryCollection<Enemy>('Enemy');
  public readonly encounters = new RegistryCollection<CombatEncounter>('CombatEncounter');
  public readonly abilities = new RegistryCollection<Ability>('Ability');
  public readonly statusEffects = new RegistryCollection<StatusEffectDefinition>('StatusEffect');
  public readonly combatAIProfiles = new RegistryCollection<CombatAI>('CombatAI');
  public readonly characterManagementRules = new RegistryCollection<CharacterManagementRule>('CharacterManagementRule');
  public readonly baseJobs = new RegistryCollection<BaseJobDefinition>('BaseJob');
  public readonly partySlots = new RegistryCollection<PartySlotDefinition>('PartySlot');
  public readonly bases = new RegistryCollection<PlayerBaseDefinition>('PlayerBase');
  public readonly baseUpgrades = new RegistryCollection<BaseUpgradeDefinition>('BaseUpgrade');
  public readonly pois = new RegistryCollection<POI>('POI');
  public readonly quests = new RegistryCollection<Quest>('Quest');
  public readonly events = new RegistryCollection<GameEvent>('GameEvent');
  public readonly maps = new RegistryCollection<GameMap>('Map');
  public readonly recipes = new RegistryCollection<Recipe>('Recipe');
  public readonly rooms = new RegistryCollection<BaseRoomDefinition>('Room');
  public readonly factions = new RegistryCollection<Faction>('Faction');
  public readonly dialogues = new RegistryCollection<DialogueTree>('Dialogue');

  private lastValidationReport: ContentValidationReport | null = null;
  private version: string = '1.0.0';

  /**
   * Loads content into the registry, parses with Zod schemas, validates duplicate & missing IDs,
   * and populates fast lookup maps.
   */
  public loadContent(rawContent: unknown, options: ContentLoadingOptions = {}): ContentValidationReport {
    const { strict = false, clearExisting = true, validation } = options;

    if (clearExisting) {
      this.clear();
    }

    // Run full schema & referential integrity validation
    const report = validateGameContent(rawContent, validation);
    this.lastValidationReport = report;

    if (strict && !report.isValid) {
      const errorMsgs = report.issues.filter((i) => i.severity === 'error').map((i) => `[${i.category}] ${i.message}`);
      throw new Error(`[ContentRegistry] Strict loading failed with ${report.errorsCount} errors:\n${errorMsgs.join('\n')}`);
    }

    // Safe parse data with defaults
    const parsed = GameContentSchema.safeParse(rawContent);
    if (!parsed.success) return report;
    const content: GameContent = parsed.data;

    this.version = content.version || '1.0.0';

    // Index Items
    for (const item of content.items ?? []) {
      this.items.set(item.id, item);
    }
    for (const definition of content.progressionDefinitions ?? []) this.progressionDefinitions.set(definition.id, definition);

    // Index NPCs / Characters
    const npcList = content.npcs ?? content.characters ?? [];
    for (const npc of npcList) {
      this.npcs.set(npc.id, npc);
    }

    // Index Enemies
    for (const enemy of content.enemies ?? []) {
      this.enemies.set(enemy.id, enemy);
    }

    // Index Encounters
    for (const encounter of content.encounters ?? []) {
      this.encounters.set(encounter.id, encounter);
    }
    for (const ability of content.abilities ?? []) this.abilities.set(ability.id, ability);
    for (const effect of content.statusEffects ?? []) this.statusEffects.set(effect.id, effect);
    for (const profile of content.combatAIProfiles ?? []) this.combatAIProfiles.set(profile.id, profile);
    for (const rule of content.characterManagementRules ?? []) this.characterManagementRules.set(rule.id, rule);
    for (const job of content.baseJobs ?? []) this.baseJobs.set(job.id, job);
    for (const slot of content.partySlots ?? []) this.partySlots.set(slot.id, slot);
    for (const base of content.bases ?? []) this.bases.set(base.id, base);
    for (const upgrade of content.baseUpgrades ?? []) this.baseUpgrades.set(upgrade.id, upgrade);

    // Index POIs
    for (const poi of content.pois ?? []) {
      this.pois.set(poi.id, poi);
    }

    // Index Quests
    for (const quest of content.quests ?? []) {
      this.quests.set(quest.id, quest);
    }

    // Index Events
    for (const event of content.events ?? []) {
      this.events.set(event.id, event);
    }

    // Index Maps
    for (const map of content.maps ?? []) {
      this.maps.set(map.id, map);
    }

    // Index Recipes
    for (const recipe of content.recipes ?? []) {
      this.recipes.set(recipe.id, recipe);
    }

    // Index Rooms
    for (const room of content.rooms ?? []) {
      this.rooms.set(room.id, room);
    }

    // Index Factions
    for (const faction of content.factions ?? []) {
      this.factions.set(faction.id, faction);
    }

    // Index Dialogues
    for (const dialogue of content.dialogues ?? []) {
      this.dialogues.set(dialogue.id, dialogue);
    }

    return report;
  }

  /**
   * Backwards-compatible loadManifest method.
   */
  public loadManifest(manifest: GameContent): ValidationIssue[] {
    const report = this.loadContent(manifest);
    return report.issues;
  }

  /**
   * Runs validation on current in-memory content.
   */
  public validate(): ContentValidationReport {
    const snapshot = this.exportSnapshot();
    const report = validateGameContent(snapshot);
    this.lastValidationReport = report;
    return report;
  }

  /**
   * Exports the entire content registry state as a unified GameContent payload.
   */
  public exportSnapshot(): GameContent {
    return {
      version: this.version,
      items: this.items.getAll(),
      progressionDefinitions: this.progressionDefinitions.getAll(),
      npcs: this.npcs.getAll(),
      enemies: this.enemies.getAll(),
      encounters: this.encounters.getAll(),
      abilities: this.abilities.getAll(),
      statusEffects: this.statusEffects.getAll(),
      combatAIProfiles: this.combatAIProfiles.getAll(),
      characterManagementRules: this.characterManagementRules.getAll(),
      baseJobs: this.baseJobs.getAll(),
      partySlots: this.partySlots.getAll(),
      bases: this.bases.getAll(),
      baseUpgrades: this.baseUpgrades.getAll(),
      pois: this.pois.getAll(),
      quests: this.quests.getAll(),
      events: this.events.getAll(),
      maps: this.maps.getAll(),
      recipes: this.recipes.getAll(),
      rooms: this.rooms.getAll(),
      factions: this.factions.getAll(),
      dialogues: this.dialogues.getAll(),
    };
  }

  public getLastValidationReport(): ContentValidationReport | null {
    return this.lastValidationReport;
  }

  public clear(): void {
    this.items.clear();
    this.progressionDefinitions.clear();
    this.npcs.clear();
    this.enemies.clear();
    this.encounters.clear();
    this.abilities.clear();
    this.statusEffects.clear();
    this.combatAIProfiles.clear();
    this.characterManagementRules.clear();
    this.baseJobs.clear();
    this.partySlots.clear();
    this.bases.clear();
    this.baseUpgrades.clear();
    this.pois.clear();
    this.quests.clear();
    this.events.clear();
    this.maps.clear();
    this.recipes.clear();
    this.rooms.clear();
    this.factions.clear();
    this.dialogues.clear();
    this.lastValidationReport = null;
  }

  public getStatsSummary() {
    return {
      version: this.version,
      itemsCount: this.items.size,
      npcsCount: this.npcs.size,
      enemiesCount: this.enemies.size,
      encountersCount: this.encounters.size,
      abilitiesCount: this.abilities.size,
      statusEffectsCount: this.statusEffects.size,
      combatAIProfilesCount: this.combatAIProfiles.size,
      characterManagementRulesCount: this.characterManagementRules.size,
      baseJobsCount: this.baseJobs.size,
      partySlotsCount: this.partySlots.size,
      basesCount: this.bases.size,
      baseUpgradesCount: this.baseUpgrades.size,
      poisCount: this.pois.size,
      questsCount: this.quests.size,
      eventsCount: this.events.size,
      mapsCount: this.maps.size,
      recipesCount: this.recipes.size,
      roomsCount: this.rooms.size,
      factionsCount: this.factions.size,
      dialoguesCount: this.dialogues.size,
      totalEntities:
        this.items.size +
        this.npcs.size +
        this.enemies.size +
        this.encounters.size +
        this.abilities.size + this.statusEffects.size + this.combatAIProfiles.size +
        this.characterManagementRules.size + this.baseJobs.size + this.partySlots.size +
        this.bases.size + this.baseUpgrades.size +
        this.pois.size +
        this.quests.size +
        this.events.size +
        this.maps.size +
        this.recipes.size +
        this.rooms.size +
        this.factions.size +
        this.dialogues.size,
    };
  }

  // Backwards-compatible lookup helpers
  public getItem(id: string): Item | undefined {
    return this.items.get(id);
  }

  public getAllItems(): Item[] {
    return this.items.getAll();
  }

  public getCharacter(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  public getAllCharacters(): NPC[] {
    return this.npcs.getAll();
  }

  public getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  public getAllNPCs(): NPC[] {
    return this.npcs.getAll();
  }

  public getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  public getAllEnemies(): Enemy[] {
    return this.enemies.getAll();
  }

  public getPOI(id: string): POI | undefined {
    return this.pois.get(id);
  }

  public getAllPOIs(): POI[] {
    return this.pois.getAll();
  }

  public getDialogue(id: string): DialogueTree | undefined {
    return this.dialogues.get(id);
  }

  public getAllDialogues(): DialogueTree[] {
    return this.dialogues.getAll();
  }

  public getQuest(id: string): Quest | undefined {
    return this.quests.get(id);
  }

  public getAllQuests(): Quest[] {
    return this.quests.getAll();
  }

  public getMap(id: string): GameMap | undefined {
    return this.maps.get(id);
  }

  public getAllMaps(): GameMap[] {
    return this.maps.getAll();
  }

  public getRecipe(id: string): Recipe | undefined {
    return this.recipes.get(id);
  }

  public getAllRecipes(): Recipe[] {
    return this.recipes.getAll();
  }

  public getRoom(id: string): BaseRoomDefinition | undefined {
    return this.rooms.get(id);
  }

  public getAllRooms(): BaseRoomDefinition[] {
    return this.rooms.getAll();
  }

  public getFaction(id: string): Faction | undefined {
    return this.factions.get(id);
  }

  public getAllFactions(): Faction[] {
    return this.factions.getAll();
  }

  public getEvent(id: string): GameEvent | undefined {
    return this.events.get(id);
  }

  public getAllEvents(): GameEvent[] {
    return this.events.getAll();
  }

  public getEncounter(id: string): CombatEncounter | undefined {
    return this.encounters.get(id);
  }

  public getAllEncounters(): CombatEncounter[] {
    return this.encounters.getAll();
  }

  public getAbility(id: string): Ability | undefined { return this.abilities.get(id); }
  public getStatusEffect(id: string): StatusEffectDefinition | undefined { return this.statusEffects.get(id); }
  public getCombatAIProfile(id: string): CombatAI | undefined { return this.combatAIProfiles.get(id); }
  public getCharacterManagementRule(id: string): CharacterManagementRule | undefined { return this.characterManagementRules.get(id); }
  public getBaseJob(id: string): BaseJobDefinition | undefined { return this.baseJobs.get(id); }
  public getPartySlot(id: string): PartySlotDefinition | undefined { return this.partySlots.get(id); }
  public getBase(id: string): PlayerBaseDefinition | undefined { return this.bases.get(id); }
  public getBaseUpgrade(id: string): BaseUpgradeDefinition | undefined { return this.baseUpgrades.get(id); }
}
