# THE BIG NUMBERS REWRITE — record of decisions

> Every choice the Big Numbers brief (deleted; see history) left open, and
> what was actually decided while executing it on 2026-09-02. Written as the
> work happened, in execution order.

## Scope decisions

**D1 — The card library is split into per-theme modules.** The prompt assumed
one `cards.library.ts`. It is now an aggregator over
`src/Cards/library/{starters,relics,rot,debt,grave,vigil,trial,choir}.cards.ts`.
*Why:* six themes could then be authored in parallel without merge conflicts,
and a theme can be reworked later without touching the other five.
*Cost:* `axiomancer-card-editor`'s write-back (`src/server/cardCodegen.ts`)
locates a card by scanning `cards.library.ts` for its `const <ident>: Card`
block. It must be taught to scan the library directory — **open follow-up**.

**D2 — No `neutral` theme.** The prompt floated a theme-less pool of ~10. The
seven existing themes were kept instead and the would-be neutrals distributed
into them (the heirloom `grandmothers-psalter` is `choir`, the watch-vestment
`threadbare-cope` is `vigil`). *Why:* adding a `CardTheme` member means
touching `THEME_KEYWORDS`, the theme-derived tag check, the catalog and the
mobile theme families for no design gain.

**D3 — Library size landed at 112, not 100-120 with a neutral pool.**
8 starters + 3 dice-valve relics + 5 curses + 6 themes x 16.

**D4 — oath/hex keep their engine-derived FREE line.** The prompt allowed
either. They continue to author `persistentEffect` and no `free`; the FREE
line is a timed (3-round) instance of the same passive via `playFreeEnchant`.
*Why:* it already satisfies "playable without a die", and authoring a second
FREE line would make the two faces say different things.

## Mechanics decisions

**D5 — Eight of the eighteen candidate player keywords shipped:** DEAL (with
`hits` and `pierce`), WRATH, FLAY, TWIN, CHAIN, EXECUTE, OVERKILL, plus the
FLOW turn-shape condition. *Not shipped:* CONJURE, CINDER, LEAD, CHARGES,
VOW, die-steal, extra-die, re-roll — the dice economy already carries
KINDLE/FORGE/BANK/OVERHEAT and adding four more die verbs would have made the
tray the whole game. AMBUSH is not a new predicate: it is `opening` with
`maxPriorSpells: 0`, which already existed.

**D6 — DEAL has no keyword row in the registry.** "Deal 24" is plain English;
keywording it would spend the face-term budget on the one verb that needs no
explanation. PIERCE, WRATH, FLAY, TWIN, CHAIN, EXECUTE, OVERKILL, AMBUSH and
FLOW all got rows with reminder text.

**D7 — EXECUTE doubles damage; it does not slay outright.** Dawncaster's
reading (instant kill under a threshold) would let a player skip a boss's
STAGE thresholds, which are the fight's dramatic beats. A double keeps the
finisher fantasy and the staging.

**D8 — FLAY is a state counter, not a status effect.** `CombatEncounterState.flay`
holds stacks on the foe; each damage instance spends one for +50%. *Why:* a
new `debuff_flayed` id would need a library entry, a glyph, an `EFFECT_KEYWORD`
row and DoT-clock semantics it does not want. *Cost:* it does not show in the
foe's status chips like a real affliction — **open follow-up** if it reads
badly in play.

**D9 — The scaler order is authored, not incidental:** read multiplier →
colour-match percentage → WRATH (flat) → CHAIN (flat) → FLAY (x1.5) →
EXECUTE (x2) → HIDE subtracted last, floor 1. HIDE last is the load-bearing
choice: it makes armour a floor on small hits rather than a percentage tax on
big ones, which is what makes `28 x 1` and `7 x 4` play differently.

**D10 — The colour-match bonus became a percentage** (+25%, minimum +2) rather
than a flat +3. A flat bonus that mattered on GUARD 6 is noise on GUARD 40.

**D11 — CHAIN fades at a turn boundary that did not feed it**, WRATH never
fades, FLAY sits on the foe until spent, TWIN never outlives its turn.

## Enemy decisions

**D12 — Enemy VITAE is decoupled from the player's stat formula.** `baseStats`
still drives procs, derived stats and befriend logic; the pool is
`round((30 + 18*level) * ENEMY_VITAE_MULT[difficulty])`, overridable by an
authored `vitae`. Every boss and unique authors one. *Why:* the difficulty
bands then separate cleanly and a boss can be a wall without a grotesque stat
budget. The `5 x level` stat law is gone as a law but `enemyStatBudget` remains
as the stat distributor.

