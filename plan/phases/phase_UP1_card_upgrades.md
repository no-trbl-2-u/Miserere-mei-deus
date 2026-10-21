# Phase UP1 — Card upgrades carry the Act 1 power curve

## Sources

- The `/plot anytime` request from T, 2026-10-20 (attended), promoting T's `/pitch` of the same day ("Let's talk
  about card upgrades. What they offer a player, how we can test them, will they upgrade multiple times, what am
  I not asking yet"). The pitch file was folded into this brief in full (§ Pitch record, below) and then deleted,
  at T's request.
- `plan/deadlines.md` W3 ("Card-upgrade path", "Upgrade grant call"); W4 (the Act Boss, Phase B2).
- D8 (card upgrades deferred until a grant path is decided; this brief decides it), D37 (no card generation
  outside a guided session with T: the renames in UP1a and the rare in UP1c were directed by T in this guided
  session, and no new card is created), D57 (the measured report is a measurement, not a gate), D84, D88, D93.

## Outcome

A player in Act 1 can upgrade the cards they own at rest sites, at the blacksmith and from elite rewards. Each
upgrade makes the card's numbers bigger, and rarity limits how many times a card can be upgraded. Once the Act 1
boss exists, the measured report shows that upgrades are what get a Blood Price deck past it.

## Acceptance

- **A1** Every Blood Price card that has no name gets a thematic name drawn from its effect. The five already
  named (Bloodletting, Open Vein, Blood for Blood, Crimson Pact, Transfusion) keep theirs. Card ids do not
  change, and a library test fails if any player-facing Blood Price card's name still starts with
  "Blood Price ".
- **A2** The upgrade law: rarity sets how many upgrades a card may take (common 1, uncommon 2, rare 3). Ids are
  `<id>+`, `<id>++` and `<id>+++`. `baseCardId` strips every `+`. An upgrade past the limit is refused, and a
  test covers each rarity at its limit and one step past it. Each upgrade's id resolves in a deck and in a save.
- **A3** Every upgrade makes the numbers bigger, Blood Price cards included. For a card whose effect is a
  `program`, the payoff amounts it deals (DEAL, GUARD, HEAL, LEECH, VULNERABLE %, "the foe loses", Conviction
  gained, and the caps on those payoffs) grow with each upgrade. Costs (SACRIFICE, TETHER, EXILE) do not grow.
  The card text shows the new numbers. A test checks every library card: after one upgrade, at least one payoff
  number is higher and no cost is higher. The formula is not shown to the player.
- **A4** A `REPLACE_CARD` (or equally named) action swaps one owned copy of a card for its upgraded copy in
  `knownCards` or `combatRewardCards`. Duplicates are kept, so only the one chosen copy changes.
- **A5** Blood for Blood (`bp-e-08n`) becomes the library's first rare (rank 5, Skull), with bigger base numbers
  than it has today. A test checks it takes three upgrades and refuses a fourth.
- **A6** One shared upgrade screen shows the card as it is, the card after this upgrade with its new numbers, and
  a locked "???" slot beside it. The player picks the card. The screen lists only cards that can still be
  upgraded.
- **A7** A rest site offers "upgrade a card" next to rest and cut. Choosing it heals nothing and upgrades one card
  the player picks.
- **A8** The blacksmith offers a card upgrade for 5 shillings, once per visit, alongside HONE, TEMPER and SWAP.
  It is refused if the player can't afford it or has nothing to upgrade.
- **A9** An elite fight's reward offers three cards of the highest rarity available, at least one from the
  player's lanes. The other option is one upgrade of a random owned card at the highest rarity the player owns.
  The upgrade option hides when nothing can be upgraded. A fight counts as elite when its enemy has
  `difficulty: 'elite'`.
- **A10** The measured report gains Blood Price columns with half the deck upgraded once, next to the plain deck,
  for every ledger fight.
- **A11** (blocked on the Act 1 boss, Phase B2) The measured report includes the Act 1 boss. The half-upgraded
  Blood Price deck beats it more than 50% of the time, and the plain deck 25% of the time or less.

Measure: `docs/reports/measured/latest.md` shows the half-upgraded Blood Price deck winning more than 50% against
the Act 1 boss and the plain deck winning 25% or less. Until the boss exists, the engine tests for A1 to A9 and
the A10 columns are the measure.

