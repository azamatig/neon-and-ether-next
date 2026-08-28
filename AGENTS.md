# System Instructions & Rules for Agents

## Mandatory Architectural Rules (Strict Adherence Required)

1. **No Gameplay Logic in React Components**: React is purely a presentation layer. All dice rolls, line-of-sight calculations, AP tracking, stat checks, and state transitions belong in `@neon-ether/engine` or `@neon-ether/game-runtime`.
2. **No Hardcoded IDs in Systems**: Never hardcode specific NPC/Quest/Item/POI IDs inside gameplay mechanics or engine systems.
3. **React as Pure Presentation**: React renders immutable state snapshots and dispatches typed commands to `GameSession`.
4. **Separation of Content & Runtime State**: Content definitions (`content/`) are immutable static blueprints; runtime session state is tracked in `@neon-ether/game-runtime`.
5. **Stable String IDs**: All game entities (Items, NPCs, Maps, Quests, Dialogues, Skills) must use deterministic string IDs.
6. **Relations via String IDs**: All references between entities are linked exclusively through string IDs.
7. **Game Systems Never Import Content**: Packages `@neon-ether/engine`, `@neon-ether/game-schema`, and `@neon-ether/game-runtime` do not import concrete files from `content/`. Content is injected via `ContentRegistry`.
8. **Shared Schemas (Game & Editor)**: Both `apps/game` and `apps/editor` use `@neon-ether/game-schema` as the single source of truth.
9. **UI Scalability**: New items, quests, NPCs, or tiles must be addable via data without modifying React UI component code.
10. **Modular Single-Responsibility Systems**: No monolithic God objects/managers. Maintain decoupled, focused modules.

Refer to `ARCHITECTURE.md` for full architectural details.
