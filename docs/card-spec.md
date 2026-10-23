# Card spec

> **Status: DRAFT — T is filling it in; nothing here is a rule until T marks the section RATIFIED.**
>
> One section per card rule the game has. Each section has three blocks:
> **Live rule** (what the code does, with pointers), **Ratified, not built**
> (T's rulings the code does not carry yet), and **T's call** (T's answer,
> pasted verbatim from the card-spec ballot, or `[T to fill]`).
>
> Written by Phase CS1 (`plan/phases/phase_CS1_card_spec_scaffold.md`) from
> the B4 inventory, [`plan/revamp/card-rules-inventory.md`](../plan/revamp/card-rules-inventory.md),
> and T's ballot, [`plan/card-ledger/card-spec-ballot-2026-10-13.md`](../plan/card-ledger/card-spec-ballot-2026-10-13.md).
> It states no rule the inventory does not record. The inventory was taken
> at `04130195` (2026-10-01), before Phase BT (D80) wired in the Blood Price
> trial set; where BT changed a rule, the paragraph says so and names its
> source. `file:line` pointers are the inventory's and drift.
>
> Paths: `M/` is `axiomancer-mechanics/src/`, `Mob/` is `axiomancer-mobile/`.
> The calls that change code beyond this document are the ballot's
> "Residue" table; each needs its own row before the loop builds it.

## 1. Card types

**Live rule.** A card's type is one of a closed union, copied onto the
combat card for display. The inventory records `attack | skill | spell`
(D51) and an engine that never branches on type. BT added `global` and
`curse` to the union, and the engine now reads the Curse type: a Curse
cannot be scrapped and playing one fires the 📜 Globals
(`isCurseCard`, `M/Combat/combat.card-program.ts`). The deck screen groups
by type through a `Record<CardType, …>`, so a new type must be labelled.
Pointers: `M/Cards/types.ts:58`, `M/Combat/combat.cards.ts:308`,
`M/Combat/combat.encounter.types.ts:130`,
`Mob/state/presenters/deck.engine.ts:171`, `:173`,
`Mob/state/presenters/combat-encounter.engine.ts:188`, `:1337`.

**Ratified, not built.**

- Global and Curse card types (Global: FREE 3 turns, PAID rest of combat;
  copies stack as independent instances, each firing and expiring on its
  own (T, 2026-10-14: experimental, may change); Curse: a dead card that holds a slot and cannot be
  scrapped). D69, `plan/revamp/cards.md`. Built by BT for the trial set.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **How do Global and Curse enter the type system?** → New members of CardType (attack, skill, spell, global, curse)
- **May the engine ever branch on card type?** → No. Type stays display only; rules live on keywords and frames.
```

Note (CS1): the union already has both members, and the Curse's scrap
refusal reads the type today. That reading is the Residue 7 work.

## 2. The `Card` record

**Live rule.** A card is `id`, `name`, `color`, `description`, `tier`,
`targetType`, `rank` and `cardType` (required), plus an optional FREE rider
(`free`, required by test), `paidSummary`, `combatEffects`,
`specialMechanics`, provenance (`addedIn`, `tags`) and a dormant `upgrade`
patch. BT added an optional `program` for cards whose lines read the fight,
pay a cost or stay in play (`M/Cards/card-program.types.ts`). Pointers:
`M/Cards/types.ts:247-298`; shape tests
`M/Cards/e2e/curated-library.engine.test.ts:55`,
`M/Cards/e2e/card-resource-system.engine.test.ts:22`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **What happens to the tier field?** → Retire it: delete the field, the sim reads rank instead
- **Is flavour text (description) required on every card?** → Optional for ever
```

## 3. Rank, rarity and tier

**Live rule.** Rank runs 1 to 6, named Ash, Tooth, Splinter, Rib, Skull,
Saint; rarity derives from it (1-2 common, 3-4 uncommon, 5-6 rare). Rank
gates nothing in play: the FREE line prints the rank name and rewards
ignore rarity. Tier (1 to 3) is dormant in play; its comment claims it
drives the resist tier, which is false. Pointers: `M/Cards/types.ts:30`,
`:36-41`, `:45-51`; `M/Combat/combat.cards.ts:260`, `:282`;
`M/Combat/combat.rewards.ts:48-52`; sim gate
`M/Combat/combat.stage-profiles.ts:36`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **What should rank do in play?** → Weight the reward roll: rarer ranks appear less often, nothing else
- **Which ranks does the Blood Price set span?** → Rank follows complexity: Ash/Tooth simple, Splinter/Rib conditional, Skull/Saint payoffs
```

## 4. Colour and the colour law

**Live rule.** A card's colour is body, mind, heart or `any`. The colour
law (D65): a die powers a card if the card is `any`, the die is wild, or
the colours match; a mismatch fizzles rather than throws. A miss face
powers nothing. A die of the card's own colour adds nothing: PAID numbers
land as printed (D79). Momentum (a same-colour chain) is dormant. Pointers:
`M/Cards/types.ts:15`, `:23`; `dieSatisfiesColorLaw`
`M/Combat/combat.engine.ts:210-212`; `:916-922`; momentum
`M/Combat/combat.engine.ts:559`, `M/Combat/combat.upgradeable-dice.ts:295`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Do lane cards carry a colour, or stay any like grey?** → A lane card is coloured; its colour is the stat its payoff scales with
- **Momentum (same-colour chains) is dormant code. Keep, cut, or ratify?** → Cut it; re-add through a lane that wants it
```

## 5. FREE / PAID anatomy

**Live rule.** The FREE line is the card's rider, played with no die. The
PAID line is its mechanics and effects, paid with exactly one die (tray,
Reserve or floating) and never Conviction. Every library card has a FREE
rider with substance (test-required). A card with no FREE line would play
as "FREE — no effect." (dormant). Pointers: `M/Cards/types.ts:148-156`;
`playTopAction` `M/Combat/combat.engine.ts:837-860`; `playBottomAction`
`:868-1099`; `M/Cards/e2e/curated-library.engine.test.ts:40`;
`M/Cards/e2e/card-effectiveness.engine.test.ts:182`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Must every card have a FREE line with substance?** → Yes, every card, no exemptions
- **May a card ever cost Conviction or two dice instead of one die?** → No. One die, always; Conviction belongs to signatures and scrap
```

## 6. Mechanics, riders and card text

**Live rule.** A plain card's PAID mechanics are a closed union (`deal`,
`guard`) bound to a runtime list in both directions; its FREE rider is
`damage`, `guard`, `applyEffect`. Text is generated from them unless the
card authors `paidSummary`, and every number the engine applies must
appear in that text (`paid-summary-honesty`). A program card (BT) prints
its own lines with number tokens. Pointers: `M/Cards/types.ts:99-140`;
`mechanicText` `M/Combat/combat.cards.ts:213-218`;
`M/Combat/e2e/paid-summary-honesty.engine.test.ts:46`.

**Ratified, not built.**

- The scrap floor: no line gives only 1 Conviction. `plan/revamp/cards.md`
  (T, 2026-09-30). Fenced by CS1 (§17).
- The Global template: duration badges on the frame, the trigger first,
  the PAID line shows only the change. `plan/revamp/cards.md` (T,
  2026-09-30). Fenced by CS1 (§17); the badges are not built.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Does the trigger-first template apply to every card with a trigger, or only Globals?** → Every triggered line opens with its trigger from the closed set
- **Must paidSummary be authored on every card, or generated by default?** → Generated by default; authored only where generation reads badly
```

## 7. Keyword families and S3 scaling

**Live rule.** Each effect has a family: body for damage to the foe, mind
for anything on you, heart for anything on the foe; a self-debuff is grey.
A one-shot scales `base × stat ÷ 5`, a repeating effect at half rate,
durations flat, floor 1, no cap (`NEUTRAL_STAT = 5`). VULNERABLE adds,
refreshes and is uncapped (D41). The tables are `Record`s, so a new kind
without a family fails to compile. `MAX_EFFECT_INTENSITY = 30` clamps the
pip pass (finding F3). Pointers: `M/Combat/stat-scaling.ts:42`, `:49-55`,
`:82`, `:88`, `:102`, `:124`;
`M/Game/game-mechanics.constants.ts:52`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Which family do the Blood Price keywords belong to?** → SACRIFICE grey (unscaled); its payoffs scale by what they do (DEAL body, GUARD mind); EXILE grey; LEECH and TETHER heart
- **Is the MAX_EFFECT_INTENSITY = 30 clamp a rule or a bug (F3)?** → Bug: VULNERABLE and any D41-uncapped effect bypass the clamp
```

## 8. Keyword registries, the atlas and the carrier rule

**Live rule.** Two registries: the keyword atlas (a document) and mobile's
gloss table; `content-drift` keeps them equal. The carrier rule (D45): a
keyword, gloss, glyph or atlas row lives only while something carries it
(a player card, an enemy deck or ability, a signature skill, an item, or
the dice and blacksmith systems). The inventory found no enforcer (F1) and
BLEED registered with no carrier. The admission bar (a keyword needs 2
cards or 2 enemies) was unenforced. Pointers:
`axiomancer-mechanics/docs/keyword-atlas.md`;
`Mob/state/combat/keywords.ts:100-120`; `scripts/content-drift.mjs`;
`plan/2026-09-25-refactor-strategy.decisions.md:413-424`.

**Ratified, not built.**

- EXILE (a line's card leaves the combat; PAID only) and SACRIFICE (lose n
  VITAE, unscaled, never below 1); the first Curse. D69-D71. Built by BT
  for the trial set.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **BLEED has no carrier. What happens to it?** → Retire it now (atlas row, gloss, glyph)
- **Enforce the admission bar (a keyword needs 2 cards or 2 enemies)?** → Yes, in the lint, with exemptions for system words (CONVICTION, RESERVE, WILD, PIP)
```

## 9. Complexity budget

**Live rule.** By rank: Ash/Tooth carry at most 1 keyword beyond a damage
or guard verb and no trigger condition; Splinter/Rib at most 2 and one
condition; Skull/Saint are unbudgeted. The inventory found it doc-only.
The scorer `cardComplexity` feeds only the playtest summary. Pointers:
`axiomancer-mechanics/docs/keyword-atlas.md` (the budget paragraph);
`M/Combat/combat.card-complexity.ts:73`, `:114`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Ratify the atlas bands as the lint's rule?** → Yes, as written
- **What counts as a keyword for the budget?** → [T to fill]
  Note: Any uppercase atlas word other than deal and guard. However, I would like it if the atlas differentiates between a "Card Keyword" and a "rule Keyword". For example: While EXILE appears on cards, it's a rule keyword since the EXILE pile exists outside of the deck. or While "GLOBAL" appears as a card type, there is a GLOBAL space on the board.
```

## 10. Deck, hand, scrap and removal

**Live rule.** A fresh deck is Blow 5, Ward 3, Word 2 (D43). The hand is 5
and carries over, refilling to 5. Draw reshuffles the discard. The deck
floor is 10 (2 × hand); there is no maximum. Removal refuses below the
floor and costs 5, 10, 15 shillings. Scrap discards a card for +1
Conviction, the first 2 per turn, Conviction capped at 12; it has no test
(F5). Pointers: `M/Combat/combat.rewards.ts:40-44`;
`M/Combat/combat.deck.ts:30`, `:94-115`; `M/Cards/card.removal.ts:90`,
`:135-225`; `M/Cards/card.removal.pricing.ts:35-69`;
`discardCombatCard` `M/Combat/combat.engine.ts:598-616`, `:113`, `:119`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Is there a deck maximum?** → No maximum; removal is the only pressure
- **Scrap: +1 Conviction, 2 per turn, cap 12. Ratify and test, or change?** → [T to fill]
  Note: There is no cap to this. A player may scrap as many cards as they like and there's no cap on conviction
```

## 11. Rewards and lanes

**Live rule.** The reward pool is the whole library (D44); BT keeps the
Curses out of it. The roll is uniform, with no repeats, capped at the pool
size. The post-fight draft offers 3 (pick or skip). A loot cache offers
one random library card. Shops sell no cards. Pointers:
`COMBAT_REWARD_POOL` `M/Combat/combat.rewards.ts:25`;
`rollCombatCardRewards` `:53-66`;
`Mob/state/combat/store-actions.ts:157`;
`M/World/LootCacheChoice/lootcachechoice.engine.ts:46-101`.

**Ratified, not built.**

- Relics open lanes: a combat card reward is 2 random and 1 guaranteed
  lane card; with no lane relic, 3 random. D68, D71. Lane relics stack:
  3-4 relics of one lane give 2 lane cards, 5 give all 3. D100.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Build D71 as ratified, or revise it first?** → Build as ratified: 2 random from every open lane plus 1 from the relic's family
- **What does a loot cache offer once lanes exist?** → One card from any open lane (grey counts as open)
  Note: One card from any open lane OR consumables OR a relic OR a quest item
```

## 12. Upgrades and die growth

**Live rule.** The `+` card upgrade (D8) is dormant: the rule exists, but
no player surface upgrades a card. Dice grow at the anvil (D20): HONE turns
a miss face to mana (3 shillings), TEMPER a mana face to BOON (5), SWAP
replaces the gear (8); a coloured die caps at 2 BOON faces, gold at 1. One
tray roll per threat phase. Pointers: `M/Cards/card-upgrades.ts:68-73`,
`:250`; `DEFAULT_DIE_GEAR` `M/Combat/combat.upgradeable-dice.ts:82`;
`ANVIL_VERB_PRICING` `M/World/Blacksmith/blacksmith.engine.ts:55`;
`M/Combat/e2e/turn-law.engine.test.ts:89`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Do cards get an upgrade surface?** → [T to fill]
  Note: Not yet. So there should be 2 offers from the Blacksmith:
1) Upgrade a die (more hits or specials)
2) Upgrade a card (Doesn't exist yet, any given card should only be able to upgraded once)

I also want to note that when a player completes an ACT, they are reward 1 extra die (basic color of their choice R/B/P) upon completing an ACT
```

## 13. Pricing

**Live rule.** Cards have no prices: no scorer, budget of points or
pricing test survives. What is left is a dead budget comment, a dead doc claim and a
catalog field that is always null. The live prices are removal and the
anvil, not card prices. Pointers: `M/Cards/types.ts:263`;
`axiomancer-mechanics/docs/combat.md:292`;
`axiomancer-mechanics/scripts/export-catalog.ts:111`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Should B5 ship an advisory power scorer for new cards?** → Yes, and the lint gates on it
  Note: While I want this, it may take another lane or two before we can lock in a good standard. We'll see.
```

## 14. Save and migration

**Live rule.** The inventory found no save hop that drops purged player
card ids (F2). For the trial set, saves drop removed trial card ids on load
(`dropUnknownCardIds`, `plan/card-ledger/rehearsal-blood-price.md`
Revision 2). Pointers: `M/Game/game.migrate.ts:228`, `:416`, `:519`,
`:758`; `M/Game/game.reducer.ts:174`.

**Ratified, not built.** None.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Drop unknown card ids from saves on load?** → Yes: every load drops ids not in the library, logs them once
```

## 15. Lanes, families and the ledger (Plan B)

**Live rule.** A lane is a named group of library cards and a test deck
(`M/Cards/card.lanes.ts`); the grey office is the permanent lane and each
trial set registers its own in one line. The Blood Price ledger,
`plan/card-ledger/rehearsal-blood-price.md`, is T's ruling on which slots
the lane keeps (ids `bp-<slot><option>`); CS1 checks the library against it
(§17).

**Names (Phase UP1a, 2026-10-22).** Every Blood Price card has a name read
off what it does; the ids (`bp-<slot><option>`) did not change. Five names
are T's from revision 2 (Bloodletting, Open Vein, Blood for Blood, Crimson
Pact, Transfusion); the other 25 replaced the `Blood Price <slot>`
placeholders. A library test fails if a lane card's name still starts with
"Blood Price " or two library cards share a name (§17). Names are card
content: a rename is a T-approved brief, like this one (D99).

