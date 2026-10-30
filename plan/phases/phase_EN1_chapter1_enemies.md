# Phase EN1 — Chapter 1's enemies

## Sources

- T's request, 2026-10-30, in the Claude Duet enemy-drafts thread, after reading the Breakwater
  Bestiary drafts and their recommendations: "Set tithe collector as the elite instead of the
  lamprey knot. For the normals, we'll use all of them. Keep the first region's set below level
  10 though we'll figure out how frequently they repeat. ... but yes to everything. Get the PR in
  and get it merged."
- T's enemy rules, 2026-10-29, same thread: intents telegraphed but not exact (attack, defend,
  status, DANGER, unknown); DANGER is the signature move, named at fight start only if the foe was
  beaten before; phases change at HP lines, at most one change per turn, DANGER on every change;
  normals 2 phases (30%), elites 3 (60/30), bosses 4 (75/50/25). Current foes "just deal" and
  reach their last phase too fast.
- Decisions: **D116** (this plot's rules), D45 (every keyword has a live counter), D57 (a
  measurement is not a gate), D88 (enemies and art are T's content; T designed these), D97 (sprite
  sheets only for used enemies), D106 (each region is a chapter), D114 (the 44-node Breakwater),
  D115 (every image is open source).
- Part plan: `plan/revamp/enemies.md` → "B2 — Enemy revamp (owner)". This plot is B2's Chapter 1
  slice for the normals and the C1 elite. B2 stays open for the L4 and W5 elites, the sea keep's
  boss and Chapters 2-4.

## Outcome

