# First-map audit — Fishing Village

**Date:** 2026-08-08 · **Base commit:** `723675c` · **Scope:** the whole of
`fishing-village` (the first map a player ever walks), its event content, its
quest chain, and the two minigames reachable from it.

Everything below was checked against the working tree, not against memory.
Route claims come from an exhaustive walk of every legal single-life route
through the map definition under the live movement law (`moveToNode` +
`completedNodes` locking), not from sampling.

---

## Summary

The first map could not be finished. Not "was hard to finish" — could not.
Four independent defects, any one of which ends a run:

| # | Finding | Severity | Status |
|---|---|---|---|
| F1 | Eight nodes strand the run outright; shortest strand is 4 nodes deep | **Critical** | Fixed |
| F2 | The boss and the quest-board node are mutually exclusive in one life | **Critical** | Fixed |
| F3 | Kill objectives never fire in the app — the quest chain is dead | **High** | Fixed |
| F4 | No in-game path off the map; `get-to-forest` is unreachable | **High** | **Filed, not fixed** |
| F5 | The start node's authored content can never resolve | Medium | Fixed |
| F6 | The options drawer offers moves the engine refuses | Medium | Fixed |
| F7 | Two northern-forest node pairs share grid coordinates | Low | Fixed |
| F8 | The foe rotation was an accident of node numbering | Low | Fixed |

Two further findings concern the minigames the map routes into, and are
design rather than defect: the Gleaning was push-your-luck with no luck, and
the Boy's Almanac was roll-and-move. Both are addressed below.

---

## F1 — Eight nodes strand the run · **Critical**

`fishing-village` is a **gauntlet** map: `moveToNode` locks completed nodes
behind you and permits no back-travel. The Phase 65 expansion laid a 25-node
grid over that law with one-way spine edges (`fv-1 → fv-2 → … → fv-10`) and
two-way sub-area edges (`fv-11 ↔ fv-12`), which produces states where every
neighbour of the node you just entered is already completed.

Exhaustive walk over the pre-fix definition — 260 distinct legal routes:

```
terminal (stuck) nodes and how often reached:
  fv-25: 96    fv-10: 72    fv-20: 28    fv-23: 24
  fv-21: 24    fv-16: 12    fv-15:  3    fv-13:  1
```

Only `fv-10` is an authored end of the map. The other seven are soft-locks:
the player is alive, the map is unfinished, and the exploration screen has no
glowing node left to tap. There is no recovery affordance — the drawer's
empty-state copy reads *"the paths close as you go deeper — tap a glowing
node to travel"* while no node is glowing.

**The shortest strand is four nodes:** `fv-1 → fv-11 → fv-14 → fv-15`. Every
one of those moves is legal and `fv-11` is one of the two openings out of the
starting node, so a first-time player who steps "up" into the Harbor District
on move one can be permanently stuck before the fourth combat.

### Fix

Both coastal maps are re-layered into **column-layered forward gauntlets**
(the Slay-the-Spire shape). The law, enforced by an invariant test:

> Every edge runs from column *x* to column *x+1*, where a node's column IS
> its `location[0]`.

A route therefore visits exactly one node per column and can never revisit
one, so a node's forward neighbours can never already be completed — strands
become *structurally impossible* rather than patched. Node ids and their
authored event kinds are unchanged; only positions and edges moved.

`auditMapTraversal(def)` (new, in `world.reducer.ts`) walks every legal route
and reports strands, unreachable nodes, and the longest route.
`src/World/e2e/map-traversal.engine.test.ts` runs it over every registered
gauntlet map and fails on any strand. Post-fix: 0 strands, 0 unreachable
nodes, every run exactly 10 nodes.

---

## F2 — The boss and the quest board are mutually exclusive · **Critical**

Across all 260 pre-fix routes:

