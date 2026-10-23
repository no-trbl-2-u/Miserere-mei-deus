# Card-rules inventory (Phase B4)

> Every rule and fixture around cards in the tree, taken at `04130195`
> (2026-10-01, after R7e2). Part plan: [`cards.md`](cards.md) → B4. This
> document is the gate THE CARD HOLD names: no card, card-type or keyword
> work starts before it is merged (`plan/bearings.md`).
>
> It is an inventory, not a design. It changes no code and rules nothing.
> Dead rows are marked **candidate for removal**; deleting them is a
> separate call (an `/iterate` tick, B5 or B6).

**Paths.** `M/` = `axiomancer-mechanics/src/`, `Mob/` = `axiomancer-mobile/`,
`docs/` = `axiomancer-mechanics/docs/` unless rooted. Line numbers are at the
commit above and will drift.

**Status.**

- **live** — read on a real play path with the grey library.
- **dormant** — the code exists and may be tested, but no grey card or live
  path exercises it (sim-, CLI- or dev-only counts as dormant).
- **dead** — unreachable, unused, or pointing at something deleted.

## 0. The library today

`M/Cards/library/starters.cards.ts`, exported as `GREY_OFFICE_CARDS` (`:80`).
All three are `color: 'any'`, `tier: 1`, `rank: 1` (Ash), `tags: ['grey','starter']`.

| Card | id | Type, target | FREE (`free`) | PAID | Face |
|---|---|---|---|---|---|
| A Plain Blow | `grey-strike` (`:25`) | attack, enemy | `damage: 2` | `deal 5` | "Deal 5." |
| A Plain Ward | `grey-ward` (`:41`) | skill, self | `guard: 2` | `guard 5` | "GUARD 5." |
| A Plain Word | `grey-word` (`:60`) | spell, enemy | VULNERABLE 10, 1 turn | `combatEffects` VULNERABLE 25, 2 turns | "VULNERABLE +25% for 2 turns." |

`cardLibrary = [...GREY_OFFICE_CARDS]` (`M/Cards/cards.library.ts:37`), with a
`Map` registry (`:41`) and `getCardById` (`:49`) resolving sandbox, then
library, then `+` upgrade ids. Enemies carry no keywords: `EnemyKeyword =
never` (`M/Enemy/enemy-keywords.ts:16`).

Guards on the library as a whole:

- unique ids — `M/Cards/e2e/curated-library.engine.test.ts:20`,
  `M/Cards/e2e/card-resource-system.engine.test.ts:36`;
- kebab-case ids — `curated-library:27`;
- required shape — `curated-library:55`, `card-resource-system:22`;
- starters are rank 1 and colour `any` — `curated-library:83`, `:86`;
- `addedIn` format — `curated-library:65` (provenance only);
- the grey office as a unit — `M/Cards/e2e/grey-office.engine.test.ts`.

## 1. Card types

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| `CardType = 'attack' \| 'skill' \| 'spell'` (D51) | `M/Cards/types.ts:58` | the union; `grey-office:55` (Blow attack, Ward skill, Word spell); shape tests above | live |
| The engine never branches on type; it is copied onto the combat card | `M/Combat/combat.cards.ts:308`, `M/Combat/combat.encounter.types.ts:130` | — | live (display only) |
| Deck screen groups by type | `Mob/state/presenters/deck.engine.ts:171` (`CARD_TYPE_ORDER`), `:173` (`CARD_TYPE_LABEL`, a `Record<CardType,…>` so a new type must be labelled) | the `Record` type; `Mob/state/presenters/__tests__/deck.engine.test.ts:125` | live |
| Meta chip shows the type | `Mob/state/presenters/combat-encounter.engine.ts:188`, `:1337` | — | live |
| Catalog export reads the type | `axiomancer-mechanics/scripts/export-catalog.ts:258` | — | live (tooling) |

Leftover oath/hex/enchant wording, comments only: `M/Cards/cards.library.ts:13`,
`M/Cards/card-upgrades.ts:34` (a `theme` field that no longer exists), `:118`,
`M/Cards/e2e/card-effectiveness.engine.test.ts:213`. **dead** — candidate for
removal (R10c owns comment truth).

## 2. The `Card` record (`M/Cards/types.ts:247-298`)

| Field | Req. | Line | Grey use | Read by | Status |
|---|---|---|---|---|---|
| `id`, `name` | yes | 248-249 | all | registry; event attribution `M/Combat/combat.engine.ts:737` | live |
| `color: CardAspect` | yes | 250 | all `any` | colour law (§4) | live |
| `description` | yes | 251 | all | flavour text, `deck.engine.ts:294`, `combat-encounter.engine.ts:1601` | live |
| `tier: CardTier` | yes | 252 | all 1 | §3 | dormant in play |
| `targetType` | yes | 253 | enemy / self | text only (cross-side marker, `combat.cards.ts:244`, `combat.card-text.ts:198`); routing uses `appliedTo` / `applyEffect.to` | live (text) |
| `rank: CardRank` | yes | 259 | all 1 | §3 | live (display) |
| `cardType` | yes | 261 | §1 | §1 | live (display) |
| `free?: CardRider` | type-optional, test-required | 266 | all | `playTopAction` | live |
| `paidSummary?` | no | 277 | all | replaces generated PAID text, `combat.cards.ts:276-297` | live |
| `combatEffects?` | no | 278 | Word | `executeCard`, `M/Cards/card.engine.ts:113` | live |
| `specialMechanics?` | no | 279 | Blow, Ward | `playBottomAction`, `combat.engine.ts:987-1086` | live |
| `addedIn?`, `tags?` | no | 286-287 | all | tests only | provenance |
| `upgrade?: CardUpgrade` | no | 297 | none | `upgradeCard` | dormant |

