/**
 * @neon-ether/game-runtime
 * Effect Execution Context.
 */

import { GameJournalEntry, GameState } from '../state/game-state.ts';
import { ContentRegistry } from '../content/content-registry.ts';

export interface EffectExecutionContext {
  state: GameState;
  contentRegistry?: ContentRegistry;
  logJournal?: (category: GameJournalEntry['category'], text: string, metadata?: Record<string, any>) => void;
  emitEvent?: (eventName: string, payload: any) => void;
  customVariables?: Record<string, any>;
}
