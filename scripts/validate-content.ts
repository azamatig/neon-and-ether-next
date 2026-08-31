import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameContent } from '../content/manifest.ts';
import { validateGameContent } from '../packages/game-schema/src/validation/index.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetRoots = ['public', 'content/assets'].map((path) => join(root, path)).filter(existsSync);
const walk = (path: string): string[] => readdirSync(path).flatMap((name) => { const target=join(path,name); return statSync(target).isDirectory()?walk(target):[target]; });
const knownAssets = new Set(assetRoots.flatMap(walk).map((path) => relative(root, path).replace(/^public\//, '').replaceAll('\\', '/')));
const report = validateGameContent(gameContent, { knownAssets });
for (const issue of report.issues) console.log(`${issue.severity.toUpperCase()} [${issue.category}] ${issue.targetId}${issue.field ? `:${issue.field}` : ''} — ${issue.message}`);
console.log(`Content validation: ${report.errorsCount} errors, ${report.warningsCount} warnings, ${report.infoCount} info.`);
if (!report.isValid) process.exit(1);
