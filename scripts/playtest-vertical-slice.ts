import { GAME_CONTENT_MANIFEST } from '../content/manifest.ts';
import { ContentRegistry, GameSession } from '../packages/game-runtime/src/index.ts';

const expect=(condition:unknown,message:string):void=>{if(!condition)throw new Error(`Vertical slice: ${message}`);};
const registry=new ContentRegistry();registry.loadContent(GAME_CONTENT_MANIFEST,{strict:true});
let session=new GameSession(registry,1337);
const action=(poiId:string,actionId:string)=>expect(session.executePoiAction(poiId,actionId).success,`action ${actionId} failed`);

expect(session.getPoisForCurrentMap().length===3,'start should expose exactly safehouse, market, and clinic');
action('poi_glassline_safehouse','act_safehouse_search');
action('poi_glassline_safehouse','act_glassline_briefing');
expect(session.chooseEventOption('accept'),'briefing choice failed');
expect(session.getState().quests.qst_glassline_signal?.currentStageId==='stage_intel','main quest did not start');
action('poi_glassline_clinic','act_clinic_intel');
expect(session.chooseEventOption('help_clinic'),'clinic choice failed');
expect(session.advanceEventStep(),'clinic reveal failed');
expect(session.getState().world.flags.transit_discovered===true,'transit was not discovered');

// Mid-slice save/load audit across location, quests, flags, inventory, NPC, faction, base, and time state.
const before=session.getState();const save=session.serializeSave(false);session=new GameSession(registry,1337);expect(session.loadSave(save).success,'save could not be loaded');
const loaded=session.getState();expect(loaded.quests.qst_glassline_signal.currentStageId===before.quests.qst_glassline_signal.currentStageId,'quest stage was not preserved');
expect(loaded.world.flags.transit_discovered===true&&loaded.player.inventory.items.length===before.player.inventory.items.length,'flags or inventory were not preserved');
expect(JSON.stringify(loaded.factions)===JSON.stringify(before.factions)&&JSON.stringify(loaded.base)===JSON.stringify(before.base),'faction or base state was not preserved');
expect(JSON.stringify(loaded.time)===JSON.stringify(before.time)&&JSON.stringify(loaded.npcs)===JSON.stringify(before.npcs),'time or NPC state was not preserved');

action('poi_glassline_transit','act_transit_search');
action('poi_glassline_transit','act_transit_investigate');
expect(session.chooseEventOption('fight'),'transit combat choice failed');
expect(session.getCombatPreview()?.escape.allowed===true,'avoidable encounter must allow escape');
session.resolveCombatVictory('enc_glassline_transit_standoff',2);session.dismissCombatResult();
expect(session.craftRecipe('rec_bypass_spike',{location:'base'}).success,'base workshop recipe failed');
action('poi_glassline_transit','act_transit_annex');
expect(session.chooseEventOption('use_spike'),'crafted bypass route failed');
action('poi_glassline_facility','act_facility_core');
expect(session.chooseEventOption('engage'),'annex lockdown choice failed');
expect(session.getCombatPreview()?.escape.allowed===false,'mandatory encounter unexpectedly allows escape');
session.resolveCombatVictory('enc_glassline_annex_core',4);session.dismissCombatResult();
expect(session.chooseEventOption('release'),'final faction choice failed');
expect(session.advanceEventStep(),'final return transition failed');
action('poi_glassline_safehouse','act_safehouse_epilogue');
expect(session.chooseEventOption('recruit_sable'),'resident recruitment failed');
expect(session.getState().world.activeScreen==='Base','epilogue did not open the shared Base screen');
expect(session.executeBaseManagementCommand({type:'BuildRoom',slotId:'base_slot_support',roomDefinitionId:'room_safehouse_medbay'}).success,'medbay construction failed');
const medbay=Object.values(session.getState().base.rooms).find(room=>room.definitionId==='room_safehouse_medbay');expect(medbay,'medbay runtime room missing');
expect(session.executeBaseManagementCommand({type:'InstallUpgrade',roomInstanceId:medbay!.roomId,upgradeId:'upgrade_room_capacity'}).success,'room upgrade failed');
expect(session.executeCharacterManagementCommand({type:'AssignJob',npcId:'npc_doctor_sable',jobId:'base_job_medic'}).success,'medic job assignment failed');
expect(session.executeCharacterManagementCommand({type:'AssignRoom',npcId:'npc_doctor_sable',roomId:medbay!.roomId}).success,'resident room assignment failed');
expect(session.getState().quests.qst_glassline_signal.status==='Completed','main quest was not completed');
console.log('Vertical slice playthrough passed: start → investigation → save/load → optional combat/crafting → mandatory combat → consequence → base.');
