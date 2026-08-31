import { strict as assert } from 'node:assert';
import { DEFAULT_AUTHORING_PRESETS, applyPresetAsCopy, type AuthoringPresetKind } from '../apps/editor/src/presets/authoring-presets.tsx';

const requiredKinds: AuthoringPresetKind[] = ['conditions', 'effects', 'outcome', 'poiAction', 'eventChoice', 'rewards', 'skillCheck'];
for (const kind of requiredKinds) assert.ok(DEFAULT_AUTHORING_PRESETS.some((preset) => preset.kind === kind), `Missing ${kind} preset support`);

for (const preset of DEFAULT_AUTHORING_PRESETS) {
  const serialized = JSON.stringify(preset.payload);
  assert.equal(serialized.includes('presetId'), false, `${preset.name} leaked preset metadata into canonical payload`);
  const applied: any = applyPresetAsCopy<any>(preset.payload);
  assert.deepEqual(applied, preset.payload);
  if (Array.isArray(applied)) (applied[0] as Record<string, unknown>).__testMutation = true;
  else (applied as Record<string, unknown>).__testMutation = true;
  assert.notEqual(JSON.stringify(applied), JSON.stringify(preset.payload), `${preset.name} was not copied independently`);
}

console.log('Editor presets are complete, metadata-free canonical copies.');
