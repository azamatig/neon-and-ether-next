import type { IncomingMessage, ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

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
} as const;

type EditableCategory = keyof typeof EDITABLE_FILES;

async function readJson(root: string, category: EditableCategory): Promise<unknown[]> {
  return JSON.parse(await fs.readFile(path.join(root, EDITABLE_FILES[category]), 'utf8'));
}

async function readEditableContent(root: string, gameContent: Record<string, unknown>) {
  const [items, npcs, enemies, pois, events, quests, maps, encounters, rooms, bases, baseUpgrades, baseJobs, recipes, shops, factions] = await Promise.all([
    readJson(root, 'items'), readJson(root, 'npcs'), readJson(root, 'enemies'), readJson(root, 'pois'), readJson(root, 'events'), readJson(root, 'quests'), readJson(root, 'maps'),
    readJson(root, 'encounters'), readJson(root, 'rooms'), readJson(root, 'bases'), readJson(root, 'baseUpgrades'), readJson(root, 'baseJobs'), readJson(root, 'recipes'), readJson(root, 'shops'), readJson(root, 'factions'),
  ]);
  return { ...gameContent, items, npcs, characters: npcs, enemies, pois, events, quests, maps, encounters, rooms, bases, baseUpgrades, baseJobs, recipes, shops, factions };
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
            await Promise.all(categories.map(async (category) => {
              const filePath = path.join(root, EDITABLE_FILES[category]);
              await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(body.collections?.[category], null, 2)}\n`, 'utf8');
            }));
            for (const category of categories) {
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
