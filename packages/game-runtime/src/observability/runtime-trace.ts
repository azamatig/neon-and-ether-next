export type RuntimeTraceKind =
  | 'ConditionChecked'
  | 'EffectStarted'
  | 'EffectExecuted'
  | 'OutcomeResolved'
  | 'EventTransition'
  | 'QuestTransition'
  | 'CombatStarted'
  | 'CombatCompleted'
  | 'CombatAction'
  | 'EconomyTransaction'
  | 'CraftingCompleted'
  | 'EventChoice'
  | 'BaseCommand'
  | 'CharacterCommand'
  | 'SkillCheck';

export interface RuntimeTraceEvent {
  kind: RuntimeTraceKind;
  message: string;
  details?: Record<string, unknown>;
}

/** Optional, presentation-agnostic sink used by development tooling and telemetry. */
export type RuntimeTraceSink = (event: RuntimeTraceEvent) => void;