`CardCombatEffects.description?` (`types.ts:84-90`) is authored by no card:
dormant.

## 3. Rank, rarity and tier

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| `CardRank = 1..6`; `CARD_RANK_NAMES` Ash, Tooth, Splinter, Rib, Skull, Saint | `M/Cards/types.ts:36-41`; exported `M/Cards/index.ts:26`, `M/index.ts:185,189` | `Record<CardRank,string>`; `curated-library:32` ("every rank is a named rung"), `:59`; `card-resource-system:28`; `grey-office:46` | live (display; only Ash exercised) |
| `rankToRarity`: 1-2 common, 3-4 uncommon, 5-6 rare | `types.ts:45-51`; projected `combat.cards.ts:306-307` | `Mob/state/presenters/__tests__/card-rarity.engine.test.ts`; `CombatCardFace.rarity-D4.test.tsx`; `deck.engine.test.ts:151-183` | live (display) |
| Rank gates nothing in play: the FREE line prints "(Ash)" (`combat.cards.ts:260`, `:282`); rewards ignore rarity (`M/Combat/combat.rewards.ts:48-52`) | — | — | live |
| Mobile rarity presentation: labels, 1/2/3 pips, colours | `Mob/state/presenters/card-rarity.engine.ts:86`, `:101`, `:116`, `:165` | tests above | live |
| Mobile keeps its own `RANK_NAMES` copy; its comment says the engine does not export the names, which is false | `Mob/state/presenters/combat-encounter.engine.ts:71-75` | — | live, duplicate — candidate for removal |
| Sim gate `rankMaturityLevel` `{1:1,2:2,3:4,4:6,5:10,6:12}` | `M/Combat/combat.stage-profiles.ts:36`, used `:183` | `M/Combat/e2e/combat-stage-profiles.engine.test.ts` | dormant (sim) |
| `CardTier = 1 \| 2 \| 3` | `types.ts:30` | tier in range: `curated-library:58`, `card-resource-system:23`; `grey-office:45` | dormant in play |
| Tier "drives the resist tier" (comment) — false: `buildActiveEffect` uses the effect's tier | comment `types.ts:26-29`, `:239`; code `M/Cards/card.engine.ts:227` | — | dead comment |
| Tier readers: projection `combat.cards.ts:305`; sim `maxCardTier` `combat.stage-profiles.ts:59,182`; catalog `export-catalog.ts:254`; learn-card offer `Mob/state/actions.ts:640` | — | — | dormant |
| Mobile `TIER n` chip fallback, shown only when rank is missing | `combat-encounter.engine.ts:1346` | — | dead |
| `TIER_1_CARDS` (a copy of the grey 5/3/2); `TIER_2_CARDS`, `TIER_3_CARDS`, `TIER_2_SYNERGY_CARDS` are empty | `M/Character/presets.ts:58-67` | `M/Character/e2e/presets.engine.test.ts:50,65,79` | dormant (dev presets); the empty arrays are dead |

No card rarity weighting or pity exists. The hazard minigame's rarity
(`M/World/Hazard/hazard.engine.ts:544-553`) is separate.

## 4. Colour and the colour law

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| `StatType = body \| mind \| heart`; `CardAspect = StatType \| 'any'` | `M/Cards/types.ts:15`, `:23` | `curated-library:62` (one of four values) | `any` live; body/mind/heart dormant (no carrier) |
| **Colour law (D65)**: a die powers a card if the card is `any`, the die is wild, or the colours match | `dieSatisfiesColorLaw`, `M/Combat/combat.engine.ts:210-212`; `firstLegalPoweringDie` `:1657-1668` | a mismatch is an `effect-fizzled` event, not a throw (`:916-922`); `grey-office:85` (every die colour powers Blow and Ward, never a fizzle); `Mob/state/presenters/__tests__/grey-card-palette.test.ts:30` | live |
| Miss faces cannot power; X dice excluded | `combat.engine.ts:898-908` | — | live |
| Exported `combatDieCanPower` / `availableDiceFor`: no `'any'` branch, plus an unreachable `cardColor === 'wild'` branch | `M/Combat/combat.dice.ts:69-77`; re-exported only, `combat.engine.ts:1920` | `M/Combat/e2e/hazard-pattern-combat-helpers.engine.test.ts:102`; `Mob/.../CombatBoard.colorlaw.test.tsx:81` (excludes `any`) | dead on the play path; disagrees with the live law for grey cards |
| Mobile mirror `dieCanPowerCardVM` (handles `any`; dead `wild` card branch `:309`) | `Mob/state/presenters/combat-encounter.engine.ts:300-312`; used `CombatBoard.tsx:130`, `:847`, `:1054`, `:1101` | `CombatBoard.colorlaw.test.tsx` | live |
| No colour-match bonus: a die of the card's own colour adds nothing; PAID numbers and status turns land as printed | `scalePlayerHit` and `playBottomAction`, `combat.engine.ts` (the bonus, `colorMatchBonus` and `COLOR_MATCH_STATUS_DURATION_BONUS`, was deleted, D79) | `big-numbers` (a body or wild die deals exactly the printed DEAL); `fate-engine` R7 (printed duration); `preview-truth` (printed duration) | live |
| Momentum (same-colour chain) | `combat.engine.ts:559`; `M/Combat/combat.upgradeable-dice.ts:295` | — | dormant (`any` never chains) |
| Resonance: spending a die counts its colour | `combat.engine.ts:954-961` | — | live |

