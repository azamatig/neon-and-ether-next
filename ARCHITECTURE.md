# Neon & Ether // Architecture & System Contracts

This document establishes the mandatory architectural rules and constraints for the **Neon & Ether** codebase. Every developer, system designer, and AI agent must adhere strictly to these principles across all packages and applications.

---

## 1. No Gameplay Logic in React Components
- React components (`apps/game/src/components/*`, `apps/editor/src/components/*`, `packages/shared-ui/*`) must contain **zero** gameplay calculation logic (e.g., dice rolls, AP resolution, combat damage algorithms, stat modifiers, line-of-sight raycasting).
- All mechanics, checks, turn resolutions, and state transitions reside inside deterministic engine and runtime layers (`@neon-ether/engine`, `@neon-ether/game-runtime`).

## 2. No Hardcoded Entity IDs in Gameplay Systems
- Systems, action handlers, and math formulas must **never** hardcode specific NPC, Quest, Item, or POI identifiers (e.g., `if (npcId === 'npc_dr_arundhati')`).
- Systems operate strictly on abstract interfaces, tags, status effects, and parameters provided in data schemas.

## 3. React Operates Strictly as a Presentation Layer
- React renders the immutable snapshot of the game state provided by `@neon-ether/game-runtime`.
- UI interactions emit typed actions/commands to the `GameSession` or event bus; they do not mutate state directly.

## 4. Separation of Static Content from Runtime State
- Static manifests (blueprints, items, quest definitions, dialogue trees) are immutable definitions located in `content/`.
- Runtime state (current player health, active inventory instance, resolved dialogue node, quest step status) is managed separately by `packages/game-runtime/src/state/*` and validated by `packages/game-schema/src/types/runtime-state.ts`.

## 5. Stable String IDs for All Game Entities
- Every entity (Item, Character, Quest, QuestStage, DialogueNode, SectorMap, Skill, POI) must have a deterministic, stable string identifier (e.g., `item_monoblade_proto_01`, `dlg_arundhati_root`).
- String IDs are permanent keys for persistence, savefiles, editor serialization, and telemetry.

## 6. Content Relations Referenced Exclusively via IDs
- Static definitions and runtime references link to related entities exclusively through string IDs (e.g., `dialogueTreeId: "dlg_intro_arundhati"`, `requiredItemId: "item_cyberdeck_mk1"`), never direct object pointers or memory instances.

## 7. Game Systems Do Not Import Specific Content
- Core packages (`@neon-ether/engine`, `@neon-ether/game-schema`, `@neon-ether/game-runtime`) must **never** import concrete content files from `content/` or `@neon-ether/content`.
- Content is loaded dynamically at boot time into the `ContentRegistry` / `GameSession`.

## 8. Single Source of Truth for Schemas (Game & Editor)
- Both the Game Client (`apps/game`) and Content Editor (`apps/editor`) import and operate on the exact same schemas defined in `@neon-ether/game-schema`.
- An item or dialogue node edited in the Editor is directly valid and executable by the Game runtime without translation layers.

## 9. Content Scalability Without UI Modifications
- Adding a new weapon, cyberware implant, NPC, dialogue branch, quest stage, or tile type must not require changing existing UI components or layout code.
- The UI dynamically reads category definitions, modifier arrays, and choice conditions from the schemas.

## 10. Modular Architecture Over Monolithic / God Objects
- Avoid creating giant monolithic "Managers" or "Services" that handle everything.
- Break systems into focused, single-responsibility units (for example `DiceRoller`, condition/effect registries, `TurnBasedCombatEngine`, `QuestRuntime`, `EventRuntime`, and `ContentRegistry`). `GameSession` is the application facade and delegates mechanics to these focused modules.

---

## Current package boundaries

### `@neon-ether/game-schema`
- Owns serializable content and runtime-state schemas only.
- Low-level shared enums that are referenced by both authored effects and runtime state live in dependency-neutral schema modules such as `types/world.ts`; authored schemas must not import aggregate runtime-state schemas.
- Contains no React, filesystem, concrete content, or state transition code.

### `@neon-ether/game-runtime`
- Receives content through `ContentRegistry`; it never imports `content/`.
- Owns all gameplay mutations, including player resource commands, navigation, dialogue, quests, events, combat, character management, and base management.
- `GameSession` exposes snapshots and typed commands. Public snapshot accessors return copies so presentation code cannot mutate live session state.
- Conditions, effects, and outcomes use the shared registries/executors rather than feature-local evaluators.

### `apps/game`
- `useGameRuntime` is the composition root: it injects the content manifest into `ContentRegistry`, owns one `GameSession`, clones emitted state snapshots, and exposes typed command callbacks.
- React components render snapshots and dispatch commands. They must not directly modify `GameState`.
- Browser persistence and file download controls are presentation/application concerns; save serialization and migration remain in runtime.

