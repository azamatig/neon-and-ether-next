# Neon & Ether — Production UI Style Guide

## Intent

The interface is an industrial dark-fantasy operations layer: quiet metal surfaces, restrained cyan and ether-violet telemetry, and rare semantic warnings. Readability always wins over atmosphere. Decorative terminal typography is reserved for labels, metadata, buttons, and numbers; narrative and body copy use the system sans-serif stack.

## Tokens

All production tokens live in `src/index.css` under `:root` and use the `--ne-*` prefix.

- **Surfaces:** `--ne-bg`, `--ne-surface-1..3` establish elevation without pure-black cards.
- **Text:** `--ne-text-1..3` and `--ne-text-disabled` define primary, body, metadata, and disabled hierarchy.
- **Accent:** `--ne-cyan` is interaction/navigation; `--ne-ether` is supernatural/ether data. Semantic success, warning, and danger colors must not be used as decoration.
- **Geometry:** use tokenized spacing and radii. Panels use `--ne-radius-panel`; controls use small/medium radii.
- **Depth:** use panel/modal shadows and low/medium glow. Glow must never sit behind body text.
- **Motion:** fast for hover/focus, normal for overlays, slow for progress changes. Reduced-motion preferences are honored globally.
- **Layers:** HUD, overlay, modal, and tooltip z-index tokens are the only standard elevation layers.

## Type hierarchy

| Role | Treatment |
| --- | --- |
| Display / location | `--ne-font-display`, bold sans, sparingly |
| Screen title | `--ne-font-title`, bold mono or sans |
| Section heading | `--ne-font-heading`, mono, uppercase, tracked |
| Body / dialogue | `--ne-font-body`, sans, relaxed line height |
| Secondary | `--ne-font-secondary`, sans |
| Metadata / system | `--ne-font-meta` / `--ne-font-system`, mono |
| Buttons | concise uppercase mono |
| Numbers / stats | tabular-number mono at `--ne-font-number` |

Do not render paragraphs in decorative mono. Avoid body text below 12px; 11px is limited to metadata.

## Shell and scrolling

Production targets desktop at **1280×720 and above**. The document viewport does not scroll. Use a top HUD, one bounded main-content region, optional context rails, and contextual actions at the bottom. Individual long panels own their scroll with `overflow: auto`; modal bodies are bounded to the viewport.

## Shared components

Import from `@neon-ether/shared-ui`:

- Structure: `GamePanel`, `SectionPanel`, `Modal`, `ResultModal`, `ConfirmationModal`.
- Actions: `CyberButton`, `IconButton`, `ChoiceButton`, `Tabs`, `Tooltip`.
- Data: `Badge`, `StatusBadge`, `ProgressBar`, `StatRow`, `ResourceDisplay`, `ConditionRequirement`, `RewardDisplay`.
- Entities: `CharacterCard`, `CharacterPortrait`, `ItemCard`, `ItemSlot`, `POIMarker`, `QuestMarker`.
- Feedback: `EmptyState`, `LoadingState`.

Buttons support `primary`, `secondary`, `danger`, `warning`, `ghost`, and explicit disabled state (plus compatibility variants used by existing screens). Use one component instead of screen-local button CSS. Disabled choices should provide a visible requirement via `ChoiceButton.unavailableReason`; do not rely on hover alone. Icon-only controls require an accessible `label` and a 40×40 minimum hit area.

## Interaction rules

1. Every interactive control needs hover, active, disabled, and `:focus-visible` feedback.
2. Selection is persistent (`aria-selected`, `aria-pressed`, or `data-selected`) and cannot be communicated by color alone.
3. Tooltips supplement labels; they never contain information unavailable to keyboard/touch users.
4. Keep labels concise, but allow descriptions, quest copy, and item names to wrap or truncate with a native title where appropriate.
5. Use modal overlays only for decisions or focused results. Do not stack modals.

## Legacy migration map

This foundation intentionally does not rewrite every game screen yet. During the next screen pass, replace:

| Legacy pattern | Foundation replacement |
| --- | --- |
| Local cyan/rose `<button>` class strings | `CyberButton`, `IconButton`, or `ChoiceButton` |
| Fixed `z-50 bg-black/85` modal wrappers | `Modal`, `ResultModal`, `ConfirmationModal` |
| Screen-local bordered cards | `SectionPanel`, `CharacterCard`, `ItemCard` |
| Hand-built tab button rows | `Tabs` |
| One-off HP/resource tracks | `ProgressBar`, `StatRow`, `ResourceDisplay` |
| Plain unavailable text / title-only reasons | `ConditionRequirement` or `ChoiceButton.unavailableReason` |
| Ad-hoc empty/loading copy | `EmptyState`, `LoadingState` |
| Map and quest indicator buttons | `POIMarker`, `QuestMarker` |

Existing `Button`, `Panel`, `Badge`, and `StatBar` exports remain compatible so screens can migrate incrementally without gameplay changes.

### Completed exploration migration

The production Map and POI screens now use the focused exploration composition:

- Map artwork owns the main viewport; POI state is presented by compact markers and contextual tooltips rather than a permanent inspector or directory.
- POI presentation uses the authored `GameMap.backgroundImage`, `POI.image`, and normalized `POI.mapPosition` fields directly. Missing artwork falls back to a stable visual placeholder.
- POI details use a single artwork/description/actions split without contacts, logs, inventory, quest, or faction sidebars.
- Map and POI share one `ExplorationHud`; other gameplay contexts retain their existing contextual UI.
- Condition evaluation and action availability remain runtime-owned. The UI only displays resolved availability and the authored/runtime-provided reason.

## Architecture boundary

These components render immutable values and emit callbacks only. They must never roll dice, evaluate conditions, spend AP, resolve outcomes, mutate content, or import concrete content. The runtime remains the sole source of gameplay truth.


## Production shell migration status

All runtime modes now mount through one `GameShell`. `standard`, `immersive`, and `combat` are presentation modes of that shell rather than separate applications. Market, Workbench, and Base screens return through the runtime `returnToOrigin` outcome; no screen hardcodes a map transition. Dialogue and Event presentations no longer render the map or journal beneath them.

Removed after reference verification: the production `TacticalHUD` and `TerminalLog` components. They were the obsolete top-HUD/sidebar pair responsible for the legacy gameplay frame.

Remaining production components that still contain incremental legacy utility styling internally: `CombatPreviewContainer`, `CombatResultContainer`, `TurnBasedCombatScreen`, `BaseScreen`, `ActionResultModal`. They are no longer wrappers or navigation shells, and all render inside `GameShell`; deeper visual refinement can be performed without changing composition or runtime flow.


## Character and menu surfaces

`CharacterSheet` is the single player dossier over the unchanged gameplay snapshot. Its Character, Inventory, Equipment, Party, and Quests tabs reuse `PlayerState`, inventory/equipment commands, assigned party members, and authored quest definitions. Closing it is presentation-only and preserves the current gameplay context.

`MainMenu` and `InGameMenu` use the existing local save slots and serializer callbacks. The menu never deletes saves when starting a new game; deletion is explicit and confirmed. Character access is only supplied by the standard HUD, so immersive and combat shell modes cannot open it accidentally.