Gap: the colour-law test at `grey-office:85` runs only `['grey-strike','grey-ward']`
(`:38`); A Plain Word is not covered.

## 5. FREE / PAID anatomy

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| FREE line = `Card.free: CardRider` (`damage`, `guard`, `applyEffect`), no die | `types.ts:148-156`; `playTopAction` `combat.engine.ts:837-860` via `applyRiderToState` `:716-792` | `curated-library:40` (every card has a FREE rider with substance); `grey-office:103`, `:115` | live |
| A card with no FREE plays as a no-op, "FREE — no effect." | `combat.cards.ts:283` | — | dormant |
| PAID line = `specialMechanics` + `combatEffects`, paid with exactly one die (tray, Reserve or floating); no Conviction; face says "Costs 1 die." | `playBottomAction` `combat.engine.ts:868-1099` (`dieId` required `:885`, spent `:1062-1076`); dispatch `playCombatCard` `:494-517`; text `combat.cards.ts:296` | `card-effectiveness.engine.test.ts:182` (every PAID face moves the state it promises), `:187` | live |
| Budget law "FREE ≈ 25-35% of points" | comment `types.ts:263-265` | none (pricing is gone) | dead — candidate for removal |
| FREE-rider substance suite covers spells only | `card-effectiveness.engine.test.ts:237`, `:241` | — | live, partial (Word only) |

## 6. Mechanic and rider unions, card text

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| `CardSpecialMechanic = {kind:'deal'} \| {kind:'guard'}` (with `amount`) | `types.ts:99-105` | runtime list `CARD_SPECIAL_MECHANIC_KINDS` `:117` with two-way `AssertNever` checks `:122-140` | live |
| `CardRider` fields `damage`, `guard`, `applyEffect` | `types.ts:148` | `RIDER_SCALING` `Record` (§7) | live |
| Upgrade patch types | `types.ts:170-229` | §10 | dormant |
| `mechanicText` switch, no `default` (a new kind without a case fails `tsc`) | `combat.cards.ts:213-218`; `noImplicitReturns` `axiomancer-mechanics/tsconfig.json:26` | the compiler; `M/Combat/e2e/mechanic-text-coverage.engine.test.ts:27`, `:39` | live |
| `riderText` `:191`, `paidText` `:230`, `toCombatCard` `:265` | `combat.cards.ts` | `M/Combat/e2e/card-text-projection.engine.test.ts:26-82` | live |
| Clause projection and `MECHANIC_LABEL` (`Record` by kind) | `M/Combat/combat.card-text.ts:114`, `:164`, `:196`, `:209` | `Mob/state/presenters/__tests__/card-detail-agreement.test.ts:87`, `:189`, `:213` | live |
| Test-side `never` guard on mechanic kinds | `card-effectiveness.engine.test.ts:146` | itself | live |
| `REGISTRY_DOT_IDS` (poison, bleed) | `combat.cards.ts:224` | — | dormant |
| Mobile legacy `${damage} HEAL/DMG` label; every caller passes 0 | `Mob/state/selectors/combat-cards.ts:65`; `actions.ts:631` | — | dead |

## 7. Keyword families and S3 scaling

All in `M/Combat/stat-scaling.ts` unless noted.

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| Families: body = damage to the foe; mind = anything on you; heart = anything on the foe; a self-debuff is grey | `effectFamily` `:124`; `MECHANIC_SCALING` `:82` (deal body, guard mind); `RIDER_SCALING` `:88`; `PAYLOAD_SCALING` `:102` — all `Record`s, so a new kind without a family fails `tsc` | `M/Combat/e2e/stat-scaling.engine.test.ts:170`, `:179`, `:186`, `:130` (a stat scales only its family) | live |
| `scaleAmount`: one-shot `base × stat ÷ 5`; repeating `base × (stat + 5) ÷ 10` (half rate); durations flat; floor, minimum 1; no cap. `NEUTRAL_STAT = 5` | `:42`, `:49-55`; `effectScaling` `:111` | `stat-scaling:75`, `:82`, `:88`, `:97-118` (worked builds) | live |
| Scaled at play: FREE guard/damage/status `combat.engine.ts:733`, `:742`, `:762` (`uncapped: true`); DEAL `:1001`; GUARD `:1085`; hand face `:1797`; `M/Cards/card.engine.ts:164`, `:193` | — | `stat-scaling:121` (FREE scales), `:217-238` (hand prints final numbers, no double scaling) | live |
| VULNERABLE adds, refreshes, uncapped (D41) | `stat-scaling.ts`; engine | `stat-scaling:140-166` | live |
| `scaleCardForStats` (display copy; drops `paidSummary`) | `:169` | `stat-scaling:217-238` | live |
| VITAE `50 + 12·body + 6·mind + 6·heart` | `PLAYER_VITAE_BASE` `M/Game/game-mechanics.constants.ts:26`; `RESOURCE_MULTIPLIERS` `:19-23`; `calculateMaxHealth` `M/Utils/index.ts:144-151` | `M/Utils/index.test.ts:31-40`; `M/Utils/e2e/utils.engine.test.ts:151`, `:159`; `M/Character/e2e/character.engine.test.ts:89` | live |
| Mobile family colour and stat glyph on a keyword (♥ heart, ⚡ body, ★ mind) | `DIE_GLYPHS` `Mob/state/presenters/combat-encounter.engine.ts:64`; `STANCE_COLORS` `:57`; `KEYWORD_FAMILY` `:1534-1540`; `familyFace` `:1546`; drawn `CombatBoard.tsx:1649`, `:1788`; duplicate `CHAIN_GLYPHS` `CombatBoard.tsx:601` | `Mob/state/presenters/__tests__/stat-family-face.test.ts:18`, `:28`, `:36` (samples GUARD and VULNERABLE; not pinned to `MECHANIC_SCALING`) | live; 12 dead `KEYWORD_FAMILY` rows (BARRIER, RIPOSTE, SOUL, RESOLUTE, POISON, DOOM, MARK, QUARTER, STUN, TICK, KINDLE, WEAKEN) — candidate for removal |
| `MAX_EFFECT_INTENSITY = 30` | `M/Game/game-mechanics.constants.ts:52` | — | see finding F3 |

