import { ContentRegistry } from '@neon-ether/game-runtime';
import type { Item } from '@neon-ether/game-schema';
import { EntityNameResolver } from '../apps/game/src/presentation/entity-name-resolver.ts';

const registry = new ContentRegistry();
registry.items.set('item_trauma_patch', {
  id: 'item_trauma_patch',
  name: 'Trauma Patch',
} as Item);

const warnings: string[] = [];
const names = new EntityNameResolver(registry, (message) => warnings.push(message));
const presented = names.item('item_trauma_patch');

if (presented !== 'Trauma Patch' || presented === 'item_trauma_patch') {
  throw new Error(`Expected authored item name, received '${presented}'.`);
}
if (names.item('itm_missing') !== 'Unknown Item' || warnings.length !== 1) {
  throw new Error('Missing item references must use the safe fallback and emit a development warning.');
}

console.log('Entity name presentation regression passed.');
