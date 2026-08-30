import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = ['packages/game-schema/src', 'packages/game-runtime/src', 'packages/engine/src'];
const walk = (path: string): string[] => readdirSync(path).flatMap((name) => { const target=join(path,name); return statSync(target).isDirectory()?walk(target):/\.(ts|tsx)$/.test(name)?[target]:[]; });
const coreFiles = sourceRoots.flatMap((path) => walk(join(root, path)));
const errors: string[] = [];

for (const file of coreFiles) {
  const source = readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  if (imports.some((specifier) => {
    if (specifier === '@neon-ether/content' || specifier.startsWith('@neon-ether/content/')) return true;
    if (!specifier.startsWith('.')) return false;
    return relative(root, resolve(dirname(file), specifier)).startsWith(`content/`);
  })) errors.push(`${relative(root,file)} imports concrete content`);
  if (/['"](?:npc|qst|item|poi|enc|map|wpn|fac)_[a-zA-Z0-9_-]+['"]/.test(source)) errors.push(`${relative(root,file)} hardcodes a content entity ID`);
}
for (const file of walk(join(root, 'apps/game/src'))) {
  const source = readFileSync(file, 'utf8');
  if (/from\s+['"].*(?:apps\/editor|@apps\/editor)/.test(source) || source.includes('/__editor/')) errors.push(`${relative(root,file)} depends on Editor code`);
  if (/gameState\.[\w.\[\]]+\s*=(?!=)/.test(source)) errors.push(`${relative(root,file)} mutates a runtime snapshot`);
}

const graph = new Map(coreFiles.map((file) => [normalize(file), [] as string[]]));
for (const file of coreFiles) {
  const imports = [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  for (const specifier of imports.filter((value) => value.startsWith('.'))) {
    const target = normalize(resolve(dirname(file), specifier).replace(/\.js$/, '.ts'));
    if (graph.has(target)) graph.get(normalize(file))!.push(target);
  }
}
const visited = new Set<string>(); const active = new Set<string>(); const stack: string[] = [];
const visit = (file: string) => { visited.add(file); active.add(file); stack.push(file); for (const dependency of graph.get(file) ?? []) { if (!visited.has(dependency)) visit(dependency); else if (active.has(dependency)) errors.push(`circular dependency: ${stack.slice(stack.indexOf(dependency)).concat(dependency).map((item)=>relative(root,item)).join(' -> ')}`); } stack.pop(); active.delete(file); };
for (const file of graph.keys()) if (!visited.has(file)) visit(file);

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Architecture checks passed (${coreFiles.length} core modules, 0 dependency cycles).`);
