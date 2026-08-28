/**
 * @neon-ether/engine
 * Lightweight deterministic Entity & Component container.
 */

export type EntityId = string;

export interface Component {
  readonly type: string;
}

export class EntityManager {
  private nextId = 1;
  private entities = new Set<EntityId>();
  private components = new Map<EntityId, Map<string, Component>>();

  public createEntity(prefix = 'entity'): EntityId {
    const id = `${prefix}_${this.nextId++}`;
    this.entities.add(id);
    this.components.set(id, new Map());
    return id;
  }

  public destroyEntity(id: EntityId): boolean {
    if (!this.entities.has(id)) return false;
    this.entities.delete(id);
    this.components.delete(id);
    return true;
  }

  public addComponent<T extends Component>(entityId: EntityId, component: T): void {
    if (!this.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist.`);
    }
    this.components.get(entityId)!.set(component.type, component);
  }

  public getComponent<T extends Component>(entityId: EntityId, type: string): T | undefined {
    return this.components.get(entityId)?.get(type) as T | undefined;
  }

  public hasComponent(entityId: EntityId, type: string): boolean {
    return this.components.get(entityId)?.has(type) ?? false;
  }

  public queryEntitiesWith(...componentTypes: string[]): EntityId[] {
    const results: EntityId[] = [];
    for (const entityId of this.entities) {
      const compMap = this.components.get(entityId);
      if (compMap && componentTypes.every((t) => compMap.has(t))) {
        results.push(entityId);
      }
    }
    return results;
  }

  public getAllEntities(): EntityId[] {
    return Array.from(this.entities);
  }

  public clear(): void {
    this.entities.clear();
    this.components.clear();
    this.nextId = 1;
  }
}