- `fv-6` (the King of Revenge, the region climax) was reached by **216 (83%)**
- `fv-15` (the `build-the-boat` quest board — the map's story hook) by **3 (1.2%)**
- **both, in one life: 0.**

`fv-15`'s only edge is to `fv-14`, so arriving there means `fv-14` is already
completed and the run ends on the spot. The single most content-dense node on
the first map was a 1-in-83 trap that terminated the game.

### Fix

`fv-6` now sits alone in column 5, so **every** route fights it. `fv-15` sits
in the column before, reachable from all three lanes. Both are pinned by
tests. The pre-boss rest (`fv-20`) also sits on the spine with every
column-3 node opening onto it, restoring as a *guarantee* what the content
file had only claimed as intent ("Rest sits at fv-3 … so the player can heal
before the climax" — which the topology did not deliver).

---

## F3 — Kill objectives never fire in the app · **High**

`starting-quest`'s only objective is `kill / The King of Revenge`. The engine
advances kill objectives in `game.reducer.endCombat`. The live hazard-pattern
combat (Spec 26b) never calls `endCombat` — its exit path is
`CombatEncounterPanel.handleExit` → `EncounterModalOverlay.handleHazardExit`,
which resets the run on defeat and tears down the modal, and nothing else. No
caller of `endCombat` exists anywhere under `app/` or `components/`.

Consequence chain: the boss dies → the objective stays at 0/1 forever →
`starting-quest` never completes → every one of Old Marrow's reward branches
(all four gated on `questCompleted: 'starting-quest'`) is unreachable →
`get-to-forest`, which is only granted from inside one of those branches, can
never be started.

The objective's `target` is a display name (`"The King of Revenge"`), matched
against `Enemy.name`. That coupling is correct and load-bearing; it is now
pinned by a test, because a drift to the slug would silently reproduce this
exact failure.

### Fix

`advanceKillObjectives(log, enemyName)` added to the quest engine; called from
the combat write-back (`applyHazardOutcome`) on victory and the merciful wins.

---

## F4 — The map has no exit · **High** · **NOT FIXED**

There is no in-game path from `fishing-village` to `northern-forest`.
`changeMap` exists as a store action but its only caller is
`DebugMapResetButton`. `northern-forest` starts in `lockedMaps` and nothing
calls `unlockMap`. The `get-to-forest` quest's objective is `reach / nf-1` —
a node on a map the player cannot travel to.

So even with F1–F3 fixed, the first map ends at its terminal column with
nowhere to go.

**Not fixed in this pass, deliberately.** Inter-map travel is a new
cross-package system (a `MapEventKind`, its payload and handler, a mobile
route and presenter, unlock rules, save-shape implications) — it is a missing
*feature*, not a broken one, and building it under an audit banner would be
scope I was not asked for. The map's internal correctness is what an audit
owes; this is filed to `plan/PHASE_CANDIDATES.md` as a phase candidate with
the evidence above.

---

## F5 — The start node's content can never resolve · Medium

Map events fire on **arrival** at a node. `createMapState` places the player
*on* `fv-1`, and nobody arrives at the node they are placed on, so `fv-1`'s
authored pool never fired. It held a Grave Larva encounter — dead content for
the entire life of the map. (Phase 14 noted the symptom in 2026-07 and added
`--resolve-start` to the CLI; the app never got an equivalent.)

### Fix

`fv-1` re-authored as the village's **arrival cutscene** — a kind that is safe
to fire the moment the map opens, unlike a fight the player has had no chance
to prepare for. `ExplorationScreen` resolves the start node once on map entry,
held off while any other event or an in-flight encounter owns the screen.

---

## F6 — The drawer offers moves the engine refuses · Medium

`selectExplorationViewModel` built its options list from
`world.currentMap.availableNodes` — the *cumulative* set of every node ever
unlocked — rather than from adjacency. So the map lit up, and the drawer
offered, nodes that `moveToNode` would reject as non-adjacent. Tapping one
opened a confirm panel that then did nothing at all.

The old bidirectional sub-area edges masked this in many cases; the strictly
forward re-layer made it visible on every single move, which is how it
surfaced.

### Fix

Options and node classification now read the engine's `legalMovesFrom(map)`.
A node you have seen but cannot walk to from where you stand reads as
`locked` — which is exactly what the no-back-travel rule makes it.

---

## F7 / F8 — Smaller findings · Low

- **F7.** `nf-9`/`nf-22` both sat at `[6,0]` and `nf-10`/`nf-23` both at
  `[7,0]`, so the map canvas drew them stacked. Fixed by the re-layer; a
  distinct-coordinate assertion now guards every gauntlet map.
- **F8.** Which foe a player met where was an accident of node numbering: the
  content file walked `fv-1..fv-25` in id order incrementing a rotation
  index. The gentlest enemy sat on the start node nobody could reach, and the
  ramp ran backwards in places. Assignment is now explicit per node and
  monotonic along the map — column 1 is the softest thing in the village,
  column 9 the hardest short of the breakwater.

---

## The map, after

Ten columns, three lanes (WHARF `y=+1`, SPINE `y=0`, INLAND `y=-1`). Lanes
drift — a node reaches every next-column node within one step of its own `y` —
so a route is a sequence of real choices rather than a committed corridor.

```
c0    c1     c2     c3     c4        c5     c6     c7     c8     c9
      fv-12  fv-16  fv-17  fv-15     .      fv-18  fv-21  fv-22  fv-24
      enc    enc    loot   QUEST     .      hazard enc    gather enc
fv-1  fv-2   fv-3   fv-4   fv-5     fv-6    fv-7   fv-8   fv-9   fv-10
open  loot   rest   enc    gather   BOSS    enc    gather rest   hazard
      fv-13  fv-11  fv-14  fv-20     .      fv-19  fv-25  fv-23
      gather loot   narr   REST      .      inter  rest   hazard
```

Every run is 10 beats, passes the breakwater, can heal immediately before it,
and can reach the quest board. 25 nodes across 3 lanes gives the replay value
the 25-node grid was presumably reaching for in the first place.

---

## The two minigames

### The Gleaning (gathering) — push-your-luck with no luck

The engine is elaborate: wrath, three strata, offerings, one-use tools, a
reprisal deck, family sets, rolled boons. And none of it was a gamble. Every
plot printed its exact wrath cost. The reprisal thresholds were fixed at 4 and
8. Every site erupted at exactly 12. A player could compute the precise number
of takings remaining and the precise turn the site would answer. "Do I take one
more?" had a correct answer, always, and finding it was arithmetic.

The docstring's claim — *"Push-your-luck: the player may withdraw at any time…
Greed is punished by WRATH"* — described an intent the numbers did not deliver.

**Redesign:** the eruption point (THE SITE'S TEMPER) now rolls per session in
[10, 15] and is hidden; four graded OMENS read off the gap between it and
current wrath; a taking's printed cost became a FLOOR with the rest rolled
(GLEAN spread 0, STRIP spread 3, replacing STRIP's old flat surcharge); and
READ THE SITE buys the exact number for the price of a turn. Outcome cuts went
temper-relative — judging a site that bears 10 and one that bears 15 by the
same absolute number meant nothing.

Measured over 400 seeded runs per policy, the doctrine gradient holds and
gained a rung, and the stance choice became real for the first time:

| policy | kept richness | shillings | eruption | communion |
|---|---|---|---|---|
| greedy (blind) | 5.7 | 6.3 | 100% | 0% |
| timid (restraint) | 8.1 | 3.5 | 0% | 54% |
| balanced (competence) | 10.4 | 5.1 | 0% | 0% |
| **reader (information)** | **12.3** | 7.5 | 0% | 13% |
| plunderer (informed STRIP) | 9.5 | **14.7** | 0% | 22% |
| wrath-pusher (reckless) | 8.1 | 11.0 | 83% | 0% |

### The Boy's Almanac (quest board) — roll-and-move

Each space had a genuinely distinct decision shape inside it. None of it
mattered, because the only action available at idle was `CAST THE BONE`: you
rolled, you moved that many spaces, you resolved whatever you landed on. The
player never decided where to go — the one decision a board game exists for.

**Redesign:** a cast throws **two** bones, each previewed with the space it
would land on, and the player takes one step. The bone left behind banks its
pips as wind (capped at 2), so the choice is position against tempo rather
than "which square looks nicer". The read is now, verbatim from the CLI:

```
Two bones on the boards. One step, one banked.
  [1] 6 → OLD MARROW'S DOCK (parley) — leaves 2 wind behind
  [2] 2 → THE TIDE CACHE (cache) — leaves 2 wind behind
```

Over 300 seeded runs per policy the three bots separate cleanly now that
route preference is expressible: cautious 5.2 days / 46% masterwork,
economist 5.9 / 41%, gambler 7.2 / 30%.

---

## Verification

All three workspaces green at every commit in this pass:
`npm run verify -w axiomancer-mechanics` (193 files, 2718 tests),
`npm run verify -w axiomancer-mobile` (268 suites, 2789 tests),
`npm run type-check -w axiomancer-card-editor`.

New hermetic coverage: `map-traversal.engine.test.ts` (the strand invariant,
over every registered gauntlet map), `kill-objectives.engine.test.ts`,
`start-node-arrival.engine.test.tsx`, plus the temper/omen/unsteady-hand and
two-bone suites in the two minigames' existing e2e files.
