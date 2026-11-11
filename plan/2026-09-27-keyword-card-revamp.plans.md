# Keyword / card revamp — three plans to drive the phase

> [!NOTE]
> ## ✅ STATUS: DECIDED 2026-09-30 (D73)
>
> T ratified **Plan B (Slice first)**, amended: **one slice = one lane**
> (lanes are colour-free, so the colour-ordered slices are gone); lanes
> group into **families**, and a relic names a family; the first pool is
> **3 families × 1 lane**; **bridge cards** join sub-lanes within a family.
> **Plans A and C are rejected.** §1's session rules are **not ratified**
> (reviewed later); C1's threat matrix, the §7 D8/D20 and progression calls,
> and B5's tool shape stay open. THE CARD HOLD (D37) and the B4 inventory
> gate still apply: no card is created outside a guided session with T.
> The full ruling is D73 in `plan/2026-09-25-refactor-strategy.decisions.md`.

> Written 2026-09-27 for T, ahead of the guided sessions D37 requires. This
> is a **process** document: it decides *how* the post-purge keyword, card
> and card-type work is run, not what any keyword or card is. No keyword,
> card or card type is defined here (THE CARD HOLD, D37). Each plan is a
> different order of operations with its own gates; pick one, or splice.
> Research sources are in §6; every claim that rests on inference carries a
> confidence score (0 = guess, 100 = fact).

## 0. Where the tree stands (facts, confidence 100 unless marked)

