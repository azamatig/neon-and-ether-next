import type { ContentRegistry } from '@neon-ether/game-runtime';

export type ProductionEntityKind = 'Item' | 'NPC' | 'Ability' | 'Status Effect' | 'Quest' | 'Faction' | 'POI' | 'Encounter';

type NamedDefinition = { id: string; name?: string; title?: string };
type NamedCollection = { get(id: string): NamedDefinition | undefined };

/** Resolves runtime IDs through authored content without exposing IDs as display labels. */
export class EntityNameResolver {
  public constructor(
    private readonly content: ContentRegistry,
    private readonly warn: (message: string) => void = import.meta.env.DEV ? console.warn : () => {},
  ) {}

  public item = (id: string): string => this.resolve('Item', this.content.items, id);
  public npc = (id: string): string => this.resolve('NPC', this.content.npcs, id);
  public ability = (id: string): string => this.resolve('Ability', this.content.abilities, id);
  public statusEffect = (id: string): string => this.resolve('Status Effect', this.content.statusEffects, id);
  public quest = (id: string): string => this.resolve('Quest', this.content.quests, id);
  public faction = (id: string): string => this.resolve('Faction', this.content.factions, id);
  public poi = (id: string): string => this.resolve('POI', this.content.pois, id);
  public encounter = (id: string): string => this.resolve('Encounter', this.content.encounters, id);

  private resolve(kind: ProductionEntityKind, collection: NamedCollection, id: string): string {
    const definition = collection.get(id);
    const displayName = definition?.name || definition?.title;
    if (displayName) return displayName;
    this.warn(`[EntityNameResolver] ${kind} definition '${id}' is missing or has no authored display name.`);
    return `Unknown ${kind}`;
  }
}
