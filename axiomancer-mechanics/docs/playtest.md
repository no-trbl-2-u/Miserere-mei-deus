# Hazard-Pattern Combat Playtest Reference

> One-page reference for the combat playtest harness: stage profiles, the
> sim-policy roster, the deck-selection grammar, the sandbox card workflow,
> and the CLI cookbook. Doctrine: the enemy's SOLE bar is HP and status
> effects are the EFFICIENT path to dropping it — the harness exists to keep
> that true at every stage of the campaign.
>
> Loops that consume this: none until Phase R12 writes a new combat-playtest
> command (the old one was archived in R0).
> Card changes ship only from a brief T approved (D88, D99). Engine constants
> are tuned manually against this harness's evidence.

## Stage profiles

Defined in `src/Combat/combat.stage-profiles.ts` (numbers marked
`// PLAYTEST-CALIBRATION` — the source is authoritative). Each stage builds a
deterministic player (`buildStagePlayer`) whose known skills are the stage's
eligible card pool (`stageEligibleCardIds`: library + registered sandbox
cards, filtered by `tier <= maxCardTier` and learning level).

| Id | Name | Player | HP | Max tier | Enemy roster (slugs) |
|---|---|---|---|---|---|
| `early` | The Shallows | level 3, 5/5/5 | 90 | 1 | float-eye, brine-hag, death-beholder |
| `mid` | The Long Road | level 20, 17/17/17 | 255 | 3 | brine-hag, death-beholder |
| `late` | The Deep Wood | level 45, 37/39/38 | 570 | 3 | death-beholder |

The rosters are the three foes left after the enemy roster reset (revamp
R2); the `impossible` ceiling stage went with its only foe. The rosters
regrow in B2.

## Sim-policy roster

Defined in `src/Combat/combat.sim-policies.ts`; consult
`COMBAT_SIM_POLICIES` for each policy's signature list and Conviction
threshold.

| Id | Sees hidden stances? | Plays like |
|---|---|---|
| `greedy` | no | The canonical witness: the original bestCard ordering — payoff timing, new-status-first, status-over-strike. |
| `blind` | no | Identical play to `greedy` since D7: its only difference (drafting off revealed stances only) died with the draft. Kept so the matrix keeps its column. |
| `dot-weaver` | yes | DoT and rupture/amplify payoffs above all; utility only once the enemy is already bleeding. |
| `control-lock` | yes | Control and stat-debuffs first — aims to deny the enemy's telegraphed threat phases. |
| `aggro-brute` | yes | Raw bottom-damage preview, no payoff timing. The doctrine's weak baseline — its underperformance IS the design. |
| `turtle` | yes | Guard/barrier/defend first, DoT second; hoards Conviction (high signature threshold). |
| `chaos` | no | Uniform-random card play and random affordable signatures (seeded rng) — the noise floor. |
| `mercy-seeker` | yes | Controls to survive, befriends as soon as the HP gate opens, always spares. |

Tune player-facing difficulty against `blind`; ceilings against `greedy`;
doctrine assertions against the archetype pairs (e.g. `dot-weaver` must beat
`aggro-brute` on the late stage).

## Deck-selection grammar

One grammar shared by `npm run combat-playtest --deck=...`,
`npm run combat -- --deck ...`, and `CombatDeckSelection`
(`src/Combat/combat.playtest.ts`):

| Form | Meaning |
|---|---|
| `grey` | The fresh-run grey deck (`STARTING_CARD_IDS`: Blow 5 / Ward 3 / Word 2) — the default |
| `cards:a,b,c` | An explicit card-id list (invalid ids dropped) |

The preset table, the seeded drafts, `policy-pick`, the measurement-seat
swaps and the named sandbox sets went in revamp R7b (D50): with a three-card
library there was nothing left to draft, swap or A/B. No escape card is
appended — there is no in-combat retreat; a fight resolves only by winning or
losing. Deck resolution is not random.

A sandbox card (`src/Cards/cards.sandbox.ts`, `registerSandboxCards`) still
resolves through `getCardById`, so a test can register one and name it in a
`cards:` deck. Sandbox content never ships; a new card enters the library
only from a brief T wrote or approved (D88, D99).

## CLI cookbook

```bash
# Full matrix: all stages, greedy policy, the grey deck, 60 runs/cell, seed 1
npm run combat-playtest

# One stage under the player-feel witness, with the per-card usage table
npm run combat-playtest -- --stage=early --policy=blind --runs=100 --seed=7 --cards

# Every policy on the late stage (doctrine check: dot-weaver vs aggro-brute)
npm run combat-playtest -- --stage=late --policy=all --runs=60 --seed=1

# An explicit card list against one enemy, machine-readable for agents
npm run combat-playtest -- --stage=mid --enemy=brine-hag --deck=cards:grey-strike,grey-strike,grey-ward --json

# A single auto-played encounter through the interactive CLI (fast qualitative sweep)
npm run combat -- --enemy float-eye --auto --policy status --seed 5 --deck grey --max-turns 6

# A hand-playable encounter: stage player, the grey deck, JSONL answers on stdin
npm run combat -- --enemy brine-hag --stage mid --deck grey --seed 11 --stdin --json-events
```

The `combat-playtest` CLI (`src/CLI/combat-playtest.cli.ts`) accepts
`--stage=early|mid|late|all`, `--policy=<id|all>`,
`--deck=<grammar above>`, `--enemy=<slug>`, `--runs=N`, `--seed=N`,
`--cards`, `--json`. Every sweep runs spec 33's
Upgradeable Dice — the only combat model since the flag collapse (D7,
2026-09-25). `--upgradeable-dice` is still accepted as a no-op for old
scripts; `--legacy-dice` fails loudly (that model was deleted), and the report
no longer carries a `Dice model:` header or a `diceModel` field. The interactive
`combat` CLI's answer protocol (script/stdin JSONL) lives in `src/CLI/io.ts`.

## The e2e bands were the balance contract

`src/Combat/e2e/combat-playtest.balance-bands.sim.test.ts` used to pin
per-stage bands over the matrix (win-rate floors/ceilings, the
status-engagement and DoT-erosion witnesses, the `dot-weaver` beats
`aggro-brute` assertion). Those bands were repealed 2026-09-02 by THE BIG
NUMBERS REWRITE; the file is now a smoke test — the matrix runs across every
stage without crashing and every cell's outcome accounting is exact with a
finite win rate. Companion witnesses:
`combat-playtest.matrix.sim.test.ts` (determinism + invariants) and
`combat-playtest.card-coverage.sim.test.ts` (every library card must be
playable — dead cards fail the build).

**Starter-deck win-rate curve (load-bearing doctrine, set 2026-07-08 — see
`VISION.md` → Combat vision):** early ~80%, mid ~50%, late ~25-35%.
The current placeholder bands above (esp. the late win-rate ceiling) predate
this doctrine
and should tighten toward it as calibration runs land — a starter deck
clearing late well above this curve is a dominance finding, not a
success, since starter decks are early/mid-game decks by design (the
player trades into a new mid-game deck after the labyrinth). Correction
history: `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-08-win-path-scaling.md`.
