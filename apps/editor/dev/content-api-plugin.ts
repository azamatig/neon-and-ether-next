import type { IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const PRESETS_FILE = 'editor-presets/presets.json';

const EDITABLE_FILES = {
  items: 'content/items/items.json',
  npcs: 'content/characters/characters.json',
  enemies: 'content/enemies/enemies.json',
  pois: 'content/pois/pois.json',
  events: 'content/events/events.json',
  quests: 'content/quests/quests.json',
  maps: 'content/maps/maps.json',
  encounters: 'content/encounters/encounters.json',
  rooms: 'content/rooms/rooms.json',
  bases: 'content/bases/bases.json',
  baseUpgrades: 'content/bases/upgrades.json',
  baseJobs: 'content/character-management/jobs.json',
  recipes: 'content/recipes/recipes.json',
  shops: 'content/shops/shops.json',
  factions: 'content/factions/factions.json',
  weatherDefinitions: 'content/weather/weather.json',
  weatherProfiles: 'content/weather/profiles.json',
  backgrounds: 'content/character-creation/backgrounds.json',
  minigames:'content/minigames/minigames.json',
} as const;

type EditableCategory = keyof typeof EDITABLE_FILES;

type JsonPath = (string | number)[];
type SourceSpan = { start: number; end: number };

function pathKey(path: JsonPath): string {
  return JSON.stringify(path);
}

function escapeCanonicalUnicode(value: string): string {
  return value.replace(/[\u2018\u2019\u201c\u201d\u2013\u2014]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => jsonValuesEqual(value, right[index]));
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key) => Object.hasOwn(rightRecord, key) && jsonValuesEqual(leftRecord[key], rightRecord[key]));
  }
  return false;
}

function indexPrimitiveSpans(source: string): Map<string, SourceSpan> {
  const spans = new Map<string, SourceSpan>();
  let cursor = 0;
  const skipWhitespace = () => { while (/\s/.test(source[cursor] ?? '')) cursor += 1; };
  const readString = (): string => {
    const start = cursor++;
    while (cursor < source.length) {
      if (source[cursor] === '\\') cursor += 2;
      else if (source[cursor++] === '"') break;
    }
    return JSON.parse(source.slice(start, cursor)) as string;
  };
  const readValue = (path: JsonPath): void => {
    skipWhitespace();
    const start = cursor;
    if (source[cursor] === '{') {
      cursor += 1;
      skipWhitespace();
      while (source[cursor] !== '}') {
        const key = readString();
        skipWhitespace();
        if (source[cursor++] !== ':') throw new Error('Invalid JSON object.');
        readValue([...path, key]);
        skipWhitespace();
        if (source[cursor] === ',') { cursor += 1; skipWhitespace(); }
        else break;
      }
      if (source[cursor++] !== '}') throw new Error('Invalid JSON object.');
      return;
    }
    if (source[cursor] === '[') {
      cursor += 1;
      skipWhitespace();
      let index = 0;
      while (source[cursor] !== ']') {
        readValue([...path, index++]);
        skipWhitespace();
        if (source[cursor] === ',') { cursor += 1; skipWhitespace(); }
        else break;
      }
      if (source[cursor++] !== ']') throw new Error('Invalid JSON array.');
      return;
    }
    if (source[cursor] === '"') readString();
    else while (cursor < source.length && !/[\s,\]}]/.test(source[cursor])) cursor += 1;
    spans.set(pathKey(path), { start, end: cursor });
  };
  readValue([]);
  return spans;
}

function collectPrimitiveChanges(before: unknown, after: unknown, path: JsonPath, changes: JsonPath[]): boolean {
  if (jsonValuesEqual(before, after)) return true;
  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false;
    return before.every((value, index) => collectPrimitiveChanges(value, after[index], [...path, index], changes));
  }
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    const beforeRecord = before as Record<string, unknown>;
    const afterRecord = after as Record<string, unknown>;
    const beforeKeys = Object.keys(beforeRecord);
    if (beforeKeys.length !== Object.keys(afterRecord).length || beforeKeys.some((key) => !Object.hasOwn(afterRecord, key))) return false;
    return beforeKeys.every((key) => collectPrimitiveChanges(beforeRecord[key], afterRecord[key], [...path, key], changes));
  }
  changes.push(path);
  return true;
}

/** Preserves untouched source bytes and the repository's escaped typographic punctuation. */
export function serializeEditableCollection(previousSource: string, nextValue: unknown[]): string {
  const previousValue = JSON.parse(previousSource) as unknown[];
  if (jsonValuesEqual(previousValue, nextValue)) return previousSource;

  const changes: JsonPath[] = [];
  if (collectPrimitiveChanges(previousValue, nextValue, [], changes)) {
    const spans = indexPrimitiveSpans(previousSource);
    const replacements = changes.map((path) => {
      const span = spans.get(pathKey(path));
      if (!span) throw new Error(`Unable to locate changed JSON value at ${pathKey(path)}.`);
      let value: unknown = nextValue;
      for (const segment of path) value = (value as Record<string | number, unknown>)[segment];
      return { ...span, value: escapeCanonicalUnicode(JSON.stringify(value)) };
    }).sort((left, right) => right.start - left.start);
    return replacements.reduce(
      (result, replacement) => `${result.slice(0, replacement.start)}${replacement.value}${result.slice(replacement.end)}`,
      previousSource,
    );
  }

  return `${escapeCanonicalUnicode(JSON.stringify(nextValue, null, 2))}\n`;
}

