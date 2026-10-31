# Phase EN2 — The fight-or-flee screen shows only the DANGER; the combat telegraph is one plain icon

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-31, attended). T played EN1c's build and
> said the reveal before a fight shows too much: it should show the foe's DANGER move and nothing
> else, and only name it once the player has seen it. In combat, the telegraph keeps its five
> kinds but becomes one plain icon per kind, bigger and closer to the foe.

## Sources

- T, 2026-10-31, verbatim: "I had mentioned that we ONLY show their DANGER move, that's all. And
  only if they've seen it before. Not? -> Then just a [  ? ? ?  ]. Yes? -> [ Explanation of move ]".
- T, same session, on where: "I'm talking about the screen that pops up when you decide to fight or
  flee. It should only show the DANGER information. No information on Attack / Defend / etc. In
  regard to the actual combat screen, the only change is the telegraph icon. It should just be one
  icon for each of Attack / Defend / Status / Unknown / DANGER (and it should probably be bigger and
  closer to the enemy)."
- T, same session, on foes outside the new roster: "We need to be in a place where we swap out all
  the enemies for the new enemies first before I make this decision."
- T, same session, on the Lamplighter's Dark (EN1k): "Dark hides its DANGER".
- **D117** (this plot, below) amends **D116**'s second bullet ("At fight start its name shows only
  if the player has beaten that foe before").
- EN1 brief `plan/phases/phase_EN1_chapter1_enemies.md` (A4, A5; the Appendix's DANGER `text`).

### D117 (to add to `plan/2026-09-25-refactor-strategy.decisions.md` in EN2a's PR)

**D117 — The fight-or-flee screen shows only the foe's DANGER, named once seen.** (T, 2026-10-31,
attended.) Before a fight, the reveal shows the foe's DANGER moves and no other move: a DANGER the
player has seen fire in any earlier fight shows its name and what it does; one never seen reads
`[ ? ? ? ]`. "Seen" replaces D116's "beaten". In combat the telegraph is one icon per kind (ATTACK,
DEFEND, STATUS, UNKNOWN, DANGER), larger and beside the foe. Foes without `phases` are untouched
until the enemy swap; T decides their reveal then.

## What exists

Read from `main` at 9da815d on 2026-10-31 (engine paths under `axiomancer-mechanics/src`, app paths
under `axiomancer-mobile`):

- **The defeat ledger** (EN1b): `Game/defeat-ledger.ts`, `codex.defeatedEnemies` (optional, no
  version bump), written in `game.reducer.ts:378-387` on a victory or befriend only. Nothing records
  which DANGER moves the player has seen.
- **DANGER moves** carry `name`, `kind: 'danger'` and `text`, one player-facing line of what the move
  does (`Enemy/types.ts:260-266`; e.g. the Float-Eye's "The Long Career", `enemy.library.ts:437`).
  A foe's DANGERs sit on `phases[i].danger` for `i > 0`.
- **The reveal** (`components/combat/encounter/CombatEncounterPanel.tsx:744-860`): "A FOE BARS THE
  WAY", portrait, name, HP, VITAE, then a threat-phase accordion over every `threatPhases` entry
  (`:802`), each header from `threatPhaseHeader` with its intent kind and move name, then Enter
  combat and Retreat. The DANGER name gate is `beaten` (`:437-440`, `hasDefeatedEnemy`).
- **The combat telegraph**: `IntentIcon.tsx` draws a disc with the kind's glyph (`⚠`, `?`, …, from
  the kind table at `state/presenters/combat-encounter.engine.ts:215-223`) and the move name under
  the badge (EN1c); `telegraphName` hides an unbeaten DANGER's name.
- **The log**: `selectCombatLogHistory(state, beaten)` (`:914`, `:977-979`) logs an unbeaten DANGER
  as "DANGER." with no name.

## Outcome

Before a fight the player sees what the foe's DANGER is only if they have watched it fire before,
and nothing else about its moves; in a fight the telegraph is one clear icon per kind beside the foe.

## Acceptance

- **A1 (the seen record)** The save records each DANGER the player has seen fire, on an optional
  `codex.seenDangers` list of `<enemy slug>:<move name>` keys, written when the fight ends by any
  outcome (victory, befriend, flee, defeat) for every DANGER that fired in it, de-duped. A save
  without the field loads as none seen; no version bump (as EN1b). An engine test for a fired
  DANGER on each outcome and for an old save.
- **A2 (the reveal shows only the DANGER)** For a `phases` foe the reveal shows no ATTACK, DEFEND,
  STATUS or UNKNOWN move, no move list or phase accordion and no number; it shows one line per
  DANGER the foe carries, in phase order. A presenter test for a normal (one DANGER) and an elite
  (two).
- **A3 (unseen reads `[ ? ? ? ]`)** A DANGER line whose key is not on the seen record reads
  `[ ? ? ? ]` and nothing else; its accessibility label says the move is unknown. A test.
- **A4 (seen reads its explanation)** A DANGER line whose key is on the seen record shows the move's
  name and its `text`. A test, with the Float-Eye seen and unseen.
