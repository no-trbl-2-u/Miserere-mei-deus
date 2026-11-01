# Narrative-encounter audit — both first-arc maps

**Date:** 2026-08-09 · **Base commit:** `abda11f` · **Scope:** every event
kind that exists to make the player *read* something — `interaction`,
`narration`, `cutscene`, and the dialogue runtime behind them — across
`fishing-village` and `northern-forest`.

Follow-on to `FIRST-MAP-AUDIT.md` (2026-08-08), which fixed whether the map
can be *walked*. This one asks whether anything on it can be *heard*.

Every number below comes from driving the real code, not from reading it:
node reachability from an exhaustive walk of all 1479 / 1393 legal
single-life routes, NPC reachability from calling `resolveMapEvent` at all
50 nodes.

---

## Summary

The dialogue system is fully built and almost entirely unreachable.

| # | Finding | Severity | Evidence |
|---|---|---|---|
| N1 | 11 of 14 authored dialogue trees cannot be reached by legal play | **Critical** | `resolveMapEvent` at all 50 nodes |
| N2 | The first map's quest chain cannot start — its only giver is unreachable | **Critical** | `startQuest: 'starting-quest'` appears once, in a dead tree |
| N3 | 39 of 44 authored gated choices can never render in the app | **High** | `composeNpcDialogue` context |
| N4 | A mistyped `npcName` fails silently — it renders a mute card | **High** | `resolveInteraction` fallback |
| N5 | Choice consequences are write-only; nothing reads a dilemma flag | Medium | zero `requires.flag` in map content |
| N6 | Narrative sits off the spine — 7 in 10 runs miss the one dilemma | Medium | route-coverage walk |

Composed with **F4 from the first-map audit** (no in-game path off
`fishing-village`), the practical state of the shipped game is:

> **A player can experience exactly two pieces of authored narrative: the
> arrival cutscene at `fv-1`, and — on 29.4% of runs — the dilemma at
> `fv-14`. Every NPC conversation in the game is unreachable, and the first
> map's premise quest has no giver.**

The three trees that *are* wired correctly (Shrine Keeper, The Chronicler,
The Wandering Philosopher) are all on `northern-forest`, and no player can
get to `northern-forest`.

---

## N1 — 11 of 14 dialogue trees are unreachable · **Critical**

Both maps carry a full `npcs` roster, and **every NPC in both rosters has an
authored `dialogueTree`** — 14 for 14. They are substantial: branching,
multi-node, alignment-gated, quest-aware. They are also, mostly, dead.

An NPC becomes reachable only when some map node carries an `interaction`
pool whose `npcName` matches the roster entry, because that is the only
lookup `resolveInteraction` performs:

```ts
const npc = def.npcs?.find(n => n.name === payload.npcName);
return { kind: 'interaction', npcName: npc?.name ?? payload.npcName, dialogue: npc?.dialogueTree };
```

Driving `resolveMapEvent` at every node on both maps:

| map | interaction nodes | resolve to a tree | roster | unreachable |
|---|---|---|---|---|
| `fishing-village` | 1 (`fv-19`) | **0** | 8 | **8 / 8** |
| `northern-forest` | 5 | 3 | 6 | 3 / 6 |

Unreachable, with trees written and waiting: **Old Marrow, Tide-Shopkeeper,
Coastal Beggar, Captain Blackwater, Fisherman's Daughter, Village Healer,
Dockworker's Union Leader, Merchant's Widow, Forest Ranger, Hermit Sage,
Lost Trader.**

Four `interaction` nodes name someone absent from their map's roster:

| node | authored `npcName` | roster has |
|---|---|---|
| `fv-19` | `Weathered Fisher` | nobody by that name |
| `nf-7` | `Forest Hermit` | `Hermit Sage` |
| `nf-14` | `Ancient Stone Marker` | nobody (it is scenery, not a person) |
| `nf-23` | `Echo Stone` | nobody (also scenery) |

