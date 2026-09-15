import { ContentRegistry, GameSession } from '@neon-ether/game-runtime';
import { GAME_CONTENT_MANIFEST } from '@neon-ether/content';
import type { ChangeStatEffect, Effect } from '@neon-ether/game-schema';

const content = new ContentRegistry();
content.loadManifest(GAME_CONTENT_MANIFEST);
const session = new GameSession(content);
const player = session.getState().player;
const resolvedPlayer = session.getResolvedPlayerCharacter();
const equippedWeapon = player.inventory.items.map((entry) => entry.isEquipped ? content.getItem(entry.itemId) : undefined).find((item) => item?.category === 'weapon');
const playerAverageDamage = equippedWeapon?.damageRange ? (equippedWeapon.damageRange[0] + equippedWeapon.damageRange[1]) / 2 : 0;
const isHpRestoration = (effect: Effect): effect is ChangeStatEffect =>
  effect.type === 'changeStat' && effect.stat.toLowerCase() === 'currenthp' && (effect.delta ?? 0) > 0;
const healing = content.items.getAll().filter((item) => item.usableContexts.includes('Combat') && item.useEffects.some(isHpRestoration));

console.log(`Starting HP: ${resolvedPlayer.vitals.currentHp}/${resolvedPlayer.vitals.maxHp}`);
console.log(`Starting weapon: ${equippedWeapon?.name ?? 'None'} (${equippedWeapon?.damageRange?.join('–') ?? 'no damage'} damage)`);
console.log(`Combat healing authored: ${healing.map((item) => `${item.name} +${item.useEffects.find(isHpRestoration)?.delta ?? 0} HP (starting quantity ${player.inventory.items.find((entry) => entry.itemId === item.id)?.quantity ?? 0})`).join(', ') || 'None'}`);

for (const encounter of content.encounters.findByTag('Prologue')) {
  const enemies = encounter.enemyGroups.flatMap((group) => Array.from({ length: group.count }, () => content.getEnemy(group.enemyId))).filter((enemy) => enemy !== undefined);
  const enemyDamage = enemies.map((enemy) => {
    const weapon = enemy.equippedWeaponId ? content.getItem(enemy.equippedWeaponId) : undefined;
    return `${enemy.name}: ${weapon?.damageRange?.join('–') ?? 'ability-dependent'} raw`;
  });
  const hits = enemies.map((enemy) => Math.ceil(enemy.vitals.currentHp / Math.max(1, playerAverageDamage - enemy.vitals.armorRating)));
  console.log(`\n${encounter.name}`);
  console.log(`  Enemy damage: ${enemyDamage.join('; ')}`);
  console.log(`  Estimated starting-weapon hits required: ${hits.join(', ')} (average ${(hits.reduce((sum, value) => sum + value, 0) / Math.max(1, hits.length)).toFixed(1)})`);
  console.log(`  XP reward: ${encounter.xpReward}`);
}

console.log('\nConcern: no HP-healing consumable is present in the default starting inventory; Prologue healing depends on acquired loot and support abilities. No balance values were changed.');