- **A5 (the gate is "seen")** Every place EN1c gated a DANGER name on `beaten` (`telegraphName`,
  `threatPhaseHeader`, the pane's `dangers`, the combat log) gates it on the seen record instead; a
  DANGER that fires is named in the log from that moment. EN1c's beaten-gate tests are rewritten to
  the seen record.
- **A6 (one icon per kind)** In combat the telegraph is a single icon per kind (ATTACK, DEFEND,
  STATUS, UNKNOWN, DANGER), each kind its own drawn icon, with no move name under it and no number
  for a `phases` foe [T to confirm #1]. The accessibility label still names the kind.
- **A7 (bigger, by the foe)** The icon is at least half again its current size and sits against the
  foe's portrait on the enemy pane, not in the strip below it. A `verify:visual` baseline of the
  combat board at phone width shows it.

Measure: on the web build, a first fight with the Float-Eye shows a reveal with one `[ ? ? ? ]` line
and nothing else about its moves; after The Long Career fires and the fight ends, the next Float-Eye
reveal names "The Long Career" with its line; in the fight the telegraph is one large icon beside
the eye. Root `npm test` passes.

## Scope

- **axiomancer-mechanics:** `Game/types.ts` (`CodexState.seenDangers?`), a `Game/seen-dangers.ts`
  beside the defeat ledger (key helper, `hasSeenDanger`, the write), the END_COMBAT write in
  `game.reducer.ts`, the fired-DANGER list the reducer reads (from the combat state's threat log or a
  small field on it), the barrel exports.
- **axiomancer-mobile:** the reveal in `CombatEncounterPanel.tsx`, the reveal VM in
  `combat-encounter.engine.ts`, `telegraphName` / `threatPhaseHeader` / `selectCombatLogHistory`'s
  gate, `IntentIcon.tsx` and its place on the enemy pane, the kind icons.
- **Not touched:** move rules, phases, numbers and the order a foe plays (EN1); the reveal of foes
  without `phases` (T decides after the enemy swap); the `next` preview, wall math and log lines
  other than the DANGER name; every word of move text.

## Consumers to update

EN1c's tests (`telegraph-kind.engine.test.ts` in both workspaces, `IntentIcon.test.tsx`,
`threat-phase-header.test.ts`); ET1a's A4 (amended by this plot to read this rule); EN1k's Dark
(below); `verify:visual` baselines for the reveal and the combat board; the Act 1 walk's reveal
test ids (Enter combat and Retreat keep theirs).

## Save / schema contracts

`codex.seenDangers?: string[]`, optional, keyed `<enemy slug>:<move name>`; old saves read as none
seen; no `GAME_STATE_VERSION` bump (the EN1b pattern). The codex carries across runs with the
character (`game.reducer.ts:503-506`), so a DANGER seen in one run stays seen.

## Decisions made upfront — DO NOT ASK

1. **"Seen" means it fired in a fight the player was in**, whoever won. Reading the reveal is not
   seeing; beating a foe without its DANGER firing is not seeing.
2. **Written at the fight's end, any outcome.** A DANGER that fires mid-fight is already on screen,
   so nothing needs to change inside that fight beyond the log naming it (A5).
3. **One line per DANGER, in phase order.** A normal shows one, an elite two, the boss three; an
   elite whose first DANGER is seen and second is not shows one named line and one `[ ? ? ? ]`.
4. **The explanation is the move's own `text`**, with its name: no numbers are computed for it.
5. **Foes without `phases` are left exactly as today** (T: decide after the enemy swap).
6. **The Lamplighter's Dark** (EN1k, unbuilt): while Dark its intents read UNKNOWN as EN1k says,
   which with A6 already covers its DANGER intent in the fight. Confirmed by T (2026-10-31): "Dark
   hides its DANGER". EN1k's brief needs no change for the reveal: the reveal comes before Lit or
   Dark exists.
7. **Icon only in combat**: the move name under the badge goes [T to confirm #1]; the pill and
   numbers for a `phases` foe were already gone (EN1c).
8. **Slot: asap** [T to confirm #2]: T is playing these screens now and the MVP run shows them.

## Tests matrix

- Engine: the seen record on each outcome and an old save; the key helper.
- Mobile: the reveal VM (normal, elite, seen, unseen, mixed); the DANGER gate in telegraph, header,
  pane and log on the seen record; `IntentIcon` per kind with no name; the reveal and combat board
  baselines.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, root `npm test`,
`verify:visual` on the phase's screen, and `npm run e2e:act1-walk -w axiomancer-mobile`.

## Commit body template

`<what the player now sees before or in a fight, in plain words>. Closes A<n>, ... D117.`

## DoD

A1-A7 ticked; D117 recorded; the Act 1 walk green after each phase.

## Follow-ups (out of scope)

- **Foes without `phases`**: their reveal and telegraph, decided by T once every Act 1 foe is a new
  foe (T: "swap out all the enemies for the new enemies first").
- **Drawn icons**: if the five icons should be painted art rather than glyphs, that is T's (D88).

## Phases

### EN2a — The fight-or-flee screen shows only the DANGER · M · closes A1, A2, A3, A4, A5 · requires nothing
Measure: on the web build, a first Float-Eye reveal shows one `[ ? ? ? ]` line and no other move;
after The Long Career fires, the next reveal names it with its line.
- Scope: the seen record (engine), the reveal VM and screen, the DANGER gate moved from beaten to
  seen, D117 written into the decisions file.
- Tests: the seen record; the reveal VM; the gate in telegraph, header, pane and log.
- Verify: both workspaces, root `npm test`, `verify:visual` on the reveal, the Act 1 walk.

### EN2b — The combat telegraph: one icon per kind, bigger, by the foe · S · closes A6, A7 · requires nothing
Measure: on the web build, the Float-Eye's telegraph in combat is one large icon against its
portrait with no name under it.
- Scope: `IntentIcon.tsx` (one icon per kind, no name, larger) and its place on the enemy pane.
- Tests: `IntentIcon.test.tsx` per kind; the combat board baseline.
- Verify: `npm run verify -w axiomancer-mobile`, root `npm test`, `verify:visual` on the combat board.
