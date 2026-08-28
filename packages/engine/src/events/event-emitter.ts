/**
 * @neon-ether/engine
 * Strongly-typed event dispatcher and decoupled listener registry.
 */

export type EventHandler<T = any> = (payload: T) => void;

export class TypedEventEmitter<TEventMap extends Record<string, any>> {
  private listeners: { [K in keyof TEventMap]?: Array<EventHandler<TEventMap[K]>> } = {};

  public on<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(handler);

    // Unsubscribe callback
    return () => {
      this.off(event, handler);
    };
  }

  public off<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
    const list = this.listeners[event];
    if (!list) return;
    this.listeners[event] = list.filter((h) => h !== handler);
  }

  public emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    const list = this.listeners[event];
    if (!list || list.length === 0) return;
    // Clone list to avoid mutation during dispatch
    [...list].forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[Engine EventBus Error] while handling ${String(event)}:`, err);
      }
    });
  }

  public clearAll(): void {
    this.listeners = {};
  }
}
