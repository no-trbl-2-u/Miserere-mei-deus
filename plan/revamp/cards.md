# Revamp — cards

> Part plan of [THE REVAMP](README.md). Phases **B4** (card-rules inventory,
> loop), **B5** (card-creator workflow, owner), **B6** (card sessions,
> owner). Decisions D37, D44, D50, D51, D56. Status: RATIFIED 2026-09-28 (D64).

> [!IMPORTANT]
> **Gate before any card work (T, 2026-09-28).** Before a card session,
> card-creator work, card-type work or keyword work starts, determine
> **100%** of the fixtures and rules that exist around cards — card types,
> keyword families, pricing, rarity/rank ladder, tiers, colour, FREE/PAID
> anatomy, complexity budget, the carrier rule, and every lint, guard and
> test that pins them. That is Phase B4. No card work begins until its
> inventory is merged. (Also recorded in `plan/bearings.md` → THE CARD HOLD.)

## The card process: Plan B, ratified 2026-09-30 (D73)

T ratified **Plan B (Slice first)** from
[`plan/2026-09-27-keyword-card-revamp.plans.md`](../2026-09-27-keyword-card-revamp.plans.md),
with these amendments:

| Call | Ruling |
|---|---|
| Slice unit | **One lane** per slice (one build session plus one kill session); no colour order |
| Lane grouping | **Families of sub-lanes.** A relic names a family; the guaranteed reward card comes from any lane in the family |
| First pool | ~~3 families × 1 lane~~ → **D74: one family, Blood Price, with 3 sub-lanes (Payoff, Engine, Misc) of ~10 cards = 30 + grey**. Rehearsal ledger: `plan/card-ledger/rehearsal-blood-price.md` |
| Multi-lane cards | **Bridge cards within a family**, built at the cross-slice session once a family has 2+ lanes (so the first pool has none) |
| §1 session rules | **Not ratified**; reviewed later |
| Still open | C1 threat matrix; §7 D8/D20 and progression calls; B5's tool shape |

Plans A and C are rejected. THE CARD HOLD (D37) and the B4 gate stand.

## The trial set: Blood Price after RC (T, 2026-10-02, D75)

RC cuts the version on Act 1 as it stands, with the grey deck (the walk
proves the flow, not a winnable clear). Straight after RC, the Blood Price
rehearsal becomes a **trial set**: its ballot survivors are wired in so
the reward mechanism (D71: 2 random + 1 lane card, a lane relic naming
the family), the Curse and Global types, SACRIFICE and EXILE, and a real
Act 1 clear can be tested in play. If it holds up, Blood Price may become
the first lane family; that is decided after play, not assumed.

**The trial set must come out cleanly (T).** When real lanes are added,
removing the trial cards is a small, mechanical change:

- The trial cards live in their own library file, apart from the grey
  starters, and join the library through one registration point. Deleting
  the set is deleting that file and that line.
- No other code names a trial card id: no engine branch, mobile presenter,
  test or fixture outside the set's own test file keys off one.
- The engine pieces the set needs (Curse, Global, SACRIFICE, EXILE, the
  lane relic and reward slot) are general systems that stay. Only the
  cards, and the relic that names the family, belong to the set.
- Saves drop removed trial card ids on load (the save hop B4's inventory
  flagged for purged ids), so removal needs no hand migration.
- A test pins the removal: the game runs and the reward pool still fills
  with the set's file unregistered.

THE CARD HOLD still governs: the trial cards are only the ballot's
survivors, chosen by T.

## Where things stand

- Library: the grey office — A Plain Blow (DEAL), A Plain Ward (GUARD),
  A Plain Word (VULNERABLE) — `Cards/library/starters.cards.ts`, plus the
  Blood Price trial set (30 cards and the grey Curse,
  `Cards/library/blood-price.cards.ts`, live since Phase BT, D80). Revision 2
  (Phase BT1, D81, T 2026-10-11): the five Curse cards are cut and five
  SACRIFICE cards take their slots (11 red, 8 blue, 11 purple); the grey
  Curse stays defined for foes to add later but is in no lane, deck or
  reward pool. Fresh
  deck Blow 5 / Ward 3 / Word 2 (D43). The reward pool is the whole library
  but the Curses (D44).