### `apps/editor`
- Is a separate development application built from `editor.html`.
- Inspector, Quest Graph, and Map Editor are alternative projections over the same `@neon-ether/game-schema` definitions. They do not own parallel content formats.
- The filesystem bridge is a Vite `serve`-only plugin under `apps/editor/dev`; it must never be imported by the Game application or included in the production Game bundle.

### `content/`
- Contains immutable authored definitions consumed by both Game and Editor.
- Cross-entity relations and graph/map connections are stable string IDs validated before save or registry load.

## Runtime flow

1. The Game composition root loads `content/manifest.ts` into `ContentRegistry`.
2. `GameSession` creates runtime state from the injected registry snapshot.
3. React receives copied state snapshots and resolved presentation models.
4. UI input dispatches a typed `GameSession` command.
5. A focused runtime module evaluates shared conditions, executes shared effects/outcomes, mutates session state, and emits `STATE_CHANGED`.

Editor builds follow a separate entry point and never participate in this runtime flow.

## Content validation contract

- `@neon-ether/game-schema/validation` owns schema and full content-graph validation. Editor components only render its serializable `ContentValidationReport` and never implement validation rules.
- Validation issues use `error`, `warning`, or `info`. Errors block Editor saves and production builds; warnings and informational diagnostics remain visible to authors.
- The graph pass validates global and nested IDs, entity references, conditions, effects, outcomes, quest/event transitions, map membership/routes, combat encounters, base rooms, and host-provided asset paths.
- `ContentRegistry` runs the same validator before indexing. Strict loads throw when the report contains errors.
- The production Vite build invokes `scripts/validate-content.ts` before bundling and must fail on any validation error. The Editor remains buildable so authors can repair invalid drafts.

## Development playtest boundary

The Editor owns its playtest command facade and GameState inspector under
`apps/editor/src/playtest`. It drives a normal injected `GameSession` and transfers a
save snapshot to the Game only through a Vite-pruned `import.meta.env.DEV` bootstrap.
The runtime exposes an optional presentation-neutral trace sink; it has no dependency
on Editor or React. Editor panels, mutation helpers, and debug markers are excluded
from the production Game bundle.

## Inventory and equipment

`InventorySystem` owns stacking, quantities, optional slot/weight capacity, equipment
requirements, and modifier application. Item content only declares broad category,
tags, compatible slot IDs, requirements, modifiers, and optional effects. Combat loot,
effect handlers, and `GameSession` delegate inventory mutations to that system; none of
them branch on concrete item IDs. Equipment is runtime state and content definitions
remain immutable.

## Character RPG stats and checks

Character definitions expose compatible base attributes, open-ended skill maps, derived
stats, traits, perks, temporary modifiers, and status effects. `CharacterStatsSystem`
produces effective snapshots without mutating base attributes. `SkillCheckSystem`
resolves authored attribute/skill/difficulty/modifier definitions into five generic
outcomes. POI and Event runtimes consume the same check definition and never branch on
named skills such as hacking, strength, or charisma.

## Character progression and rewards

Progression curves are injected content definitions selected per character. The
framework-independent `ProgressionSystem` owns XP thresholds, level currency, and
open-ended skill progression for players and companions. Combat, quest completion,
events, and exploration use the same `grantRewards` effect; source systems do not
implement their own XP mutations.

## Crafting

`CraftingSystem` is the single recipe executor for POI, base, and room/station access.
Recipes declare inputs, level/attribute/skill requirements, non-consumed tool items,
required room definitions, location availability, output, time, conditions, and effects.
The runtime derives built room access from `BaseState`; presentation only sends a typed
location context. Inventory, Condition, and Effect systems remain the owners of their
respective rules.

## Shops and economy

NPCs and POIs reference immutable `ShopDefinition` IDs. `EconomySystem` owns stock,
buy/sell eligibility, atomic inventory transfers, lazy restocking, and final pricing.
Price modifiers are authored data combining shared conditions (including relationship,
faction reputation, and event flags), player traits, and map/POI filters. Item base value
remains in `ItemDefinition`; no merchant-specific logic exists in runtime or React.

## World time

`WorldTimeSystem` is the sole owner of calendar normalization, time-of-day phases,
rest, and authored route/POI travel duration. The common `time` condition makes POI,
Event, Shop, and NPC availability use the existing Condition pipeline. The common
`advanceTime` effect supports turns, minutes, hours, and days. No per-NPC daily
simulation or presentation-side clock logic is introduced.

## Event authoring