## 8. Keyword registries, the atlas and the carrier rule

**Two registries.** The keyword atlas is a document; the code registry is
mobile's gloss table. `scripts/content-drift.mjs` keeps them equal.

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| Keyword atlas: 12 rows — DEAL `:40`, BLEED `:46`, VULNERABLE `:47`, GUARD `:53`, HEAL `:59`, PIP `:65`, BOON `:66`, HONE `:67`, TEMPER `:68`; system terms CONVICTION, RESERVE, WILD `:96-98`; empty enemy section `:72-78`; wiring checklist `:107-151` | `docs/keyword-atlas.md` | `scripts/content-drift.mjs` (`atlasKeywords` `:119`) via `scripts/content-drift.test.mjs:86`, `:102`, `:109`, `:116`, `:121` (floors: registry ≥ 8, atlas ≥ 11); exemption `ATLAS_WITHOUT_REGISTRY_ROW = {DEAL}` `:78`; CI `verify-drift.yml:60` and root `npm test` | live |
| Admission bar "≥ 2 cards or ≥ 2 enemies" | `keyword-atlas.md:12` | none | unenforced |
| `KEYWORD_GLOSS`: Guard, Heal, Bleed, Vulnerable, Pip, Boon, Hone, Temper | `Mob/state/combat/keywords.ts:100-120`; `allRegistryKeywords()` `:178` | content-drift; `Mob/state/combat/__tests__/keywords.test.ts` | live |
| `EFFECT_KEYWORD` (bleed, vulnerable) `:37`; `VERB_KEYWORD` (defend → Guard) `:59`; `SYSTEM_GLOSSARY` `:183-238` | `keywords.ts` | KW-1, KW-7 | live |
| `SUPPORT_KEYWORD` `:52` (empty); `MECHANIC_KEYWORD` `:76` (empty: DEAL and GUARD print plain) | `keywords.ts` | KW-3 | dead / by design |
| `HAZARD_KEYWORDS` (SURGE, FORCE, ESCAPE, CONVERT, DRAW, RE-CAST, GILDED, SALVAGE, CRACK) — a separate glossary, outside the atlas and content-drift | `M/World/Hazard/hazard.content.ts:28-38` | — | live (hazard path) |
| **Carrier rule (D45)**: a keyword, gloss, glyph or atlas row lives only while something carries it | `plan/2026-09-25-refactor-strategy.decisions.md:413-424` | **nothing**; partial proxies only: KW-3 reverse drift (`keywords.test.ts:75`, over an empty table), `statusGlyphs.test.ts:44` (against fixtures), content-drift (atlas = gloss, not carrier) | unenforced — see F1 |

Carrier status of each word:

| Word | Carrier | Status |
|---|---|---|
| DEAL, GUARD, VULNERABLE | the grey cards | live |
| PIP | dice: `PIP_INTENSITY_BONUS = 2` `combat.engine.ts:170`, `PIP_GUARD_BONUS = 5` `:174`, `RESERVE_PIP_CAP = 2` `M/Combat/combat.dice.ts:32` | live |
| BOON, HONE, TEMPER | the anvil (`M/World/MapEvents/content.ts:269`, `:419`, `:535`, `:671`) | live, not on cards |
| HEAL | gloss names potions, but potion copy says "restores N VITAE" (`Mob/state/presenters/village.engine.ts:164`) | effectively dormant |
| BLEED | gloss names a map hazard, but the hazard's "Bleeding" (`hazard.content.ts:98`) is flat VITAE loss and never applies `debuff_bleed` | **no carrier** (D45 breach) |

## 9. Lints and guards

**KW rules** are jest tests in `Mob/state/combat/__tests__/keywords.test.ts`,
not lint rules.

| Rule | Checks | Where | Status |
|---|---|---|---|
| KW-1 | every effect id a library card applies maps to a keyword | `:17-27` | live |
| KW-2 | pinned registry count | repealed 2026-09-02 (`:30`); still cited at `:41`, `keywords.ts:162`, `M/Cards/index.ts:30`, `M/index.ts:193`, `content-drift.test.mjs:8` | dead references |
| KW-3 | every mechanic kind is mapped or classified; no stray rows; the union walk is not a copy (pins `['deal','guard']` `:81`); purged words gone (`:88`, `:97`) | `:29-105`; `KINDS_WITHOUT_MECHANIC_KEYWORD` `:47` | live |
| KW-5, KW-6 | — | cited at `keywords.ts:176` only; no test; `card-themes.ts` is deleted | dead references |
| KW-7 | system glossary shown per card | `combat-card-vm.test.ts:176`, `:192`; UI `CombatEncounterPanel.tsx:992`, `:1316` | live |
| Gloss style | terse; no em dash or semicolon; "the foe" not "the enemy" | `keywords.test.ts:114-162` | live |

**Face-honesty guards** (the number on the face is the number the engine applies):

