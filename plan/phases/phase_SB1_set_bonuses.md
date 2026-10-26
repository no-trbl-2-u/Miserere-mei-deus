# Phase SB1 — Set bonuses: T's design session

## Sources

- `/plot` from T, 2026-10-26 (in session; plot run unattended, T not present to answer). T, verbatim, answering
  call 3 of the EQ2 plot (PR #927, "the five-of-a-lane row in D100 can't happen with three relic slots; leave it
  to B1"): "Well, not necessarily. They can still be only weapons or armor and not GRANT a lane, but they could
  still help by completing a set, which could help the player with set bonuses including but not limited to
  increasing the 2 lane-specific rewards to 3 lane-specific rewards. But we can work that out later with an
  additional attended phase row (doesn't need to be part of the Act 1 MVP deadline) where we plot set bonuses."
- Decisions it rests on: D105 (one weapon, one armor, three relic slots), D100 (lane relics stack: 3 of one lane
  give 2 lane cards, 5 give all 3), D104 (worn relics count the lane slots; carried relics unlock lanes), D71 and
  D73 (a relic names the lane or family it opens), D47 (relics grant signatures), D88 and D99 (relics, weapons and
  armor are content, built only from a row T wrote or approved).
- Plan read while shaping this (already built, already planned, new):
  - **Already decided — weapons and armor grant no lane and no signature.** EQ2's calls 1 and 2
    (`plan/phases/phase_EQ2_equipment_slots.md`, merged #927, defaults accepted at merge) stand; T's words above
    keep them ("They can still be only weapons or armor and not GRANT a lane").
  - **Already planned — the lane slot count.** RW1a (`plan/phases/phase_RW1_reward_rule.md`, open) writes the
    slot function: 0, 1 or 2 lane cards of 3 from the most-worn lane, with D100's "5 give 3" row kept in the
    function but unreachable (three relic slots). LR1 (`plan/phases/phase_LR1_lane_relics.md`) adds T's six lane
    relics, three per lane (Blood Price, the Elementalist). EQ2a adds the `relic` slot kind.
  - **Already planned — the relic pass.** B1 (`plan/revamp/relics.md`, blocked: owner-led, T's session dated
    Dec 5) keeps the starting ring and stat-only relics. Weapon and armor content is "B1 or a later plot" (EQ2
    Follow-ups).
  - **New — sets.** Nothing in code or plan names a set, a set piece or a set bonus (grep `set bonus` over
    `plan/`, `docs/`, `axiomancer-mechanics/src`: no hits). No weapon or armor item exists
    (`relicLibrary` holds relics only; the v13 → v14 hop purged the rest).
- Code the later build rows will lean on (named so the session can see what exists; this phase changes none of
  it): `Items/types.ts` (`Equipment`, `EquipmentSlot`, `laneId?` once RW1a lands), `Character/types.ts`
  (`EquipmentLoadout`), RW1a's lane slot function, `Items/equipped.ts` (the stat fold), the satchel dock and
  item detail presenters in `axiomancer-mobile/state/presenters/`.

## Outcome

T and the agent agree, in one attended sitting, what a set is, what completing one gives (the bonus table,
including whether and how a set lifts the lane card slots to 3), and how a set shows on screen; the result is a
written design record with a D-number and a list of build rows a later `/plot` turns into phases. Nothing is
built.

Size: S (one attended sitting of about an hour, then writing the record; plan files only).

## Acceptance

- **A1** What a set is, recorded: which pieces count (relics of one lane, a matching weapon or armor, named sets,
  or another rule T picks), how many pieces complete it or each tier of it, and whether one piece can belong to
  more than one set. Weapons and armor still grant no lane and no signature (EQ2 calls 1 and 2); the record says
  so in one line.
- **A2** The bonus table, recorded: one row per set tier (pieces worn → what it gives). It answers, in a row or a
  stated "no", whether a set raises the lane-specific card reward slots to 3 of 3, and at what tier; any other
  bonus kinds T names (stats, signature changes, reward changes) are rows too. Every bonus names the existing rule
  it changes (D100's table, the stat fold, a signature) or says it is a new rule.
- **A3** How a set shows on screen, recorded: where the player sees which set a piece belongs to, how many pieces
  of it are worn, and what the next tier gives (item detail, the satchel dock, the reward screen, or where T
  picks), in player words.
- **A4** The decision recorded: a new D-number in `plan/2026-09-25-refactor-strategy.decisions.md` with T's words
  from the session verbatim; D100's and D105's notes amended to point at it; `plan/revamp/relics.md`'s D100
  bullet amended to the new rule.
- **A5** The build rows it implies, listed: each as a one-line candidate in `plan/PHASE_CANDIDATES.md` tagged
  "needs a brief: `/plot`" (the engine rule, its save shape if any, the screen work, any set content), with the
  D-number and the record's section named, so a later `/plot` can turn each into phases. A row that needs content
  T has not written (set pieces, weapons, armor) says so.
- **A6** Nothing is built: the phase's PR changes files under `plan/` only (no code, test, workflow or content
  file), checked by its diff.

Measure: the design record (A1-A3) exists with the new D-number (A4) and at least one "needs a brief: `/plot`"
candidate (A5); the PR's diff touches only `plan/`.

## Scope

Plan files only: the design record (call 1 below), `plan/2026-09-25-refactor-strategy.decisions.md`,
`plan/revamp/relics.md`, `plan/PHASE_CANDIDATES.md`, this brief's checkboxes and the build-plan row's tick. The
sitting is T's; the agent proposes options with prior art and writes down what T decides.

## Consumers to update

None in code. Plan readers that will need the answer: RW1a's slot function (D100's five-relic row becomes the set
rule if A2 says so; if RW1a has shipped by then, the change is one of A5's build rows), B1 (set pieces among the
relics it authors, and the first weapons and armor), LR1's six lane relics (whether they are already a set of
three).

## Save / schema contracts

None in this phase. If sets need saved state (they likely do not: a set can be derived from what is worn), A5's
engine row says so.

## Decisions made upfront — DO NOT ASK

- **Weapons and armor never grant a lane or a signature; they may count toward a set.** T's words above, and EQ2's
  calls 1 and 2. The session does not reopen this.
- **The five-relic row of D100 is this phase's question, not B1's.** EQ2's call 3 left it to B1; T moved it here.
  EQ2's brief, D105 and D100 now point at SB1.
- **The record lives in a new `plan/revamp/sets.md`** `[T to confirm #1]`. Why: sets cut across relics, weapons
  and armor, and `plan/revamp/relics.md` is B1's part plan, already edited by LR1 and EQ2. `relics.md` gets a
  one-line pointer. If T prefers it inside `relics.md`, it becomes a "## Sets (SB1)" section there instead.
- **No order against B1** `[T to confirm #2]`. The row requires nothing and can be sat whenever T picks a date;
  sitting it before B1's session (Dec 5) lets B1 author set pieces and the first weapons and armor with the rule
  in hand, so that is the suggestion, not a gate.
- **Not part of the Act 1 MVP.** T: "doesn't need to be part of the Act 1 MVP deadline". The row is under
  `## Unscheduled` in `plan/deadlines.md`, "date not set"; no MVP Item changes.
- **Slot: anytime**, after the last open row (ER1). It blocks no open row and fixes no defect.
- **Attended.** The session's answers are T's design (D88, D99); the loop never picks this row on its own turn.
- **Prior art the agent brings:** Diablo II and III set items (tiered bonuses at 2/4/6 pieces), Hades' duo boons
  (two sources completing one bonus), Slay the Spire's lack of sets (why relics there stay independent). Options,
  not a recommendation.

## Tests matrix

None: a plan-only phase. The verify gate is the root plan lints.

## Verify gate

`node scripts/check-deadlines.mjs` and `npm test` at the root (plan lints) green on the phase's PR. Foreground,
never `--no-verify`.

## Commit body template

```
SB1: set bonuses, T's design session

T decided what a set is, the bonus table (and whether a set lifts
the lane card slots to 3), and how a set shows on screen. Recorded
as D<n> in plan/revamp/sets.md; D100 and D105 point at it; the
build rows it implies are candidates for /plot. Nothing built.

Closes A1-A6 of plan/phases/phase_SB1_set_bonuses.md.
```

## DoD

A1-A6 ticked; the Measure met; T has read the record.

## Follow-ups (out of scope)

- Building the set rule, its screen work and any set content: A5's candidates, each through a later `/plot`.
- Weapon and armor content: none exists; B1 or a later plot authors it, with the set rule in hand once SB1 lands.
- Whether LR1's three-relic lanes are themselves sets (a set of three relics plus a weapon or armor would give the
  four or five pieces D100's top row wanted) is A1's question; nothing in LR1 changes until it is answered.