**D13 — Keywords and stages have a DERIVED FLOOR, not just authored lists.**
`defaultEnemyKeywords(level, difficulty)` and `defaultEnemyStages(difficulty,
vitae)` give every foe something; an authored list replaces the default
outright. *Why:* hand-authoring nine keywords across seventy-two enemies would
have produced noise, and a level-1 Float-Eye should teach the dice, not the
exceptions. Simple foes get nothing; normals get HIDE only from level 8.

**D14 — `EnemyStage` has no deck-swap field.** The prompt sketched
`deck?: Partial<EnemyDeck>`. Threat phases are compiled up front from a flat
deck, so a mid-fight tier swap would need a recompile path. Stages instead
change the fight through `gain` (keywords), `cleanse`, `heal`, `threatBonus`
and `curseCardId` — **open follow-up** if tier swapping proves worth it.

**D15 — Enemy decks stayed FLAT rather than becoming a three-tier structure.**
The existing model is an ordered, non-reshuffling sequence whose back half
spikes, which is already Aeon's End's structural escalation; the tier wrapper
would have been vocabulary, not behaviour. The doc comment was rewritten from
DECK LAWS to DECK SHAPE (conventions, not laws). **This is the one place the
prompt's §8.2 was not implemented as written.**

**D16 — THE COVETED DIE is repealed but its behaviour is the default.** A new
`DECK_STAKES` map lets any deck stake any seat; an absent entry falls back to
"a boss/unique wagers on its second card". Nothing is pinned any more.

**D17 — WOUNDING's payload is a real card**, `the-wound`, in the curse pool.
`WOUND_CARD_ID` in the engine points at it; an absent id would be a silent
no-op under the resolve-filter law.

## Alt-win decisions

**D18 — CONDEMN rescaled to `at: 12 / concedeAt: 14`**, not the 12-20 the
prompt suggested. `gainPremises` checks `concedeAt` before `at` and firing
`at` zeroes the tally, so CONDEMN is only reachable by a single filing that
overshoots from below `at` past `concedeAt`. The old geometry was a 2-Charge
gap; that gap is preserved at the new scale. A wider gap would be dead.
**Open follow-up:** if a cumulative ladder was intended, the engine must read
`premiseMilestoneTotal` for the concede check rather than the live tally.

**D19 — The concede floors (10 elite / 12 boss) are now inert** at
`concedeAt: 14`, but still printed on the face because the number-parity guard
requires every number the engine prints to appear in `paidSummary`.

## Test and guard decisions

**D20 — The number-parity guard survives; the style clauses do not.** Kept:
every number the engine applies appears verbatim on the face, every UPPERCASE
run is a registry keyword, every printed keyword has a popup, no card is
unplayable, the card-editor kind-union assertion, the turn-law test. Deleted:
the 130-character budget, the em-dash and semicolon bans, "the foe" not "the
enemy", every count pin, every band, every curve.

**D21 — DOOM's growth clause is excluded from number parity.** The generated
text carries "(grows +1 each time the foe acts)", whose `1` is a rule, not a
number the card applies. Without the exclusion every DOOM carrier would be
forced to print a meaningless 1 on its face.

**D22 — `cards.pricing.ts` survives as an ADVISORY scorer.** `VERB_POINTS`
gained `damagePerHp` (1/3, anchored against HEAL), `pierce`, WRATH's
`expectedHitsLeft`, `flayPerStack`, `twin`, `chainPerPoint`, `execute` and
`overkill`. Nothing gates on the score any more; it feeds the catalog and the
smell tests.

## Tuning decisions (the measured pass)

The first playtest matrix after the rewrite read 0% at mid, late and
impossible. Most of that was a measurement artefact; the rest was two real
curve errors. Everything below is a measured change, not a guess.

**D23 — `combat.stage-profiles.ts` hard-coded the player's pool at the OLD
scale** (mid 255, late 570, from `stats x 5`). The harness was fighting the new
roster with the old body, which read exactly like a balance catastrophe. It
derives from `calculateMaxHealth` now and cannot drift again.