| Guard | Where | Status |
|---|---|---|
| Every applied number appears in `paidSummary`; uppercase words come from `KNOWN_UPPER`; no decimals | `M/Combat/e2e/paid-summary-honesty.engine.test.ts:46`, `:64`, `:74` | live; `KNOWN_UPPER` (`:28-41`) still admits ~13 purged words (DRAW, MARK, CLEANSE, POISON, DOOM, STAGGER, FORETELL, QUARTER, RIPOSTE, PIERCE, WRATH, CHAIN, BARRIER) and the DOOM strip (`:49-54`) is dead |
| Mobile face honesty: no ambiguous PAID fallback, each term glossed once, DoT trigger, no "HP", every printed keyword has a chip, every FREE effect has a silhouette, BOON/HONE/TEMPER glossed, grey vocabulary resolves, headline keyword defined | `Mob/state/presenters/__tests__/card-face-honesty.guard.test.ts:24-219` | live |
| Stat-scaled faces | `stat-scaling:217-238`; `stat-family-face.test.ts:28` | live |
| Preview truth | `M/Combat/e2e/preview-truth.engine.test.ts:140-267` (mostly fixture POISON, QUARTER, DoTs from `M/test-utils/card-fixture.ts`) | dormant paths |
| Grey ledgers | `grey-office:103`, `:115` (Blow and Ward only) | live, partial |
| `combat-card-vm.test.ts:135` title says "×10" but asserts "+10% · 1t" | — | stale title |

**Glyph registries.**