## Scope (shared)

- `axiomancer-mechanics`: `Cards/card-upgrades.ts` (the upgrade law, program scaling), `Cards/cards.library.ts`,
  `Cards/library/blood-price.cards.ts` (names, the rare), the program context that runs card effects (payoff
  amounts and their text tokens), `Game/actions.types.ts` and `game.reducer.ts` (the replace action),
  `World/RestChoice/*` (the upgrade offer), `World/Blacksmith/*` (the card-upgrade verb), `Combat/combat.rewards.ts`
  (the elite reward), `Combat/combat.measured-truth.ts` (the upgraded deck), and the package index for whatever
  mobile needs to import.
- `axiomancer-mobile`: the shared upgrade screen, `app/rest`, `app/blacksmith`, the combat reward panel
  (`components/combat/encounter/CombatEncounterPanel.tsx`), and the stores and presenters behind them.

## Consumers to update

- `docs/game-model.md` (upgrades, grant paths, the first rare); `plan/revamp/progression.md:14-15` (upgrades are
  no longer parked: this brief, D8 resolved); `docs/card-spec.md` (the Blood Price names).

## Save / schema contracts

- Owned cards stay plain id strings, so an upgraded copy is `<id>+`, `<id>++` or `<id>+++`. `dropUnknownCardIds`
  (`Game/game.migrate.ts:1118`) already keeps any id `getCardById` resolves. No save version bump unless a phase
  adds a field. The blacksmith's once-per-visit flag lives in the visit session, not the save.

## Decisions made upfront — DO NOT ASK

- **Upgrades are counted, not "tiers"** (T, t6). A card's rarity limits how many upgrades it can take. The
  existing `Card.tier` field is the effect-resist tier (`Cards/types.ts:24-30`), unrelated to upgrades; this phase
  does not touch it.
- **"Bigger" is the agent's call, kept balanced and hidden** (T, t6: "just make the numbers bigger each
  upgrade… hide whatever equation you use"). Start from the existing default rule: +40% per upgrade, at least
  +2, effect intensity +1 within its cap. Each upgrade applies to the previous one. Payoffs and their caps grow;
  costs never do. An authored `Card.upgrade` patch still wins over the default for the first upgrade.
