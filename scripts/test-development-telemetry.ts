import { strict as assert } from 'node:assert';
import { GAME_CONTENT_MANIFEST } from '../content/manifest.ts';
import { ContentRegistry, GameSession } from '../packages/game-runtime/src/index.ts';
import { DevelopmentTelemetrySession } from '../apps/editor/src/telemetry/DevelopmentTelemetry.ts';

const registry=new ContentRegistry();registry.loadManifest(GAME_CONTENT_MANIFEST);
const session=new GameSession(registry,4242);
const before=JSON.stringify(session.getState());
const telemetry=new DevelopmentTelemetrySession(GAME_CONTENT_MANIFEST);telemetry.attach(session);
assert.equal(JSON.stringify(session.getState()),before,'Attaching telemetry changed gameplay state');

session.executeEffect({type:'changeMoney',amount:75,mode:'add'});
const factionId=GAME_CONTENT_MANIFEST.factions[0].id;session.executeEffect({type:'changeFactionReputation',factionId,delta:10});
const questId=GAME_CONTENT_MANIFEST.quests[0].id;session.startQuest(questId);

const checkedEvent=GAME_CONTENT_MANIFEST.events.find((event)=>event.steps.some((step)=>step.choices.some((choice)=>choice.check)))!;
session.startEvent(checkedEvent.id);
const checkedStep=checkedEvent.steps.find((step)=>step.choices.some((choice)=>choice.check))!;
if(session.getState().world.activeEventStepId!==checkedStep.id) session.resolveOutcome({type:'event',eventId:checkedEvent.id,stepId:checkedStep.id});
session.chooseEventOption(checkedStep.choices.find((choice)=>choice.check)!.id);

const encounterId=GAME_CONTENT_MANIFEST.encounters[0].id;
session.startCombatEncounter(encounterId,true);session.startTacticalCombat(encounterId);session.resolveCombatVictory(encounterId,3);

const summary=telemetry.getSummary();
assert.ok(summary.eventCount>0);assert.equal(summary.combats,1);assert.ok(summary.moneyGained>=75);assert.ok(summary.skillChecks>=1);
assert.ok(telemetry.events.some((event)=>event.type==='combatStarted'&&event.data.seed===4242));
assert.ok(telemetry.events.some((event)=>event.type==='combatCompleted'&&event.data.lootValue!==undefined));
assert.ok(telemetry.events.some((event)=>event.type==='reputationChanged'&&event.entityId===factionId));
assert.ok(telemetry.events.some((event)=>event.type==='choiceSelected'));
assert.ok(telemetry.events.some((event)=>event.type==='xpChanged'&&event.source?.includes('Effect started')));
assert.ok(telemetry.exportJson().includes(telemetry.sessionId));assert.ok(telemetry.exportCsv().startsWith('id,at,system'));
assert.equal(JSON.stringify(session.getState()).includes(telemetry.sessionId),false,'Telemetry leaked into SaveGame state');
console.log('Development telemetry captured structured balance data without changing GameState.');
