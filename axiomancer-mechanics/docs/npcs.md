# NPCs

> **Status:** Branching dialogue runtime is live (Spec 08 Q9). NPCs carry a
> legacy flat `dialogue` map and/or a structured `dialogueTree`; the engine
> exports tree-traversal helpers and a `GameState`-side-effect applier.
> Shop NPCs are typed but shop reducers (inventory, prices, stock refresh)
> are still pending — see `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/08-world-content-and-hazards.md`.

## Type Shape

Defined in [`src/NPCs/types.ts`](../src/NPCs/types.ts).

```ts
interface NPC {
    name: string;
    dialogue?: DialogueMap;        // legacy flat map (Q9 back-compat)
    dialogueTree?: DialogueTree;   // preferred for new authoring
    description?: string;
    image?: Image;
    isShopkeeper?: boolean;        // marks the NPC as exposing a shop view
}

interface DialogueMap {
    [key: string]: string | string[];
}

interface DialogueTree {
    rootId: string;
    nodes: Record<string, DialogueNode>;
}

interface DialogueNode {
    id: string;
    text: string;
    choices?: DialogueChoice[];    // omit for leaf nodes (terminator)
}

interface DialogueChoice {
    text: string;
    nextNodeId?: string;           // omit to end the conversation
    requires?: {
        quest?: QuestName;          // satisfied when the quest is active OR completed
        flag?: string;              // satisfied when the named flag is set
        questCompleted?: QuestName; // satisfied only when completed
    };
    effect?: {
        startQuest?: QuestName;
        progressQuest?: { name: QuestName; objectiveId: string; amount?: number };
        completeQuest?: QuestName;
        teachCard?: string;
        setFlag?: string;
        grantCurrency?: number;
    };
}
```

The alignment gate (`requiresAlignment`) and the `alignmentDelta` /
`moralDelta` effects were removed 2026-09-27 (T6, D39). Choices that
only an alignment gate hid are now always shown.

`DialogueMap` is the original flat shape keyed by trigger / context (e.g.
`"greeting"`, `"shop_open"`, `"quest_<id>_offer"`). Either a single line or an
array of lines is allowed; an array is interpreted as a sequence to play in
order. Retained for the existing NPC data — new content should author a
`DialogueTree` instead so the quest / flag gates have something to
grip.

## Public API (current)

```ts
import type {
    NPC, DialogueMap,
    DialogueTree, DialogueNode, DialogueChoice, DialogueContext,
} from 'axiomancer-mechanics';

import {
    getDialogueNode,    // (tree, nodeId) → DialogueNode; throws on unknown id
    visibleChoices,     // (node, ctx)    → DialogueChoice[] (filtered by `requires`)
    isLeafNode,         // (node)         → true when no choices / empty choices
} from 'axiomancer-mechanics';
```

### `DialogueContext`

The predicate context `visibleChoices` consumes when filtering by `requires`:

```ts
interface DialogueContext {
    activeQuests:    ReadonlySet<string>;
    completedQuests: ReadonlySet<string>;
    flags:           ReadonlySet<string>;
}
```

`requires.quest` is satisfied when the named quest is **active OR completed**;
`requires.questCompleted` is satisfied **only** when completed; `requires.flag`
is satisfied when the named flag is present in `ctx.flags`. All declared
`requires` must hold simultaneously for the choice to be visible.

### Side-effect orchestration (World module)

Applying a chosen `DialogueChoice` to `GameState` is the World module's
responsibility — see [`docs/world.md`](./world.md) and
[`src/World/dialogue.runtime.ts`](../src/World/dialogue.runtime.ts):

```ts
import { applyDialogueChoice } from 'axiomancer-mechanics';
// → ApplyDialogueChoiceResult: { gameState, nextNode, effects: { startedQuest, ... } }
```

`applyDialogueChoice` reads the current map's `MapDefinition.quests` to
resolve a quest by name, then routes the choice's `effect` payload through
the quest engine (start / progress / complete), the player's `knownCards`
(teach), `gameState.flags` (set flag), and `player.currency` (grant currency).
It returns the next dialogue node (or `null` when the conversation ends)
alongside a flat side-effect summary the UI logs.

## Reactive NPCs — alignment observers (Phase 63)

Removed 2026-09-27 (T6, D39). `DialogueTree.id?: string` survives as
an optional stable tree identifier.

## Talk + Choice Structure (Phase 128)

**Canonical dialogue pattern:** Each NPC encounter offers a `*Talk` option that provides contextual information without ending the encounter, followed by 3+ mutually-exclusive responses with distinct consequence shapes.

### Structure Pattern

1. **Initial greeting** — Sets the scene and NPC personality
2. **Talk option** — Reveals the NPC's situation, conflict, or dilemma without ending the encounter
3. **Response choices** — Options expressing different ethical approaches:
   - **Divine/transcendent responses** — Trust in higher forces or spiritual solutions
   - **Collaborative/community responses** — Offering personal help or resources to solve problems
   - **Pragmatic/individual responses** — Self-interested or purely practical approaches

### Consequence Shape Categories

Following T-specified guidance for diverse outcome types:

- **Self-sacrificial consequences** — Help others at personal cost (`grantCurrency: -N`)
- **Self-interested consequences** — Gain advantage through others' situations (`grantCurrency: +N`)
- **Balanced consequences** — Mixed outcomes reflecting complex moral choices

### Phase 128 NPCs

**Coastal Village:**
- **Village Healer** — Medical ethics dilemmas around obtaining supplies for the needy
- **Dockworker's Union Leader** — Labor rights tensions between collective action and individual survival
- **Merchant's Widow** — Grief and justice choices between forgiveness and retribution

**Northern Forest:**
- **Forest Ranger** — Conservation vs. exploitation balancing environmental and human needs
- **Hermit Sage** — Isolation vs. community obligation around sharing wisdom
- **Lost Trader** — Trust and deception in crisis situations requiring mutual aid

Each NPC puts a hard choice in a different life situation, with character conflicts designed for replayability.

## Pending

- **Dialogue-driven combat triggers** — currently choices can start quests
  and teach cards but cannot directly seed an encounter; a `startEncounter`
  effect on `DialogueChoice.effect` is being scoped for a later spec.

### Resolved since the original Pending list

- ~~Shop reducers~~ — Phase 37 (`f9c18f0`) shipped `buyItem` + `sellItem`
  + `defaultSellPrice` in `src/Items/shop.reducer.ts`; no village sold
  items after NK1c, and phase HD1a deleted them. The village counters
  (`src/World/Village`) sell cards, a bed and card removal.
- ~~Moral gating~~ — the moral meter and alignment gates were removed
  2026-09-27 (T6, D39). Dialogue gates on quests and flags only.

See `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/08-world-content-and-hazards.md`.