Every Breakwater fight node meets one of T's ten normals and the sea cave meets the
Tithe-Collector, each telegraphing a kind instead of a number, changing phase at its HP lines
with its DANGER move, and carrying only the six enemy words.

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile` green;
the Breakwater e2e fights every fight node's foe and sees its DANGER fire at its line; EN1i's
table exists for T's tuning session.

## Acceptance

- **A1 (HP phases)** A foe that declares `phases` changes phase only when its VITAE crosses a line
  of its tier: normal 30%; elite 60% and 30%; boss 75%, 50% and 25%. At most one change happens
  per turn boundary (a hit that crosses two lines changes one phase now and the next at the
  following boundary). Its DANGER move resolves on each change and at no other time. A test drives
  each tier across each line.
- **A2 (fixed loop)** Inside a phase the foe plays that phase's moves in their listed order,
  repeating. Round gates (`TIER2_DEFAULT_ROUND`, `TIER3_DEFAULT_ROUND`) and the last-card repeat do
  not apply to it. A foe with no `phases` keeps today's deck path unchanged. Tests for both.
- **A3 (no escalation clock)** The escalation formula is not applied to a normal or elite foe that
  declares `phases`, at all three sites that compute it. Bosses and foes without `phases` keep it.
  A test pins both.
- **A4 (the telegraph shows a kind)** For a `phases` foe the intent is one of ATTACK, DEFEND,
  STATUS, DANGER or UNKNOWN, with the move's name and no damage, WARD or stack number anywhere on
  the board (intent, next preview, wall math, phase header). The mobile intent icon draws all five
  kinds. Tests in both workspaces.
- **A5 (DANGER is named only once beaten)** At fight start the enemy pane shows the foe's DANGER
  move names only if the save records that foe as beaten; otherwise it shows the DANGER icon with
  no name, and the DANGER intent stays unnamed when it fires. A test for each case.
- **A6 (the defeat ledger)** The save records each foe slug the player has beaten (a win or a
  befriend). The field is optional, so a save written before it loads and reads as "none beaten".
  Tests in `game.migrate.test.ts` and the reducer.
- **A7 (enemy words, part 1)** WARD, MEND, SCOUR and BRINE resolve as D116 and the gloss below say;
  VULNERABLE lands on the player from a foe's move; LEECH can land on the player (it ticks at the
  start of the player's turn and the foe heals what the player loses). Each has a gloss, a mobile
  glyph and an atlas row, and each gloss names its counter. Tests per word.
- **A8 (enemy words, part 2)** TANGLE, UNDERTOW and BARNACLE resolve as the gloss below says, with
  gloss, glyph, atlas row and counter. Tests per word. `docs/game-model.md` describes the new enemy
  turn, the telegraph and the six words, and its "No enemy keywords" line is amended to D116.
- **A9 (fields and quays)** Float-Eye (reworked in place), Gallows Crow, Net-Mender and Crane-Hook
  play exactly the moves of the Appendix, and their nodes bind them at the levels in "The
  Breakwater table" below. Each has a portrait (a stand-in, see Decisions) with its provenance
  record.
- **A10 (long pier and town)** Brine-Widow, Lamprey-Knot, Green Jelly (reworked in place, still
  befriendable at 30%) and Curfew-Ringer, the same way.
- **A11 (cliffs)** Wreck-Picker and Smokehouse Gutter, the same way.
- **A12 (the C1 elite)** The Tithe-Collector fights at `bw-c1` with 3 phases, its two DANGERs and
  its LEDGER counter shown on the board, as the Appendix says, with a stand-in portrait.
- **A13 (the table for tuning)** A committed report gives, for every Breakwater foe at its node's
  level, the turns to kill and the VITAE lost for the four lane decks kitted at L8 and L10 (the
  lane's test deck upgraded once and its 3 relics; grey has none), and the share of fights that
  reach each phase. A measurement, not a gate (D57).

## Decisions made upfront — DO NOT ASK

- **Where the model lives.** `Enemy` (`Enemy/types.ts:152`) gains an optional `phases` field:
  one entry per phase, each a list of moves played as a loop, plus one DANGER move per phase
  change. The tier's lines come from `difficulty` (normal, elite, boss). A foe with `phases`
  bypasses `ENEMY_DECKS`, `compileEnemyDeck` and its `stages`; a foe without it is untouched
  (the Death Beholder keeps its deck and stages until enemy session 2 designs the sea keep's boss).
- **One change per turn.** The check runs where today's stage check runs
  (`processBetweenPhases`, `combat.engine.ts` ~1566). When the foe crosses a line its next move is
  that change's DANGER, then the new phase's loop starts at its first move.
- **The telegraph.** `CombatIntentType` gains `attack`, `defend`, `status`, `danger`, `unknown`
  for `phases` foes; the old kinds stay for the boss until it moves over. A move's kind is the
  Appendix's Kind column. Numbers are dropped from the VM (`intentVM`, the `next` preview,
  `wallMath`, `threatPhaseHeader`) for these foes, not hidden with CSS.
- **The defeat ledger** is `codex.defeatedEnemies?: EnemySlug[]`, written by the END_COMBAT
  reducer on a win or a befriend. Optional, so no `GAME_STATE_VERSION` bump and no hop.
- **Words.** WARD n: the foe's GUARD; soaks the player's DEAL; gone at the start of the foe's next
  turn; VULNERABLE, LEECH and INFERNO skip it. MEND n: `enemyHeal`. SCOUR: `enemyCleanse` of one
  status. BRINE n: GUARD the player gains is cut by n until the end of the player's next turn.
  TANGLE n: the player's next n cards cannot use their FREE line. UNDERTOW: one named die does not
  roll on the player's next turn. BARNACLE: a Curse into the player's hand; cannot be played or
  scrapped; falls off when the player spends a body die on a card. VULNERABLE uses
  `debuff_vulnerable`; LEECH on the player mirrors the program ledger's foe LEECH (turns and
  potency) on the player's side. A foe-only counter (LEDGER, the Wreck-Picker's hoard, the
  Curfew-Ringer's toll count, the Green Jelly's HELD cards) is fight state shown on the enemy pane,
  not a keyword.
- **Numbers.** The Appendix numbers are authored at level 2 (elite: level 3). A move's damage,
  WARD and stack numbers scale with level the way today's threat budget scales damage
  (`threatDamageBudget`), so a level change in tuning moves them together. The live ×2 VITAE knob
  stays.
- **Levels and repeats** follow "The Breakwater table" below, every foe under level 10
  [T to confirm #1]. Each fight node binds one foe; a zone's two foes alternate across its nodes
  [T to confirm #2]. Both are starting points for T's tuning session.
- **Per-node binding.** `poolFor` (`World/MapEvents/content.ts:289`) stops mapping by kind for
  `fight` and `bw-c1`; a `BW_ENCOUNTER_FOES` table by node id replaces `BW_FIGHT_LEVEL` for fights,
  like `CW_ENCOUNTER_FOES`. `bw-l4` and `bw-w5` keep today's foe (the Green Jelly at
  `BW_ELITE_LEVEL`) and `bw-k2` keeps the Death Beholder until enemy session 2's plot.
- **Other chapters.** The Float-Eye and Green Jelly reworks apply wherever they appear. The Green
  Jelly becomes `difficulty: 'normal'` everywhere. Measured-truth drift from this is expected and
  is not filed as a balance row.
- **Portraits.** Each new foe ships with the stand-in T saw on the Bestiary page, restored from
  git history into `axiomancer-mobile/assets/images/enemies/<slug>.webp` and registered in
  `ENEMY_ART_BY_KEY`, with a provenance record `open source (T, 2026-10-29, D115)` and the note
  "stand-in until T's portrait swap". No sprite sheets (D97: not until used and picked). Map:
  gallows-crow ← `wharf-shrike`, net-mender ← `sugata`, crane-hook ← `raw-head-rex`,
  brine-widow ← `hasshaku-sama`, lamprey-knot ← `foot-stealer`, curfew-ringer ← `little-belle`,
  wreck-picker ← `hag`, smokehouse-gutter ← `butcher`, tithe-collector ← `bone-wizard-b`. Each
  file is at `<commit>^` of its deletion: `hag` at `5117001a8^`, the rest at `c20ebe14e^`. The
  Float-Eye and Green Jelly keep their art and frames.
- **Prose.** Each foe's `description` is the Appendix's one-line flavour. No journal or befriend
  data for the new foes.
- **Ids.** Slugs as in the Appendix (`gallows-crow`, ...); enemy ids `enemy-<slug>`.

## The Breakwater table

| Zone | Nodes and foe | Level |
|---|---|---|
| Fields & south road | `bw-w2` Float-Eye, `bw-w3` Gallows Crow, `bw-m1` Float-Eye, `bw-p2` Gallows Crow | 2 |
| The quays | `bw-h1` Net-Mender, `bw-h2` Crane-Hook, `bw-h3` Net-Mender | 3 |
| Long pier & harbour steps | `bw-h7` Brine-Widow, `bw-t1` Lamprey-Knot | 4 |
| Town | `bw-t2` Green Jelly, `bw-t3` Curfew-Ringer, `bw-t6` Green Jelly | 5 |
| Cliffs & hamlet | `bw-l1` Wreck-Picker, `bw-d1` Smokehouse Gutter, `bw-d3` Wreck-Picker | 6 |
| Sea cave (elite) | `bw-c1` The Tithe-Collector | 5 |

## Tests matrix

- New: `Enemy/e2e/enemy-phases.engine.test.ts` (A1-A3), `Game/e2e/defeat-ledger.engine.test.ts`
  (A6), `Combat/e2e/enemy-words.engine.test.ts` (A7, A8), one suite per content phase for its
  foes' moves and riders (A9-A12), a Breakwater e2e case per fight node (A9-A12).
- Mobile: `IntentIcon.test.tsx` (five kinds), `threat-phase-header.test.ts` (no numbers),
  `enemy-art.test.ts` (new keys).
- Rewritten: `round-keyed-deck-tiers`, `revamp-roster`, `enemy-ids`, `breakwater-chapter*`,
  `CombatCombatantPane.float-eye` and `.green-jelly` where they pin old moves.

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile` for EN1c and every
content phase; root `npm test`.