- **The first phase names the Blood Price cards** (T, t6: "the first row for this phase MUST be to generate names
  for all of these blood price cards… thematic to their effect… we can always rename them"). Names only: no text,
  number or id changes. T's direct instruction in this guided session satisfies D37.
- **The rare is Blood for Blood** (T, t7: "pick the most thematic card"). Paying any amount of blood and
  hitting back double is the Blood Price lane in one card. It moves to rank 5 with bigger numbers, in a separate
  phase (T: "a tick in this plan").
- **Sources** (T, t2 and t4): rest (give up the rest), blacksmith (pay, once per visit), elite reward.
- **Elite offer with few rares** (T, t6: "Best 3, or a random upgrade"): the highest rarity available stands in
  for "rare" until rares are common in the library. At that point the rule is exactly T's: 3 rares (2 random, 1
  from the player's lanes), or an upgrade of a random owned rare, falling back to an uncommon.
- **The "???" slot is shown, locked** (T, t4). It stands for the branch designs, which are owner content after
  v0.3.
- **Anvil price: 5 shillings**, the TEMPER price. `[T to confirm]`
- **The player picks the card** at the rest site and the anvil. The elite upgrade is random (T, t2). `[T to confirm]`
- **The boss check is blocked on the Act 1 boss** (T, t5), which is Phase B2 (owner-led, W4). UP1h `Requires` B2.
- **Slot: anytime.** Upgrades are W3 work (Nov 17-30); asap would jump ahead of W1's hazard rows.

## Tests matrix

- `card-upgrades.engine.test.ts`: the upgrade law per rarity, program scaling over the whole library, the cost
  invariant, text tokens.
- Library tests: Blood Price names (A1), the rare's rank and limit (A5).
- Reducer test for the replace action; rest-choice, blacksmith and reward engine tests; measured-truth CLI test.
- Mobile: upgrade screen, rest, blacksmith and reward panel tests from real state (CT1's `startRealFight` where it
  has landed).

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile` for any phase that touches mobile;
root `npm test`.

## Commit body template

```
<id>: <title>

Closes <A-ids> of the UP1 brief.

- <what changed, one line per surface>

Decisions
- <any judgment call the brief left to the builder, with its why>
```

## DoD

A1 to A11 ticked; A11 only once B2's Act 1 boss exists.

## Follow-ups (out of scope)

- Branches of equal power behind the "???" slot (owner content).
- Hidden lane keywords unlocked by an upgrade (owner content, D37).
- A skill tree for rares; a unique card that starts weak and takes four upgrades.
- Authored upgrade patches for individual cards.
- More uncommons and rares (B5, B6 stretch).
- The Act 1 boss itself (Phase B2).
- T's elite rule for B2: a deck with no upgrades that beats an elite at full health should end with at most 25%
  of its health. Read as median end VITAE of 0.25 or less; today's lowest-VITAE p10 against brine-hag is 0.66
  (bw-8) and 0.75 (cw-12). `[T to confirm]` the reading.
- T asked whether cards should carry only rarity and no tier. `Card.tier` is the effect-resist tier and also
  gates stage pools (`Combat/combat.stage-profiles.ts:176`). Removing it is its own phase if T wants it.

## Phases

### UP1a — Blood Price names · S · closes A1 · requires nothing
Measure: the library test in A1 passes; `docs/card-spec.md` lists the new names.
- Scope: `Cards/library/blood-price.cards.ts` names only, `docs/card-spec.md`. Tests: the name test.
  Verify: mechanics.

### UP1b — The upgrade law and program scaling · M · closes A2, A3, A4 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics`; the whole-library upgrade test passes.
- Scope: `card-upgrades.ts`, `cards.library.ts`, the program context, actions and reducer, package exports.
  Tests: the A2-A4 suites. Verify: mechanics.

### UP1c — Blood for Blood, the first rare · S · closes A5 · requires UP1b
Measure: the rare test in A5 passes.
- Scope: `blood-price.cards.ts` (one card's rank and numbers). Tests: rank, limit, numbers above today's.
  Verify: mechanics.

### UP1d — The upgrade screen and the rest-site upgrade · M · closes A6, A7 · requires UP1b
Measure: a mobile test reaches a rest site, picks "upgrade a card", sees the preview and the "???" slot, and the
deck holds `<id>+`.
- Scope: RestChoice offer, mobile upgrade screen, `app/rest`. Verify: mechanics and mobile.

### UP1e — The blacksmith card upgrade · S · closes A8 · requires UP1d
Measure: a blacksmith engine test and a mobile test: one upgrade per visit, 5 shillings.
- Scope: `World/Blacksmith/*`, `app/blacksmith`. Verify: mechanics and mobile.

### UP1f — The elite reward · M · closes A9 · requires UP1b, UP1c
Measure: a reward engine test: against brine-hag the offer is the best 3 (one from the deck's lanes) or a random
upgrade, and the upgrade option hides when nothing can be upgraded.
- Scope: `Combat/combat.rewards.ts`, a deck-lanes helper in `Cards/card.lanes.ts`, the reward panel. Verify:
  mechanics and mobile.

### UP1g — Upgraded decks in the measured report · S · closes A10 · requires UP1b
Measure: `docs/reports/measured/latest.md` carries the half-upgraded Blood Price columns, stamped.
- Scope: `Combat/combat.measured-truth.ts`, the CLI, the regenerated report. Verify: mechanics.

### UP1h — The boss check · S · closes A11 · requires UP1g, B2
Measure: the report's Act 1 boss row shows half-upgraded above 50% and plain at or below 25%.
- Scope: the report and its test. If the numbers miss, the phase records them and files a CRITIQUE row; it does
  not tune cards (D37).

## Pitch record (folded from `braindump/2026-10-20-card-upgrades.md`)

**Better question surfaced.** Card upgrades are the Act 1 power curve. A Blood Price deck with half its cards
upgraded once should beat the Act 1 boss more than half the time, and a deck with no upgrades should not. The
engine for numbers-up upgrades has existed since 2026-09-02, but nothing in the game grants one, it supports one
upgrade only, and the boss to measure against does not exist yet.

**Path taken.**
1. Opened converge: four themes in one message, no moment or measure.
2. t2: T proposed a choice of two equal-power branches, upgrade limits by rarity (common 1 / uncommon 2 /
   rare 3, one unique card 4), hidden lane keywords, and three sources.
3. t3: the problem named (the power curve); v0.3 narrowed to numbers-up only, with the branch tree as "???".
4. t4-t5: the measure set against the Act 1 boss; limits by rarity back in for v0.3; the boss found missing.
5. In `/plot` (t6-t7): Blood Price upgrades found cosmetic and every card common, which led to program scaling,
   the naming phase and the rare phase.

**Raw material read.**
- `Cards/card-upgrades.ts`: `upgradeCard` makes `<id>+`. An authored patch wins, otherwise the default rule
  applies (+40% to magnitudes, at least +2; +1 effect intensity, capped). One upgrade only (lines 247, 268).
  `baseCardId` strips one `+`.
- The default rule reaches only `combatEffects`, `specialMechanics` and `free`. All 30 Blood Price cards are
  `program` lambdas (`blood-price.cards.ts:55-154`), so their upgrade today renames them and changes nothing
  else. Only the 3 grey cards gain numbers.
- Every library card is rank 1, so all are common: 3 grey, 30 Blood Price, and the Grey Curse.
- `cards.library.ts:62-68`: a `+` id resolves on demand. `card-upgrades.ts` is not exported from the package,
  and mobile renders no `+` cards.
- Deck: `Character.knownCards` plus `combatRewardCards` (`Character/types.ts:84,93`); `LEARN_CARD`,
  `addRewardCard`; no replace action. Save version 37.
- Rest: hosts use RestChoice (`rest` heals 25% of max, or `cut`; `restchoice.types.ts:19`,
  `restchoice.content.ts:14`). Blacksmith: HONE 3 / TEMPER 5 / SWAP 8 shillings, repeatable per visit
  (`blacksmith.engine.ts:53,277`), against about 26 shillings of loot income an act.
- Elites: no flag on the node. Enemy `difficulty: 'elite'` (brine-hag, `content.ts:209`). Rewards are a uniform
  3-card draw (`combat.rewards.ts:70`), with no rarity weighting and nothing distinct for elites.
- Each region ends at the Doorwarden (`isBoss: true`; `content.ts:212,345,476`). There is no Act 1 boss.
- `progression.md:14-15`: upgrades parked under D8.

**Measured** (`docs/reports/measured/latest.md` @ 7a6ef2b): plain Blood Price wins 100% against the Doorwarden at
bw-17, cw-17 and bc-15; grey even wins 21% at bw-17 and 50% at cw-17. Against the brine-hag elite, plain Blood
Price's lowest-VITAE p10 is 0.66 (bw-8) and 0.75 (cw-12). Upgrades against the Act 1 boss can't be measured
before the boss is built.

**Prior art.**
- Slay the Spire, Rest or Smith at the campfire: heal or upgrade one card, the run's most repeated trade-off;
  widely praised (memory read, not a KB citation).
- Slay the Spire, Searing Blow (upgrades without limit): the model for the four-upgrade unique card; generally
  read as a novelty (memory read, not a KB citation).
- Monster Train, the Merchant of Steel's upgrade stones: several upgrades per card, bounded per card; well liked
  for build depth (memory read, not a KB citation).
- Heroes of Terrinoth, upgrades reset each quest: reviewers name the missing persistence as the game's clearest
  missed opportunity (KB `BoardGames/patterns/campaign-progression.okf.md:41`, src-005, src-006).

**Directions considered.**
- A, the default rule applied again on each upgrade (chosen). No new rule to explain, though a rare at +++ is
  about 2.7x its base numbers. Telltale failure: a +++ rare's lowest-VITAE p10 sits near 1.0 in every fight.
- B, smaller later steps. Keeps rares in check but adds a second rule. Telltale failure: players skip later
  upgrades because the heal is worth more.
- C, one upgrade for all. No engine change. Rejected by T's limits-by-rarity ruling.

**Player fantasy.** I am forging my deck into something that can kill what waits at the end of the act.
**Telltale failure mode.** The half-upgraded and plain columns land within a few points of each other against
the boss (upgrades too small), or a fully upgraded rare trivialises every fight.
**Content boundary.** The loop names the Blood Price cards and promotes one card to rare because T directed
both in this session. Upgrade text, branch designs, hidden keywords and new cards stay T's (D37, D88).
