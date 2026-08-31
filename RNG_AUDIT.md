# Deterministic RNG audit

## Pre-change classification

The runtime contained six direct `Math.random()` call sites:

- **Gameplay:** combat loot drop chance, loot quantity, and credits variance in `CombatEncounterEngine`; the fallback path in `randomChance` conditions.
- **Non-gameplay metadata:** generated save IDs and journal entry IDs. These values do not affect gameplay decisions, but their random calls were removed as well so a runtime-wide search is unambiguous.
- **Presentation:** no direct `Math.random()` calls were found in React or shared UI. CSS particle placement is deterministic and does not mutate gameplay state.

The weather resolver also contained its own deterministic hash selection. Although it did not call `Math.random()`, it represented a separate randomness implementation and was replaced with the shared injected source.

## Result

`DiceRoller` now implements the single `RandomSource` contract. GameSession injects the same instance into checks, POI actions, events, quests, combat, loot, weather, crafting, economy, base conditions, and generic actions. Every draw updates `GameState.rng`; save/load restores it before any subsequent gameplay command.

Save and journal identifiers use non-random metadata sequences and never consume gameplay RNG. Editor playtest exposes seed, internal state, draw count, and reset/replay controls.