**D24 — the mid stage's `maxCardTier: 2` was a wrong gate.** `tier` is the
RESIST tier, never a power axis, and every Skull/Saint card is tier 3 — so a
Rib-capped deck was being sent at thousand-VITAE bosses. `rankMaturityLevel`
already gates maturity properly (rank 5 wants level 10, rank 6 level 12).
Raised to 3.

**D25 — `ENEMY_VITAE_PER_LEVEL` 18 → 8.** The structural finding of the whole
pass: **a player's damage per turn is set by CARD RANK and does not grow with
level**; only VITAE and stats do. A pool growing at 18/level outran any deck by
the late campaign. This is worth remembering — it is a property of the game,
not of this rewrite, and any future VITAE curve has to respect it.

**D26 — `THREAT_PER_LEVEL` 2.5 → 0.8.** At 2.5 the player died in a constant
~5 phases at every level (VITAE and threat both grow linearly, so the ratio is
scale-invariant). That constant is what made every boss cell unwinnable.

**D27 — stage threat bonuses cap at +50% combined** (`STAGE_THREAT_BONUS_CAP`).
They multiplied on top of an escalation clock already worth up to x2 (x1.6 for
a boss); unbounded, a four-stage unique became a one-shot by round six.

**D28 — BRUTAL lands at +50%, not x2.** Mage Knight's "take it twice" is right
at Mage Knight's numbers. Doubling a late-campaign 150 against walls that top
out near 60 is a one-shot with no legal answer.

**D29 — authored boss pools, REGROW and HIDE were re-derived** against the new
curves (they had been sized against the pre-tuning ones).

**Where the matrix landed:** early 94% · mid 56% · late 4% · impossible 0%.

## Bugs found and fixed during the pass

1. **ECHO never applied to DEAL.** A card printing `Deal 11. ECHO.` did nothing
   twice. ECHO and TWIN now multiply the HIT COUNT, not the per-hit magnitude,
   so armour and per-hit DoT clocks are paid per instance.
2. **PAID-line riders dropped the whole damage family.** Two rider executors
   exist; only the FREE-line one was taught. 20 cards printed damage the engine
   never applied. Regression guard in `profane-mechanics.engine.test.ts`.
3. **`MAX_EFFECT_INTENSITY` was 10**, so six cards printing THORNS 12-20 and
   DOOM 12 silently landed 10 — a printed number the engine did not apply,
   which breaks the one text law the repeal kept. Raised to 30.
4. **`check-lexicon`, `check-prose`, `check-naming-law` and
   `check-devlog-not-served` never ran on Windows.** Their entry guard compared
   `import.meta.url` to a backslash `process.argv[1]`, so all four exited 0
   with no output and the `PostToolUse` lexicon hook was a silent no-op. Fixed
   via `pathToFileURL`; its first real run immediately caught a retired term in
   a new boss stage name.
5. **The card-editor write-back** still scanned `cards.library.ts` (D1), so
   every save would have missed. It follows the library directory now.

## THE PATH — the progression axes (owner ruling, later the same day)

The owner ruled the campaign's real power curve, which the harness had never
modelled. Recorded in full in the durable memory `axiomancer-progression-model`;
in short, a player grows along SIX axes, not one:

1. staged decks (early / mid / late snapshots of one evolving deck)
2. card REMOVAL — the late deck is not diluted by starters
3. card UPGRADES — Slay the Spire's model, a strictly better version per card
4. die UPGRADES — more mana faces, expensive
5. ACT REWARD DICE — a base die of the player's choice after each act
6. better items → stronger SIGNATURE skills

Plus: **enemy decks increase in TIER as the rounds increase.**