`nf-7` is a near-miss typo class — the hut and the sage are obviously the
same character, written twice by different hands. `nf-14` and `nf-23` are a
different mistake: they use the `interaction` kind for a standing stone,
which has no roster entry and never will. Those two want `cutscene` or
`narration`, not a person.

## N2 — the first map's quest chain cannot start · **Critical**

Of everything in N1, one entry is load-bearing rather than merely sad.

`FIRST-MAP-AUDIT.md` § F3 established that `starting-quest` — kill the King
of Revenge — is the spine of the first map's progression, and that **Old
Marrow's dialogue tree is where its reward is collected**: every reward
branch in that tree is gated `questCompleted: 'starting-quest'`, and the
follow-on quest `get-to-forest` is granted only from inside those branches.

Old Marrow is not reachable. `fishing-village` has exactly one `interaction`
node, and it names `'Weathered Fisher'`.

The last audit read this as a broken reward chain. It is worse than that.
Searching the whole tree for who *starts* the quest:

```
maps.ts:73   effect: { startQuest: 'starting-quest' }   # Old Marrow, "Consider it done."
maps.ts:92   startQuest: 'starting-quest'               # Old Marrow, the pessimist branch
DebugQuestState.tsx:45                                  # the dev menu
```

Two authored sites, both inside Old Marrow's dialogue tree, plus a debug
button. Nothing auto-grants the quest on map entry — `createMapState` does
not read `def.quests`, and no other dialogue, board, or event references it.

So `starting-quest` is **never active in real play**. The quest is defined,
its objective now advances correctly on the boss kill (fixed 2026-08-08),
its reward branches are authored and their gate is satisfiable, and no
player has ever held it. The fix the last audit shipped is correct and
currently advances a quest nobody has.

This also re-reads the last audit's F2. That finding treated "the boss and
the quest board are mutually exclusive" as the story hook being a trap; the
re-layer made both reachable in one life. Correct, but the hook it protected
was already inert — `fv-15`'s board hands out `build-the-boat`, a different
quest. The premise quest of the first map has no giver on the map.

The map's own header comment still describes the intended shape, from a
version of the map that predates the 25-node expansion:

```
 *   fv-1 (start) → fv-2 (interaction — quest giver) → fv-3 (village — shop)
```

`fv-2` is a loot cache today. The quest giver lost his node in an expansion
and nobody noticed, because nothing fails when an NPC has no home.

## N3 — 39 of 44 gated choices can never render · **High**

The authored trees lean hard on conditional choices. Across both rosters:

| gate | count | works in the app? |
|---|---|---|
| `requiresAlignment` | 33 | **no** |
| `playerAlignmentCellChangedSince` | 6 | **no** |
| `questCompleted` | 4 | yes |
| `flag` | 1 | yes |

`visibleChoices` evaluates all five gate kinds correctly — the engine is
fine, and `old-marrow-observer.engine.test.ts` proves the observer cycle
end-to-end at engine level. The break is in the live path. Mobile's
`composeNpcDialogue` builds the context by hand and supplies three of the
five fields:

```ts
const ctx = {
    activeQuests: new Set<string>(activeNames),
    completedQuests: new Set<string>(state.quests.completed as string[]),
    flags: new Set<string>(state.flags as string[]),
};
```

`alignment` and `lastSeenAlignmentCellId` are absent. `visibleChoices`
documents a missing field as *hide the choice* — deliberately, so a gate
fails closed. Both gate kinds therefore evaluate to false for every player
in every conversation, forever.

`state.philosophicalAlignment` is right there on the store (the character
screen reads it). The observer field needs more than a wire-up: mobile never
writes `lastSeenAlignmentCells` at all, so even a fixed context has nothing
to compare against until the dialogue write-back is carried through.

The player-visible effect, once N1 is fixed: Captain Blackwater's greeting
offers five replies on paper and would show two in the app. The three that
characterise him — the trade-ethics branch, the quick-profit branch, and the
"your approach to commerce has shifted" recognition — are exactly the ones
that make him more than a shop sign.