| Registry | Where | Enforced by | Status |
|---|---|---|---|
| FREE-glyph silhouettes `GLYPH_SHAPES`: BLEED, VULNERABLE, GUARD, HEAL | `Mob/components/combat/glyphShapes.ts:37-48` | `glyphShapes.test.ts:17-46`; catalog copy `scripts/build-catalog.mjs:177-187` pinned by `content-drift.test.mjs:29`, `:44`, `:53` | live; `EYE` (`:30`) and `SHAPE_EYE` (`build-catalog.mjs:181`) dead |
| Board status glyphs `EFFECT_GLYPHS` | `Mob/components/combat/statusGlyphs.ts:60-73` | `statusGlyphs.test.ts:28-44` (pins the dead rows) | bleed, vulnerable live; poison, creeping_doom, petrify, mark, quarter dead |
| FREE text runes `FREE_KW_GLYPH`: GUARD ❖, HEAL ✚, DRAW ⚑, CLEANSE ✦, PIP ⬡ | `combat-encounter.engine.ts:168`; `riderPairs` `:140` (no damage pair, so Blow's FREE has no rune by design) | — | DRAW, CLEANSE dead |
| Retired effects kept "live" | `M/Effects/e2e/deprecated-effects.engine.test.ts:51` (`CARD_EFFECT_SET`), `:68`; combo registry `M/Effects/amplification.registry.ts` (poison+bleed, bleed+mark) | itself | dormant |

**Text lints.**

| Lint | Scope | Card-relevant content | Status |
|---|---|---|---|
| `scripts/check-lexicon.mjs` | `.md` files; registry `docs/lexicon.json` (21 rows: 19 identifiers, 2 doctrine) | bans the pre-revamp names (PREMISE, PERORATION, SWAY, THOUGHTFORM, the old rank names, …); the replacements it points to are themselves mostly retired; it bans none of the words retired in the purge | live; tests `scripts/check-lexicon.test.mjs:34-106`; CI `check-lexicon.yml`, `verify-mechanics.yml:89`, `verify-mobile.yml:104`; hook `.claude/hooks/guard.mjs:184` |
| `scripts/check-prose.mjs` | string literals in `CONTENT_SURFACES` (`:42-55`) | voice rules, MB-1 length rules, lexicon terms; lists `M/Cards/cards.library.ts` but not `M/Cards/library/starters.cards.ts`, so the card text is never linted | live, misses the cards — see F4 |

**Complexity budget by rank** (Ash/Tooth ≤ 1 keyword beyond damage/guard and
no trigger; Splinter/Rib ≤ 2 with one condition; Skull/Saint unbudgeted):
`docs/keyword-atlas.md:19-21`. **No code enforces it.** The related scorer
`M/Combat/combat.card-complexity.ts` (`cardComplexity` `:73`,
`deckComplexity` `:114`) feeds only the playtest summary
(`M/Combat/combat.playtest.ts:407`; assertion
`combat-playtest.matrix.sim.test.ts:128`): dormant. The grey cards comply.

## 10. Deck, hand and removal

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| Fresh deck Blow ×5, Ward ×3, Word ×2 (D43) | `STARTING_CARD_IDS` `M/Combat/combat.rewards.ts:40-44`; seeded `Mob/state/actions.ts:599-618`, `Mob/state/combat/store-actions.ts:87-97` (`STARTER_BUNDLES`, one `grey` bundle; `archetype` vestigial) | `curated-library:69`; `grey-office:128`; `Mob/state/combat/__tests__/starter-bundles.test.ts:30-61`; `presets.engine.test.ts:50` | live |
| Deck = `knownCards` (copies kept) + `combatRewardCards` on top; loadout flags override | `buildCombatDeck` `M/Combat/combat.deck.ts:71-80`; loadout `M/Combat/combat.loadout.ts:18-51` (max 20) | `deck.engine.test.ts:82`, `:103`; `combat-loadout.engine.test.ts` | live; the loadout path has no writer (v22→v23 strips flags): dormant |
| Hand size `COMBAT_HAND_SIZE = 5`; opening draw; hand carries over and refills to 5 (+ `bonusDraw`, no live caller) | `combat.deck.ts:30`; `combat.engine.ts:258`, `:1563-1572` | `hazard-pattern-combat.engine.test.ts:205`, `:266`, `:292`; `hazard-pattern-combat-helpers.engine.test.ts:262` | live |
| Draw reshuffles the discard, then falls back to the whole deck | `combat.deck.ts:94-115` | as above | live |
| Deck floor `MIN_COMBAT_DECK_SIZE = 10` (2 × hand) | `M/Cards/card.removal.ts:90`; rest gate `M/World/RestChoice/restchoice.engine.ts:63` | `card-removal.engine.test.ts:418`, `:424`, `:428`; `grey-office:137`; `restchoice.engine.test.ts:56` | live (a fresh deck sits at the floor until a reward) |
| No deck maximum | — | — | none |
| Removal: refuses `not-in-deck` / `deck-at-floor` (returned, never thrown); drains a reward copy first | `removeCardFromCombatDeck` `card.removal.ts:135-225`; mobile `Mob/state/rest/store-actions.ts:150` | `card-removal.engine.test.ts:75-360` | live |
| Removal price `{base: 5, step: 5}` → 5, 10, 15, … shillings | `M/Cards/card.removal.pricing.ts:35-69`; `restchoice.engine.ts:57`, `:160`; `Mob/state/presenters/rest.engine.ts:141` | `card-removal:370-408`; `card-removal-migration.engine.test.ts:28-83` | live |
| Scrap: discard a card for +1 Conviction, first 2 per turn, Conviction cap 12 | `discardCombatCard` `combat.engine.ts:598-616`; `SCRAP_CONVICTION_CAP_PER_TURN` `:119`; `CONVICTION_CAP` `:113`; reset `:406`; mobile `CombatEncounterPanel.tsx:550`, `CombatBoard.tsx:902` | **no test** — see F5 | live, untested |
| Ownership: `executeCard` throws on a card not in `knownCards` or `combatRewardCards`, and on an unknown id | `M/Cards/card.engine.ts:98-106` | `card.engine.test.ts:120`, `:127`, `:134` | live |
| Learn-a-card: `getAvailableCards` / `learnCard` (library minus known) | `card.engine.ts:28`, `:39`; `Mob/state/actions.ts:657`; `LearnCardModal.tsx`; `M/CLI/game.cli.ts:666` | `Mob/state/e2e/one-economy.engine.test.ts:111`, `:124` | dormant (a grey player knows all three) |
| Sandbox cards: register / override / clear, throws on collisions, atomic | `M/Cards/cards.sandbox.ts:51-119`; root exports `M/index.ts:123-126`; only reader `combat.playtest.ts:447` | `cards-sandbox.engine.test.ts:52-153` | dormant |

## 11. Rewards

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| Reward pool = the whole library (D44) | `COMBAT_REWARD_POOL` `M/Combat/combat.rewards.ts:25` | `combat.rewards.test.ts:37`; `grey-office:61`; `curated-library:90`; `defense-guard.engine.test.ts:109`; `status-depth-combat.engine.test.ts:219`, `:231` | live |
| Roll: uniform, no repeats, capped at pool size; `_player` unused (theme, keyword and rarity pull cut in R7b) | `rollCombatCardRewards` `:53-66` | `combat.rewards.test.ts:44-66` | live |
| Post-fight draft offers 3 (pick or skip); unseeded `Math.random` | `COMBAT_REWARD_OFFER_COUNT` `Mob/state/combat/store-actions.ts:157`; `:165`, `:184`, `:193`; `CombatRewardsOverlay.tsx`; `rewardCardVMs` `combat-encounter.engine.ts:1645` | `Mob/state/combat/__tests__/combat-reward-draft.test.ts:44-139` | live — see F6 |
| Cache card offer: one random grey card | `Mob/state/cache/store-actions.ts:73`, `:117`; `M/World/LootCacheChoice/lootcachechoice.engine.ts:46-101` | `lootcachechoice.engine.test.ts:101` | live |
| `addRewardCard` appends to `combatRewardCards` | `combat.rewards.ts:69` | `combat.rewards.test.ts:74`; `grey-office:137` | live |
| `unlockCardViaDilemma` | `combat.rewards.ts:79`; exported `M/index.ts:90` | `hazard-pattern-combat.engine.test.ts:411` | dead (no caller since R3b) — candidate for removal |
| Shops sell no cards: `ShopWare` is `{itemId, price}` | `M/Items/shop.types.ts:13` | — | none |

## 12. Upgrades (D8) and die growth (D20)

| Rule | Where | Enforced by | Status |
|---|---|---|---|
| `+` upgrade: amounts n → n + max(2, round(0.4n)); status intensity +1 (clamped 30); self-debuffs never raised; `paidSummary` cleared when the payload changes; an authored `Card.upgrade` patch replaces the rule | `M/Cards/card-upgrades.ts:68-73`, `upgradeCard` `:250`, `getUpgradedCardById` `:281`; resolver `cards.library.ts:58` | `M/Cards/e2e/card-upgrades.engine.test.ts:66-370` | dormant — no player surface upgrades a card; the only producer of `+` ids is the sim (`combat.stage-profiles.ts:192-201`); not exported from `M/index.ts` |
| Four-die tray: body/mind/heart 1 special / 2 mana / 3 miss, gold (wild) 1/1/4; special face +2 Conviction; ceiling 7 dice | `DEFAULT_DIE_GEAR` `M/Combat/combat.upgradeable-dice.ts:82`; `:40`, `:58`; roll `:197` via `combat.engine.ts:352` | `upgradeable-dice.engine.test.ts:126-288`; `die-gear-rail.engine.test.ts:79` | live |
| One tray roll per threat phase | `combat.engine.ts:358-369` | `M/Combat/e2e/turn-law.engine.test.ts:89` | live |
| Anvil growth: HONE miss → mana (3), TEMPER mana → special (5), SWAP variant (8) shillings; special-face cap 2 per coloured die, 1 gold | `ANVIL_VERB_PRICING` `M/World/Blacksmith/blacksmith.engine.ts:55`; `M/Character/dieGear.reducer.ts:50`; one anvil per Act 1 region (`ACT1_ANVIL_NODES` `content.ts:159`); mobile `Mob/state/blacksmith/store-actions.ts` | `blacksmith.engine.test.ts:30-116`; `die-gear-reducer.engine.test.ts:41-143`; `die-gear-migration.engine.test.ts:23` | live |
| `dieUpgradeLevel` (honed ladder, max 4) and `bonusTurnDice` (act-reward dice) | `combat.dice.ts:18`; `upgradeable-dice.ts:115`, `:186`; read `combat.engine.ts:316-317`; written only by `buildStagePlayer` `combat.stage-profiles.ts:226-227` | `progression-axes.engine.test.ts:54-185` | dormant (always 0 in play) |
| `permanentWildDice` (max 3), `rollGoldLeadPair` | `combat.dice.ts:129`; `upgradeable-dice.ts:217`; `combat.engine.ts:305`, `:372` | `upgradeable-dice.engine.test.ts:272` | dead (its card mechanic was purged) |
| `bankedSouls` | `M/Character/types.ts:112`; written `CombatEncounterPanel.tsx:199`; never spent | — | dormant (parked under D20, `plan/revamp/progression.md`) |

## 13. Pricing remnants

No card pricing engine, power budget or pricing test survives. What is left:

- the dead budget comment, `M/Cards/types.ts:263` (§5);
- `docs/combat.md:292` says `cards.pricing.ts` "survives as an advisory
  scorer" — the file does not exist (dead doc claim);
- `parsePricingComments` reads `// pts:` comments from `cards.library.ts`
  that no card carries (`export-catalog.ts:111`), so the catalog's and
  `axio_cards`' `pricing` field is always null (dead);
- the live prices are not card prices: removal (§10) and the anvil (§12).

## 14. Save and migration

Current save version 35 (`M/Game/game.reducer.ts:174`). Card-touching hops in
`M/Game/game.migrate.ts`: v15→v16 seeds `cardRemovals` (`:228`); v22→v23
drops loadout flags (`:416`; `loadout-seed-retirement-migration.engine.test.ts:94-125`);
v25→v26 renames `philosophicalAspect` to `color` (`:519`, `:536`); v31→v32
drops deleted hazard-deck cards (`:758`). No hop drops purged player card ids
— see F2.

## 15. Tooling that reads cards

| Tool | Where | Notes | Status |
|---|---|---|---|
| `axio-query` MCP | `scripts/axio-mcp-server.mjs` (`axio_overview` `:145`, `axio_cards` `:176`, `axio_effects` `:207`, `axio_keywords` `:236`) | atlas parser expects 5 columns, so on today's 3-column tables it drops the carrier column and types every row "utility" (`:86-123`); no `Keywords` chip is exported; `ensureFresh` (`:57`) watches `cards.library.ts`, not `library/starters.cards.ts`, so a grey-card edit serves a stale snapshot. Tests `scripts/axio-mcp-server.test.mjs:46-159` | live, defects — see F7 |
| Catalog export | `axiomancer-mechanics/scripts/export-catalog.ts` | no `damage` arm in `riderProse` (`:214`) or `FREE_RIDER_KW` (`:161`), so Blow's FREE line comes out empty (by reading; `cards.json` is gitignored); Word prints raw "VULNERABLE 10" not "+10%" (`:189`, `:250`); ~20 dead rider branches | live, not face-honest |
| Catalog build | `scripts/build-catalog.mjs` | `KEYWORD_WORDS` (`:135-149`) includes dead HEAL SELF, DOT, PIPS | live |
| DevLog plates | `scripts/devlog-card-plate.mjs` | inherits the export gaps; `devlog-card-plate.test.mjs:84` returns early when `cards.json` is absent (always, in CI) | live, vacuous test |
| Playtest / sim | `combat.playtest.ts:208` (`--deck=grey\|cards:`, silently drops unknown ids); `combat.upgradeable-economy.sim.ts:210`; `M/test-utils/card-fixture.ts:41`, `:103` | — | dormant (tooling) |
| `combat-sim.cli.ts` default loadout | `M/CLI/combat-sim.cli.ts:44-46` names purged cards | — | dead |
| Dev "learn cards" | `M/CLI/dev-tools.ts:67-89`; `Mob/state/dev/rewards.ts:77-81` | rebuilds `knownCards` through a `Set`, collapsing the 5/3/2 copies | dormant (dev) |
| Card art map | `Mob/assets/images/cards/index.ts:38-104` | ~57 purged ids, no grey id; every grey card uses the fallback | dead entries |

Tests that pass purged card ids as opaque strings (harmless, but they read as
live content): `card-removal.engine.test.ts:46-54`, `restchoice.engine.test.ts:29`,
`lootcachechoice.engine.test.ts:25`, `card-upgrades.engine.test.ts:370`,
`progression-axes.engine.test.ts:43`, `combat-playtest.card-coverage.sim.test.ts:41`,
`hazard-pattern-combat.balance.sim.test.ts:37`, `combat.depth-epic.engine.test.ts:25`.

## 16. Docs that state card rules

| Doc | Claim | Against the code |
|---|---|---|
| `docs/keyword-atlas.md` | 12 rows; complexity budget; wiring checklist | rows match; GUARD's carrier says "every signature skill (R4)" (`:53`) but R7e2 deleted those; the checklist names `cards.pricing.ts`, `PAYOFF_KINDS`, `mechanicHeadline` and `cards.library.ts` as the carrier file; "Known drift" (`:155-184`) and the OATH/HEX note (`:100-103`) are stale |
| `axiomancer-mechanics/CLAUDE.md:72-76` | DEAL scaling and the alternate wins through retired keywords | stale doctrine |
| `docs/combat.md` | `:292` pricing scorer; `:395` act-reward dice and permanent wild dice; `:409` preset aspect thirds | all stale |
| `docs/character.md:100-104` | presets hold "7 Tier-1 known … all 14 cards" | every preset holds the grey 10 |
| `M/specs/33-upgradeable-dice.md` | `:5-9` the anvil is dev-only; `:21` preset win curve; `:365` a fishing-village anvil | the anvil is a live Act 1 node; presets and the village are gone |
| `spec.md` | `:45` a Saint-rank finisher; `:91-95` rest "heal / anvil / cut", cache "card / item / sacrifice" | no such card; sacrifice is retired |
| `plan/bearings.md:756-757` | grey reward pool, rewards and cache card offer on | matches |
| `docs/LEXICON.md:33`, `docs/card-frame-legend.md:54` | Ash → Saint | matches |

Stale code comments in this area (R10c's job): `grey-office.engine.test.ts:4-16`
("7 grey-strike", `theme`), `combat.deck.ts:13-14`, `card-upgrades.ts:20`
("~124 library cards"), `cards.library.ts:43` (a `--sandbox` flag that does
not exist), `cards.sandbox.ts:74` (`basePower`), `combat.encounter.sim.ts:565`
(a phase-end discard), `CombatEncounterPanel.tsx:407-409`,
`Mob/state/presenters/deck.engine.ts:5`, `keywords.ts:175`,
`content-drift.mjs:101-104`, the "atlas 13" floor comments
(`content-drift.test.mjs:127`, `axio-mcp-server.test.mjs:114`), and
`hazard-pattern-combat.engine.test.ts:394` ("biased to archetype").

## 17. Ratified, not built

These are T's rulings for B5/B6. None exists in code; none is a live rule.

| Ruling | Source |
|---|---|
| Global and Curse card types (Global: FREE 3 turns, PAID rest of combat, unique in play; Curse: a dead card holding a slot, cannot be scrapped) | D69, `cards.md` |
| EXILE (a line's card leaves for the combat; PAID-only) and SACRIFICE (lose n VITAE, unscaled, never below 1) keywords; the first Curse | D69-D71 |
| Lanes: a 10-12 card lane on top of grey; 1-2 signature keywords per lane; pairs as the goal | `cards.md` deck model |
| Relics open lanes: combat card reward = 2 random + 1 guaranteed lane card; no lane relic, 3 random | D68, D71 |
| Lane relics stack: 3-4 relics of one lane = 2 lane cards + 1 random; 5 = all 3 from that lane | D100 |
| Families of sub-lanes; a relic names a family; bridge cards within a family | D73 |
| First pool: one family, Blood Price, with 3 sub-lanes (Payoff, Engine, Misc) of ~10 cards = 30 + grey; replaces D73's 3 families × 1 lane | D74 |
| Card text: the scrap floor (no line gives only 1 Conviction); the Global template (duration badges, trigger first, PAID shows only the change) | `cards.md` (T, 2026-09-30) |

## 18. Findings

Defects the sweep turned up, ranked. "By reading" means traced through the
code but not run.

| # | Finding | Evidence | Weight |
|---|---|---|---|
| F1 | The carrier rule (D45) has no enforcer, and BLEED is registered (atlas, gloss, silhouette, status glyph) with no carrier | §8 | medium — B6 adds keywords; a carrier check belongs before it |
| F2 | No save hop drops purged player card ids. A pre-purge save keeps them in `knownCards` / `combatRewardCards`; `buildCombatDeck` deals them and `executeCard` throws `not found in library` (`card.engine.ts:105`) | §14, by reading | medium — old saves only |
| F3 | The pip pass clamps status intensity to `MAX_EFFECT_INTENSITY = 30` (`combat.engine.ts:977`), so a pipped A Plain Word at heart ≥ 7 (stack > 30) would be *cut* to 30, against the uncapped VULNERABLE (D41) | §7, by reading | medium |
| F4 | `check-prose` does not read `library/starters.cards.ts`; the card text is never linted | §9 | low |
| F5 | The scrap action and its per-turn cap have no test | §10 | low |
| F6 | The post-fight draft offers 3 from a pool of 3, so it always shows all three grey cards | §11 | low — expected until B6 grows the pool |
| F7 | `axio-query` parses the atlas wrongly and watches the wrong card file for freshness | §15 | low — tooling |
| F8 | Two colour-law functions disagree on `any`; the exported `combatDieCanPower` is off the play path | §4 | low |
| F9 | The catalog export is not face-honest (empty Blow FREE line, raw Word numbers) | §15, by reading | low |
| F10 | Dead registry rows: 12 `KEYWORD_FAMILY` rows, 5 `EFFECT_GLYPHS` rows, DRAW/CLEANSE runes, `EYE`, `KNOWN_UPPER` purged words, `CARD_ART_BY_ID` purged ids, `unlockCardViaDilemma`, `permanentWildDice`, the empty `TIER_*` arrays, the budget comment | §§3-15 | cleanup |

Gaps in coverage, not defects: the colour-law and FREE ledgers skip A Plain
Word (§4, §5, §9); the complexity budget is doc-only (§9); `stat-family-face`
is not pinned to `MECHANIC_SCALING` (§7).