- THE CARD HOLD (D37) is lifted (D99, 2026-10-22): cards and keywords are
  built from a brief T wrote or approved, like any content (D88).
- Card types: purged to **Attack / Skill / Spell** (D51, shipped in R7).
- The keyword/card revamp process plans:
  [`plan/2026-09-27-keyword-card-revamp.plans.md`](../2026-09-27-keyword-card-revamp.plans.md)
  and its summary — **Plan B ratified, amended (D73)**.
- The card editor package is deleted in R1 (D56); B5 replaces it.
- `card-expert` is archived in R0 (D58); a fresh card agent is written at
  the first card session.

### Blood Price revision 2 rules (T, 2026-10-11, D81)

- **LEECH is a stacking debuff with two numbers, turns and potency.** Each
  LEECH n adds 3 turns and adds n (heart-scaled when applied) to the
  potency, the first application included. At the start of each foe turn
  the foe loses the potency in VITAE (plain loss, not a DEAL) and you HEAL
  what it lost (capped at max VITAE); then a turn ticks off. At 0 turns
  LEECH ends and the potency resets. The potency never decays. This
  replaces the decaying LEECH of D80.
- **Crimson Pact** (E-09n, Global, 🩸): your next DEAL this turn deals +n.
  The +n is unscaled, stacks across SACRIFICES, is spent by the next DEAL
  (TETHER's hit is a DEAL and takes it) and expires at the end of the turn.
- **The Bleeding Signet** (placeholder name): +20 max VITAE while worn and
  the signature **Crimson Covenant** (4 Conviction): TETHER 3, and your next
  SACRIFICE this turn counts twice (paid once; each instance fires TETHER
  and the 🩸 Globals). Not in shops, loot or rewards yet.
- **Two signets at once.** Relics are accessories and a character wears up
  to three, so the Suppliant's Ring and the Bleeding Signet are worn
  together; the signature bar lists every signature the worn signets grant.
- **Fight-length target (T):** Float-Eye about 3 player turns, Brine Hag
  about 5, the Doorwarden about 7. Measured with `npm run lane-pacing`
  (`Combat/combat.pacing.sim.ts`) at live foe VITAE; card numbers change
  only when T approves.

## Rewards (D44, D50)

T, 2026-09-28: keep the post-fight card reward; gut the keyword-, theme-
and rarity-focused selection logic (R7).

**Research note for B6:** find the best way for rewards to steer players
toward *focused* deckbuilding. Starting prior art to examine (via `scout`
and the KB): Slay the Spire's class pools and rarity pity, Monster Train's
clan pairs, Dawncaster's talent/card gating, Balatro's shop steering,
Inscryption's totem/sigil drafting. Output: options with trade-offs, not a
decision.

## Deck model — T's answers so far (2026-09-29, in progress)

Answered by T through `AskUserQuestion` while working out what a "deck"
is before choosing a card process plan. These are the owner's answers, not
a pick among Plans A/B/C, and they create no cards.

| Question | T's answer |
|---|---|
| How a player comes to own a deck identity | Grey start, then commit to a **lane** during the run |
| When the first lane opens | **With the first lane relic** (D71; replaces "at run start"). The run starts grey with all-random rewards |
| What one deck pitch produces | A **10–12 card lane** that sits on top of the grey cards and mixes with other lanes |
| Keyword ownership | Each lane owns **1–2 signature keywords**; all other keywords are shared |
| Mixing lanes | **Pairs are the goal** (two lanes per run) |
| First shippable pool | **3 lanes** (~36 cards + grey) |
| Lanes and colour | **Colour-free.** A lane is a play style and spans colours. A mono-colour deck cannot work: the tray's dice colours are rolled and the Color Law lets a die power only its own colour of card (D65) |

**Locked (D68): relics open lanes.** The relics a player has equipped
decide the reward pool for **combat** card rewards. Card rewards outside
combat (events, shops, other non-combat sources) are not affected by
relics. This replaces the stat-threshold idea.

**Locked (D71): how relics and rewards carry lanes.**

- **A relic names its lane.** The relic's detail view shows the name of
  the lane, or of a lane family if lanes end up grouped (how granular a
  lane is has not been fixed).
- **Relic sources, for now:** quests (a designated relic as the quest
  reward) and elites (a low chance of a random relic).
- **The combat card reward** offers 3 cards: 2 completely random and 1 guaranteed lane card, drawn from a lane an equipped relic
  opens. With no lane relic equipped, all 3 options are random.

**The first lane opens with the first lane relic** (T, D71). There is no
starting relic; until a quest or elite gives one, the deck is grey plus
random rewards.

**Settled by D73:** lanes group into families, a relic names a family, and
bridge cards join sub-lanes within a family.

## Card types — T's answers (2026-09-29, D69)

A type is a lifecycle rule. Five types:

| Type | Lifecycle |
|---|---|
| **Attack** | Play, then discard |
| **Skill** | Play, then discard |
| **Spell** | Play, then discard |
| **Global** | Stays in play and affects the combat (either side; there is no separate on-you / on-foe type). FREE: in play for 3 turns. PAID: in play for the rest of combat. No cap. Copies stack as independent instances; each fires and expires on its own (T, 2026-10-14: experimental, may change). Removed only by a card effect |
| **Curse** | A dead card that holds a hand slot until played. It cannot be scrapped. No extra discard cost and no "While in your hand:" effect for now; later Curses may add them. The first Curse (D71) is below |

**EXILE** is a shared keyword on a card line: the card does not go to the
discard pile and is gone for the rest of combat. It is the word for every
"doesn't go to discard" effect. A card can EXILE on its PAID line only,
so the weak line keeps the card and the big line spends it.

Attack, Skill and Spell share a lifecycle and stay as separate types (T).
The old `oath`/`hex` literals are not reused; Global replaces both.

**The hand carries over.** Cards you neither play nor discard stay in your
hand for the next round; the hand refills up to `COMBAT_HAND_SIZE` (5).
This is the current engine rule (`combat.engine.ts`, the boundary refill)
and T confirmed it stays. So a Curse costs a card every round until cleared.

**The first Curse (D71, T's text).** Grey (any die), type Curse:

| Line | Text |
|---|---|
| FREE | SACRIFICE 5 (lose 5 VITAE) |
| PAID | SACRIFICE 10 (lose 10 VITAE). EXILE |

Playing it FREE clears the hand slot for now but the card cycles back;
playing it PAID pays double to be rid of it for the combat. Its name is
not set. Further Curses are defined in card sessions.

**SACRIFICE** (lose n VITAE, unscaled) is now carried by a real card, so
it is a live keyword candidate rather than only the trial's codename.
A Curse cannot be scrapped (the discard-for-Conviction action refuses
it, loudly, per the UI doctrine); playing it is the only way out. **SACRIFICE is a cost, paid in VITAE (T).** It never takes the player
below 1 VITAE: a line whose SACRIFICE would leave less than 1 VITAE cannot
be played, the same as lacking a die, and the game says so. So at low
VITAE a Curse can be stuck in hand until the player heals.

A trial lane session (self-sacrifice, codename SACRIFICE) paused at its
first stage; the trial skill lives outside the repo until T adopts it.

**Scrap floor (T, 2026-09-30).** Scrapping any card gives 1 Conviction, so
every card line must be worth more than scrapping it. A line that only gives
1 Conviction is dead text.

**Global card text template (T, 2026-09-30).**
- The duration is printed on the frame as two badges, FREE ⏳3 (in play 3 turns) and PAID ∞ (rest of combat, D69), never in the rules text.
- The text opens with its trigger, taken from a closed set: ⟳ "Start of your turn:", 🩸 "When you SACRIFICE n:", 📜 "When you play a Curse:".
- A PAID line prints only what changes ("DEAL n instead.", "Also gain 1 Conviction."); if nothing changes, there is no PAID line.
- Each trigger phrase becomes a keyword candidate once 3 or more kept cards use it (Plan B's extraction rule).

## B4 — Card-rules inventory (loop; creates nothing)

Runs after R7 so it records the post-purge tree. Produces
`plan/revamp/card-rules-inventory.md`: for each rule or fixture — what it
is, where it lives (file:line), what enforces it (test/lint/guard), and
whether it is live, dormant or dead. Must cover at least: card types, the
`CardType` union, rank ladder (Ash → Saint), tiers, `color` body/mind/heart,
FREE/PAID anatomy, complexity budget by rank, keyword families and S3
scaling, the carrier rule (D45), the keyword atlas, gloss/glyph registries,
the KW-* lints, face-honesty guards, the reward pool, card upgrades (D8),
die growth (D20), and any surviving pricing remnants. The loop may ship
this — it is an inventory, not a design.

**Shipped 2026-10-01:** [`card-rules-inventory.md`](card-rules-inventory.md).
The B4 gate is met; B5 and B6 start from it. Its three medium findings (the
carrier rule's missing enforcer, purged card ids in old saves, the pip cap on
VULNERABLE) are filed in `plan/AUDIT.md` for `/iterate`.

## B5 — Card-creator workflow (owner)

T, 2026-09-28: "Create card-editor / card-creator workflow" as a phase of
the card-creation build plan. Replaces the deleted card editor. Designed
with T after B4; scope (UI tool vs. agent-driven authoring vs. both) is
T's call.

**Shape ruled (T, card-spec ballot §17, 2026-10-13;
`plan/card-ledger/card-spec-ballot-2026-10-13.md`).** B5 is a skill, not
a UI: it takes a loose idea for a deck, asks questions until aligned,
proposes several keyword and mechanic interactions, has T pick a few,
renders an HTML artifact showing five example cards per sub-lane (Payoff,
Engine, Misc), and, on T's sign-off, writes briefs for three phases: card
creation, measuring, tuning. CS1 ships `Cards/card-rules.ts` as its
validation layer. The skill itself is written in a session with T.

CS1 shipped the spec skeleton (`docs/card-spec.md`) and the rules fence; B5's tool shape is still T's call.

## B6 — Card sessions (owner)

T runs Plan B's sessions as amended by D73, one lane per slice. A fresh card agent is written at the
first session. The Global and Curse types (D69–D71) are built here: the
`CardType` union, Global play/expiry and uniqueness, the Curse slot, the
EXILE and SACRIFICE keywords, and the first Curse.

**Decided (D73):** lanes group into families (a relic names a family) and
bridge cards join sub-lanes within a family. Each slice builds one lane.

## Card-session queue

Card-mechanic gaps the loop filed before D37/D58, moved here from
`plan/PHASE_CANDIDATES.md` in R0 (2026-09-28). They are inputs for the
owner-led card sessions (B6), not loop work: the loop authors no card or
keyword (D37, D58). The steward-era scoring and "ship small" language is
kept verbatim as history; the card agent re-judges each row against the
grey library.

### [score 3.0] No card grants an in-combat/temporary card upgrade — Slay the Spire's Armaments/Apotheosis niche has no analogue
- origin: filed by `/adjust-cards` pass 17, 2026-09-23; moved from `plan/PHASE_CANDIDATES.md` in R0 (2026-09-28).
- proposed: 2026-09-23, `/adjust-cards` pass 17 (Step 1b widened KB
  cross-reference; Step 1's own structural audit read zero-diff — same
  134 cards, `pricing.engine.test.ts` 263/263, `curated-library.engine
  .test.ts` 14/14, `deck-presets.engine.test.ts` 9/9, all byte-identical
  to pass 16's own citation, and the only touching commit on the
  card-authoring surface in the 40-commit window was an unrelated
  `export` rename on `REGISTRY_DOT_IDS` in `combat.cards.ts`).
- source signals:
  - KB: `kb:slay-the-spire/cards/0015-armaments-armaments` (community,
    medium) — "Gain 5 Block. Upgrade a card in your hand for the rest
    of combat," `kb:slay-the-spire/cards/0013-apotheosis-apotheosis`
    — "Upgrade ALL your cards for the rest of combat. Exhaust," and
    `kb:slay-the-spire/cards/0202-lesson-learned-lessonlearned` — "Deal
    10 damage. If Fatal, Upgrade a random card in your deck. Exhaust."
    A genre-staple niche (temporary-for-this-fight or permanent-to-deck
    card-granted upgrades) distinct from a player's own meta-progression
    upgrade choice.
  - Live-code check: Axiomancer already has a full `+`-card system
    (`src/Cards/card-upgrades.ts` — `upgradeCard`/`getUpgradedCardById`,
    a pure default-numeric-rule-plus-authored-patch model, exhaustively
    switched over all 52 `CardSpecialMechanic` kinds with no `default:`
    arm, so a missing case fails the build) but it is wired ONLY as a
    between-run meta-progression axis (the file's own header: "Players
    should also be able to upgrade their cards") — no
    `CardSpecialMechanic` kind lets a card grant an upgrade to another
    card as a COMBAT EFFECT. Confirmed via the full 52-kind
    `CardSpecialMechanic` enumeration (`src/Cards/types.ts`) and a
    library-wide `axio_cards`/grep sweep: no card, sandbox card, or
    keyword-atlas row references any such verb.
  - This is a genuine gap, not a near-synonym: our upgrade axis and
    StS's Armaments/Apotheosis niche share the same computed-`+`
    machinery in spirit but operate on different triggers (meta-screen
    choice vs. a card played mid-fight) and different scopes (permanent
    vs. this-fight-only).
- rationale: real and KB-grounded, but not a Step 3 ship-small CREATE —
  `upgradeCard` is pure and reusable, but a card-triggered call needs a
  new `CardSpecialMechanic` kind (e.g. `grant_upgrade`), a targeting
  model (self hand card / random deck card / whole hand), a
  combat-engine hook to apply it, and — for the "this fight only" StS
  flavor — a REVERT-at-combat-end path, a transient-state shape the
  engine doesn't carry today (today's `+` is always permanent, computed
  once at draft/meta time). Past that: pricing, display text, and the
  full 12-step keyword wiring checklist (mobile gloss, card-editor
  vocabulary, atlas row). New engine wiring plus a new keyword — past
  this steward's ship-small ceiling (THE GROWTH FLOOR ¶2).
- proposed scope: a `mechanics-expert`/`card-expert` design session
  first (permanent-to-deck vs. this-fight-only, or both as separate
  verbs; whether the revert path is worth building or the niche ships
  permanent-only to start), then the full keyword wiring checklist for
  the resulting verb, then 1-2 carrying cards (a natural fit for
  grave's MILL/RECALL-adjacent "invest in the deck itself" register, or
  debt's compounding-power theme).
- estimated phases: 1
- conflicts: none against spec.md non-goals; doesn't touch the 3
  surviving big-numbers constraints or the LOCKED MECHANICS.

### [ ] [score 3.0] No mechanic lets a card offer the player a choice among revealed/generated options — Slay the Spire's Discovery / Dawncaster's Delve niche has no analogue
- origin: filed by `/adjust-cards` pass 19, 2026-09-25; moved from `plan/PHASE_CANDIDATES.md` in R0 (2026-09-28).
- proposed: 2026-09-25, `/adjust-cards` pass 19 (Step 1b widened KB
  cross-reference; Step 1's own structural audit read zero-diff — same
  134 cards / 8 themes / 72 keywords, `pricing.engine.test.ts` 263/263,
  `curated-library.engine.test.ts` 14/14, `deck-presets.engine.test.ts`
  9/9 all green and byte-identical to pass 18's own citation; `git diff
  f155b027..HEAD` over every card-authoring surface — `cards.library.ts`,
  `combat.starter-deck-presets.ts`, `cards.sandbox-sets.ts`,
  `combat.deck-draft.ts`, `cards.allies.ts`, `cards.haunts.ts`,
  `library/*.cards.ts` — returns zero changes across the 27-commit
  window).
- source signals:
  - KB: `kb:dawncaster/keywords/delve.okf.md` (src-001, community,
    medium) — "Select 1 of 3 randomly selected cards" (Deck Management
    function, ordinal 43 of 141).
  - KB: `kb:slay-the-spire/cards/0111-discovery-discovery` (community)
    — "Choose 1 of 3 random cards to add into your hand. It costs 0
    this turn. Exhaust." A genre-staple "pick one of a revealed set"
    primitive, distinct from our FORETELL (peek-and-reorder the deck,
    no choice among alternatives) and RECALL (deterministic
    highest-rank-first retrieval, no choice involved).
  - Live-code check: a grep for choice/choose/select across
    `src/Cards/types.ts` finds nothing on the mechanic surface (the one
    hit is the unrelated `befriend_attempt` mercy-choice comment, see
    below); the full `CardSpecialMechanic` union (50+ kinds) has no
    member that presents the player a set of options to pick from, and
    `axio_keywords`'s 72 registry rows are all single-resolution
    effects — none branches on a player pick.
  - This is a genuine gap, not a near-synonym for an existing keyword:
    FORETELL/RECALL manage what's already committed (deck order,
    discard retrieval by a fixed rule); Delve/Discovery hand the player
    an active choice among freshly-generated or revealed alternatives —
    a mid-resolution decision point, not a deterministic effect.
- rationale: real and KB-grounded, but structurally large — no
  generic "offer N options, resolve on player pick" surface exists
  mid-card-resolution today. Building it needs a new
  `CardSpecialMechanic` kind (e.g. `choose_one`), a transient
  combat-state shape to hold the offered options pending a player pick,
  a mobile UI screen/modal to present and resolve the choice (today's
  mobile combat screen has no such component), the full 12-step keyword
  wiring checklist (mobile gloss, card-editor vocabulary, atlas row),
  and a card-editor authoring surface for "N options, pick 1." Past
  this steward's ship-small ceiling by a wide margin — this reads
  closer to a UI feature than a card content addition. Notably, the
  engine already carries ONE player-facing mid-resolution choice state
  (`befriend_attempt`'s mercy-choice gate, Phase 108, `CardSpecialMechanic`
  doc comment: "opening a mercy choice state if successful") — a
  `choose_one` primitive could plausibly reuse that plumbing rather than
  building fresh, which is exactly the kind of call a design session
  should make before any code is written.
- proposed scope: a `mechanics-expert` design session first (what
  "options" means here — 3 random cards from the reward pool, 3 cards
  from the player's own deck/discard, or a fixed authored triplet per
  card; whether the pick resolves synchronously at play-time or is
  queued like the mercy-choice state; whether it reuses that state's
  plumbing), then the full keyword/engine wiring checklist for the
  resulting primitive, then 1-2 carrying cards once it exists (grave's
  MILL/RECALL register or choir's harvesting register are the closest
  thematic fits).
- estimated phases: 1-2
- conflicts: none against spec.md non-goals; doesn't touch the 3
  surviving big-numbers constraints or the LOCKED MECHANICS.

### [score 3.0] No card/effect pre-empts an incoming affliction — CLEANSE only removes one after the fact, nothing prevents the application
- origin: filed by `/adjust-keywords` pass 17, 2026-09-23; moved from `plan/PHASE_CANDIDATES.md` in R0 (2026-09-28).
- proposed: 2026-09-23, `/adjust-keywords` pass 17 (Step 1b widened KB
  cross-reference; Step 1's own structural audit read zero-diff —
  `combat.cards.ts`'s `mechanicText` switch still matches every
  `CardSpecialMechanic`/`CardRider` kind 55/55 with zero silent
  `default:` arms, `node --test scripts/content-drift.test.mjs` 11/11
  green, and the atlas's 72 rows still match `axio_keywords`'s live
  count exactly — the only 8 intervening commits on the keyword-surface
  path set were the docs-audit's stale-comment corrections
  (`f5db5ca6`/`fb1bffd5`/`adf35108`), zero schema/engine/atlas changes).
  Spot-checked six lower-population keywords for the ≥2-carrier REMOVE
  signal too (TWIN, IMMOLATE, PURGE, OMEN, FLAY, TICK via `axio_cards`)
  — all clear the bar with 2-5 live carriers each; no retirement
  candidate found.
- source signals:
  - KB: `kb:dawncaster/keywords/ward.okf.md` (community, confidence
    medium) — "Whenever you gain an Affliction, prevent that Affliction
    and lower your Ward by 1 instead. Fades at the start of the turn" —
    a PRE-EMPTIVE stacking buff distinct from Dawncaster's own Cleanse
    (`kb:dawncaster/keywords/cleanse.okf.md`, "Removes an Affliction" —
    after-the-fact, same shape as our own CLEANSE). Also checked
    Impervious (`kb:dawncaster/keywords/impervious.okf.md`) and Insight
    (`kb:dawncaster/keywords/insight.okf.md`) as the wider
    damage-negation family — both are DAMAGE-prevention, not
    affliction-prevention, and our own `buff_invincibility`
    (`defenseModifier: 99`, non-card, Signature-only) already occupies
    that niche; Ward's axis (blocking a STATUS application, not a
    damage instance) is the one left genuinely uncovered.
  - Live-code check: `src/Effects/index.ts`'s `applyEffect` is the SOLE
    application point for every buff and debuff (player and enemy
    alike) — read start to finish, it has no interception/consult step
    against the target's own active-effect list before stacking a new
    one; the only related lever, `buff_cleanse`/`buff_cleanse_minor`
    (`payload.cleanse: true`), fires as its own separate mechanic
    AFTER an affliction already landed, never before. Grepped both
    effect libraries (`src/Effects/{buffs,debuffs}.library.json`,
    29 entries total) for `prevent`/`immune`/`ward` in any
    description or payload key: zero hits outside one debuff's flavor
    text (`debuff_curse`'s description uses "denied," unrelated). No
    existing buff, debuff, `CardSpecialMechanic`, or `CardRider` blocks
    an incoming affliction before it stacks.
  - This is a genuine gap, not a near-synonym: CLEANSE (`CLEANSE N`,
    already in the atlas) removes UP TO N afflictions you already
    hold; the Ward axis stops one from landing in the first place —
    different point in the sequence, same family (affliction
    management) Dawncaster itself keeps as two separate keywords.
- rationale: real and KB-grounded, but not a Step 3 ship-small CREATE.
  `applyEffect` is a single, heavily-shared pure function (every
  status application in the engine funnels through it); teaching it
  to consult a "Ward" stack on the TARGET before stacking a new
  debuff is a new interception hook on a load-bearing shared path, not
  a same-tick reuse of an existing one — it would need careful
  ordering against the resist-roll (`resistedBy`/`resistDR`) that
  already gates whether an effect lands at all, a new
  `EffectPayload`/buff-payload shape, a carrying card or two, pricing,
  a hermetic e2e, and the mobile gloss/glyph. Squarely THE GROWTH
  FLOOR ¶2's "file large" case.
- proposed scope: a `mechanics-expert` design session first (where the
  Ward consult sits relative to the existing resist roll — before it,
  after it, or replacing it entirely for the one interaction — since
  both are "does this affliction land" gates and stacking two would be
  redundant), then the full 12-step keyword wiring checklist for the
  resulting buff/keyword, then 1-2 carrying cards (a defensive-stance
  vigil card or a choir ward-of-grace fit both the existing theme
  vocabulary).
- estimated phases: 1
- conflicts: none against spec.md non-goals; doesn't touch the 3
  surviving big-numbers constraints or the LOCKED MECHANICS.
