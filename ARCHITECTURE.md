# Neon & Ether // Architectural Rules & System Contracts

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
- Runtime state (current player health, active inventory instance, resolved dialogue node, quest step status) is managed separately in session state models (`packages/game-runtime/src/models/*`).

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
- Break systems into focused, single-responsibility units (e.g., `SpatialSystem`, `DiceRoller`, `StatCheckResolver`, `TurnManager`, `DialogueRunner`, `ContentRegistry`).