| Id | Name | Sub-lane | Id | Name | Sub-lane |
|---|---|---|---|---|---|
| `bp-p-01a` | Forfeit Strike | Payoff | `bp-e-06b` | Double-Edged | Engine |
| `bp-p-02a` | Scar Tissue | Payoff | `bp-e-07b` | Raised Stakes | Engine |
| `bp-p-03a` | Cornered | Payoff | `bp-e-08n` | Blood for Blood | Engine |
| `bp-p-04c` | Returned Twofold | Payoff | `bp-e-09n` | Crimson Pact | Engine |
| `bp-p-05b` | Shared Wound | Payoff | `bp-e-10d` | Name Your Price | Engine |
| `bp-p-06d` | What Is Owed | Payoff | `bp-m-01d` | Siphon | Misc |
| `bp-p-07b` | Full Tally | Payoff | `bp-m-02b` | Reclaim | Misc |
| `bp-p-08d` | Binding Vow | Payoff | `bp-m-03d` | Famished | Misc |
| `bp-p-09b` | Uneven Trade | Payoff | `bp-m-04n` | Transfusion | Misc |
| `bp-p-10c` | Callus | Payoff | `bp-m-05b` | Grim Resolve | Misc |
| `bp-e-01n` | Bloodletting | Engine | `bp-m-06c` | Not Yet | Misc |
| `bp-e-02d` | Pinpricks | Engine | `bp-m-07a` | Feeding Mark | Misc |
| `bp-e-03d` | Slow Drip | Engine | `bp-m-08d` | Nothing Wasted | Misc |
| `bp-e-04c` | Remission | Engine | `bp-m-09a` | Brimming | Misc |
| `bp-e-05n` | Open Vein | Engine | `bp-m-10a` | Repaid in Kind | Misc |

