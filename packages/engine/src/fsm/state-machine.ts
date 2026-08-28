/**
 * @neon-ether/engine
 * Deterministic Finite State Machine (FSM) with validated transitions.
 */

export interface StateConfig<TState extends string, TContext> {
  onEnter?: (context: TContext, previousState: TState | null) => void;
  onUpdate?: (context: TContext, deltaMs: number) => void;
  onExit?: (context: TContext, nextState: TState) => void;
  allowedTransitions?: TState[];
}

export class FiniteStateMachine<TState extends string, TContext> {
  private currentState: TState;
  private states: Map<TState, StateConfig<TState, TContext>> = new Map();
  private context: TContext;

  constructor(initialState: TState, initialContext: TContext) {
    this.currentState = initialState;
    this.context = initialContext;
  }

  public registerState(state: TState, config: StateConfig<TState, TContext>): this {
    this.states.set(state, config);
    return this;
  }

  public getCurrentState(): TState {
    return this.currentState;
  }

  public getContext(): TContext {
    return this.context;
  }

  public setContext(newContext: Partial<TContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  public canTransitionTo(nextState: TState): boolean {
    const currentConfig = this.states.get(this.currentState);
    if (!currentConfig || !currentConfig.allowedTransitions) return true;
    return currentConfig.allowedTransitions.includes(nextState);
  }

  public transitionTo(nextState: TState): boolean {
    if (this.currentState === nextState) return false;

    const currentConfig = this.states.get(this.currentState);
    if (currentConfig?.allowedTransitions && !currentConfig.allowedTransitions.includes(nextState)) {
      console.warn(`[FSM] Invalid transition from ${this.currentState} to ${nextState}`);
      return false;
    }

    const previous = this.currentState;
    currentConfig?.onExit?.(this.context, nextState);

    this.currentState = nextState;
    const nextConfig = this.states.get(nextState);
    nextConfig?.onEnter?.(this.context, previous);

    return true;
  }

  public update(deltaMs: number): void {
    const config = this.states.get(this.currentState);
    config?.onUpdate?.(this.context, deltaMs);
  }
}
