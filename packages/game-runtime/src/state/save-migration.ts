/**
 * @neon-ether/game-runtime
 * SaveGame Migration Engine & Versioning Infrastructure.
 * Allows safe, sequential upgrades of serialized game states across versions.
 */

import { CURRENT_SAVE_SCHEMA_VERSION, GameState } from '@neon-ether/game-schema';

export interface SaveMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;
  readonly migrate: (oldData: any) => any;
}

export interface MigrationExecutionResult {
  readonly success: boolean;
  readonly data: any;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrated: boolean;
  readonly appliedMigrations: string[];
  readonly error?: string;
}

export class SaveMigrationRegistry {
  private migrations: Map<number, SaveMigration> = new Map();

  constructor(registerDefaultMigrations = true) {
    if (registerDefaultMigrations) {
      this.registerBuiltInMigrations();
    }
  }

  /**
   * Register a new step migration (e.g. from version N to N+1).
   */
  public registerMigration(migration: SaveMigration): void {
    if (migration.toVersion <= migration.fromVersion) {
      throw new Error(
        `[SaveMigration] Invalid migration path: toVersion (${migration.toVersion}) must be greater than fromVersion (${migration.fromVersion})`
      );
    }
    this.migrations.set(migration.fromVersion, migration);
  }

  public getMigration(fromVersion: number): SaveMigration | undefined {
    return this.migrations.get(fromVersion);
  }

  public getAllMigrations(): SaveMigration[] {
    return Array.from(this.migrations.values());
  }

  /**
   * Sequentially upgrades raw save data from its existing schemaVersion to targetVersion.
   */
  public migrate(rawData: any, targetVersion: number = CURRENT_SAVE_SCHEMA_VERSION): MigrationExecutionResult {
    if (!rawData || typeof rawData !== 'object') {
      return {
        success: false,
        data: rawData,
        fromVersion: 0,
        toVersion: targetVersion,
        migrated: false,
        appliedMigrations: [],
        error: 'Invalid save data payload: Expected JSON object',
      };
    }

    // Detect current version (default to 0 if unversioned legacy save)
    let currentVersion = typeof rawData.schemaVersion === 'number'
      ? rawData.schemaVersion
      : (typeof rawData.metadata?.schemaVersion === 'number' ? rawData.metadata.schemaVersion : 0);

    const initialVersion = currentVersion;
    const appliedDescriptions: string[] = [];

    // Check if future version
    if (currentVersion > targetVersion) {
      return {
        success: false,
        data: rawData,
        fromVersion: initialVersion,
        toVersion: targetVersion,
        migrated: false,
        appliedMigrations: [],
        error: `Save version (${currentVersion}) is newer than current runtime schema version (${targetVersion}). Please update your game.`,
      };
    }

    let workingData = JSON.parse(JSON.stringify(rawData));

    // If envelope { metadata, state }, extract or wrap appropriately
    let isEnvelope = Boolean(workingData.metadata && workingData.state);

    while (currentVersion < targetVersion) {
      const migration = this.migrations.get(currentVersion);
      if (!migration) {
        return {
          success: false,
          data: workingData,
          fromVersion: initialVersion,
          toVersion: currentVersion,
          migrated: appliedDescriptions.length > 0,
          appliedMigrations: appliedDescriptions,
          error: `Missing migration step from schema version ${currentVersion} to ${currentVersion + 1}`,
        };
      }

      try {
        if (isEnvelope) {
          workingData.state = migration.migrate(workingData.state);
          workingData.metadata.schemaVersion = migration.toVersion;
          workingData.state.schemaVersion = migration.toVersion;
        } else {
          workingData = migration.migrate(workingData);
          workingData.schemaVersion = migration.toVersion;
        }

        appliedDescriptions.push(
          `v${migration.fromVersion} -> v${migration.toVersion}: ${migration.description}`
        );
        currentVersion = migration.toVersion;
      } catch (err: any) {
        return {
          success: false,
          data: workingData,
          fromVersion: initialVersion,
          toVersion: currentVersion,
          migrated: appliedDescriptions.length > 0,
          appliedMigrations: appliedDescriptions,
          error: `Migration error at v${currentVersion}->v${migration.toVersion}: ${err?.message ?? String(err)}`,
        };
      }
    }

    return {
      success: true,
      data: workingData,
      fromVersion: initialVersion,
      toVersion: currentVersion,
      migrated: appliedDescriptions.length > 0,
      appliedMigrations: appliedDescriptions,
    };
  }