**Ratified, not built.**

- Lanes: a 10-12 card lane on top of grey; 1-2 signature keywords per
  lane; pairs as the goal. `plan/revamp/cards.md` deck model.
- Families of sub-lanes; a relic names a family; bridge cards within a
  family. D73.
- The first pool is one family, Blood Price, with 3 sub-lanes (Payoff,
  Engine, Misc) of about 10 cards, 30 and grey. D74. Built by BT as a
  trial set.

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **Canonical lane size going forward?** → A family is 3 sub-lanes of about 10 (30 + grey); a lane is a sub-lane
- **Which family is next?** → None until Blood Price is measured (R12a)
- **When do placeholder names become real names?** → A naming session before the next lane; names are card content: a `/plot` brief T approves (D99; D37 lifted)
```

The ballot's §17 asked about B5, the card-creator tool, which has no
section of its own here. Its answer is recorded under B5 in
`plan/revamp/cards.md`:

```markdown
T's call (ballot, 2026-10-13):

- **What is the card-creator?** → [T to fill]
  Note: It should be an AI SKILL that:
- Takes a loose idea for a deck
- Asks questions until alignment is had
- Proposes several keywords / mechanic interactions
- Has T choose a few
- Creates an html/css/js artifact to show 5 card examples for each sub-lane (payoff / engine / misc)
- If T signs off, create a spec for a card creation phase, measuring phase, and a tuning phase
```

## 16. Relics as lane keys

**Live rule.** No relic opens a lane: relics have no lane field. This
section is a pointer; relic content belongs to
[`plan/revamp/relics.md`](../plan/revamp/relics.md) (B1).

**Ratified, not built.**

- Relics open lanes (D68, D71); a relic names a family (D73).

**T's call.**

```markdown
T's call (ballot, 2026-10-13):

