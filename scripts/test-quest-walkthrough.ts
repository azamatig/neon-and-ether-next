import { strict as assert } from 'node:assert';
import { GAME_CONTENT_MANIFEST } from '../content/manifest.ts';
import type { GameContent, Quest } from '../packages/game-schema/src/index.ts';
import { QuestWalkthroughController } from '../apps/editor/src/playtest/QuestWalkthroughController.ts';

const itemId = GAME_CONTENT_MANIFEST.items[0].id;
const npcId = GAME_CONTENT_MANIFEST.npcs.find((npc) => !npc.isPlayer)!.id;
const factionId = GAME_CONTENT_MANIFEST.factions[0].id;
const quest: Quest = {
  id: 'quest_walkthrough_regression', name: 'Walkthrough Regression', description: '', tags: [], factionId,
  recommendedLevel: 1, initialStageId: 'stage_one', rewardCredits: 0, rewardXp: 0, rewardItemIds: [], isMainQuest: false, isRepeatable: false,
  stages: {
    stage_one: { id:'stage_one',stageNumber:1,title:'Stage One',journalEntry:'',objectives:[{id:'objective_one',description:'Finish prerequisite',objectiveType:'Custom',requiredCount:1,currentCount:0,isOptional:false,isCompleted:false}],entryConditions:[],completionConditions:[{type:'flag',flag:'stage_one_done',operator:'==',value:true}],actions:[],entryEffects:[],completionEffects:[],branches:[{id:'branch_a',label:'A',conditions:[],effects:[],targetStageId:'stage_two'},{id:'branch_b',label:'B',conditions:[],effects:[],targetStageId:'stage_two'}],nextStageId:'stage_two' },
    stage_two: { id:'stage_two',stageNumber:2,title:'Stage Two',journalEntry:'',objectives:[],entryConditions:[{type:'hasItem',itemId,quantity:1,operator:'>=',requireEquipped:false},{type:'relationship',npcId,operator:'>=',value:25},{type:'factionReputation',factionId,operator:'>=',value:30}],completionConditions:[],actions:[],entryEffects:[],completionEffects:[],branches:[] },
  },
};
const content = structuredClone(GAME_CONTENT_MANIFEST) as GameContent;
content.quests.push(quest);
const controller = new QuestWalkthroughController(content, quest, 44);
const results = controller.jumpToStage('stage_two');
assert.equal(results.every((result) => result.satisfied), true, results.map((result) => result.reason).join('\n'));
const state = controller.getState();
assert.equal(state.quests[quest.id].currentStageId, 'stage_two');
assert.equal(state.quests[quest.id].completedObjectiveIds.includes('objective_one'), true);
assert.equal(state.world.flags.stage_one_done, true);
assert.equal(state.player.inventory.items.some((item) => item.itemId === itemId), true);
assert.ok(state.npcs[npcId].relationship.affinity >= 25);
assert.ok(state.factions[factionId].reputation >= 30);
assert.equal(controller.satisfyConditions([{type:'baseRoomExists',roomId:'missing_room',minLevel:1}])[0].automatic, false);
assert.ok(controller.history.some((entry) => entry.kind === 'stage' && entry.label === 'Stage Two'));
assert.ok(controller.unresolvedPrerequisites.some((warning) => warning.includes('branch-specific')));
console.log('Guided quest walkthrough checkpoint bundle and unresolved prerequisites passed.');
