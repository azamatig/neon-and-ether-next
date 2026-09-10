import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { serializeEditableCollection } from '../apps/editor/dev/content-api-plugin';

const source = await readFile(new URL('../content/pois/pois.json', import.meta.url), 'utf8');
const collection = JSON.parse(source) as Record<string, unknown>[];

assert.equal(
  serializeEditableCollection(source, structuredClone(collection)),
  source,
  'A no-op save must preserve the file byte-for-byte.',
);

const edited = structuredClone(collection);
const entity = edited.find((candidate) => JSON.stringify(candidate).includes('actions'));
assert(entity, 'Expected a POI with an action label fixture.');

const findLabelOwner = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.label === 'string') return record;
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const entry of child) {
        const found = findLabelOwner(entry);
        if (found) return found;
      }
    } else {
      const found = findLabelOwner(child);
      if (found) return found;
    }
  }
  return undefined;
};

const labelOwner = findLabelOwner(entity);
assert(labelOwner && typeof labelOwner.label === 'string', 'Expected an authored action label.');
const originalLabel = labelOwner.label;
labelOwner.label = `${originalLabel} (serialization regression)`;

const serialized = serializeEditableCollection(source, edited);
const beforeLines = source.split('\n');
const afterLines = serialized.split('\n');
const changedLines = beforeLines.flatMap((line, index) => line === afterLines[index] ? [] : [index]);

assert.deepEqual(changedLines.length, 1, 'A single label edit must change exactly one source line.');
assert.equal((JSON.parse(serialized) as Record<string, unknown>[]).length, collection.length);
assert(!serialized.includes('“') && !serialized.includes('”') && !serialized.includes('’') && !serialized.includes('—'));

console.log('Editor content serialization regression passed.');