async function readJson(root: string, category: EditableCategory): Promise<unknown[]> {
  return JSON.parse(await fs.readFile(path.join(root, EDITABLE_FILES[category]), 'utf8'));
}

async function readEditableContent(root: string, gameContent: Record<string, unknown>) {
  const [items, npcs, enemies, pois, events, quests, maps, encounters, rooms, bases, baseUpgrades, baseJobs, recipes, shops, factions, weatherDefinitions, weatherProfiles, backgrounds,minigames] = await Promise.all([
    readJson(root, 'items'), readJson(root, 'npcs'), readJson(root, 'enemies'), readJson(root, 'pois'), readJson(root, 'events'), readJson(root, 'quests'), readJson(root, 'maps'),
    readJson(root, 'encounters'), readJson(root, 'rooms'), readJson(root, 'bases'), readJson(root, 'baseUpgrades'), readJson(root, 'baseJobs'), readJson(root, 'recipes'), readJson(root, 'shops'), readJson(root, 'factions'), readJson(root, 'weatherDefinitions'), readJson(root, 'weatherProfiles'), readJson(root, 'backgrounds'),readJson(root,'minigames'),
  ]);
  return { ...gameContent, items, npcs, characters: npcs, enemies, pois, events, quests, maps, encounters, rooms, bases, baseUpgrades, baseJobs, recipes, shops, factions, weatherDefinitions, weatherProfiles, backgrounds,minigames };
}

async function readKnownAssets(root: string): Promise<string[]> {
  const assetRoots = ['public', 'content/assets'];
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    try { for (const entry of await fs.readdir(directory, { withFileTypes: true })) { const target=path.join(directory,entry.name); if(entry.isDirectory()) await visit(target); else files.push(path.relative(root,target).replace(/^public\//,'').replaceAll('\\','/')); } } catch { /* Optional asset root. */ }
  };
  for (const directory of assetRoots) await visit(path.join(root,directory));
  return files;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

/** Development-server-only filesystem bridge. Never participates in browser bundles. */
export function editorContentApiPlugin(root: string): Plugin {
  return {
    name: 'neon-ether-editor-content-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor/presets', async (request, response) => {
        try {
          const filePath = path.join(root, PRESETS_FILE);
          if (request.method === 'GET') {
            try { send(response, 200, { presets: JSON.parse(await fs.readFile(filePath, 'utf8')) }); }
            catch { send(response, 200, { presets: null }); }
            return;
          }
          if (request.method === 'PUT') {
            const body = await readBody(request) as { presets?: unknown[] };
            if (!Array.isArray(body.presets)) { send(response, 400, { error: 'Expected presets array.' }); return; }
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(body.presets, null, 2)}\n`, 'utf8');
            await fs.rename(`${filePath}.tmp`, filePath);
            send(response, 200, { saved: body.presets.length });
            return;
          }
          send(response, 405, { error: 'Method not allowed.' });
        } catch (error) { send(response, 500, { error: error instanceof Error ? error.message : String(error) }); }
      });
      server.middlewares.use('/__editor/content', async (request, response) => {
        try {
          const [{ gameContent }, { ContentRegistry }] = await Promise.all([
            server.ssrLoadModule('/content/manifest.ts'),
            server.ssrLoadModule('/packages/game-runtime/src/content/content-registry.ts'),
          ]);
          if (request.method === 'GET') {
            const content = await readEditableContent(root, gameContent);
            const knownAssets = await readKnownAssets(root);
            const registry = new ContentRegistry();
            const report = registry.loadContent(content, { validation: { knownAssets: new Set(knownAssets) } });
            send(response, 200, { content, report, knownAssets });
            return;
          }
          if (request.method === 'PUT') {
            const body = await readBody(request) as { categories?: EditableCategory[]; collections?: Partial<Record<EditableCategory, unknown[]>> };
            const categories = body.categories?.filter((category) => category in EDITABLE_FILES) ?? [];
            if (!categories.length || !body.collections || categories.some((category) => !Array.isArray(body.collections?.[category]))) {
              send(response, 400, { error: 'Expected categories and matching entity collections.' });
              return;
            }
            const content = await readEditableContent(root, gameContent);
            const knownAssets = await readKnownAssets(root);
            for (const category of categories) content[category] = body.collections[category] as never;
            if (body.collections.npcs) content.characters = body.collections.npcs as never;
            const registry = new ContentRegistry();
            const report = registry.loadContent(content, { validation: { knownAssets: new Set(knownAssets) } });
            if (!report.isValid) {
              send(response, 422, { error: 'Content validation failed.', report });
              return;
            }
            const changedCategories = await Promise.all(categories.map(async (category) => {
              const filePath = path.join(root, EDITABLE_FILES[category]);
              const previousSource = await fs.readFile(filePath, 'utf8');
              const serialized = serializeEditableCollection(previousSource, body.collections?.[category] as unknown[]);
              if (serialized === previousSource) return null;
              await fs.writeFile(`${filePath}.tmp`, serialized, 'utf8');
              return category;
            }));
            for (const category of changedCategories) {
              if (!category) continue;
              const filePath = path.join(root, EDITABLE_FILES[category]);
              await fs.rename(`${filePath}.tmp`, filePath);
            }
            send(response, 200, { saved: categories, report });
            return;
          }
          send(response, 405, { error: 'Method not allowed.' });
        } catch (error) {
          send(response, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}
