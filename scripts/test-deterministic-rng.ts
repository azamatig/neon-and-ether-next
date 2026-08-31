import { GAME_CONTENT_MANIFEST } from '../content/manifest.ts';
import { ContentRegistry, GameSession } from '../packages/game-runtime/src/index.ts';
import type { CombatResolution } from '../packages/game-schema/src/index.ts';

const registry=new ContentRegistry();registry.loadContent(GAME_CONTENT_MANIFEST,{strict:true});
const expect=(condition:unknown,message:string)=>{if(!condition)throw new Error(`RNG regression: ${message}`);};
const projection=(resolution:CombatResolution|undefined)=>resolution&&({loot:resolution.availableLoot,credits:resolution.creditsFound,incapacitated:resolution.incapacitatedEnemies,xp:resolution.xpGained});
const run=(seed:number)=>{const session=new GameSession(registry,seed);const conditions=Array.from({length:8},()=>session.evaluateCondition({type:'randomChance',probability:.5}).isMet);expect(session.startCombatEncounter('enc_glassline_transit_standoff',false)&&session.startTacticalCombat(),'seeded tactical combat did not start');const combatBefore=session.getState().combat;const actorId=combatBefore.turnOrder[combatBefore.activeTurnIndex];const targetId=Object.values(combatBefore.combatants).find(unit=>unit.team==='Enemy')!.id;const command=session.executeCombatAction({type:'Attack',actorId,targetId});expect(command.success,'seeded attack failed');const damage={targetHp:command.state.combatants[targetId].currentHp,log:command.state.log.map(entry=>entry.message)};const combat=projection(session.resolveCombatVictory('enc_glassline_annex_core',3));return{conditions,damage,combat,rng:session.getRandomState()};};

const first=run(8675309);const replay=run(8675309);
expect(JSON.stringify(first)===JSON.stringify(replay),'same seed and actions produced different results');

const uninterrupted=new GameSession(registry,424242);
for(let index=0;index<5;index++)uninterrupted.evaluateCondition({type:'randomChance',probability:.35});
const saved=uninterrupted.serializeSave(false);
const resumed=new GameSession(registry,1);expect(resumed.loadSave(saved).success,'saved RNG state could not be loaded');
expect(JSON.stringify(uninterrupted.getRandomState())===JSON.stringify(resumed.getRandomState()),'load did not restore RNG state');
const nextA=projection(uninterrupted.resolveCombatVictory('enc_glassline_transit_standoff',2));
const nextB=projection(resumed.resolveCombatVictory('enc_glassline_transit_standoff',2));
expect(JSON.stringify(nextA)===JSON.stringify(nextB),'save/load changed the subsequent random sequence');
expect(JSON.stringify(uninterrupted.getRandomState())===JSON.stringify(resumed.getRandomState()),'RNG state diverged after continuation');

console.log('Deterministic RNG regression passed: replay and save/load continuation are identical.');