**D30 — the harness now carries the campaign, not just the level.**
`CombatStageProfile` gained `bonusBaseDice`, `dieUpgradeLevel` and
`upgradedCardShare`, monotone across the four stages; `Character` gained
`bonusTurnDice` and `dieUpgradeLevel`; `dieFacesForUpgrade(0..4)` trades dead X
faces for live ones, then grows the bag to 7 and 8 faces. Guarded by
`progression-axes.engine.test.ts`. (Extended 0..2 → 0..4 on 2026-09-03 so the
owner's "3 or 4 upgrades" band is expressible; see D31a.)

**D31 — WITHDRAWN 2026-09-03. It was a wiring bug, not a design finding.**

The original D31 read: *"MEASURED: act-reward dice are a WEAK axis. Raising a
late player from 2 bonus dice to 8 moved the matrix by exactly zero. Under the
dice law you ROLL N and DRAFT ONE, so extra dice buy colour selection and
Conviction — not extra PAID plays."*

The reasoning about roll-N-draft-one is true **of the legacy dice model**. It
is not why the measurement came back flat. `startTurn` has an early return for
the spec-33 UPGRADEABLE model (`combat.engine.ts`, `isUpgradeableDiceEnabled()`
branch) which read **neither** `bonusTurnDice` **nor** `dieUpgradeLevel`. The
playtest CLI and the app both default to that model, so **both dice axes were
inert in every playtest that has ever been run.** Eight bonus dice moved
nothing because eight bonus dice were never rolled.

Worse, the inference was backwards. Spec 33 **retired the draft** —
`draftStanceDie` no-ops under the flag and *every usable die powers a card*
(`combat.engine.ts:790`). So in the shipped model an extra die IS an extra PAID
play, and a honed mana face IS one fewer dead die. These are the two STRONGEST
axes on THE PATH, not the weakest.

**D31a — the axes now reach the shipped roll.** `honedDieGear(color, level)`
converts MISS faces to MANA faces (colour dice 2→5 mana across four hones,
gold 1→5); `activeDieGear` falls back to it when no gear rail is authored;
`rollUpgradeableDice` appends one duplicate-colour die per banked act reward in
R/B/P order. Owner-set harness bands (2026-09-03): early = base tray, mid = +1
die and 1-2 hones, late = +2 dice and 3-4 hones. Pinned by
`progression-axes.engine.test.ts` ("THE PATH under the SHIPPED dice model").

**D31b — what it was worth, measured on the same matrix.**

| stage | axes inert | axes live |
|---|---|---|
| early | 94% | 94% (correctly unchanged — no dice banked yet) |
| mid | 89% | 98% |
| late | 44% | 84% |
| impossible | 0% | 0% (still out of reach by design) |

Biggest single cells: rangda 48→98, tezcatlipoca 55→100, death 35→93,
arch-demon 22→78, the-abortive 7→35. **Every late-campaign win rate quoted
before 2026-09-03 was measured with an act-one tray and is void.** Mid at 98%
and late at 84% may now be too generous; no law is broken (the win-rate curve
was repealed) but it is the owner's call.

Two spec-33 economy assertions moved with it, both restated rather than
silenced: the F1 whiff-skew comparison now measures the `early` stage, because
`measureDiceMath` is a stock-gear stream and mid/late no longer are; and the
STAKE clock gap inverted (flag-on 5.38→3.17 rounds vs flag-off 3.75) because
the axes are worth more with the draft retired.

**Still genuinely open for the owner:** under the LEGACY model extra dice
remain selection-only. If the legacy tray ever ships, "more dice" needs
`1 + bonus` drafts per turn — an engine + combat-UI change.

## The pilot was not smart enough — it was broken

The owner asked whether the playtest pilot was smart enough. Two bugs, both
mine, both from this overhaul:

**D32 — `bottomDamagePreview` summed DoT ONLY.** Its own comment read "0 for
everything else (no strike preview exists any more)" — true under the strike
ban, badly wrong once DEAL returned. The greedy pilot RANKS CANDIDATE PLAYS by
that number, so it was blind to the library's primary verb: every damage card
scored 0, the bot fell through to its signature nearly every turn, and 75% of
the library never got played. Fixing it alone moved mid 56 → 66% and late
4 → 9%.

**D33 — DEAL damage was never recorded in the attribution ledger.** Every
report credited it to whatever last attributed — the signature skill. That is
the entire explanation for the `dom=100%(signature)` reading previously
reported as "the sim grades the signature economy more than the library". It
was an accounting error, not a finding.

**D34 — THE APOCRYPHA.** A twelve-card, Saint-rank late-act pool
(`library/apocrypha.cards.ts`), two per theme, each carrying its theme's axis
to its extreme — a flat 90 for RECOIL 30, `16 x 6` under EXECUTE, REAP ALL at
26 per Soul, BACKFIRE ALL at 16 per denied rung, PLEA 70.

**D35 — the CONDEMN ladder rescaled 12 / 24 / 40 / 60** (base / elite / boss /
unique; `unique` is a new tier). CONDEMN is an alt-win: reaching the tally ends
the fight whatever the foe's VITAE, so its cost is the only thing between a
Charge deck and a free kill. At the old 8/10/12 — set when a card filed one or
two Charges — a single apocryphal card filing NINE beat the deliberately
unwinnable Unfinished **87% of the time**. Every floor is printed on the card
face, so raising them stays honest.

## Known gaps and follow-ups

Raised by the authoring agents, all real, none blocking:

1. **`recoil_x` cannot pay out in damage** — only `poisonPerX`. A
   `damagePerX` / `wrathPerX` would unlock debt's most obvious card
   ("deal 4 per VITAE paid").
2. **`rupture` has no authorable per-stack number**, so a RUPTURE face cannot
   print its own detonation rate. Needs a `perStack` field.
3. **No FESTER/PROLONG rider**, so no FREE line can deepen existing DoTs.
4. **No affliction-count, Soul-count or PLEA-total predicate** in
   `SynergyStatePredicate` — the affliction and harvest themes cannot gate on
   their own currency.
5. **No "deal damage equal to your GUARD" verb.** Vigil's whole pitch is
   faked by printing matched numbers (GUARD 60 / RIPOSTE 60). A
   `{ kind: 'reprisal'; pct }` reading the live defensive pools would make the
   theme do what it says. Vigil's biggest number is a printed 60, below the
   100-300 payoff band every other theme reaches — **the weakest theme as
   shipped.**
6. **No discard-depth scaler** for grave, and **no accumulating quiet-round
   ledger** for vigil.
7. **`overkill` converts to Conviction, Souls and healing but not PLEA.**
8. **A card carries at most one `synergy`**, so a Skull/Saint card cannot gate
   on two conditions despite that band being nominally unbudgeted.
9. **`lock_stance` has no keyword token**, so it prints as prose and renders no
   glossary chip.
10. **FLAY has no status chip** (D8) — it is a state counter, so it shows on
    the enemy pane as a meter rather than among the affliction chips.
11. **`projectRupture` / `projectRuptureBurst` are not composition-aware.**
    `communion-of-the-worm` prints `Deal 30. PIERCE.` *before* its RUPTURE;
    that hit fires the damage-instance clock, so BLEED ticks out and washes
    away before the burst is priced. On a standard board the preview reads 63
    and the burst lands 40. A plain-rupture fixture previews 63/63, so the
    engine is self-consistent and the PROJECTION is what is missing the card's
    own pre-payoff verbs. Captured as an `it.fails` in
    `status-depth-combat.engine.test.ts` — it turns red when fixed.
12. **`concedeFloorFor` is effectively dead code.** The only CONDEMN card now
    prints `concedeAt: 14`, above every tier floor (8/10/12), so
    `max(printed, floor)` never binds.

## The late campaign is still too hard

The matrix reads **late 4%**, with four of six cells at 0%. This is a real,
unresolved gap, not a measurement artefact — it survived every tuning lever
above. The diagnosis is D25's structural finding: card power is flat in level
while enemy pools are not, so at the top of the curve a deck cannot chew
through a boss in the phases it survives. Three honest ways out, none of them
attempted here because each is a design decision rather than a tuning one:

- give cards a level-scaling term (the biggest change, and the one that makes
  the curve self-correcting);
- flatten enemy VITAE growth to near-zero past the mid campaign;
- give the walls a late-game answer — the vigil `reprisal` verb in gap 5 would
  turn a 60-point wall into a 60-point answer and is the cheapest of the three.

Note also that the sim's greedy policy reports `dom=100%` on a SIGNATURE SKILL
at every stage, and exercises only 28 of 112 cards. The matrix is currently a
better measure of the signature economy than of the library, so its late-stage
verdict should be read with that caveat.

## Open follow-ups, checked 2026-11-04 (plan 150.5)

Each "open follow-up" above was read against main. None is live, so none is
carried to a spec; this record is the close.

- **D1 (card-editor scan of the library directory):** moot. The card-editor
  package and `cardCodegen` no longer exist.
- **D8 (FLAY has no status chip):** moot. The engine purge (`plan/revamp/engine.md`,
  R7) removes the flay state with the rest of the carrier-less encounter fields.
- **D14 (mid-fight tier swap):** moot. The enemy revamp (spec 134) replaces the
  staged-deck model this was asked of.
- **D18 (cumulative concede ladder via `premiseMilestoneTotal`):** moot.
  `premiseMilestoneTotal` is gone with the premises machinery.
- **Gaps 1-12 and "The late campaign is still too hard":** superseded by the
  revamp; the numbers they cite predate the round-turn-law fix and THE PATH.