The Editor provides both a generic schema inspector and an ordered scene editor for
`GameEvent`. The scene editor changes the same event, step, choice, check, effect, and
`GameplayOutcome` objects consumed by `EventRuntime`; it has no graph DTO, conversion
layer, or editor-only event format. Local step links and cross-event outcome links stay
as stable string IDs and remain subject to the shared content-graph validator.

## POI authoring

The specialized POI Editor edits the canonical `POI` and `PoiAction` schemas directly.
It composes the shared schema-driven Condition/Effect controls and the same reusable
`GameplayOutcome` editor used by Event authoring. Its preview renders the production
`PoiScreen` from `@neon-ether/shared-ui` with a presentation-only draft snapshot; it
does not copy the screen or evaluate gameplay rules in React.

## Combat encounter authoring

The Combat Encounter Editor mutates the canonical `CombatEncounter` definition used by
preview, tactical combat, loot, and outcome resolution. Initial availability uses the
shared Condition pipeline, while conditional encounter modifiers use the shared Effect
pipeline at combat start. Quick playtest creates a normal injected `GameSession`; no
editor-specific encounter DTO, combat state, or combat engine exists.

## Base authoring and state

Base, room, upgrade, and job editors mutate the canonical definitions indexed by
`ContentRegistry`. Room categories and slot types are open string taxonomies; adding a
new authored room never requires a runtime or React branch. Logical slot layout and
upgrade-chain views are projections of those definitions, not separate layout data.
`BaseState` and NPC assignment state remain SaveGame-only and identify their selected
definitions by stable IDs. Development playtest mutations live only in the Editor
controller and dispatch normal base/character management commands before opening Game.

## Factions and reputation

Faction definitions own configurable reputation tiers, default directional relations,
membership vocabulary, hostility configuration, presentation metadata, and optional
future area ownership references. `FactionRuntimeState` separately stores the player's
reputation, resolved tier, membership, discovery/hostility overrides, and mutable
relations. All consumers use shared Conditions, Effects, and existing modifier rules;
shops, events, POIs, NPCs, quests, and combat contain no faction-specific branches.
The Editor relation matrix writes the same directional relation list loaded by
`ContentRegistry`; no diplomacy simulation, territory state machine, or faction AI is
introduced.

## Data-driven weather and environments

Weather definitions and weighted profiles are immutable content. `WeatherSystem` resolves map/region-scoped weather only when world time advances and persists the result in `WorldState.weatherByScope`; it uses no real-time background timer. Conditions and Effects access weather through their shared registries, while consumers receive generic tags and numeric modifiers rather than branching on weather IDs. `EnvironmentalLayer` is the single pointer-transparent, capped-particle renderer shared by map, POI, and Editor previews. POIs declare exposure, events may alter only presentation, and encounters can inherit or override resolved environmental metadata without coupling combat logic to weather rendering.

## Deterministic gameplay randomness

All gameplay randomness is supplied through the engine-level `RandomSource` contract. `GameSession` owns one seeded source and injects the same instance into conditions, checks, events, combat, encounter rewards, weather, crafting, economy, quests, base rules, and POI/action resolution. Each draw updates `GameState.rng`; save/load restores the initial seed, current generator state, and draw count before another gameplay command runs. Runtime code must not call `Math.random()`. Presentation-only animation must not consume the gameplay source.

## Pending gameplay resolutions and save/load

Mechanically resolved flows that still require player acknowledgement or a choice live
in `GameState.pendingGameplay`. Action results, rolled combat loot, surviving-enemy
state, post-combat decisions, and deferred outcome-sequence tails are serialized and
rebound to the outcome runtime on load. The gameplay mode is reconstructed from the
pending phase. React modal visibility, selected tabs, animation progress, scroll,
hover state, and every other purely presentational detail remain outside SaveGame.

## Editor authoring presets

Editor presets are development authoring templates around canonical Condition, Effect,
GameplayOutcome, POI Action, Event Choice, reward Effect, and Skill Check values.
Applying a preset always performs a deep copy into the authored entity; production
content contains no preset ID or runtime dependency. The preset library is served only
by the Editor development filesystem bridge and is not imported by game runtime code.

## Guided quest walkthrough

The development-only Quest Walkthrough owns an isolated `GameSession` and dispatches
normal QuestRuntime, Condition, Effect, Event, POI, and Combat commands. Checkpoint
construction derives only safely inferable prerequisite state; unsupported conditions
remain visible for manual Debug Inspector input. Branch history and state-change views
are Editor projections and are never serialized into production content or SaveGame.

## Development gameplay telemetry

Balancing telemetry is a local Editor observer attached to `GameSession` events and the
optional runtime trace sink. Runtime systems emit presentation-agnostic structured
facts, while the development observer derives state deltas and summaries without
writing to GameState. Telemetry sessions, filters, comparisons, and JSON/CSV exports
remain Editor-only; no network analytics or production telemetry dependency exists.