  /**
   * Registers default built-in migrations (e.g. v0 legacy unversioned -> v1).
   */
  private registerBuiltInMigrations(): void {
    // Migration 0 -> 1: Upgrade legacy flat GameState to modular Sub-States
    this.registerMigration({
      fromVersion: 0,
      toVersion: 1,
      description: 'Upgrade legacy flat GameState into modular PlayerState, WorldState, NpcRuntimeState, and Factions',
      migrate: (oldState: any) => {
        const migrated: any = {
          schemaVersion: 1,
          gameId: oldState.gameId ?? `session_${Date.now()}`,
          createdAt: oldState.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          player: {
            characterId: oldState.player?.id ?? 'player',
            name: oldState.player?.name ?? 'Vane',
            title: oldState.player?.title ?? 'Technomancer Drifter',
            level: oldState.player?.level ?? 1,
            experience: oldState.player?.experience ?? 0,
            attributePointsUnspent: oldState.player?.attributePointsUnspent ?? 0,
            skillPointsUnspent: oldState.player?.skillPointsUnspent ?? 0,
            factionId: oldState.player?.factionId ?? 'Neutral',
            attributes: oldState.player?.attributes ?? {
              body: 12,
              reflexes: 14,
              mind: 16,
              etherTech: 15,
              presence: 11,
            },
            vitals: oldState.player?.vitals ?? {
              maxHp: 38,
              currentHp: 38,
              maxEther: 50,
              currentEther: 45,
              actionPointsMax: 8,
              actionPointsCurrent: 8,
              initiative: 14,
              armorRating: 3,
              etherResistance: 15,
            },
            position: oldState.player?.position ?? { x: 4, y: 5 },
            facing: oldState.player?.facing ?? 'South',
            inventory: {
              items: Array.isArray(oldState.player?.inventory)
                ? oldState.player.inventory.map((slot: any) => ({
                    itemId: slot.itemId,
                    quantity: slot.quantity ?? 1,
                    isEquipped: slot.isEquipped ?? false,
                  }))
                : [],
              credits: oldState.player?.credits ?? 500,
              maxSlots: 30,
              maxWeight: 100,
            },
            activeStatusEffects: [],
          },
          world: {
            currentMapId: oldState.currentMapId ?? '',
            discoveredMapIds: [oldState.currentMapId ?? ''],
            flags: oldState.flags ?? {},
            activeDialogueTreeId: oldState.activeDialogueTreeId ?? null,
            activeDialogueNodeId: oldState.activeDialogueNodeId ?? null,
            mode: oldState.mode ?? 'Exploration',
            pois: {},
            containers: {},
            doors: {},
            ambientEtherModifier: 1.0,
          },
          npcs: {},
          quests: {},
          factions: {},
          base: {
            baseId: 'base_player',
            name: 'Player Base',
            rooms: {},
            roomSlots: {},
            residentNpcIds: [],
            storage: { items: [], capacity: 20 },
            resources: {},
            unlockedUpgrades: [],
            stationedCompanionIds: [],
          },
          time: {
            turnCount: oldState.time?.turnCount ?? 1,
            day: oldState.time?.day ?? 1,
            hour: oldState.time?.hours ?? 9,
            minute: 0,
            timeOfDay: 'Day',
            elapsedRealSeconds: 0,
          },
          companions: Array.isArray(oldState.companions) ? oldState.companions : [],
          combat: oldState.combat ?? {
            encounterId: null,
            isActive: false,
            roundNumber: 0,
            turnOrder: [],
            activeTurnIndex: 0,
            combatants: {},
            log: [],
            outcome: null,
          },
          journal: Array.isArray(oldState.journal) ? oldState.journal : [],
        };

        // Migrate NPCs to slim runtime state (ID and mutable values only)
        if (oldState.worldNpcs && typeof oldState.worldNpcs === 'object') {
          for (const [npcId, npcData] of Object.entries(oldState.worldNpcs as Record<string, any>)) {
            migrated.npcs[npcId] = {
              npcId,
              mapId: oldState.currentMapId ?? '',
              isAlive: (npcData.vitals?.currentHp ?? 1) > 0,
              currentHp: npcData.vitals?.currentHp ?? 25,
              maxHp: npcData.vitals?.maxHp ?? 25,
              currentEther: npcData.vitals?.currentEther ?? 0,
              position: npcData.position ?? { x: 0, y: 0 },
              facing: npcData.facing ?? 'South',
              behaviorOverride: npcData.defaultBehavior,
              dialogueTreeIdOverride: npcData.dialogueTreeId,
              isHostile: false,
              isMerchant: Boolean(npcData.isMerchant),
              isCompanion: Boolean(npcData.isCompanion),
              relationship: {
                status: npcData.isCompanion ? 'companion' : 'independent',
                affinity: oldState.relationships?.[npcId] ?? 0,
                trust: 0,
                fear: 0,
                loyalty: 0,
              },
              assignment: { jobId: null, roomId: null, partySlotId: null },
              flags: {},
            };
          }
        }

        // Migrate Quests
        if (oldState.quests && typeof oldState.quests === 'object') {
          for (const [questId, qData] of Object.entries(oldState.quests as Record<string, any>)) {
            migrated.quests[questId] = {
              questId,
              status: qData.status ?? 'NotStarted',
              currentStageId: qData.currentStageId ?? 'stage_01',
              completedObjectiveIds: qData.completedObjectiveIds ?? [],
              failedObjectiveIds: [],
              objectiveCounters: {},
              customVariables: {},
            };
          }
        }

        // Migrate Factions
        if (oldState.factionReputation && typeof oldState.factionReputation === 'object') {
          for (const [facId, rep] of Object.entries(oldState.factionReputation as Record<string, number>)) {
            let standing: 'Hostile' | 'Unfriendly' | 'Neutral' | 'Friendly' | 'Honored' = 'Neutral';
            if (rep >= 50) standing = 'Honored';
            else if (rep >= 20) standing = 'Friendly';
            else if (rep <= -50) standing = 'Hostile';
            else if (rep <= -20) standing = 'Unfriendly';

            migrated.factions[facId] = {
              factionId: facId,
              reputation: rep,
              standing,
              tier: 1,
              isDiscovered: true,
              flags: {},
            };
          }
        }

        // Migrate Base rooms
        if (oldState.baseRooms && typeof oldState.baseRooms === 'object') {
          for (const [roomId, rData] of Object.entries(oldState.baseRooms as Record<string, any>)) {
            migrated.base.rooms[roomId] = {
              roomId,
              definitionId: rData.definitionId ?? roomId,
              slotId: rData.slotId ?? `legacy_slot_${roomId}`,
              isBuilt: Boolean(rData.built),
              level: rData.level ?? 1,
              assignedNpcIds: [],
              productionProgress: 0,
              installedUpgradeIds: [],
              capacity: { residents: 0, workers: 0, storage: 0 },
            };
            migrated.base.roomSlots[`legacy_slot_${roomId}`] = {
              slotId: `legacy_slot_${roomId}`,
              slotType: 'Legacy',
              roomInstanceId: roomId,
            };
          }
        }

        return migrated;
      },
    });
  }
}

// Global default singleton migration runner
export const defaultSaveMigrationRegistry = new SaveMigrationRegistry();
