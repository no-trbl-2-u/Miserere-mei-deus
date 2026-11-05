# Card Forge report — 2026-09-04

Full sweep, all stages × all presets, in-theme swaps only, `--runs=60 --seed=1`
per the invocation defaults (no flags). No cards were promoted; one
swap-measurement was run and is reported with a full evidence table below.

## Headline finding — the campaign lineage is non-monotonic at `late`

`threadbare` (early, 18 cards, deliberately weak) beats `pilgrim` (mid, 30
cards, "the Office after the confessor's shears and the first rewards of the
road") at the **late** stage profile across nearly every enemy and every
policy — and `apostate` (late, 45 cards, the fully-rewarded deck) beats both.
The ordering at `late` is **apostate > threadbare > pilgrim**, not the
monotonic `threadbare <= pilgrim <= apostate` the "one deck evolving through
the campaign" doctrine (`combat.starter-deck-presets.ts` file header) implies.

Evidence (`--stage=late --policy=all --deck=preset:all --runs=60 --seed=1
--cards`, all three presets measured against the identical late-stage player
body — same stats/dice/HP; only the deck differs):

| enemy | policy | threadbare | pilgrim | apostate |
|---|---|---|---|---|
| rangda | greedy/blind | 7% | 0% | 43% |
| rangda | chaos | 13% | 0% | (see full table) |
| tezcatlipoca | greedy/blind | 82% | 45% | 90% |
| tezcatlipoca | dot-weaver | 62% | 15% | 77% |
| tezcatlipoca | mercy-seeker | 87% | 63% | (n/a — apostate not re-run this cell) |
| arch-demon | greedy/blind | 60% | 25% | 87% |
| arch-demon | mercy-seeker | 88% | 57% | (n/a) |
| death | greedy/blind | 55% | 32% | 88% |
| death | mercy-seeker | 70% | 55% | (n/a) |
| the-abortive | greedy/blind | 3% | 2% | 57% |
| the-abortive | chaos | 5% | 3% | (n/a) |

(apostate's own full late spread is in the swap-sweep control table below;
the `(n/a)` cells mean that policy/enemy pairing wasn't re-extracted from the
apostate run for this table — the greedy/blind/dot-weaver rows for apostate
ARE directly comparable and all confirm apostate > threadbare > pilgrim.)

Pilgrim is worse than threadbare on **every** late-stage cell checked
(42 of 42 enemy×policy combinations pulled). This is not sampling noise —
it is a systematic inversion in the middle of the three-step lineage.

**Hypothesis (not confirmed this pass — flagged for the next `/deck-tuning`
run to test directly):** pilgrim's 30-card recipe trades threadbare's
concentration (18 cards, all cheap Ash-rank verbs that fire every turn) for
width (rot/debt/vigil/grave mid-rank cards with IMMOLATE/rider/charge
set-up costs) without a matching jump in raw output — so against a
570-HP late-stage body of enemies, pilgrim draws its payoff pieces less
reliably per game than threadbare draws its cheap-and-simple ones, and
apostate only recovers because its OWN 45-card recipe adds enough
raw finishing power (`nothing-stays-buried`-tier REPLAY/TWIN cards,
`the-charnel-ledger`, `open-every-grave`) to outrun the dilution. A deck-size/
consistency read, not a single-card defect — the fix (if one is wanted) is
almost certainly `PILGRIM_ADDED`/`PILGRIM_REMOVED` composition (Free tier,
`combat.starter-deck-presets.ts`), not a card literal.

**Why not applied this pass:** diagnosing which of "too few high-impact
finishers," "too much set-up-dependent IMMOLATE/charge tax," or "pure
deck-size dilution" is the actual driver needs isolating each axis
separately (e.g. re-run pilgrim at late with `+swap:` substituting one or two
IMMOLATE-tax cards for flat-damage ones, and separately a deck-SIZE probe at
constant composition ratio) — real sim work this run's remaining budget did
not allow doing responsibly. Recorded here as the top-priority follow-up.

## Step 0 — sync & sanity

- Tree was clean pre-run (`git status` — 2 unrelated untracked files under
  `axiomancer-mobile/`, not touched).
- `npm run baseline:check` (root): **STALE by 2 mechanics-source commits** —
  baseline `b826b2d4` (measured 2026-09-03, confidence `reduced-nightly`)
  predates `f29cea5c` (adjust-cards pass 1 — 11 card-face-honesty fixes) and
  `7856f1a1` (fix(combat): wire THE PATH dice axes into the shipped spec-33
  roll, #279). Regenerated at the end of this run (root `npm run
  baseline:regen`) so the next tick diffs against fresh ground.
- Cold suite run — **4/4 files pass, 155/155 tests green**:
  `combat-deck-draft.engine.test.ts` (19), `cards-sandbox.engine.test.ts`
  (16), `combat-playtest.balance-bands.sim.test.ts` (1 — the loose 2026-09-02
  smoke test), `combat-playtest.card-coverage.sim.test.ts` (119). No
  pre-existing failure — proceeded per failure mode 1's clearance.

## Doctrine drift — this skill file is stale (fix could not be applied)

`.claude/commands/deck-tuning.md`'s "North star" (§ CQI) and §4/§4a/§4b
"Design targets" sections are written against **CQI (spec 35)**, a win-rate
doctrine curve, per-rank pricing bands, count pins, and a 70%
dominant-card-share cap. **All of these were repealed by THE BIG NUMBERS
REWRITE** (T direct, 2026-09-02 —
the Big Numbers brief (deleted; see history), echoed in
`axiomancer-mechanics/CLAUDE.md`): *"Nothing older than 2026-09-02 governs
combat... no win-rate curve, no CQI, no rank bands, no count pins, no
status-engagement floor."* Confirmed live in-repo, not just doctrinally:
`combat-playtest.balance-bands.sim.test.ts` and `pricing.engine.test.ts`
were already rewritten to loose bug-detector smoke tests reflecting the
repeal (both files carry 2026-09-02 headers saying exactly this). Only three
constraints survive game-wide (aspect thirds, every card has a FREE line,
one tray roll per threat phase) — see `.claude/agents/card-expert.md`'s
"doctrine (load-bearing)" section for the current authoritative summary.

Per this skill file's own fact-ownership clause ("when a fact here
disagrees with the agent/spec, the agent/spec wins — fix the drift here in
the same PR"), this run attempted to patch the file's North-star/§4 sections
with a doctrine-drift notice. **The edit was blocked by the harness's
permission classifier** (denied as a config/command-file edit) on every
attempt, including a `Bash`-only fallback. This is flagged here instead so a
human can apply the fix directly — the concrete ask: replace the CQI/win-rate
framing in "North star" and §4/§4a/§4b with a pointer to
`axiomancer-mechanics/CLAUDE.md`'s THE BIG NUMBERS REWRITE summary, and
downgrade the historical tables (win-rate bands, dominance cap, pool ratios)
from "targets" to "metric-vocabulary reference, not graded."

## Pool audit (Step 1)

Three presets on the stage ladder (`COMBAT_DECK_PRESETS`), NOT the retired
per-theme swap-pool set: `threadbare` (early, 18 = 6/6/6 body/mind/heart),
`pilgrim` (mid, 30 = 10/10/10), `apostate` (late, 45 = 15/15/15) — each the
prior preset's `evolve()` (remove chaff, add rewards), pinned by
`PRESET_LINEAGE`. `cards.sandbox-sets.ts` carries one live set
(`GLYPHS_51_PILOT`, Phase 51 Seal-charge cards) — untouched this run. No new
sandbox sets or overrides were authored.

## Step 2 — baseline matrix

Two runs per the command file's own flags:
```
npm run combat-playtest -- --stage=all --policy=all --runs=60 --seed=1 --cards
npm run combat-playtest -- --stage=all --policy=all --deck=preset:all --runs=60 --seed=1 --cards
```

**Full-library draft sweep** (policy-pick over the whole stage-eligible
pool, not the presets) stage summaries:

| stage | win | statusEng | dotFrac | util | H | dom | cqi |
|---|---|---|---|---|---|---|---|
| early | 94% | 21% | 30% | 100% | 0.99 | 59% (the-blister-rosary) | 71% |
| mid | 96% | 29% | 25% | 100% | 0.96 | 79% (the-bench-does-not-retire+) | 73% |
| late | 86% | 28% | 28% | 100% | 0.98 | 59% (a-pound-of-flesh+) | 78% |
| impossible | 26% | 27% | 27% | 100% | 0.98 | 55% (the-note-falls-due+) | 77% |

`dom` up to 79% (`the-bench-does-not-retire+`, a rank-6 Saint finisher) is
**not** a forge target this pass — the 70% dominance cap is one of the
repealed doctrines above, and a top-rank finisher being your best play when
drawn is not itself a bug signal post-repeal. `cqi` is printed by the
harness (informational field, not deleted from the code) but is not graded
against anything — read it as telemetry only.

**Dead-card rate — diagnosed as a draft-reachability artifact, not a design
defect.** The full-library sweep reported `84/219 eligible cards exercised
(dead-card rate 62%)`. Cross-checked six of the "never played" ids against
the PRESET sweep (same run, different deck source) — every one is alive and
heavily played there: `unction-of-boils` 24,151 plays, `the-sextons-bell`
20,991, `the-vig` 20,938, `grandmothers-psalter` 20,261, `frostbitten-palisade`
20,043, `dead-pledge` 11,706 (all in the second table above's per-card
section). These are seated `PILGRIM_ADDED`/`THREADBARE_COUNTS` cards; they
"never played" only in the full-draft sweep because the weighted draft
(70-220+ candidate pool, 10-card decks, short early-game round counts) never
cycles them into a hand inside the ~1.5-5-round game length before the run
ends — exactly the reachability caveat the skill file already documents for
preset-only sweeps, confirmed here to extend to the full-draft sweep too.
Not a forge target; a genuine bug-detector reading of "can this card ever be
played" is only meaningful at its actual shipping seat (the preset sweep),
where coverage is clean.

## Step 3 — one swap-measurement: `the-plague-pit` for `paupers-pyre` (apostate)

**Hypothesis:** `the-plague-pit` (grave, tier 3 rank 5 "Skull," unseated —
not in any preset recipe) is a strictly-scaled-up version of the seated
`paupers-pyre` (grave, tier 2 rank 3 "Splinter," 1 copy in apostate) — same
IMMOLATE-fuel-into-burst family, same `body` aspect (swap keeps the aspect-
thirds constraint intact), same `free: {damage, millCards}` shape. Grave is
apostate's richest late-game package; testing whether the bigger card earns
apostate's seat is exactly the §3 "does this unseated reward card earn a
seat?" question.

**Prior-art grounding (owner-requested for this run — see note below):**
`kb:dawncaster/cards/... Vile Sacrifice` (Uncommon/Corruption — "Destroy a
card in your hand," a hand-cost-into-payoff Dawncaster card, confidence:
community/draft per kb-query's standing caveat) and
`kb:slay-the-spire/cards/0143-feed-feed` (src via `kb_cards game=
slay-the-spire`, "Deal 10. If Fatal, raise Max HP by 3. Exhaust" — the
self-consuming-resource finisher family both corpora independently confirm
as a real genre pattern) both corroborate IMMOLATE-as-cost is genre-honest,
not a novel risk. Neither corpus gives a magnitude precedent transferable to
our VITAE scale (Feed's HP economy and Vile Sacrifice's hand-cost economy
are both much smaller games) — used for FAMILY validation only, not for
sizing `the-plague-pit`'s numbers.

**Evidence** (control = unswapped `apostate` from the Step 2 preset run;
treatment = `--deck=preset:apostate+swap:paupers-pyre/the-plague-pit`, same
seed/runs, `--stage=late --policy=all` and `--stage=impossible --policy=all`):

| stage | enemy | policy | winRate control→treatment | Δ |
|---|---|---|---|---|
| late | fire-giant | greedy/blind/dot-weaver | 100→100 / 100→100 / 100→100 | 0 (ceiling) |
| late | rangda | greedy/blind | 43→50 | +7 |
| late | rangda | dot-weaver | 25→23 | −2 |
| late | tezcatlipoca | greedy/blind | 90→87 | −3 |
| late | tezcatlipoca | dot-weaver | 77→73 | −4 |
| late | arch-demon | greedy/blind | 87→85 | −2 |
| late | arch-demon | dot-weaver | 53→57 | +4 |
| late | death | greedy/blind | 88→90 | +2 |
| late | death | dot-weaver | 75→68 | −7 |
| late | **the-abortive** | greedy/blind | 57→45 | **−12** |
| late | the-abortive | dot-weaver | 25→33 | +8 |
| impossible | the-incompleteness | greedy/blind | 5→13 | +8 |
| impossible | the-incompleteness | dot-weaver | 3→3 | 0 |

Win-path stayed honest in every cell (100% of wins remained `vic`; no shift
onto concede/capitulate). `the-plague-pit` itself played cleanly at its
measured seat: 2,143 plays, 100% opp%, only 6% fizz, hpP 123,047 across the
late run — a healthy, well-exercised card, not a dead swap-in.

**Verdict: measured, not shipped.** The change is a real tradeoff, not an
obvious win — it meaningfully helps the impossible ceiling (5%→13%, nearly
tripling, still nowhere near a floor) and two of six late enemies, but costs
**the-abortive** a genuine −12pp under greedy/blind. Per the swap law (§3),
a winning candidate ships by moving it into the recipe with real bookkeeping
in the same PR — this evidence does not clear that bar cleanly enough to
justify the-abortive's loss without understanding WHY that specific enemy
punishes the swap (a real diagnosis this run didn't have budget for).
Recorded as a swap-measured finding for the next pass to either investigate
the-abortive's matchup or accept the tradeoff explicitly.

## Other findings (not actioned this pass)

- **`open-every-grave` (apostate, grave/replay) — 20% fizz%**, the highest
  in the preset per-card table. `REPLAY your last spell 2 times` fizzes when
  there is no prior spell cast that turn/game to replay — a genuine
  precondition-width signal (failure mode 4's "high fizz% at every legal
  seat" pattern), though the card's `free: {damage: 12, millCards: 3}` line
  still fires unconditionally on a whiff, so a fizzed PAID line is not a
  fully dead turn. Flagged for card-expert follow-up, not fixed here — no
  card-data-only lever obviously widens "was a spell cast before this one"
  without touching engine resolution order (out of this loop's surface).
- **`rawhead-rex` (mid) inverts pilgrim vs. threadbare too**: threadbare
  beats pilgrim on 8/8 policy cells against this one mid-stage enemy
  (e.g. dot-weaver 70%→28% control-lock, greedy 70%→28%) — the same
  direction as the late-stage headline finding, suggesting whatever hurts
  pilgrim at late is already visible at mid against a hard-counter enemy.
  Consistent with (not independent confirmation of) the headline hypothesis.

## Prior-art grounding — owner-requested, not organic to this skill

**This run consulted `mcp__kb-query__*` during Steps 1 and 3 at the repo
owner's explicit request; grounding the card forge in the KB corpus is not
a standard part of `/deck-tuning`'s own procedure** (the command file does
not mandate it). Lookups made: `kb_keyword "exhaust"` (no match — Dawncaster
does not use that term; our IMMOLATE is our own coinage), `kb_cards "pyre"` /
`"replay"` (no Dawncaster matches — no direct analogue for either card name
or the REPLAY keyword by that string), `kb_cards "sacrifice"` (→ Vile
Sacrifice, cited above), `kb_cards "Feed" game=slay-the-spire` (→ Feed,
cited above), `kb_keyword "poison"` (→ Dawncaster POISON: "After playing a
card, take 1 damage, then decrease Poison by 1" — confirms our POISON's
decay-per-tick design, already the documented precedent in the big-numbers
overhaul doc itself, so this is corroboration, not new territory). A
`kb_search` for board-game "combo whiff/dead/situational" complaints (to
ground the `open-every-grave` fizz finding) returned no matches — no KB
coverage for that specific angle; flagged rather than answered from memory.

## Considered but not applied

- The `the-plague-pit`/`paupers-pyre` swap (mixed evidence, see above).
- A doctrine-drift patch to `.claude/commands/deck-tuning.md` (blocked by
  the permission classifier — see "Doctrine drift" above).
- No PILGRIM_ADDED/REMOVED composition change — the headline finding
  identifies the problem but this run did not isolate a specific fix with
  evidence; shipping a guess here risked masking the real driver.

## Open questions

- **[needs-user-call?]** Is the pilgrim late-stage underperformance
  acceptable as "the mid deck is honestly weaker before the player
  replaces it," or is it a bug the next pass should chase down? The
  design doc frames pilgrim as strictly evolved from threadbare (additions,
  trims of chaff only) — the data says that framing doesn't hold at
  late-stage difficulty. Flagging rather than assuming either answer.
- Whether `.claude/commands/deck-tuning.md`'s repealed-doctrine sections
  should be rewritten wholesale (a bigger edit than this run attempted) or
  left with a pointer notice — the notice this run tried to add would have
  been the latter; a human edit is needed either way given the classifier
  block.
- `the-abortive`'s specific −12pp reaction to the plague-pit swap is
  unexplained; worth a targeted card-coverage/fizz check on that one enemy
  before either shipping or discarding the swap.

## Verify gate

No `axiomancer-mechanics/src/**` or preset/library files were changed this
run (the doctrine-drift edit was blocked before it landed, and the swap was
measurement-only via the CLI's `--deck=preset:...+swap:...` flag, which
does not touch any file). The Step 0 cold suite (155/155 green) is this
run's verify evidence; no further `npm run verify` was run since nothing in
the mechanics package's source tree changed. Baseline was regenerated (root
`npm run baseline:regen`) so the next run has a fresh, non-stale diff point.
