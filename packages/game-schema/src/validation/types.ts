export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationCategory =
  | 'Item' | 'NPC' | 'Enemy' | 'POI' | 'Quest' | 'GameEvent' | 'CombatEncounter'
  | 'Ability' | 'StatusEffect' | 'CombatAI' | 'CharacterManagementRule' | 'BaseJob'
  | 'PartySlot' | 'PlayerBase' | 'BaseUpgrade' | 'Map' | 'Recipe' | 'Room'
  | 'ProgressionDefinition'
  | 'Shop'
  | 'Faction' | 'Dialogue' | 'Asset' | 'Integrity';

export interface ValidationIssue {
  severity: ValidationSeverity;
  category: ValidationCategory;
  targetId: string;
  field?: string;
  message: string;
}

export interface ContentValidationReport {
  isValid: boolean;
  errorsCount: number;
  warningsCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

export interface ContentValidationOptions {
  /** Normalized asset paths or logical IDs known to the host application. */
  knownAssets?: ReadonlySet<string>;
}