## Commit body template

```
enemies: <what this slice adds> — phase EN1<x>

Closes A<n>[, A<m>]. D116.
```

## DoD

A1-A13 ticked.

## Follow-ups (out of scope)

- The L4 and W5 elites and the sea keep's boss (enemy session 2, Oct 31, then its plot). Drafted
  options: the Lamplighter or the Wrecker at L4, the Toll-Keeper or the Tide-Gate at W5.
- Tuning: final levels, repeat rate and VITAE (T's session after EN1i), and the cards.
- T's portrait swap: each stand-in replaced by T's pick.
- Chapters 2-4's foes and the bosses' move to the phase model.
- The measured-truth danger band (`plan/PHASE_CANDIDATES.md`, score 6.0).

## Phases

### EN1a — Enemy phases: HP lines, fixed loops, DANGER on change · L · closes A1, A2, A3 · requires nothing
Measure: `enemy-phases.engine.test.ts` drives a fixture normal, elite and boss across every line.
- Scope: `Enemy/types.ts`, `Enemy/index.ts`, `Combat/combat.engine.ts` (`processBetweenPhases`,
  the three escalation sites), `Combat/combat.threat.ts` (a phases path beside `resolveAuthored`).
  A test fixture foe carries the model; no live foe moves yet.

### EN1b — The defeat ledger · S · closes A6 · requires nothing
Measure: a win and a befriend each add the slug; an old save loads with none.
- Scope: `Game/types.ts`, `Game/game.reducer.ts` (END_COMBAT), `Game/game.migrate.ts` (nothing to
  hop; a test proves the optional read).

### EN1c — The telegraph shows a kind · M · closes A4, A5 · requires EN1a, EN1b
Measure: mobile tests render the five kinds with no number; the DANGER name shows only when beaten.
- Scope: `Combat/combat.encounter.types.ts` (`CombatIntentType`), `combat.threat.ts`
  (`deriveIntentType`), mobile `combat-encounter.engine.ts` (`intentVM`, `enemyPane`,
  `threatPhaseHeader`), `IntentIcon.tsx`, `CombatEncounterPanel.tsx` timeline.

### EN1d — Enemy words, part 1: WARD, MEND, SCOUR, BRINE, VULNERABLE and LEECH on the player · L · closes A7 · requires EN1a
Measure: `enemy-words.engine.test.ts` resolves each word and its counter.
- Scope: engine resolution (`resolveThreatPhase`, the player's DEAL soak for WARD, the player's
  GUARD gain for BRINE, a player-side LEECH tick), `Enemy/enemy-keywords.ts` (the `never` type
  becomes the six words), glosses, glyphs, atlas rows.

### EN1e — Enemy words, part 2: TANGLE, UNDERTOW, BARNACLE · M · closes A8 · requires EN1d
Measure: `enemy-words.engine.test.ts` resolves each word and its counter.
- Scope: the card FREE line check (TANGLE), the dice roll (UNDERTOW), a BARNACLE Curse card and
  its body-die release; `docs/game-model.md`.

### EN1f — Fields and quays: Float-Eye, Gallows Crow, Net-Mender, Crane-Hook · L · closes A9 · requires EN1c, EN1e
Measure: the Breakwater e2e fights `bw-w2`, `bw-w3`, `bw-m1`, `bw-p2`, `bw-h1`, `bw-h2`, `bw-h3`.
- Scope: `Enemy/enemy.library.ts`, the per-node `BW_ENCOUNTER_FOES` table and `poolFor`, the four
  foes' riders, three stand-in portraits.

### EN1g — Long pier and town: Brine-Widow, Lamprey-Knot, Green Jelly, Curfew-Ringer · L · closes A10 · requires EN1f
Measure: the Breakwater e2e fights `bw-h7`, `bw-t1`, `bw-t2`, `bw-t3`, `bw-t6`.
- Scope: as EN1f; the Green Jelly's HELD cards and the Curfew-Ringer's toll count on the pane;
  three stand-in portraits.

### EN1h — Cliffs and the sea cave: Wreck-Picker, Smokehouse Gutter, the Tithe-Collector · L · closes A11, A12 · requires EN1g
Measure: the Breakwater e2e fights `bw-l1`, `bw-d1`, `bw-d3` and `bw-c1`.
- Scope: as EN1f; the hoard and the LEDGER on the pane; `bw-c1` bound to the Tithe-Collector;
  three stand-in portraits.

### EN1i — The tuning table · S · closes A13 · requires EN1h
Measure: `docs/reports/chapter1-enemies.md` exists with the table.
- Scope: a script over `simulatePacing` (`Combat/combat.pacing.sim.ts`) for each foe at its node
  level against the four kitted lane decks at L8 and L10; the report; no balance change.

## Appendix: the roster (T's picks, from the Breakwater Bestiary page, 2026-10-30)

Kinds are the telegraph kinds. "D" is the normal's DANGER, fired at its 30% line. The moves
without "D" are the phase 1 loop, in order; "Phase 2" changes that loop.

### Fields & south road

Nodes: W2 Gallows crossroads, W3 Field road, M1 South fork, P2 Mountain path.

#### Float-Eye (`float-eye`)

The eye that outlived its head, reworked. It punishes a full hand and a big final blow.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Long Look | 6 damage, +2 for each card you leave unplayed in your hand. |
| 2 | ATTACK | Afterimage | 5 damage. If your GUARD blocks all of it, the eye copies your GUARD as its own WARD. |
| 3 | DEFEND | Shut Lid | WARD 8. While shut it cannot see: the next status you put on it lasts 1 turn longer. |
| 4 | STATUS | Stare | You are VULNERABLE 25% for 1 turn. |
| D | DANGER | The Long Career | Hits back for half the damage you dealt it last turn. Cross 30% with a small hit, then finish it. |

Phase 2 (below 30%): Shut Lid leaves the pool. Long Look rises to +3 per unplayed card.

Counters: Blood Price bursts eat The Long Career. Defender over-guarding feeds Afterimage. Grey learns GUARD vs hand size.

#### Gallows Crow (`gallows-crow`)

Lives on the crossroads gibbet, collecting what the hanged still owed.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Peck the Debt | 3 damage, 2 hits. Each hit that gets through steals 1 Conviction. |
| 2 | ATTACK | Carrion Dive | 8 damage. If you are under half VITAE: 12 damage, and the crow MENDs 4. |
| 3 | DEFEND | Take Wing | WARD 6. If you do not hit it this turn, its next attack gains +3. |
| 4 | STATUS | Shiny Thing | Steals one banked die. With none banked: TANGLE 1. |
| D | DANGER | Murder of Crows | One 2-damage hit per 2 cards in your discard (at least 3 hits). |

Phase 2 (below 30%): Peck the Debt becomes 3 hits.

Counters: Defender THORNS shred the multi-hits. Blood Price low-VITAE turns get punished by Carrion Dive. Dice bankers lose dice.

### The quays

Nodes: H1 Quay end, H2 Crane quay, H3 Harbour light pier.

#### Net-Mender (`net-mender`)

A drowned fisherman still mending the net he went down in.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Cast Net | 5 damage and TANGLE 1. |
| 2 | ATTACK | Haul In | 6 damage. If you are TANGLED: 11 damage, and the tangle ends. |
| 3 | DEFEND | Mend the Net | MEND 6 and it SCOURs one status off itself. |
| 4 | STATUS | Gill-hook | A BARNACLE Curse goes into your hand. |
| D | DANGER | The Whole Catch | 3 damage per card in your hand, then TANGLE 2. |

Phase 2 (below 30%): Cast Net and Haul In always come back to back.

Counters: Banked dice and the gold die cut through TANGLE. LEECH and INFERNO stacks get scoured.

#### Crane-Hook (`crane-hook`)

An iron dock crane that swings on its own and lifts whatever is owed.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Swing | 8 damage. Your GUARD counts half against it. |
| 2 | ATTACK | Counterweight | 4 damage now, 6 more next turn unless you deal 10+ to it this turn. |
| 3 | DEFEND | Lock the Brake | WARD 10. |
| 4 | STATUS | Hoist | UNDERTOW: your body die is lifted out of your next roll. |
| D | DANGER | Drop the Load | 15 damage. If you block all of it, the crane is VULNERABLE 50% for 2 turns. |

Phase 2 (below 30%): Counterweight's second hit grows to 9.

Counters: Swing undercuts the Defender, but Drop the Load pays the Defender back. Body-heavy hands hate Hoist.

### Long pier & harbour steps

Nodes: H7 Long pier, T1 Harbour steps.

#### Brine-Widow (`brine-widow`)

She waits at the pier end with a fist of salt for whoever comes back.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Salt the Wound | 5 damage, doubled if you carry any status. |
| 2 | ATTACK | Keening | 4 damage and BRINE 3. |
| 3 | DEFEND | Black Veil | WARD 6. While veiled, your HEAL is halved. |
| 4 | STATUS | Mourning | You are VULNERABLE 25% for 2 turns. |
| D | DANGER | Throw the Salt | Strips your THORNS, REFLECT and INFERNO, then 3 damage for each one stripped. |

Phase 2 (below 30%): Keening's BRINE rises to 5.

Counters: Hits Defender and Elementalist setups hard. Blood Price HEAL is halved under the veil. Grey barely notices.

#### Lamprey-Knot (`lamprey-knot`)

A ball of lampreys knotted round a pier pile, feeding on the tide line.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Latch | 4 damage and LEECH 2 on you: it heals what you lose. |
| 2 | ATTACK | Writhe | 2 damage, 3 hits. |
| 3 | DEFEND | Knot Up | WARD 5 and MEND 4. |
| 4 | STATUS | Mouthful | LEECH 3 on you. |
| D | DANGER | Unravel | 4 damage per turn of LEECH left on you, then it lets go. |

Phase 2 (below 30%): Writhe rises to 4 hits.

Counters: THORNS and REFLECT tear up Writhe. Blood Price races it with its own LEECH. Fast kills beat it.

### Town

Nodes: T2 Bridge approach, T3 Town gate, T6 Upper town.

#### Green Jelly (`green-jelly`)

The Face Broker, moved into the town. Keeps what it eats, and shows you your own face. Befriend window kept at 30%.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Engulf | 5 damage. The next card you play is HELD inside it until it dies or its DANGER fires. |
| 2 | ATTACK | Show You Your Face | Deals what you dealt it last turn, up to 10. |
| 3 | DEFEND | Settle | WARD 8. |
| 4 | STATUS | Reflection | Copies the last status you put on it back onto you. |
| D | DANGER | Spit It Out | Every HELD card drops into your discard, 4 damage per card. |

Phase 2 (below 30%): Engulf holds 2 cards. The Open Hand can now befriend it.

Counters: Burst decks get mirrored. Status decks get their own status back. The befriend path stays the soft route.

#### Curfew-Ringer (`curfew-ringer`)

Rings the town to bed. Anyone still out after the bell is fair game.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Toll | 4 damage, +2 for every Toll already rung this fight (the count shows). |
| 2 | ATTACK | Clapper | 7 damage, +4 if you played 3+ cards this turn. |
| 3 | DEFEND | Bar the Door | WARD 8. |
| 4 | STATUS | Hush | TANGLE 2. |
| D | DANGER | Curfew | Next turn you can play at most 2 cards. |

Phase 2 (below 30%): Toll comes every other turn.

Counters: A clock: it rewards fast kills. Elementalist STORM and INFERNO race it well.

### Cliffs & hamlet

Nodes: L1 Cliff crossroads, D1 Fishing hamlet, D3 Hamlet rise.

#### Wreck-Picker (`wreck-picker`)

A cliff scavenger who strips what the sea brings in, and what you carry.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Pick Over | 5 damage, and takes a random card from your discard into its hoard. You get the hoard back when it dies. |
| 2 | ATTACK | Hurl Flotsam | 3 damage per card in its hoard. |
| 3 | DEFEND | Hide in the Hoard | WARD 3 per hoarded card. |
| 4 | STATUS | Gull-call | UNDERTOW on a random die. |
| D | DANGER | Everything Washes Up | 4 damage per hoarded card, then the cards go back to your hand. |

Phase 2 (below 30%): Pick Over takes 2 cards.

Counters: Defender RETRIEVE fights the theft. Thin decks feel it most.

#### Smokehouse Gutter (`smokehouse-gutter`)

Something gutted and hung on the hamlet's smoking racks, still working.

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Smoke Lash | 6 damage. If INFERNO is on the board, adds its INFERNO and gains that much WARD. |
| 2 | ATTACK | Gut Hook | 7 damage. If it gets through your GUARD: BARNACLE. |
| 3 | DEFEND | Hang to Cure | MEND 8, but it is VULNERABLE 25% next turn. |
| 4 | STATUS | Choking Smoke | TANGLE 2. |
| D | DANGER | Light the Racks | INFERNO 4 on both sides. |

Phase 2 (below 30%): Gut Hook always lands its BARNACLE.

Counters: The Elementalist check: lean on BLIZZARD and STORM, not INFERNO. Everyone else just takes the fire.

### C1 elite: The Tithe-Collector (`tithe-collector`)

The town's tithe is due, and he has followed you down to the sea cave to collect it. Your name is already in the ledger.

Mechanic: LEDGER: a counter on the collector. +1 for each card you scrap and each Conviction you spend. His DANGERs read it.

Phase 1 (100-60%):

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Assess | 6 damage, +3 for each card you scrapped this turn. |
| 2 | ATTACK | Garnish | 6 damage and takes 2 Conviction. With none to take: +4 damage. |
| 3 | DEFEND | Ledger Shield | WARD equal to twice your Conviction. |

DANGER at 60%: **Audit**. 3 damage per LEDGER, then the LEDGER clears.

Phase 2 (60-30%):

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | STATUS | Lien | A Lien (BARNACLE) Curse into your hand. His attacks gain +2 per Lien in your hand. |
| 2 | ATTACK | Assess | +4 per scrapped card now. |
| 3 | ATTACK | Garnish | As before. |

DANGER at 30%: **Foreclose**. Takes all your Conviction, then 2 damage and WARD 2 per point taken.

Phase 3 (30-0%):

| # | Kind | Move | Effect |
|---|---|---|---|
| 1 | ATTACK | Seize Goods | 5 damage and takes the top card of your discard until he dies. |
| 2 | ATTACK | Assess | As before. |

Counters: Signature players spend Conviction before each line, but spending feeds the LEDGER. Body cards shake off Liens. Grey barely scraps, so Audit stays small.
