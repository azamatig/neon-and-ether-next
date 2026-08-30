# Glassline Ward vertical-slice audit

## Worked well

- The complete route is authored through existing maps, POIs, conditions, effects, outcomes, events, quests, encounters, shops, recipes, factions, rooms, upgrades, jobs, and NPC definitions.
- POI visibility conditions reveal the transit station and annex without presentation-specific state.
- Event choices drive branching, skill checks, faction reputation, inventory gates, combat transitions, and the final observable market consequence.
- Both encounters use the shared preview, tactical combat, resolution, loot, and post-combat pipeline. The avoidable encounter permits escape; the annex encounter disables it in content.
- The existing save envelope preserves the mid-slice location, quest stage, flags, inventory, NPC and faction state, base state, and world time.
- The shared Base runtime already supported construction, upgrades, resource costs, jobs, and room assignment once production presentation exposed its typed commands.

## Architecture gaps

- `BuildRoom` previously required presentation to invent a runtime room-instance ID. The command now accepts an optional ID and the Base runtime generates a deterministic generic ID when omitted.
- Authored status-effect definitions could be indexed and used in tactical state, but the common Effect pipeline could not apply a persistent player status from an encounter modifier. A single generic `applyStatusEffect` effect was added; it is usable by any combat, item, event, POI, or environmental content.
- No new quest, dialogue, combat, shop, crafting, faction, or navigation system was introduced for Glassline.

## Editor gaps

- The Editor can create and validate every entity type used by the slice, but large nested POI action and event-choice arrays are still slower to author than a dedicated reusable condition/effect preset workflow.
- Combat balancing lacks a multi-run simulator; quick encounter playtest remains manual.
- Development checkpoints are discovered generically from `Checkpoint:*` entity tags. They prepare the selected context but do not yet compose a complete prerequisite state bundle for every late-game checkpoint.
- The Editor has no guided end-to-end quest walkthrough view; the automated slice script currently provides regression coverage instead.

## Hardcoding found

- No Glassline quest, NPC, POI, faction, item, or encounter ID exists in engine/runtime mechanics or production React routing.
- Slice IDs appear only in authored content and the dedicated content regression script.
- Existing combat resolution still emits generic hardcoded journal phrases and resource labels; these are not Glassline-specific but should eventually become presentation/content templates.

## Technical debt

- Combat loot, credits, survivor generation, and random-chance conditions still use `Math.random()` in parts of the pre-existing runtime, so full combat resolution is not completely seed-deterministic.
- Active action/combat-resolution presentation objects live in the outcome engine and are not part of the save envelope. Saving during a tactical combat preserves combat state, but saving on the post-combat loot/result screen cannot resume that exact presentation phase.
- Persistent status application currently targets the player state; a future generic character-status store is needed before persistent NPC injuries can be represented outside tactical combat.
- Base job resource production is defined but has no scheduled production tick in this slice.

## Next recommended steps

1. Replace remaining `Math.random()` calls with the injected deterministic roller.
2. Decide whether post-combat/result presentation should be resumable and, if so, serialize a minimal pending outcome descriptor.
3. Add reusable Editor presets for common condition/effect/outcome bundles.
4. Add an Editor quest walkthrough that evaluates visibility and choices against a selected checkpoint state.
5. Add balancing telemetry for encounter duration, resource spend, and alternate-route completion rates before authoring a larger chapter.