## N4 — the failure mode is silence · **High**

None of N1's four mismatches raise anything. `resolveInteraction` falls back
to `npcName: payload.npcName, dialogue: undefined`; the presenter composes a
card with the name, the one-line description, and a single **SO BE IT**
button. It looks deliberate. It reads as a minimalist encounter rather than
as a missing conversation.

This is the same class as F5 in the last audit — authored content that no
player can reach, sitting undetected across content passes — and it is the
second instance in two audits. The pending AUDIT row
"[world] Map-event content has no coverage guard against unreachable
authoring" was filed for the first instance; this finding widens it. The
guard that would have caught both is the same shape: intersect what legal
play can reach with what has been authored, and fail when the intersection
leaves something out.

The neighbouring pool already shows the right instinct. `FV_ENCOUNTER_FOES`
throws at import when a node has no authored foe:

```ts
if (!foe) throw new Error(`fishing-village: ${nodeId} has no authored event kind or foe.`);
```

Nothing equivalent guards `npcName`.

## N5 — consequences are write-only · Medium

`fv-14` "What Do I Tell Father?" is the one dilemma a player can currently
meet, and it is well made: three replies, no engine-signposted correct
answer, each setting a distinct flag —
`boy-told-father-truth` / `boy-spared-father-worry` / `boy-deflected-father`.

Those three flags are read by exactly one thing in the repository: the test
that asserts they are set. No dialogue choice, no quest, no later node gates
on any of them. The dilemma's own spec (`S-01`) describes them as existing
"purely for a future NPC to react differently in a later conversation" — the
future has not arrived, and until it does the choice is a fork with one
outcome.

Across all authored map content there is exactly **one** `requires.flag`
gate. The apparatus for reactive narrative is complete and essentially
unused.

## N6 — the narrative is off the spine · Medium

`fishing-village` is a gauntlet: 25 nodes, 1479 legal routes, and a route is
**10 nodes long**. A player sees at most 40% of the map, and the map's
authors had no tool telling them which 40%.

Exhaustive route-coverage walk, fishing-village:

| node | content | share of routes |
|---|---|---|
| `fv-1` | arrival cutscene | **100%** |
| `fv-6` | the boss | **100%** |
| `fv-15` | quest board — "build the boat" | 33.3% |
| `fv-14` | the father dilemma | 29.4% |
| `fv-19` | the (mute) NPC node | 27.6% |

Only two nodes are on every route, both by deliberate construction in the
last audit. Everything narrative landed in the lanes.

So two out of three players never find the quest board that names the
map's premise, and seven out of ten never meet its only moral choice. Not
as a designed rarity — the placement predates anyone being able to measure
it. `northern-forest` is worse: `nf-1` is the only node above 51.5%.

This is a design question as much as a defect, and it does not resolve to
"put everything on the spine" — a gauntlet where every route sees identical
content stops being a gauntlet. But the current distribution was not chosen,
and the load-bearing beats (quest giver, quest board, the map's premise)
belong somewhere better than a coin flip.

---

## What this does not cover

- **Village / shop kinds.** `nf-8` and `nf-18` resolve as villages with
  merchant lists; the shop UI has been out of scope since Spec 08 and the
  screen renders a name and a LEAVE button. Known and deliberate, not filed
  here.
- **`endCombat`.** The pending AUDIT row on the live combat exit path stands
  unchanged; nothing in this pass re-read it.
- **Northern-forest quest content.** `gather-wood` / `get-to-cave` were
  authored in Phase 8 and are unreachable for the same F4 reason as the map
  itself. Out of scope until inter-map travel exists.

## Where the work is queued

Nothing in this report is fixed here. The repairs are sequenced as build-plan
phases 53a → 53e, in dependency order — machinery before content, because
authoring against a broken gate ships more dead content. See
`plan/steps/01_build_plan.md` and the briefs in `plan/phases/`.
