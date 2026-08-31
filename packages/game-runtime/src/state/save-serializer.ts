/**
 * @neon-ether/game-runtime
 * SaveGame JSON Serializer, Deserializer, and Validation Pipeline.
 * Enforces schema validation and applies automatic migrations.
 */

import {
  CURRENT_SAVE_SCHEMA_VERSION,
  GameState,
  GameStateSchema,
  SaveGame,
  SaveGameMetadata,
  SaveGameMetadataSchema,
  SaveGameSchema,
} from '@neon-ether/game-schema';
import { defaultSaveMigrationRegistry, SaveMigrationRegistry } from './save-migration.ts';

export interface DeserializationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly saveGame?: SaveGame;
  readonly migrated?: boolean;
  readonly appliedMigrations?: string[];
  readonly error?: string;
  readonly validationErrors?: string[];
}

export type SaveLoadResult = DeserializationResult<SaveGame>;

export { CURRENT_SAVE_SCHEMA_VERSION };

/**
 * Serializes a GameState directly to a JSON string.
 */
export function serializeGameState(state: GameState, pretty = true): string {
  return JSON.stringify(state, null, pretty ? 2 : undefined);
}

/**
 * Creates a complete SaveGame envelope containing metadata and the serializable GameState.
 */
export function createSaveGame(
  state: GameState,
  options: {
    slotName?: string;
    saveId?: string;
    playtimeSeconds?: number;
    screenshotDataUrl?: string;
  } = {}
): SaveGame {
  const activeQuests = Object.values(state.quests).filter((q) => q.status === 'Active').length;

  const metadata: SaveGameMetadata = {
    saveId: options.saveId ?? `save_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    slotName: options.slotName ?? 'AutoSave',
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    playtimeSeconds: options.playtimeSeconds ?? state.time.elapsedRealSeconds ?? 0,
    playerLevel: state.player.level,
    playerName: state.player.name,
    currentMapId: state.world.currentMapId,
    activeQuestCount: activeQuests,
    screenshotDataUrl: options.screenshotDataUrl,
  };

  return {
    metadata,
    state: {
      ...state,
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Serializes a complete SaveGame envelope to JSON.
 */
export function serializeSaveGame(save: SaveGame, pretty = true): string {
  return JSON.stringify(save, null, pretty ? 2 : undefined);
}

/**
 * Deserializes, migrates, and validates a JSON string or object into a verified GameState.
 */
export function deserializeGameState(
  input: string | Record<string, any>,
  migrationRegistry: SaveMigrationRegistry = defaultSaveMigrationRegistry
): DeserializationResult<GameState> {
  try {
    const rawParsed = typeof input === 'string' ? JSON.parse(input) : input;

    // If it's a SaveGame envelope, extract state
    const rawState = (rawParsed && typeof rawParsed === 'object' && 'state' in rawParsed && 'metadata' in rawParsed)
      ? rawParsed.state
      : rawParsed;

    // Apply migrations if necessary
    const migrationResult = migrationRegistry.migrate(rawState, CURRENT_SAVE_SCHEMA_VERSION);
    if (!migrationResult.success) {
      return {
        success: false,
        error: migrationResult.error,
        appliedMigrations: migrationResult.appliedMigrations,
      };
    }

    // Validate against GameStateSchema
    const parseResult = GameStateSchema.safeParse(migrationResult.data);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return {
        success: false,
        error: 'Schema validation failed after migration',
        validationErrors: formattedErrors,
        migrated: migrationResult.migrated,
        appliedMigrations: migrationResult.appliedMigrations,
      };
    }

    return {
      success: true,
      data: parseResult.data,
      migrated: migrationResult.migrated,
      appliedMigrations: migrationResult.appliedMigrations,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `JSON parsing error: ${err?.message ?? String(err)}`,
    };
  }
}

/**
 * Deserializes, migrates, and validates a JSON string or object into a verified SaveGame.
 */
export function deserializeSaveGame(
  input: string | Record<string, any>,
  migrationRegistry: SaveMigrationRegistry = defaultSaveMigrationRegistry
): DeserializationResult<SaveGame> {
  try {
    const rawParsed = typeof input === 'string' ? JSON.parse(input) : input;

    if (!rawParsed || typeof rawParsed !== 'object') {
      return {
        success: false,
        error: 'Save payload is not a valid JSON object',
      };
    }

    // If rawParsed is a naked GameState without metadata envelope, wrap it
    let rawEnvelope: any = rawParsed;
    if (!rawEnvelope.metadata || !rawEnvelope.state) {
      rawEnvelope = {
        metadata: {
          saveId: `save_${Date.now()}`,
          slotName: 'ImportedSave',
          schemaVersion: rawParsed.schemaVersion ?? 0,
          timestamp: new Date().toISOString(),
          playtimeSeconds: rawParsed.time?.elapsedRealSeconds ?? 0,
          playerLevel: rawParsed.player?.level ?? 1,
          playerName: rawParsed.player?.name ?? 'Unknown',
          currentMapId: rawParsed.world?.currentMapId ?? rawParsed.currentMapId ?? '',
          activeQuestCount: 0,
        },
        state: rawParsed,
      };
    }

    // Migrate envelope
    const migrationResult = migrationRegistry.migrate(rawEnvelope, CURRENT_SAVE_SCHEMA_VERSION);
    if (!migrationResult.success) {
      return {
        success: false,
        error: migrationResult.error,
        appliedMigrations: migrationResult.appliedMigrations,
      };
    }

    // Validate SaveGameSchema
    const parseResult = SaveGameSchema.safeParse(migrationResult.data);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return {
        success: false,
        error: 'SaveGame envelope validation failed',
        validationErrors: formattedErrors,
        migrated: migrationResult.migrated,
        appliedMigrations: migrationResult.appliedMigrations,
      };
    }

    return {
      success: true,
      data: parseResult.data,
      saveGame: parseResult.data,
      migrated: migrationResult.migrated,
      appliedMigrations: migrationResult.appliedMigrations,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `JSON parsing error: ${err?.message ?? String(err)}`,
    };
  }
}
