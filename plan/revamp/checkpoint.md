# Revamp — the Act 1 checkpoint

<!-- lexicon-ok: stance-check — the RC walk checks that the removed stance surface stays absent -->

> Part plan of [THE REVAMP](README.md). Phases **R9a** (save checkpoint in
> fights, loop) and **RC** (the Act 1 checkpoint release, attended). Added
> via `/oversight` 2026-09-28 at T's request.

## Why

T, 2026-09-28: "get everything to a good checkpoint with the mechanics in
place, the map working, and everything cleaned up. Then we'll cut a release
before we start work on content, cards, people, story, AI skills, anything
past Act 1, etc. This way, if I want to pump the brakes, we can reset to
this release version."

So RC sits between the reset (R1–R10c, R7d, R9a, B4) and everything that grows
the game again: every owner-led B-row, R11 (loop content phases) and R12
(new combat-playtest) require it.

## R9a — Save checkpoint in fights (loop)

Promoted from `plan/PHASE_CANDIDATES.md` ("No single owner for
save/persistence policy", expand pass 19). A reload taken during a live
encounter lands the player past the fight: `beginHazardEncounter` clears
the event slice and consumes the node when the fight is entered, not when
it resolves. On a door node that skips the Doorwarden.

Decided here (the candidate asked for a ruling; this is the smaller shape
it recommended):

1. **Save ownership stays with mobile**, and is written down. The
   `wrapDeflectingAdapter` in `axiomancer-mobile/state/store.ts` and its
   hand-placed `save()` checkpoints are the one owner; the engine's
   `DURABLE_ACTIONS` allowlist is documented as the engine-only (CLI/test)
   path. Both files' header comments and `docs/` say so, and the guard test
   `axiomancer-mobile/state/e2e/exploration.engine.test.ts` ("mobile owns
   save timing") stays as the witness.
2. **A node is consumed when its encounter settles** (victory, flee,
   defeat, mercy), not when it is entered. Reuse the `arrivalPending`
   re-offer pattern that closed the prelude hole: a reload mid-fight puts
   the player back on the node with the fight offered again from the start.
   Rebuilding a half-played fight's turn state is out of scope.
   The one way back (phase ER1, 2026-10-27): a claimed rest un-consumes
   every settled elite node of the act (`respawnElites`), except an elite
   whose relic dropped (`retiredEliteNodes`); every other node stays spent.
3. Tests: an engine test that a save taken mid-encounter reloads onto the
   unconsumed node with its onward edges closed, for a normal fight and a
   door fight; a mobile e2e that reload mid-fight re-offers the fight.

Requires R7c (the engine's encounter state is final) and R8 (mobile flows
are final).

## RC — Act 1 checkpoint release (attended)

The loop never picks RC (attended). When every row it requires is `[x]`,
`/march` falls through to `/iterate` and `/expand` under the revamp rules
until T opens the session.

### Gate (all must hold before tagging)

1. **Rows:** R1–R10, R7a–R7e (with R7c2), R9a, R10b, R10c, R10d and B4 are `[x]` on main.
2. **Checks:** the root `npm test`, mechanics `verify`, mobile `verify`,
   `lint:content`, `check-lexicon`, and every `verify-*` workflow on the
   tagged commit are green.
3. **The walk:** the `playtester` agent drives the exported web build from
   a new game through the Breakwater, the Charcoal Wood, the Beacon Crags
   and the Lantern Deep. **RC proves Act 1 works, not that it is winnable
   (T, 2026-10-02, D75):** three grey cards cannot carry a real clear.
   Where the grey deck cannot win a fight, the walk settles it with the
   dev menu (D19) and moves on, and the report says which fights it
   settled that way. Each report must show:
   - a Doorwarden door fight in all four regions, each one starting,
     playing and settling without a crash or dead end;
   - Float-Eye on normal fights and at least one Brine Hag;
   - The Open Hand opens the mercy choice on the Brine Hag;
   - an Anvil near each region's exit;
   - healing potions obtainable and usable; shillings the only currency;
   - the Suppliant's Ring is the only relic in play, and no parked-world
     NPC, quest or shop is reachable (R7e, D72);
   - the vault door and the deep stair both sealed, with no crash or
     dead end past them;
   - level-ups fire as XP crosses R9's curve (the 3–4 across a clear
     is checked again once the trial set makes a real clear possible);
   - a reload mid-fight re-offers that fight (R9a);
   - no keyword, gloss or glyph on screen without a live carrier;
   - no stance chip, punish/yield line or stance readout anywhere (R7d);
     dice still power only their own colour of card;
   - no console errors.
4. **Findings:** anything small is fixed in the session; anything larger
   is filed and blocks the tag until it ships.
5. **Accepted for RC (T, 2026-10-02):** the combat "NO MOMENTUM" chip has
   no live carrier while the deck is grey (every grey card is colour ANY).
   Momentum is a locked mechanic; the chip stays and comes alive with the
   trial set's coloured cards (BT). The walk does not fail item "no glyph
   without a live carrier" on it.

### The walk, 2026-10-02 (attended)

Four `playtester` legs on the dev build, one per region, each continuing
the save from the last (slot Chronicle I). **Every checklist item passed**
once the in-session fixes below landed; the Momentum chip is accepted (5).

| Region | Doorwarden | Settled with dev skip | Brine Hag spared by The Open Hand | Level at exit |
|---|---|---|---|---|
| Breakwater | bw-17, 176 VITAE | Float-Eye, Brine Hag, Doorwarden | not reached (never under 30%) | 2 |
| Charcoal Wood | cw-17, 214 | Doorwarden | yes (honest play) | 3 |
| Beacon Crags | bc-15, 254 | Doorwarden | yes | 4 |
| Lantern Deep | ld-16, 290 | Doorwarden | yes | 5 |

Also seen: a reload mid-fight re-offers the fight from its reveal; both
sealed cutscenes (ld-15, ld-18) return to a usable map; the save reloads
cleanly at the end; no new console errors in a production path.

**Fixed in the session:** the Windows path bug in the DevLog test
(a493eaf7); the Ascend screens one level ahead and the intent pill printing
face damage (dbbecab6); drinking one of two potions removing both
(cb0a6d9f); every region's exit reachable past its Doorwarden, now gated
and pinned by a test (157864d4); pre-purge card ids crashing combat on load
(b09e1de0, B4 F2); the Chronicle calling a mercy FLED (b09e1de0); and,
at T's request, the map's ink blots, NODE GRAPH label and compass rose
removed (4f88a720).

**Filed, not blocking:** thirteen copy/label/console rows in
`plan/CRITIQUE.md` ("RC walk 2026-10-02"). **Accepted for the tag (T,
2026-10-02):** the Chronicle empties on reload, and the victory/mercy panels
do not show XP or loot. Both ship after the tag (`plan/PHASE_CANDIDATES.md`).

**Added before the tag (T, 2026-10-02): Phase R10d**, every tutorial window
removed ("they're miserable"). RC requires it; the gate and CI re-run on the
commit that ships it, and that commit is the one tagged.

### Cut

**Done 2026-10-02 (D76):** tagged `v0.1.0-checkpoint` on `9ddba0f8`, GitHub
release published, EAS preview APK built from the tag and linked from the
release; recorded in bearings and the decisions log; RC ticked.

1. T tags the gated commit `v0.1.0-checkpoint` (annotated), pushes the tag
   and publishes a GitHub release. The release notes list what the core
   holds (README §2) and what is deliberately absent.
2. T builds an EAS preview APK from the tag and attaches or links it.
3. Record the tag in `plan/bearings.md` (THE REVAMP bullet) and the
   decisions log, with the reset recipe:
   `git switch -c <branch> v0.1.0-checkpoint`.
4. Tick RC. Next is the Blood Price trial set (D75, `cards.md` → "The
   trial set"); R11 stays the next attended loop phase.

## RC2 — v0.2.0 release (attended)

Added 2026-10-10 by T (D78). The loop never picks RC2: when PF1 is `[x]`
and its first audit has landed, `/march` falls through as it did for RC
until T opens the session.

### Gate (all must hold before tagging)

1. **Perf:** PF1 is `[x]` and the first performance audit ran on CI:
   `docs/reports/perf/budgets.json` is seeded and `history.jsonl` has at
   least one line on main. Open `[perf]` rows do not block the tag.
2. **Checks:** RC gate item 2, on the commit to be tagged.
3. **The walk:** RC gate item 3, re-run on the exported web build of that
   commit. Where a phase shipped since RC changed a rule an item checks
   (for example BT's cards), the item is checked against that phase's
   rule, and the report says so.
4. **Findings:** RC gate item 4.

### The walk, 2026-10-11 (attended)

Four `playtester` legs on the expo-web dev build of `eb75f451`, one per
region, continuing one save (slot I). At T's direction the walk used the
**Blood Price test deck** (set from `/dev` → CARDS → TEST LANE DECK),
fought every map fight honestly, and kept the dev quick-win
(`globalThis.__AXM_SKIP_EVENT__`, the dev menu's SKIP EVENT) for a stuck
fight or hazard only. **Every checklist item passed**, with no crash or dead
end. The one skip was on a fight fired from the `/dev` enemy picker, not on
a map fight. Items checked against later rules: relics are the Suppliant's
Ring and the Bleeding Signet (BT1), and Momentum has live carriers (BT).

| Region | Doorwarden (turns, VITAE) | Brine Hag | Level at exit |
|---|---|---|---|
| Breakwater | bw-17, 7 turns, 258 | spared (Open Hand at 29%) | 3 |
| Charcoal Wood | cw-17, 8 turns, 312 | killed outright, 3 turns | 4 |
| Beacon Crags | bc-15, 10 turns, 368 | spared, 2 turns | 5 |
| Lantern Deep | ld-16, 6 turns, 422 | EXPLOIT, 4 turns | 6 |

Honest fights against D82's targets: Float-Eye ×18, 3.9 turns on average
(target about 3); Brine Hag ×4, 3.25 (target about 5); the Doorwarden ×4,
7.75 (target about 7). Three of the four Hag fights ended through mercy at
about 30% VITAE, and the one kill was a SACRIFICE burst under VULNERABLE.
The Hag kept **152 VITAE in every region**, while Float-Eye (92 → 124) and
the Doorwarden (258 → 422) scaled with the map. Not retuned; filed in
`plan/AUDIT.md`.

Also seen: a reload mid-fight re-offers the fight; both sealed omens (ld-15,
ld-18) return to a usable map; the end-of-walk reload is clean; the only
app console error is React 19's dev-only `element.ref` warning, from
react-native-gesture-handler 2.28.0 on web, which production builds never
print.

**Accepted for the tag (T, 2026-10-11):** "Tag now, file all". Four
rules/interaction bugs went to `plan/AUDIT.md` and do not block: P-07b's
"(max 30)" does not cap, a die is spent on an unplayable staged card,
Scarred never clears, and "SACRIFICE any amount" does not prompt. The copy
and consistency rows are in `plan/CRITIQUE.md` ("RC2 walk 2026-10-11").

### Cut

**Done 2026-10-11 (D83):** tagged `v0.2.0` on `eb75f451`, GitHub release
published. No EAS build from the tag: T played a preview APK built that
morning. Recorded in bearings and the decisions log; RC2 ticked.

As RC's cut, with tag `v0.2.0` (annotated): T tags and pushes it,
publishes a GitHub release (what changed since `v0.1.0-checkpoint`), builds
an EAS preview APK from the tag and links it, records the tag in
`plan/bearings.md` and the decisions log, and ticks RC2.

### Not in RC

No content, cards, keywords, people, story, art or new skills. No loop
changes (R11 owns those). No version bumps beyond the tag unless the EAS
build needs `app.json` `version`.