| Fact | Value |
|---|---|
| After P1 (merged 2026-09-27, #406) the player owns | 3 grey cards: `grey-strike` A Plain Blow, `grey-ward` A Plain Ward, `grey-word` A Plain Word (D43: PAID VULNERABLE +25% for 2 turns, FREE +10% for 1 turn, stacking and uncapped) and 3 live keywords (DEAL, GUARD, VULNERABLE) |
| Card types in the engine | `CardType = 'spell' \| 'oath' \| 'hex'` — an **open enum** by design (`Cards/types.ts:65`). The haunt class and the ally library were emptied by P1; their modules remain as stubs (`hauntLibrary = []`, `allyLibrary = []`) |
| Card anatomy that survives | FREE line + PAID line, rank ladder Ash→Saint (6), tier 1–3, `color` body/mind/heart, one tray roll per threat phase |
| Stat model (S3, D40–D41) | Body = damage to the foe; Mind = anything on you; Heart = anything on the foe; Grey = unscaled. `base × stat ÷ 5`, no caps |
| Enemy side after P1 | 78 enemies keep 11 enemy keywords (HIDE, SWIFT, BRUTAL, VENOM, UNSHAKEN, ELUSIVE, REGROW, RAVENOUS, WOUNDING, FLURRY, SUMMON) and their statuses |
| Machinery kept for the rework | card rewards and cache offers are **live** on the grey cards (D44 amended D36: a won fight offers Blow, Ward and Word), `card-upgrades.ts` (D8), die growth `bonusTurnDice` / `dieUpgradeLevel` (D20), the card editor, the sandbox A/B harness, `combat-playtest` matrix + `playtester` agents, `baseline:regen` |
| Keyword discipline still on the books | ≥2 carriers + Vilain's three tests (flavor, compresses, class); complexity budget by rank (Ash/Tooth ≤1 keyword, no trigger; Splinter/Rib ≤2, one condition; Skull/Saint open) |
| **Keyword glossary purge: done** | PR #407 (keyword audit, 2026-09-27) removed every keyword only purged cards used. The keyword purge (2026-09-28, T: "purge the remaining unused keywords") then cut PIERCE, RIPOSTE and FORETELL, which had no carrier left. The atlas now lists 19 player rows plus the 11 enemy rows, and every one has a live carrier: the grey office, enemy decks, relic signature skills, consumables, or the dice and blacksmith systems. Only DEAL, GUARD and VULNERABLE have a card carrier |
| Ownership | S3 residue (PR #404): "A separate card agent owns card, keyword, upgrade and transformation design from here (T, 2026-09-27)." The plans below are that agent's process |
| Keyword wiring cost | 12 touch points per keyword (engine piece, runtime switch, display, pricing, carriers, hermetic e2e, exports, ban-list, mobile registry + gloss + glyph ×3, editor union, atlas) |
| Baseline | `c6fd758c`, 2026-09-27, FRESH: re-stamped after the keyword audit, on the grey deck (`npm run baseline:check`). The S3 residue note warns that stat scaling on top of rank-scaled bases double-counted (mid/late/impossible went to 100%); the purge was expected to undo most of it, and the post-P1 stamp is the one to read before any tuning |

**The two previous runs (confidence 65 that these are the "last 2 times").**

| Run | Shape | What happened |
|---|---|---|
| Phase 29/30, 2026-07-10 | **Keywords first.** A 31-row registry was defined and ratified, then a 70-card FREE-line pass fitted cards to it | The language outran the cards; by 2026-09-02 the library was "tuned to death under ~35 laws" (the rewrite's own words) |
| THE BIG NUMBERS REWRITE, 2026-09-02 | **Cards first, one shot.** 112 cards, 8 new keywords and a 72-row registry in a single unattended session | Purged 24 days later (D36). Nobody had played a slice of it before the whole of it existed |

Common failure: in both runs the **unit of work was the whole library**, and
the first playable moment came after the last card was written. No plan
below allows that. Every plan makes something playable by session 2 and
lets it die before the next slice starts.

## 1. What every plan shares

- **Guided sessions only** (D37). Each plan is a sequence of attended
  sessions; between sessions, agents prepare evidence, never content.
- **A slice is the unit.** A slice is ≤12 cards, ≤2 new keywords, ≤1 new
  card type, playable end-to-end (engine, mobile face, editor) before the
  next slice opens.
- **Kill gate before growth gate.** Each session opens by cutting from the
  previous slice (StS/Balatro practice, §6) and only then adds.
- **Types are the scarcest thing.** A new `CardType` is proposed only with
  the four-question test in §5 answered in writing.
- **Numbers come from the ladder, verdicts come from play.** No governing
  objective function returns (CLAUDE.md doctrine §3). The matrix and the
  `playtester` agents are bug detectors and a witness, not a grade.
- **The verdict vocabulary.** In any session T judges a card with one of
  KEEP; TWEAK <one integer delta> (numbers first, never a redesign); CUT
  <reason>, the reason one of weak / strong / redundant / wordy / tracking /
  dull / unfun-to-face / never-taken / too-niche / does-not-advance-the-set;
  PARK (to the ledger's outtakes, argued again only when a slot opens);
  TRANSFORM <to a persistent card | die face | relic | enemy-side>; REVISIT
  <date>. CUT is the default. Category verdicts ("every X in this batch")
  are legal. T never writes card text; numeric tuning of a wired card
  belongs to the kill session (§6 R2-03, R6-04, RC-04).
- **Generation is cheap; the session is a cull.** Inside the attended
  session agents draft 2–3× the slice as unwired ballot material: one line
  per candidate (slot code, FREE line, PAID line, ≤20 words together,
  generator persona and mode top-down / bottom-up), ≤3 candidates per slot,
  ≤4 on screen at once, ≤36 lines per build session. T strikes, keeps or
  merges; only survivors are built. Nothing is drafted between sessions
  (D37) (§6 R1-02, R2-01, R6-13).
- **Three artefacts, one ladder.** Every slice climbs three rungs: (1) the
  ballot; (2) the **sandbox set**, the survivors registered as one named set
  in `cards.sandbox-sets.ts` so they render in the editor face and run in
  the matrix and the reward-draft sim without touching `library/*.cards.ts`,
  reached only after a deterministic lint (schema, closed keyword list, rank
  word budget, printed-number honesty); (3) the wired slice, promoted at the
  kill session through the editor write-back and the 12-step checklist. No
  candidate reaches T unlinted (§6 R3-09, R3-11, R3-14, R6-07).
- **Session shape and clock.** A slice is two attended sessions. Build
  session, ≤90 min: 0–10 T signs the slice pitch; 10–70 agents generate the
  ballot and T culls; 70–90 agents register the sandbox set and T plays ≥3
  seeded fights. Kill session, ≤60 min, opens the next slice: T reads the
  batch sheet and the playtester write-ups side by side, cuts, extracts,
  promotes. No tuning in build, no new cards in kill (§6 R6-14, R2-04).
- **The batch sheet, the only between-session artefact.** One row per
  sandbox or promoted card: play rate and top/bottom split from `cardUsage`
  in `combat.encounter.sim.ts`; offered-vs-picked from
  `combat.reward-draft.sim.ts` (it already loads sandbox sets); win-cell
  presence, to be added before B2; damage per enemy; a synergy-gated flag;
  the cheapest patch; lint status. Flags, never bands (doctrine §3). Plus a
  prose write-up and a novelty line per playtester run, and a before/after
  run per slice (§6 R3-06, R6-03, R1-10).
- **Pool size is a decision, not a discovery.** At session 0 T writes one
  soft target for the first shippable pool (comparators: ~18-card modules
  make a runnable game; ~40 is the skeleton ceiling; 70–85 draftable per run
  at 1.0, roughly 25/50/25 by rarity, which `rankToRarity` already derives)
  with ±25% flex and a stop rule: growth beyond it only when the
  reward-draft sim's offer counts and playtester runs show repeats
  (§6 R1-03, R1-05, R1-12, RC-05).
- **Residue is filed in two places.** Design rulings (a keyword extracted,
  a grant path, a type verdict, the pool-size target) go to
  `plan/2026-09-25-refactor-strategy.decisions.md` (D45+) as today. Per-card
  outcomes go to a slice ledger, `plan/ballots/<slice-id>.md`, with
  three tables: ballot (every candidate seen: slot code, one line, persona
  and mode, verdict, reason), outtakes (every CUT and PARK with its reason),
  revisions (each TWEAK; a card is replaced at its third revision). The next
  slice's brief is proposed by this slice's kill session (§6 R2-03, R2-11).

## 2. Plan A — Vision first (the staged pipeline) — REJECTED (D73)

Model: Wizards' four-stage process (exploratory → vision → set → play
design) and the "design skeleton" (§6 A1–A4). Best when T wants the
player fantasies fixed before any card exists.

| Session | Name | Output | Gate to next |
|---|---|---|---|
| A0 | **Pillars** | 3–5 one-line player fantasies per family (body/mind/heart) + the grey office's job. What the deck should *feel* like at level 1, 8, 15 | T signs the fantasy list; ≤1 page |
| A1 | **Exploratory** | Wide brainstorm (`/brainstorm-mechanics`, `card-expert` consult, KB receipts): 30–40 mechanic *ideas*, no wiring, no names. Rejects logged with a reason | Ideas tagged to a fantasy; anything untagged dies |
| A2 | **Vision doc + skeleton** | ≤2 pages: keyword shortlist (≤8), card-type verdict (§5), the **skeleton** — a grid of slots by rank × family × type, each slot a one-line role ("Ash body: cheap multi-hit") Agents draft the skeleton and T prunes it (strike rows, never write them); only the next wave's ≤12 slots are shown, the full grid stays an agent working file; a headline mechanic gets a throwaway codename plus 3–6 sample cards, never a bare keyword row, and is named at A5 after play (§6 R7-02 naming). | Skeleton slots ≤ 40 for the first pool; T ratifies; the doc **expires** after set design (no law accumulates) |
| A3 | **Set design, in waves** | Fill the skeleton 10–12 slots per session, wired through the checklist; sandbox A/B per wave | Each wave green on all three verify gates before the next |
| A4 | **Play design** | `combat-playtest` matrix + `playtester` agents on seeded fights; kill/replace list | ≥2 cards cut per wave, or the wave is suspicious |
| A5 | **Evergreen ratification** | Which keywords are evergreen (any future set may use them), which are deciduous (this pool only) | Atlas rows labelled; D8 upgrades + D20 die growth decided here |

**Card types in Plan A.** Decided once, at A2, from the skeleton: if a slot
family cannot be filled by spell/oath/hex, that is the evidence for a type.
Prior art gate: Wizards adds a type only when it opens design space no
existing type can and carries a whole set's worth of cards (§6 A5).

Strengths: fantasies fixed first, so keywords are named for a role, not a
verb; the skeleton makes the pool's coverage visible before a card exists.
Risks: the vision doc becomes the ~35-law regime again — mitigated by the
2-page cap and the expiry rule; slowest first playable (session 3).
Sessions: 6–7. Confidence the sequence fits this repo: 80.

## 3. Plan B — Slice first (vertical prototypes) — RATIFIED, amended (D73)

Model: Slay the Spire's weekly early-access loop, Balatro's prototype
timeline, Hearthstone's "a keyword only when many cards already say it"
(§6 B1–B4). Best when T wants to be playing new cards in session 1.

| Session | Name | Output | Gate to next |
|---|---|---|---|
| B1a | **Pitch + ballot** | T signs a one-page slice pitch (one fantasy line from A0, one family, ≤12 slot codes with a one-line role each, drafted by agents from C1's threat matrix and pruned by T). Agents then generate the ballot in-session: 2–3 candidates per slot as **plain rules text** (no new keyword yet), tagged top-down or bottom-up. T culls with the §1 vocabulary to ≤12 survivors | ≤36 ballot lines; ≤4 on screen at once; CUT is the default |
| B1b | **Sandbox play** | Survivors are registered as one named set in `cards.sandbox-sets.ts` (id = the slice id) behind the deterministic lint, so they render in the editor face and run in the matrix (`--sandbox=<setId>`) and the reward-draft sim without touching `library/*.cards.ts`. T plays ≥3 seeded fights with the grey deck plus the set | Slice beats the Act 1 elite set with the grey deck + set; `playtester` write-up per run |
| B2 | **Kill + extract + promote** | T reads the batch sheet (§1) and the playtester write-ups side by side; cuts with a reason; **extracts keywords** only where ≥3 KEEP cards share identical text and Vilain's tests pass; survivors are promoted from the sandbox set into the library in the same PR (the editor write-back is used here, at the last rung only); the slice ledger is updated | Cut list ≥2; extracted keywords ≤2; wired through the 12 steps; ledger complete |
| B3 | **Rules note, then slice 2: mind** | Before slice 2 opens, T ratifies a ≤15-line note (prepared by agents from `combat.engine.ts`) fixing what "hit", "dealt", "guarded", "applied" and "consumed" mean for triggers and when a turn ends for a fading effect; it lives in the atlas header (wording, not a keyword, so D37 holds). Then the same B1a/B1b/B2 shape for a mind fantasy | Note ratified; same gate |
| B4 | **Slice 3: heart** + vocabulary review | Same shape; then a **vocabulary review**: merge/rename keywords across all slices, check the rank budget | Atlas consistent across slices |
| B5 | **Cross-slice play** | Mixed decks are the three family pairs plus the three mono lanes (six run identities from three slices); the reward pool must reward adding cards, not only thinning; every extracted keyword gets an evergreen / deciduous / set-only label and every card a core / expansion label (core = one keyword, no condition); matrix re-shaped and re-stamped | Baseline stamped; D8/D20 decided from what the slices needed; use-XP judged on paper (ballot outcome 4) |
| B6+ | Repeat per fantasy | Each further slice is one session + one kill session | — |

**Card types in Plan B.** Types by necessity: a type is proposed only when a
card in a slice cannot be written as spell/oath/hex after two attempts, and
at least 3 cards in the slice need the same shape. The proposal is answered
with §5 before wiring.

Strengths: first playable in session 1; keywords are extracted from real
text, so every one has carriers by construction; the kill gate is built into
the cadence. Risks: local optima per slice (a keyword that made sense in
slice 1 collides with slice 3) — mitigated by B4's vocabulary review; plain
rules text on Ash cards can breach the rank budget until extraction — the
budget is checked at B2, not B1.
Sessions: 6 for three fantasies, then 2 per added fantasy. Confidence: 85.

## 4. Plan C — Threat first (answers to the roster) — REJECTED (D73)

Model: the enemies survived the purge; the player's toolkit is derived from
what they do. Slay the Spire designed enemies as tests of specific deck
weaknesses; this inverts it — cards as answers, then fantasies layered on
(§6 C1–C3). Best when T wants the pool to be provably relevant to the fights
that already exist.

| Session | Name | Output | Gate to next |
|---|---|---|---|
| C1 | **Threat matrix** | Inventory the 78 enemies' 11 keywords, telegraph patterns and statuses by Act; each row a *problem* ("HIDE walls chip damage", "FLURRY punishes single big GUARD") | Matrix ≤ 25 rows, agent-prepared, T prunes |
| C2 | **Answer slots** | For each row, the answer *shapes* each family could own (body: burst through; mind: absorb; heart: pre-empt). This is the skeleton, derived instead of imagined Capped at ≤12 slots per Act-slice; the pruned list is the slice pitch T signs. | Every Act 1 row has ≥1 answer slot per family; rows nobody wants to answer are enemy-side work, filed |
| C3 | **Slice by Act** | Cards for Act 1 answers (~12), plain text, wired, played on the actual Act 1 encounter pools Climbs the §1 ladder: ballot, then sandbox set, then wired at C4. | Matrix + `playtester` on Act 1; kill list |
| C4 | **Fantasy pass** | Give each surviving card a role in a fantasy; rename; extract keywords (≥3 carriers) | Atlas; rank budget |
| C5 | **Measure** | Re-shape the baseline to the grey deck + Act 1 pool; stamp; then Act 2 rows | Stamp cited in the brief for C6 |
| C6+ | Next Act | Repeat C3–C5 per Act | — |

**Card types in Plan C.** A type is justified by a threat row that no
one-shot or passive card answers (for example a row that needs something
that lives *between* fights, or on the die tray). The §5 test still applies.

Strengths: nothing in the pool is decorative; the matrix doubles as the
enemy roster's audit, and the baseline is re-shaped early. Risks: reactive
design reads as a toolbox, not a fantasy — C4 exists for that; Act-by-Act
sequencing can delay late-game keywords (WRATH-class scalers) — allow one
"late" slot per family from C2. Confidence: 75.

## 5. The card-type test (all plans)

A new `CardType` costs a face layout, an editor union, a FREE-line rule
(spell authors one; oath/hex derive a timed one), reward weighting and a
tutorial beat. The research (§6 A5, B7, C2–C4) agrees on one criterion: a
type exists when it carries **its own rule** — a lifetime, a zone, a cost
family or a per-fight limit — that rules text on an existing type cannot.
Before any type is wired, answer in writing:

1. **Which rule is the type's own?** Name the lifetime / zone / limit and the
   card that fails without it. If a keyword on a spell expresses it, it's a
   keyword.
2. **How many cards will carry it in the first pool?** Fewer than ~6 is a
   keyword or a one-off, not a type (Wizards' "very high bar", §6 A5).
3. **Would it be a drag to explain to a friend?** One sentence of reminder
   text; if it needs two, the type is two ideas (§6 C3).
4. **Does it resolve through the existing loop?** FREE/PAID lines, the tray,
   the threat phase. A type that needs its own turn structure is a second
   game (§6 C2).
5. **What does it cost the face and the editor?** List the files. Paper or
   sandbox it before any of them change (§6 C3–C4).

### 5.1 Candidate shapes — an inventory to evaluate, not a list to adopt

Sources: Dawncaster's categories (Action, Enchantment, Form, Basic Attack,
Equipment, Affix, Revelation, Artifact, Path, Item; `kb:dawncaster` card
records, `category:` field), Slay the Spire's five (Attack, Skill, Power,
Status, Curse), Monster Train 2 (Equipment, Room), Wildfrost (clunkers),
Astrea (risk-tiered dice), and the shapes this engine already half-owns.
Each row names the rule that would be the type's own (§5 q1), the engine
hook it would ride, and how it fares against the test *today*. Verdicts are
inferences (confidence in the last column); the guided session decides.

| Shape | Prior art | The rule that would be its own | Existing hook | Against §5 | Conf. |
|---|---|---|---|---|---|
| **Persistent passive** | StS Power, Dawncaster Enchantment | Lifetime: rest of fight, leaves the cycle | Already `oath` (on you) / `hex` (on the foe) | Exists. Any "power" idea is an oath or a hex, not a type | 95 |
| **Form / stance** | Dawncaster Form, StS stances (Watcher) | Exclusive slot: one Form at a time, replacing the last; changes a *rule* (which die colour matches, what FREE lines do) rather than adding a number | The tray's colour-match step (`cardStanceColor`), `color` on cards | Strongest candidate: no oath expresses "replace the previous one" or "rewrite the match rule". Needs a face marker and one slot in combat state | 65 |
| **Attachment** | MT2 Equipment (to a unit) / Room (to a floor), Dawncaster Equipment | Zone: attaches to a target that isn't the player or the foe — here the only such target is a **die** or a **tray slot**; limit one per target | `Combat/combat.dice.ts` reserve + slots; the relic-granted card path | Viable only if dice become a zone worth building on (D20). Otherwise a keyword on a spell ("your body die gains …") | 55 |
| **Consumable / one-use** | Dawncaster Item, StS Exhaust, MT consumables | Lifetime: removed from the deck after one play (this run, not this fight) | Cache offers, `card.removal.ts` | Fails q1 as a type: a keyword (a BURN-the-card verb) on a spell does it. Fails q4 unless rewards can offer it separately | 75 |
| **Path / self-upgrading card** | Dawncaster Path I→II→III, StS upgrades (+) | Lifetime across plays: the card *becomes* its next stage | `card-upgrades.ts` (D8, held for this rework) | Not a type: D8 decides the grant path; the same card id with `upgradeLevel`. Evaluate at A5 / B5 / C4 with D8 | 80 |
| **Affix / modifier** | Dawncaster Affix, Revelation | Attaches to *another card* in the deck | None; the editor has no card-on-card reference | Fails q4–q5 hard (a new zone in deck state, a face for the host). Defer past the first pool | 85 |
| **Summon / ally** | Dawncaster Monster, MT units, StS orbs | A second combatant with its own VITAE that acts in the threat phase | The ally library was emptied by P1; the `oath`-typed schema and `cards.allies.ts` stub remain; enemy SUMMON exists | Schema half-exists. The question is whether allies need their own type to be *targetable* (q1). Re-examine only if a slice needs the foe to hit them | 70 |
| **Junk / wound** | StS Status + Curse; the 5 purged curses | Unplayable or self-harming, injected by enemies, removed by a specific verb | Curse injection removed in P1; removal machinery kept | Only if an enemy row (Plan C) needs "clogs your deck" as its threat. A type only because it needs a *removal rule*; otherwise a `hex` on yourself | 60 |
| **Die card** | Astrea's safe / balanced / risky dice | Grants or replaces a die for the fight; a risk axis (more power, more corrupted faces) | `bonusTurnDice`, `dieUpgradeLevel` (D20), the KINDLE/FORGE/BANK die economy | Rides D20, not a card type: a die-growth *grant* can be a spell's PAID line. Only becomes a type if the die itself must sit in the deck (q1: zone) | 60 |
| **Basic attack** | Dawncaster Basic Attack | Always available, never drafted, no rarity | The grey office (Phase 104) | Exists as a *theme* (`grey`), not a type. Leave as is | 90 |

Reading the table: **one** shape (Form / stance) passes the test on paper
today; two (Attachment, Die card) become live only if D20 turns the tray
into a zone; the rest are keywords, D8, or later. So the first pool most
likely ships with `spell | oath | hex` plus at most one addition, and the
type ledger below is where every proposal goes to die or live. Confidence
that at most one new type earns its place in the first pool: 70.

### 5.2 The type ledger (all plans)

Every session appends to a `## Card-type proposals` table in the running
brief: proposal, the slice that raised it, answers to §5 q1–q5, verdict
(keyword / type / defer), and the card that motivated it. A shape proposed
twice with the same failing answer is closed for the phase. This is the
"deciduous" tier for types (§6 A7): a shape can be *available* without
being *used*.

**Where each plan discovers types.** Plan A: once, at A2, from empty
skeleton slots. Plan B: by necessity, when a card in a slice can't be
written as spell/oath/hex after two tries and ≥3 cards want the same
shape. Plan C: from a threat row no one-shot or passive answers. All three
paper or sandbox the shape before any engine file changes (§6 C3–C4).

### 5.3 Card progression — how one card changes over a run

T, 2026-09-27: *"new card progression (upgrades, merging, transforming). I'm
open to all types of card related ideas."* What is already ruled: THE PATH
(2026-09-02) names six progression axes — staged decks, card removal, card
upgrades (Slay the Spire's model), die upgrades, act-reward dice, items →
signature skills. D8 deferred card upgrades' grant path to this rework; D20
kept die growth for it. Neither ruling said *which* mechanisms; that is this
section's job. Each row: the rule, what the engine already has, the
progression-specific test, and a verdict with confidence. Nothing here is
adopted; every row is a ballot for the guided session.

**The progression test** (in addition to §5 where a mechanism needs a type):
(p1) the changed card must still print the number the engine applies
(`paid-summary-honesty` law); (p2) the change must be visible on the face
without a tooltip; (p3) it must not add a second multiplier to a number the
stat model already multiplies: name the ONE axis that owns each printed
number (stat, die, or `+`), and the harness prints the max product at Saint
rank with maxed stats and honed dice as the declared ceiling (the S3 residue,
PR #404, is the in-tree witness of what compounding does); (p4) it must have
a *price* on THE PATH (a node, a currency, a sacrifice, plays) — free
progression is a difficulty knob, not a choice; (p5) an upgraded or
transformed face must differ from its base in at least one printed number
or line, guarded by a test beside `paid-summary-honesty`; (p6) no repeatable
in-fight action may produce a permanent progression change: the price is
paid once per node or once per fight, with a playtester check that fight
length does not rise when the mechanism is on.

| Mechanism | Prior art | Rule | Engine today | Test | Verdict | Conf. |
|---|---|---|---|---|---|---|
| **Linear upgrade** (`+`) | Slay the Spire rest-site `+`; Monster Train stones, two slots max | One strictly-better copy per card; computed by bucket (+40% magnitude, +25% rate, +1 count) or an authored patch | `card-upgrades.ts` — the whole rule, minus a grant path and the oath/hex hook-by-id hazard | p1 ✓ (face regenerates), p2 needs a `+` marker, p3 **fails as computed**: the +40% magnitude bucket multiplies a number the stat model already multiplies (the S3 residue shape); p3 passes only with small integer steps and one declared owner per number, p4 **missing** — that is D8 | Ship first: the cheapest axis, engine-complete. Grant path is the only decision: rest choice vs Blacksmith vs a currency. Keep the one-upgrade cap (§6 D1). Keep the computed default with a per-card opt-out (Dawncaster's shape, §6 KB-03), but move it to ±1 steps and lint every `+` for a cost, count, rider or downside change; author only where the lint flags a number-only face (§6 R4-03). Ratify `+` as a base/upgraded pair table, never per card | 85 |
| **Branching upgrade** (A / B) | Cobalt Core's A/B; Griftlands' choice-of-two on level | Two authored patches; the player picks one; the other is gone for the run | `CardUpgrade` patch supports one path only | p2 ✓, p4 ✓ if it reuses the `+` grant; costs 2 authored patches per card, so it fights the slice budget | Defer to Skull/Saint cards only, after `+` ships; a `+` with a choice is the same face | 70 |
| **Upgrade by use** (XP) | Griftlands: cards level after N plays | A play counter per card instance; the upgrade fires from the counter, not a node | Nothing counts plays per card instance; combat state has no per-card counter | p4 ✓ (the price is play), p2 needs a pip meter on the face; new deck-state field, saves migrate; needs a per-fight XP cutoff from day one or players draw fights out (§6 D4); if prototyped later, one XP per card per fight | The most *game-shaped* option for a campaign RPG (a card you use becomes yours). Evaluate at B5/C5 once the pick × win table exists | 60 |
| **Merge / fusion** | Inscryption: the altar moves one card's sigil onto another and destroys the source; the Mycologists fuse two identical cards (§6 D5) | Two cards → one; the result carries one card's numbers and the other's keyword or line | No card-on-card reference in the data model (same gap as Affix, §5.1); card removal exists | p1 ✓ only if the fused face is generated, p3 ✓, p4 ✓ (the sacrifice is the price); fails p2 unless the face has room for a second line | Attractive for the doom register (a card *eats* another). Prototype on paper: "the merged card = FREE line of A + PAID line of B" is expressible today as a new authored card, no engine work, so pilot it as **authored fusion results** before generic fusion | 55 |
| **Transform** | Slay the Spire Transform event; Dawncaster Ascension I→II→III and Path I→II→III numbered chains (in-place replacement VERIFIED from the Blightbane card API, game v1.19.002, §6 D8: the transforming object is a persistent self-buff on the player, this engine's oath shape, not a deck card; every stage is unique and only stage I is offered) | A card becomes a different card, by chance (event) or by chain (its next stage) | Card ids are static; reward/cache offers gated off; map events exist | Chains satisfy p1–p3 as separate authored cards; p4 is the chain's trigger (plays, an act boundary, a story beat). Random transform fails p4 (no choice) unless it is an event's price | Chains, yes, as a Plan C late slot or a Saint slot: a card that *ends* as something else is the cheapest transformation and pure content. Random transform: an event, not a card system | 70 |
| **Attachment / charm** | Wildfrost charms; Balatro enhancements, editions, seals; Roguebook gems | A modifier object sits on a card and changes one number or adds one keyword | None; the closest live thing is die gear (Blacksmith payload swap) | Fails p2 (a second glyph on the face) and needs a new zone; p3 ✓ if the modifier is a keyword | Not for the first pool. If T wants a "modifier" fantasy, put it on the **dice** (gear already exists) rather than on cards | 75 |
| **Die growth** (the card-adjacent axis) | Astrea's risk-tiered dice; THE PATH axes 4–5 | Hone miss faces to mana; add a die per act | `honedDieGear`, `bonusTurnDice`, `dieUpgradeLevel`; D31a proved these the strongest axes | Passes all four; the only open question is the grant path (D20) | Decide the grant with `+` upgrades in the same session: one Blacksmith / rest surface for both | 80 |
| **Removal** (deck thinning) | StS removal pricing; Dominion trashing | Linear price `base + step × removals` | Shipped (Phase 52a/52f), rest offers "cut a card" | Passes | Untouched. It is the axis that makes a small pool feel curated | 95 |

Reading the table: `+` upgrades and die growth are engine-complete and want
one grant decision; chains and authored fusion results are content, not
engine; upgrade-by-use is evaluated on paper at B5/C5 once the batch sheet
exists (per §7 ballot outcome 4, nothing beyond `+` and die growth is
prototyped in the first pool); charms and generic fusion wait. Confidence in
that ordering: 70.

**Where each plan decides progression.** Plan A: A2 names the axes the
skeleton assumes (a `+` column per slot?), A5 ratifies the grant paths. Plan
B: B2 ships `+` for slice 1 as its own mini-slice so the kill session
compares base vs `+`; B5 decides die growth, and use-XP is a paper verdict. Plan C: C2's answer
slots may be answered by a *progression* (a `+` that turns a chip card into
an answer) rather than a new card; C5 decides grants with the stamp.

### 5.4 Everything else card-shaped (the open backlog)

Ideas T is open to, filed so no session has to rediscover them. None is
scheduled; each names its existing surface.

| Idea | Surface today | One-line note |
|---|---|---|
| Card rewards after fights | Live on the grey cards (D44) | Each slice widens the offer pool; the offer *order* teaches keywords (§6 B5) |
| Cache "take a card" offer | Live on the grey cards (D44) | Same pool as rewards, or a rarer one |
| A shop for cards | Act 1 has no shop (adjust-equipment pass 21 filed it) | Card purchase is also a progression price (p4) |
| Curses / junk injected by enemies | Removed in P1 | Only via Plan C's threat rows (§5.1 junk row) |
| Allies / summons | `cards.allies.ts` stub, library emptied by P1 | Needs a slice that wants a second body on the board |
| Haunts (CONJURE-only class) | `cards.haunts.ts` stub, library emptied by P1 | Conjured cards are a free way to add *temporary* cards without a type |
| Relic-granted cards | Purged; relic effects stay | A relic can hand you a card again once the pool exists |
| Deck-size floor / ceiling | Deck sizes open since 2026-09-02 | A ceiling makes removal and fusion matter |
| Card colour vs die colour | `color`, colour-match +25% | The Form / stance candidate (§5.1) is the one that touches this rule |
| Signature skills from items | THE PATH axis 6 | Not cards; leave to `/adjust-equipment` |
| Reward re-arming per slice | `COMBAT_REWARD_POOL`, `REWARD_RARITY_WEIGHTS` (`combat.rewards.ts`) | A slice enters the pool only after its kill gate; offers stay 3 wide; rarity derives from rank so the weights are the lever, not a rewrite; add a pity ramp once the pool passes one slice; the reward-draft sim's per-card offer counts are the repeat-rate witness |
| Pool gating by progression tier | Act boundaries, `dieUpgradeLevel` bands | Gate what already has a grant path (dice, `+`, kit) before gating cards; if cards are withheld, the open tier must be self-sufficient and the withheld slice thin (§8 R-gate-01/03) |

## 6. Research receipts

Gathered 2026-09-27 by web scouts; primary sources unless marked
*secondary*. Anything the scouts could not load is marked UNVERIFIED and
carries no weight in §2–§5.

### A — the staged pipeline (Plan A's model)

| # | Principle | Source | What to copy |
|---|---|---|---|
| A1 | Four stages: exploratory (asks questions, scopes problems), vision (fixes the mechanical focus, hands off a file), set design (builds and field-tests), play design (tunes). Each stage has a different job; tuning is separated from building | Rosewater, "Vision Design, Set Design, and Play Design", 2017-10-23, magic.wizards.com/en/news/making-magic/vision-design-set-design-and-play-design-2017-10-23 | A0–A5's stage split; never tune inside the build session |
| A2 | The design skeleton: a slot grid (per colour × rarity, creature vs spell, removal/draw/trick counts) "to see at a glance the needs of the set", filled against gaps rather than ad hoc. "A living, breathing document" | Rosewater, "Nuts & Bolts: Design Skeleton Revisited", 2021-03-22, magic.wizards.com/en/news/making-magic/nuts-bolts-13-design-skeleton-revisited-2021-03-22 | A2's rank × family × type grid; C2 derives the same grid from threats |
| A3 | The vision handoff: 3–5 numbered set goals, one section per mechanic with sample cards, rationale and rarity spread, and explicit notes on where set design has flexibility | Rosewater, "Reality Fracture Vision Design Handoff, Part 1", 2026-09-21, magic.wizards.com/en/news/making-magic/reality-fracture-vision-design-handoff-part-1 | A2's ≤2-page doc shape |
| A4 | Keyword vs ability word: keywords replace rules text and are the only thing other cards can reference; ability words label shared text. Mechanics exist to fill skeleton gaps, solve playtest problems or deliver theme. No fixed card-count minimum exists; a mechanic was keyworded on one cycle so it "could be used again later" | Rosewater, "Finding Your Mechanics, Part 1", 2025-04-07, magic.wizards.com/en/news/making-magic/nuts-and-bolts-17-finding-your-mechanics-part-1; Blogatog 2024-09-06 | B2/C4's extraction rule: keyword what other cards will reference or you will reuse; plain text for the rest |
| A5 | New card type bar: "very high"; a type is warranted only when its rules must be baked into the type itself and would not fit as a subtype's text (Battles); Planeswalkers needed a template no permanent had | Blogatog 2025-05-15, markrosewater.tumblr.com/post/783593925555421184; Wargamer 2023-04-03 quoting Rosewater (*secondary*); Rosewater, "Planeswalking Down Memory Lane", 2018-07-23 | §5 questions 1–2 |
| A6 | New World Order: restrict comprehension and board complexity at common, keep strategic depth; ~12 words of rules text is a red flag; ~20% of commons may break a flag with a reason. Lenticular cards hide complexity in strategy, not text | Rosewater, "New World Order", 2011-12-05; "New New World Order", 2013-04-01; "Lenticular Design", 2014-03-31 (all magic.wizards.com/en/news/making-magic/) | The rank budget already in the atlas; add a word cap on Ash/Tooth |
| A7 | Evergreen (every set), deciduous (toolbox, any set that wants it), set-only. Promote when generic, popular, fills a gap, tests well at common; demote when swingy or confusing | Rosewater, "Deciduous", 2022-03-28; "Evergreen, Eggs & Ham", 2015-06-08 | A5's ratification tiers |
| A8 | Top-down (flavour leads) vs bottom-up (mechanics lead): declare which leads, leave slack for the other | Rosewater, "Creative Elements", 2018-03-26 | Plan A is top-down, B and C are bottom-up; say so in the brief |

### B — the prototype loop (Plan B's model)

| # | Principle | Source | What to copy |
|---|---|---|---|
| B1 | Balance by data, not intuition: pick rate when offered × presence in winning decks, weekly patches; feedback channel for "feel" because "the numbers are not telling us how things feel". Rework before delete (Dual Wield) | Game Developer, "How Slay the Spire's devs use data", 2018-02-27, gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder; GDC 2019 "Metrics Driven Design and Balance" (video; the "largest mechanic cut" section UNVERIFIED) | B2's kill session reads a pick × win table from the matrix plus the `playtester` feel report |
| B2 | Build the scoring core first, add a layer only when the core proves out (Timeline). Every Joker went through a balance change, some scrapped; the cut is two-sided: "too good and cannibalises all the adjacent strategies" or never worth taking; change a number first, rewrite an effect last (Rogueliker) | LocalThunk, "Balatro Timeline", 2025-03-06, localthunk.com/blog/balatro-timeline-3aarh; LocalThunk interviewed by Mike Holmes, Rogueliker, 2024-03-07, rogueliker.com/balatro-interview (corrected in the second pass, §8 RC-03) | B1 starts from the grey core; B2's two-sided cut criterion and the number-first rule |
| B3 | Keyword only when the effect recurs; a two-card effect was left unkeyworded; "keywords are double-edged swords" between condensing and vocabulary load. Expansion keywords rotate so players "don't have to learn a hundred new mechanics" | Brode via hearthstone.wiki.gg/wiki/Ability (*wiki-mediated*); Yong Woo, Gamescom 2014 (*wiki-mediated*); Ayala, hsreplay interview 2018-11-07 | B2's ≥3-carrier extraction; a short evergreen list per A7 |
| B4 | Keyword stacks lose identity ("Fearsome is much less impactful when it already has Challenger and Elusive") | Riot (Morgan) via outof.games 2022-07 (*secondary*) | Rank budget: ≤2 keywords per card below Skull |
| B5 | Marvel Snap: one card type, two keywords, ~11 words per card; "simplify, even if your team hates you"; teach each keyword by the card that showcases it, in unlock order | mobilegamer.biz 2023-03-23 and 2023-03-21 (Brode, Hagman; GDC 2023) | The reward pool's re-arm order teaches keywords one at a time |
| B6 | Inscryption: one icon per ability, reminder text one click away, never on the face; legibility "constantly fretted over" | thumbsticks.com 2022-03-25; gamedeveloper.com 2022-03-14 (Couture) | The glyph + gloss popup the atlas already mandates |
| B7 | Monster Train 2 added two card types (Equipment attaches to a unit, Room modifies a floor), each limited to one per slot; Dawncaster's keyword count grew ~10 per expansion | gamingbolt.com 2025-04-09 (Cooke, *secondary*); dawncasterrpg.fandom.com/wiki/Keywords | §5: a type earns a slot limit and a clear attachment target, or it's a keyword |

### C — threat-led and gated evaluation (Plan C's model)

| # | Principle | Source | What to copy |
|---|---|---|---|
| C1 | Cards are brainstormed in the thousands and the weak ones cut; two metrics decide — pick rate when offered ("too low and it's basically not a card in our game") and presence in winning decks ("too high and you know that card is overpowered"); no formula, change then re-observe; "metrics can be misleading" (super-playtester bias) | Game Developer 2018-02-27 (above); GDC 2019 talk (thresholds in slides, UNVERIFIED) | C3/C5: the matrix's per-card play rate and win-deck presence as floor/ceiling flags, never fixed bands (doctrine §3 forbids a governing curve anyway) |
| C2 | A second deck / new rule set is cheap only when it shares the core turn structure and verbs (Griftlands' negotiation reused the battle engine after a roll-based version was "a lot less fun") | Uppercut, Bailes, 2020-06, uppercutcrit.com/feat-of-klei-how-griftlands-exemplifies-a-nurturing-approach-to-game-development | Any new type must resolve through the existing FREE/PAID + tray loop |
| C3 | "If a rule would be a drag to explain to a friend on board game night, it wasn't good enough"; prototyped in Tabletop Simulator in half an hour; double-digit numbers "extremely rare" | Game Developer (Guerra, Cobalt Core), gamedeveloper.com/design/how-cobalt-core-makes-movement-as-exciting-as-fighting-in-its-roguelike-deckbuilder-combat | §5 question 3; paper the type before code |
| C4 | Wildfrost's clunkers are a type born from one rules exception (health replaced by scrap); "the two major things are simplicity and consistency"; paper prototype first | MCV, Pavey, 2023-06-27, mcvuk.com/business-news/when-we-made-wildfrost | A type is one rule exception with a name, not a bundle |
| C5 | Keywords "make card texts shorter... create classes of cards"; lenticular designs look simple and reveal depth | Game Developer, Harris, 2022-03-04 (Vilain, Roguebook), gamedeveloper.com/design/tackling-deckbuilding-design-in-abrakam-s-roguebook | The atlas's three tests come from here; unchanged |
| C6 | Keyword budget: "8–12 to start and no more than 7 for expansions"; keyword only simple, frequent mechanics, drop unused ones | Game Developer, Kinstler, 2018-07-02, gamedeveloper.com/game-platforms/card-games-what-s-in-a-keyword; Cloudfall (Loewen), 2021-06-30, cloudfallstudios.com/blog/2021/6/17/design-tips-keywords | First-pool ceiling: ~10 player keywords including the 3 that survive; a retire pass per Act |
| C7 | Stage-gate funnel: 2 days to 5 weeks per experiment, gate "engaging for at least 15 minutes"; add one idea, keep if it works, else move on. "Once the idea hits the table you're in a conversation with the idea" | Cook, gamethinking.io/podcast/104-dan-cook; Lantz, forcingfunction.com/podcast/frank-lantz, 2022-11-03 | One idea per slice; the `playtester` session is the 15-minute gate |
| C8 | Cut a part "that isn't working with the whole, even if you personally like it"; start from a strong core, remove what conflicts with it, add what supports it | Forbes (Griftlands, above); Burgun, Clockwork Game Design 2nd ed., 2025 | The kill gate in §1 |
| C9 | Astrea's dice taxonomy is a risk axis (safe / balanced / risky), not a function axis | Indiecator, 2022-09-26 (Castanho) | A candidate axis for the die-growth decision (D20), not for card types |
| C10 | "Most digital games don't have ENOUGH randomness"; luck lets weaker players win sometimes | Garfield, Game Developer spotlight 2020-07-07; Board Game Design Lab 2018-05-02 (audio) | The tray stays the variance source; cards don't add a second one |

Not found, and therefore not used: a Mega Crit keyword cap or text limit;
Giovannetti's rationale for Powers as a type; Dawncaster designer statements
on types (the corpus gives categories only); "Alexander Ostrovski" as a
design writer (no such source).

### D — card progression (§5.3's model)

| # | Principle | Source | What to copy |
|---|---|---|---|
| D1 | Slay the Spire's first prototype let cards "increase values indefinitely" and was thrown out: "Acquire good card, just upgrade that card. This wasn't deckbuilding!" Reduced to one upgrade per card, then "8 straight hours creating a unique upgrade for every single card". The Rest Site makes the upgrade compete with a 30% heal | Yano, Mega Crit AMA, 2019-01-24, bestofama.com/amas/aj6sq1; slaythespire.wiki.gg/wiki/Rest_Site | One `+` per card, and the grant competes with healing. The engine's computed default rule is a scaffold; the authored patch is the product |
| D2 | Monster Train: upgrade stones bought for gold, "cards only have two upgrade slots" (a third via artifacts); impactful upgrades cost 100+ gold | TheGamer (Alston) 2025-05-28; monster-train.fandom.com/wiki/Upgrades (*snippet, medium*) | If stacking is ever wanted, hard-cap at 2 slots and price it |
| D3 | Cobalt Core: every card has Upgrade A and Upgrade B, chosen at a node that also offers heal or remove; an event lets you flip A↔B | cobaltcore.wiki.gg/wiki/Basic_Shot, /wiki/Annoying_Debate | A/B forks at the same node as `+`; authored per card |
| D4 | Griftlands: cards gain XP per play (3–7 uses), then a choice of two upgrade paths. XP-per-play "incentivizes players to draw out fights"; Fatigue (round 6 cutoff) was the fix | Gamepur (Palm) 2020-06-16; Klei Entertainment, Griftlands update 355233, 2019-07-24, kleiforums.com/game-updates/griftlands/355233-r832/ (primary, confirmed in the second pass) | Upgrade-by-use needs a per-fight XP cutoff from day one (added to §5.3's row) |
| D5 | Inscryption: the Sacrificial Altar destroys one card and moves its sigil onto another (sigils union, duplicates don't double); the Mycologists fuse two identical cards, summing stats and unioning sigils | Steam discussion 1092790/3419936083033918051; inscryption.fandom.com/wiki/The_Mycologists (*snippet*) | "Sacrifice X onto Y" is the cheapest fusion: one line moves, the source dies |
| D6 | Across the Obelisk: a Blue (cheaper) and a Gold (stronger) upgrade per card, priced in shards by rarity; converting between them costs gold | TheGamer (Buchalter) 2022-09-13 | Rarity-priced upgrades are a currency sink that scales with rank |
| D7 | Slay the Spire Transform: remove a card, add a random non-basic card of the class, "equally likely across rarities"; sourced from events and two relics, never a shop | slaythespire.wiki.gg/wiki/Transform | Transform is an event's price, not a card system |
| D8 | Dawncaster's Ascend/Advance chains VERIFIED from the Blightbane card API (game v1.19.002): each stage is a persistent self-enchantment (category Form), the step is an in-place replacement (`enchantref:self;removeenchant:this` with the next stage in the effect's card list); the seven zodiac chains (Aquarius' Dream and the rest) are "and Advance. Unique." with only stage I acquirable | blightbane.io/api/card/Dark_Ascension_I; blightbane.io/api/cards?category=17 (fetched 2026-09-27, §8 KB-01/KB-02) | A chain occupies a persistent slot, not a deck slot; the unique flag stops a second copy double-advancing |
| D9 | Wildfrost charms: attached between fights, "cannot be removed or undone", max 3 per card. Balatro: one Enhancement, one Edition, one Seal per card; a new one replaces the old. Roguebook: 0–2 sockets, gems permanent | wildfrostwiki.com/Charms; balatrowiki.org/w/Card_modifiers; Game Rant (Meffert) 2021-07-03 | Typed slots, one of each, new replaces old, permanent. Still parked for the first pool (§5.3) |
| D10 | Removal price: StS "starts at 75 gold and increases by 25 each time"; Dominion's Chapel is "probably" the strongest card for its cost | slaythespire.wiki.gg/wiki/The_Merchant; Vaccarino via meadowparty.com 2010-12-19 | The shipped linear removal curve (Phase 52a) is the standard brake; keep it |

Not found: any Rosewater statement on deckbuilder upgrades; LocalThunk on
"modify cards rather than add Jokers"; Chrono Ark's conditional evolution.

## 7. Recommendation and open calls

**Recommended: Plan B**, with A0 (the one-page fantasy list) bolted on as
session 0 and C1 (the threat matrix) prepared by agents before B1 as
briefing material. Reason: both previous runs failed by making the whole
library the unit of work; B is the only plan whose first session ends with
T playing new cards, and its keyword extraction rule makes carrier count a
consequence rather than a gate. Confidence: 70.

**Ballot outcome (2026-09-27).** All four calls were put to T through
`AskUserQuestion` and answered "no preference". Per `docs/asking-well.md`
rule 5 the stated defer paths apply and are policy until T reopens them:
(1) all three plans are filed as one attended candidate in
`plan/PHASE_CANDIDATES.md`; nothing starts. (2) §0's identification of the
two prior runs stays as written, marked unconfirmed (confidence 65).
(3) The D8 / D20 grant paths are held for the ratification session of
whichever plan runs. (4) No progression mechanism beyond `+` and die growth
is prototyped in the first pool; §5.3 stays an inventory.

Open calls for T (put as a ballot, `AskUserQuestion`, not re-asked once
answered; answered 2026-09-27 as above):

1. Which plan (or splice).
2. Whether the "last 2 times" are the two runs named in §0 (confidence 65).
3. Whether card upgrades (D8) and die growth (D20) are decided inside the
   first slice or held for the ratification session.
4. Which progression mechanisms beyond `+` and die growth get a prototype in
   the first pool (§5.3 recommends upgrade-by-use and authored fusion
   results; confidence 60).

**Second research pass (2026-09-27, §8).** A 56-agent pass (six research
dimensions, two-lens source checks, two critic rounds, three comparison
lenses) returned **partly aligned**: the spine holds (slice as unit, kill
gate first, keywords extracted after play, verdicts from play) and the gap
was the process layer that decides T's role. That layer is now §1's six new
bullets. The pass re-affirms Plan B with A0 and C1 spliced in (its
confidence 80) and says the next question for T is not which plan but
whether the §1 session format is ratified as written; the format is the
same under all three plans. Two further calls it adds:

5. The pool-size soft target for the first shippable pool (§1, comparators
   18 / 40 / 70–85).
6. Whether the §1 session format (vocabulary, ladder, clock, ledger, batch
   sheet) is ratified as written. Defer path: it applies as written to
   whichever plan runs and resurfaces at the next `/oversight`.

## 8. Alignment review (2026-09-27, second research pass)

Tree read after merging origin/main into the branch at f2f8522. The branch is at parity with main. Main's keyword audit (#407, e663ef0) has landed; the atlas still lists 22 player rows and 11 enemy rows under a header that says two carriers. The three lens reviews, the research corpus and the plan file were read in full. Overall verdict: partly aligned. The spine holds; the process layer that decides T's role is missing.

### 8.1 Receipts

Source verdict is the corpus's own confidence or verification tag. Fit verdict is how the plan file stands against the finding today.

| id | Principle | Source | Source verdict | Fit verdict |
|---|---|---|---|---|
| R1-01 | Build the pool in archetype batches, then sculpt single cards from play data | gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder | partly | aligned, adapted to the slice |
| R1-02 | Shipped pools are survivors of a 2 to 3x generated set; the cull is the design work | pcgamer.com/games/card-games/its-kind-of-like-youre-a-butcher-hundreds-of-slay-the-spire-2-card-ideas-were-cut-during-development-in-an-incredibly-destructive-process/ | high | missing |
| R1-05 | Fix the visible set first; grow the pool only when runs repeat cards | dominionstrategy.com/2012/12/20/interview-with-donald-x-vaccarino-part-i-boardgame-design/ | confirmed | partly |
| R1-06 | Ship a simple core first; label core and expansion at creation | dominionstrategy.com/2013/06/24/the-secret-history-of-dominion/ | high | partly, Plan A only |
| R1-07 | A skeleton of empty slots is a blueprint, not a lock | magic.wizards.com/en/news/making-magic/nuts-bolts-design-skeleton-2010-02-15 | confirmed | partly, slice-sized |
| R1-10 | A reused old pool reads as stale to testers | pcgamer.com/games/roguelike/slay-the-spire-2-dev-says-an-early-idea-was-to-actually-reduce-the-card-pool-but-players-hated-it-we-need-new-stuff/ | high | missing |
| R1-11 | Family pairs plus mono lanes carry variety in a small pool | gamedeveloper.com/design/tackling-deckbuilding-design-in-abrakam-s-roguebook | high | aligned |
| R1-13 | Reward screens are rated on difficulty, good options and interest | uu.diva-portal.org/smash/get/diva2:2078257/FULLTEXT01.pdf | low, results unread | missing |
| R2-01 | Generate 2 to 3x and make cut the default outcome | pcgamer.com, as R1-02 | confirmed | missing |
| R2-03 | Every cut carries a one-word reason; keep an outtakes file | dominionstrategy.com/2013/06/24/dominion-outtakes/ | high | missing |
| R2-04 | Two owner touchpoints per batch: the pitch and the ship list | outof.games/news/2987-dean-ayala-details-the-different-groups-of-the-hearthstone-dev-team-confirms-more-battlegrounds-content-in-the-future/ | confirmed | partly, absent from Plan B |
| R2-06 | Competing candidates are filed under one slot code | magic.wizards.com/en/news/making-magic/nuts-bolts-filling-design-skeleton-2011-02-28 | partly | missing |
| R2-07 | The lead frames and votes; the lead does not author the list | magic.wizards.com/en/news/making-magic/nuts-bolts-14-initial-ideation-2022-03-07 | high | missing |
| R2-11 | Three reworks, then replace | mobilegamer.biz/second-dinner-reveals-the-secrets-of-marvel-snaps-onboarding-and-card-design/ | medium | missing |
| R2-13 | Change a number first; reserve effect rewrites for the owner | rogueliker.com/balatro-interview/ | medium | partly, conflicts with D37 unless stated |
| R3-06 | Four per-card metrics; healthy means wanted some of the time | gamedeveloper.com, as R1-01 | high | partly, one column missing in the tree |
| R3-07 | Designers edit content, not parameters | arxiv.org/abs/2005.07478 | confirmed | aligned with §0's diagnosis |
| R3-09 | No generated card reaches the reviewer without a validator | markrosewater.tumblr.com/post/720140714202267648 | high | missing |
| R3-10 | Budgets and distribution are code; prose is the model's job | mechanisticmind.substack.com/p/creating-magic-the-gathering-cards-with-generative-ai | confirmed | partly, as a lint |
| R3-11 | A strict schema and a closed keyword list stop hallucinated mechanics | arxiv.org/abs/2604.27972 | high | missing |
| R3-13 | Restricted play gives a per-card value delta | ojs.aaai.org/index.php/AIIDE/article/view/12513 | medium | missing |
| R3-14 | Cards are data rows; a batch is a reviewable diff | riotgames.com/en/news/engineering-tools-designers-legends-runeterra | high | partly, sandbox registry unused |
| R4-01 | One upgrade per card; unbounded upgrades were not deckbuilding | bestofama.com/amas/aj6sq1 | confirmed | aligned |
| R4-02 | The upgrade is priced by its competitor | steamcommunity.com/app/2868840/discussions/0/806845754928808544/ | confirmed | partly, no measurement method |
| R4-03 | Number-only upgrades read flat; cost, count and rider changes register | steamcommunity.com, as R4-02 | medium | misaligned with the computed bucket |
| R4-04 | Upgrade by use needs a per-fight cutoff from day one | kleiforums.com/game-updates/griftlands/355233-r832/ | high | aligned |
| R4-09 | An upgrade that changes nothing on the face is a defect | blog.febucci.com/2026/08/interview-red-nexus-peglin-behind-the-scenes/ | high | missing |
| R4-10 | Early upgrade power busts balance; gate grants by act | steamcommunity.com/app/1135810/discussions/0/2968398218091214440/ | high | missing |
| R4-12 | Base and upgraded values are tuned as a pair and reversible | pcgamesn.com/slay-the-spire-2/patch-notes-live-april-2026 | medium | missing |
| R5-01 | A merge is a pure function, optional, capped | steamcommunity.com/app/1092790/discussions/0/4588603157850224567 | high | aligned, conditions missing |
| R5-08 | Transform is an event's price, never a shop | slaythespire.wiki.gg/wiki/Transform | partly | aligned, deferred |
| KB-01 | A chain steps in place; the object is a persistent self-buff, not a deck card | blightbane.io/api/card/Dark_Ascension_I | high | misaligned, plan says unverified |
| KB-02 | Every chain stage is unique; only stage one is offered | blightbane.io/api/cards?search=&rarity=&category=17&type=&banner=&exp= | high | missing |
| KB-03 | Upgrades are computed by default with a per-card opt-out | blightbane.io/api/card/Aegis | medium | misaligned with the authored default |
| KB-04 | Upgrade levels stack additively with no visible cap | blightbane.io/api/card/Ambition | high | conflicts with D1; owner call |
| R6-01 | The handoff rates each mechanic's fate; the owner objects at review, never hand-edits | markrosewater.tumblr.com/post/809181847710056448 | high | partly |
| R6-03 | Every playtest ends with a short prose write-up | magic.wizards.com/en/news/making-magic/nuts-bolts-initial-playtesting-2013-02-11 | high | missing |
| R6-04 | Park is distinct from cut; cut what does not advance the set | magic.wizards.com/en/news/making-magic/nuts-bolts-three-stages-design-2015-03-30 | high | missing |
| R6-05 | Generators and ratifiers are separate roles with a halfway checkpoint | outof.games, as R2-04 | confirmed | partly |
| R6-08 | One card changed per test; verdicts at category level | dominionstrategy.com/2012/12/20/interview-with-donald-x-vaccarino-part-i-boardgame-design/ | high | missing |
| R6-09 | The archetype batch is the unit; numbers never say how things feel | gamedeveloper.com, as R1-01 | confirmed | aligned |
| R6-12 | Ratify event definitions once before batch two | mcvuk.com/business-news/when-we-made-wildfrost/ | medium | missing |
| R6-13 | Reviewers discard over half; show at most four suggestions at a time | arxiv.org/abs/1901.06417 | medium | missing |
| R6-14 | Reviewer detection falls past sixty minutes | smartbear.com/learn/code-review/best-practices-for-peer-code-review/ | low | missing |
| GAP-1 R6-02 | Exactly one axis may touch printed numbers | levelwinner.com/dawncaster-beginners-guide-tips-tricks-strategies/ | medium, unverified | misaligned with p3 |
| GAP-1 R6-03 | Upgrades move in plus or minus one steps; extra dice at fixed levels | terrycavanagh.itch.io/dicey-dungeons/devlog/104827/dicey-dungeons-version-15 | high, unverified | partly |
| GAP-1 R6-04 | Card upgrade and die growth share one surface | store.steampowered.com/app/1755830/Astrea_SixSided_Oracles/ | medium, unverified | aligned |
| R7-01 naming | A keyword is a count decision made after the cards exist | markrosewater.tumblr.com/post/674919453694296064/ | high | aligned with Plan B |
| R7-02 naming | Headline mechanics get a codename plus sample cards; the name comes late | magic.wizards.com/en/news/making-magic/bloomburrow-vision-design-handoff-part-2 | high | misaligned with A2 |
| R7-04 naming | Roughly half of named mechanics die before print | magic.wizards.com, as R7-02 naming | medium | missing |
| R7-02 contests | Keep the ritual light; the reject pile seeds later briefs | markrosewater.tumblr.com/post/817972556104597504 | high | missing |
| R7-04 contests | The owner sets the brief, judges once, and the winner sets the next brief | forum.dominionstrategy.com/index.php?topic=18987.0 | high | missing |
| R5-01 cut-lines | Two directional cut metrics; no number was ever published | gamedeveloper.com, as R1-01 | high | partly |
| R5-02 cut-lines | Synergy-gated cards are reviewed, not killed; kill by before/after delta | bestofama.com/amas/aj6sq1 | medium | missing |
| RC-01 | The three GDC talks are gated; abstracts hold no rationale | gdcvault.com/play/1025731/-Slay-the-Spire-Metrics | high | aligned, rows stay UNVERIFIED |
| RC-03 | The cannibalise line is Rogueliker 2024-03-07; the cut is two-sided | rogueliker.com/balatro-interview/ | high | misaligned citation in B2 |
| RC-04 | A twenty-word face cap; a three-way kill verdict | gameinformer.com/interview/2024/03/21/balatro-was-almost-called-joker-poker-and-other-details-from-its-creator | high | partly |
| RC-05 | Pool size was set by fiat, then grown by slices | localthunk.com/blog/balatro-timeline-3aarh | high | aligned |
| R8-02 | No shipped card carries two frame keywords; a third carry none | slaythespire.wiki.gg/wiki/Ironclad_Cards | medium | misaligned rank budget |
| R8-05 | Two signature keywords per fantasy; a ceiling near thirteen | slaythespire.wiki.gg/wiki/Keywords_(Slay_the_Spire_2) | medium | missing stop |
| R-gate-01 | Withheld cards are a thin slice designed with the open pool | slaythespire.wiki.gg/wiki/Ironclad | high, unverified | missing |
| R-gate-03 | The open tier must be self-sufficient | steamcommunity.com/app/2742830/discussions/0/599653598138280893 | medium, unverified | missing |

### 8.2 Verdict per lens

**Library and keywords: partly.** The slice unit, the kill gate before the growth gate, extraction after play, and verdicts from play all match the comparators (R1-01, R6-09, R7-01 naming, R7-03 naming, R5-01 cut-lines). §0 is stale in a way that changes the pre-session step: the code purge landed on main, the atlas trim remains, and the branch contradicts itself on the carrier threshold (R7-01 naming, R8-03). No plan has an overgenerate-then-cull step, a kill-reason vocabulary, an outtakes file, or a validator before T's eyes (R1-02, R2-03, R3-09, R3-11). The B2 attribution is wrong and the D8 chain rule is now verified (RC-03, KB-01). Pool size, per-slice density, a keyword ceiling, reward re-arming and withholding are unwritten (R1-05, R8-02, R8-05, R1-04, R-gate-01).

**Progression: partly.** The one-upgrade cap, the open grant path, deferred forks, the use-XP cutoff, authored fusion before generic fusion, transform as an event's price, charms refused and die growth as the strongest axis all match (R4-01, R4-02, R4-04, R5-01, R5-08, GAP-1 R6-04). The p3 test marks the compounding case as safe, which is the S3 residue shape (GAP-1 R6-02, GAP-1 R6-01). The computed magnitude bucket and the authored-per-card default both run against the comparators, which use small integer steps and a computed default with an opt-out (GAP-1 R6-03, KB-03, R4-03). The reading paragraph contradicts §7's ballot outcome (R2-11, R6-09). One tree fact in the lens is corrected here: a reward-draft sim exists at axiomancer-mechanics/src/Combat/combat.reward-draft.sim.ts and already loads sandbox sets. Offered-versus-picked is reachable today; win-cell presence is the only missing column (R3-06, R5-01 cut-lines).

**Owner in the loop: partly.** The slice is the right size for one sitting, agents prepare evidence not content, and C1's prune-not-author shape is the right template (R6-14, R2-04, R6-02). No plan gives T a verdict vocabulary, a candidate ceiling, a clock, a per-card ledger or a fixed batch sheet (R2-03, R6-13, R6-14, R2-02, R3-06). Plan B wires cards before T culls them because the editor writes into the real library; the sandbox set registry is the unwired middle rung the plans never use (R3-14, R6-07). Plan A's A2 asks T to ratify forty abstract slots before any card exists, the registry-first shape §0 blames (R3-07, R7-02 naming). The next question to T is the session format, not the plan.

### 8.3 Amendments

Applied in this revision: must 1–12; should 13, 15, 16, 18, 19, 20 and 22, and the D4 / D8 rows of 23. Listed only, for the session: should 14, 17, 21, the rest of 23, 24 (put to T as §7 call 6); could 25–28.

Must.

1. §0. Refresh the purge row: code purge landed as #407, atlas trim and carrier census remain, raise the card threshold to three carriers, baseline c6fd758c. Sources R7-01 naming, R8-01, R8-03, R8-04, A4.
2. §1. Add the verdict vocabulary: KEEP, TWEAK one integer, CUT with a fixed reason, PARK, TRANSFORM, REVISIT with a date; CUT is the default; category verdicts are legal; T never writes card text; numeric tuning of a wired card belongs to the kill session. Sources R2-03, R2-01, R6-04, R6-06, R6-08, R6-10, R6-11, RC-03, RC-04, R2-13.
3. §1, B1, A3, C3. Generation is cheap and the session is a cull: agents draft two to three times the slice in-session as one-line ballot material, at most three per slot and four on screen, at most thirty-six lines per build session. Sources R1-02, R2-01, R2-06, R6-01, R6-13, R6-14, R3-07, RC-04.
4. §1 and B1. Three artefacts on one ladder: ballot, then a named sandbox set in cards.sandbox-sets.ts behind a deterministic lint, then the wired slice at the kill session; the editor write-back is used at the last rung only. Sources R6-07, R3-07, R3-09, R3-10, R3-11, R3-14, R2-10, RC-04, A6.
5. §3 Plan B. Split B1 into pitch plus ballot and sandbox play; B2 becomes batch sheet, two cuts, extraction from three KEEP cards, promotion in the same PR, ledger updated. Sources R2-04, R6-05, R2-06, R6-02, R3-14, R1-01, R7-04 contests, R2-12.
6. §1. Session shape and clock: a build session under ninety minutes and a kill session under sixty, with a fixed agenda; no tuning in build, no new cards in kill. Sources R6-14, R6-13, R2-07, R2-04, R6-05, A1.
7. §1. Residue is filed in two places: rulings to the decisions file, per-card outcomes to plan/ballots/<slice-id>.md with ballot, outtakes and revision tables; replace at revision three. Sources R2-02, R2-03, R6-04, R2-11, R7-02 contests, R7-05 contests, R6-01.
8. §5.3 p3 and the linear upgrade row. One axis owns each printed number and the harness prints the ceiling; the computed magnitude bucket fails p3; keep the computed default with an opt-out, lint each upgrade for cost, count, rider or downside, and author only where flagged. Sources GAP-1 R6-01, GAP-1 R6-02, GAP-1 R6-03, GAP-1 R6-04, KB-03, R4-13, R4-03, R4-01, R2-13.
9. §5.3 reading paragraph. Align with §7 ballot outcome four: nothing beyond the upgrade and die growth is prototyped in the first pool; use-XP is a paper verdict. Sources R2-11, R6-09, RC-05, R4-04.
10. §5.3 transform row and §6 D8. Mark chains verified from the Blightbane API, note the transforming object is a persistent self-buff, drop the missing chain citation, add the unique flag and stage rules. Sources KB-01, KB-02, KB-05, R5-08, R5-10.
11. §6 B2. Fix the attribution to Rogueliker 2024-03-07, date the Timeline 2025-03-06, add the two-sided cut and the number-first rule. Sources RC-03, RC-05, R5-01 cut-lines.
12. §5.3, §6 B1 and C1, §1. Specify the batch sheet and the witness: play rate, offered versus picked from the existing reward-draft sim, win-cell presence to be added before B2, damage per enemy, a synergy-gated flag, bombo count, cheapest patch, lint status; flags not bands; a prose write-up and novelty line per run; a before and after run per slice. Sources R3-06, R5-01 cut-lines, R5-02 cut-lines, RC-03, R2-09, R3-03, R3-09, R3-12, R3-13, R6-03, R1-10, R1-13, R3-04, R4-11, R2-11.

Should.

13. §1 and §7. Pool size is a decision at session 0 with a soft target, a quarter of flex and a stop rule; add a fifth ballot line. Sources R1-03, R1-05, R1-06, R1-09, R1-12, R2-13, RC-05.
14. §1, B2, B4, C4, atlas. Density targets per slice, a third of cards with no keyword, no two keywords below Skull, a library ceiling near thirteen with reuse-or-swap after slice three. Sources R8-01, R8-02, R8-03, R8-04, R8-05, C6, B4.
15. §2 Plan A. Agents draft the skeleton and T prunes it; only the next twelve slots are shown; headline mechanics get a codename plus sample cards and a fate tag; half will die. Sources R7-02 naming, R7-03 naming, R7-04 naming, R6-01, R6-02, R1-07, R2-06, R3-07.
16. §4 Plan C. Make C1's prune shape the template; cap C2 at twelve slots; C3 climbs the ladder; C1 becomes briefing under the splice. Sources R6-02, R6-08, R2-06, R1-01, R3-14.
17. §5.3 upgrade row and §7 call three. Ballot lines with their tree cost, an act gate for the first grant, and the weakness test using upgradedCardShare against restHealFraction. Sources R4-02, GAP-1 R6-04, R4-10, R5-13, R4-13, R4-11, R4-12.
18. §5.3 tests and B2. Add p5 must-differ and p6 no-farm; the upgrade is ratified as a base and upgraded pair table, never per card. Sources R4-09, R5-07, R4-04, R4-12, R4-01, R4-03.
19. §3 B3. A fifteen-line engine-event rules note ratified before slice two. Sources R6-12, R3-11.
20. §3 B5 and C5. Mixed decks as pairs plus mono lanes; keyword tiers and a core label in every plan, not only Plan A. Sources R1-11, A7, R1-06, R7-04 naming.
21. §5.3 merge, die growth and branching rows. Record the ship conditions the prior art learned: optional merge with a chosen output and a keyword cap, dice at fixed act boundaries, forks only with both branches picked. Sources R5-01, R5-02, R5-12, KB-02, GAP-1 R6-03, R4-08, R5-07, GAP-1 R6-01, R4-05, R4-06.
22. §5.4. Four new rows: reward re-arming with a pity ramp, thin pool gating with a self-sufficient open tier, bounded offer weight as the first knob, reversibility notation. Sources R1-04, R1-05, R-gate-01, R-gate-02, R-gate-03, R-gate-04, R-gate-05, R3-05, R4-12, B5.
23. §6 D. Replace secondary citations with primaries, mark D8 verified, add rows D11 to D16, surface KB-04 as an owner call. Sources R4-04, KB-01, KB-02, KB-05, R5-03, R4-09, R4-10, R5-07, KB-03, KB-04, GAP-1 R6-03, GAP-1 R6-01.
24. §7. Put the session format to T as the next question; the defer path applies it as written to whichever plan runs. Sources R2-07, R6-01, R6-05, R2-04.

Could.

25. §2 A0 and A1. Run the fantasy list as a dot-vote; tag every candidate with its generation mode. Sources R2-07, R2-12, RC-02, A8.
26. §3 B6 and beyond. Seasons of slices with a retro between; each kill session proposes the next brief; one submission per persona; the library file is the hall of fame. Sources R7-01 contests, R7-02 contests, R7-03 contests, R7-04 contests, R7-05 contests.
27. §5.3 preamble. Every progression mechanism is ratified as a batch rule with a named review format, never per card. Sources R4-12, R4-10, KB-02, R5-10, R4-02.
28. §5.3 p2 note. The mobile grant surface shows a short filtered list with the before and after face inline; eligibility is printed on the face. Sources R4-14, R5-11.

### 8.4 Not found

- Any numeric pick-rate or win-rate cut line from Mega Crit, in the 2018 article, the 2019 AMA, or any of the 56 weekly patches; the GDC 2019 talk is members-only (R5-01 cut-lines, R5-03 cut-lines, R5-05 cut-lines, RC-01).
- Cooke's GDC 2021 rationale for upgrade slots and Mullins's GDC 2022 rationale for sacrifice mechanics; both talks are gated (RC-01).
- Any LocalThunk statement on modifying cards rather than adding more; the podcast has no transcript (RC-02, RC-05).
- The Dawncaster glossary prose for its chain and upgrade terms, any cap on its upgrade level, and the chain the branch's D8 row cited; no such record exists on Blightbane (KB-05).
- A designer statement from any studio on keeping one growth axis dominant or capping the product of stat, die and upgrade (GAP-1, all four rows).
- A primary Brode statement of the Hearthstone recurrence rule; the cited video could not be confirmed (R7 naming, not found).
- A published ratio of candidate cards to shipped cards at Hearthstone, or a percentage of named mechanics that die at Wizards (R2 not found, R7-04 naming).
- Any card studio's guidance on how many cards to review per sitting; the sixty-minute figure is a code-review analogue (R6-14).
- A studio postmortem of LLM-generated card batches shipped in a commercial deckbuilder (R3 not found).
- The Uppsala thesis results on three versus six reward offers; the PDF returned 503 (R1-13).
- Rules and cadence of the r/customhearthstone weekly competition; Reddit was unreachable (R7 contests, not found).
- Wildfrost's pool size, cut process, or charm design rationale; the wikis are blocked (R1, R5-03 not found).
- The Ayala hsreplay 2018 interview cited without a URL in §6 B3; not located (R7 naming, not found).