- **How does a relic name its lane?** → opensLane: laneId on Equipment; the lane registry is the source of valid ids
- **May a relic both grant a signature and open a lane?** → Yes; every relic may do either or both
```

## 17. Enforcement

Which test guards which rule. The four card-rules rows read one exemptions
fixture: an offender listed there passes with its reason, a new offender
fails, and a listed offender that no longer breaks the rule fails as
stale. Today's offenders are pinned for T's next card session (`[content]`
rows in `plan/AUDIT.md`). Re-seed after that session with
`CARD_RULES_SEED=1 npx vitest run src/Cards/e2e/card-rules.engine.test.ts`
in `axiomancer-mechanics`.

| Rule | Section | Test | Fixture |
|---|---|---|---|
| Complexity budget by rank | §9 | `axiomancer-mechanics/src/Cards/e2e/card-rules.engine.test.ts` → "rule: complexity-budget" (`checkComplexityBudget`) | `axiomancer-mechanics/src/Cards/e2e/card-rules.exemptions.json` |
| Scrap floor | §6 | `card-rules.engine.test.ts` → "rule: scrap-floor" (`checkScrapFloor`) | same |
| Global text template | §6 | `card-rules.engine.test.ts` → "rule: global-template" (`checkGlobalTemplate`) | same |
| Carrier rule and admission bar | §8 | `card-rules.engine.test.ts` → "rule: carrier-rule" (`checkCarrierRule`) | same |
| House voice and retired terms on card text | §6 | `scripts/check-prose.mjs` (the card libraries are content surfaces) | none needed: the text is clean |
| Ledger and library agree on the Blood Price slots | §15 | `scripts/content-drift.test.mjs` → "the Blood Price lane ships exactly the slots the ledger keeps" | none |
| Every Blood Price card has a real name; library names are distinct | §15 | `axiomancer-mechanics/src/Cards/e2e/blood-price.engine.test.ts` → "every lane card carries a real name" | none |
| The atlas's Card / Rule split | §9 | `scripts/content-drift.test.mjs` → "the atlas sorts every row into a Card, Rule or system section" | none |

The checkers live in `axiomancer-mechanics/src/Cards/card-rules.ts`, unit
tested in `card-rules.test.ts` beside it.
