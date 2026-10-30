# The game model

<!-- lexicon-ok: stance-check, rps, preset-deck, card-pricing, deck-theme, retired-keyword — names deleted systems to say the game does not have them -->

> The game as the code stands. Read this first. Every number names the
> constant it comes from, so a change to the code shows up as a wrong line
> here. Paths are under `axiomancer-mechanics/src/` unless rooted. The card
> rules in full, with file and line, are in
> [`plan/revamp/card-rules-inventory.md`](../plan/revamp/card-rules-inventory.md).

Miserere Mei, Deus is a single-player dark fantasy deckbuilder for mobile.
The player walks Act 1 node by node and fights with cards powered by dice.
The rules live in a deterministic TypeScript engine (`axiomancer-mechanics`);
the Expo app (`axiomancer-mobile`) presents it.

## Cards

- **The library is three grey cards and four trial sets, Blood Price, the
  Elementalist, the Defender and the Merciful.** The
  grey office (`GREY_OFFICE_CARDS`, `Cards/library/starters.cards.ts`): A
  Plain Blow (attack, DEAL), A Plain Ward (skill, GUARD), A Plain Word
  (spell, VULNERABLE), all colour `any`, rank 1 (Ash), tier 1. The trial
  set (`BLOOD_PRICE_SET`, `Cards/library/blood-price.cards.ts`, D80, D81):
  30 cards (11 body, 8 mind, 11 heart, all rank 1 but one): 25 kept from the Blood
  Price ballot and five SACRIFICE cards T added in revision 2 (Bloodletting,
  Open Vein, Blood for Blood, Crimson Pact, Transfusion). Blood for Blood
  (`bp-e-08n`) is the library's one rare (rank 5, Skull; Phase UP1c): FREE
  SACRIFICE 3, DEAL 9; PAID SACRIFICE X (max 12), DEAL 3X. Its upgrades
  raise X's cap by 3 each (15, 18, 21) and the third makes it 4X (T,
  2026-10-23). The grey Curse is
  defined for foes to add later; no card adds it and it is in no lane, deck
  or reward pool. It joins the library through one `TRIAL_SETS` line in
  `Cards/cards.library.ts` and comes out by deleting that line and the file
  (D75); saves drop removed card ids on load (`dropUnknownCardIds`).
  The Elementalist trial set (`ELEMENTALIST_SET`,
  `Cards/library/elementalist.cards.ts`, Phase EL1c) is 30 cards (9 body,
  11 mind, 10 heart, all rank 1, one upgrade each) at the sims' adjusted
  numbers, with placeholder names ("Elementalist P-01"): they put up and
  read the weather (INFERNO, BLIZZARD, FROZEN, STORM; `Combat/combat.elements.ts`)
  and DRAW. Its lane `elementalist` holds all 30 and deals T's 20-card test
  deck; it comes out the same way, by its file and its `TRIAL_SETS` line.
  The Defender trial set (`DEFENDER_SET`, `Cards/library/defender.cards.ts`,
  Phase DF1d) is 30 cards (10 body, 10 mind, 10 heart, all rank 1, one upgrade
  each) in T's names and colours at the numbers T chose to ship: they put up
  THORNS and REFLECT (`Combat/combat.spikes.ts`), pay for bigger payouts by
  discarding random cards from your own hand (a PAID-only cost the engine
  refuses when it cannot pay), and use RETRIEVE and "while GUARD holds". Its
  lane `defender` holds all 30 and deals T's 20-card test deck (every Global
  and every Spell); it comes out by its file and its `TRIAL_SETS` line.
  The Merciful trial set (`MERCIFUL_SET`, `Cards/library/merciful.cards.ts`,
  Phase MF1d) is 29 cards (10 body, 10 mind, 9 purple, all rank 1, one upgrade
  each) under drafted names at the numbers T chose to ship (the sims' fixes):
  RADIANCE heals you and hits the foe for what it restored; MERCY heals the foe,
  adds to its MERCY total, and bursts for twice the total when its 3-turn clock
  runs out (`Combat/combat.mercy.ts`); YIELDING lets you befriend a foe whatever
  its VITAE. Its lane `merciful` holds all 29 and deals the sims' 20-card test
  deck (every Global and every Spell); it comes out by its file and its
  `TRIAL_SETS` line. The Suppliant's Ring is its family relic (an elite drop).
- **Card types** (`CardType`) are lifecycle rules. Attack and Skill play
  FREE or PAID, then discard. A **Spell** plays FREE and discards, or PAID
  and EXILEs, and its PAID line is a step stronger to pay for it (the Spell
  law, D103; A Plain Word is held out of it for T, so today it discards on
  both lines). A **Global** stays in play and fires on
  its trigger (⟳ start of your turn, 🩸 when you SACRIFICE n, 📜 when you
  play a Curse): FREE for `GLOBAL_FREE_TURNS` = 3 turn starts, PAID for the
  rest of combat. Copies stack as independent instances, each firing and
  expiring on its own (T, 2026-10-14: experimental, may change). A **Curse** holds a hand slot
  until played and cannot be scrapped.
- **Every card has two lines.** The FREE line plays with no die; the PAID
  line costs exactly one die. A grey card's lines are data: `Card.free`, and
  `specialMechanics` and `combatEffects`. Blow: FREE 2 damage, PAID deal 5.
  Ward: FREE guard 2, PAID guard 5. Word: FREE VULNERABLE 10% for 1 turn,
  PAID VULNERABLE 25% for 2 turns. A trial card's lines are a **program**
  (`Card.program`, `Cards/card-program.types.ts`) that
  `Combat/combat.card-program.ts` runs for the live board and the sim
  alike: lines can read VITAE ("at half VITAE or less"), pay costs and move
  Curses. A line whose condition fails or whose SACRIFICE it cannot pay
  cannot be played, and the game says why (`programLineBlock`).
- **Card mechanics** are DEAL and GUARD (`CardSpecialMechanic`) for the grey
  cards. The player's keywords are DEAL, GUARD, VULNERABLE, Blood Price's
  six: **SACRIFICE** n (lose n VITAE, unscaled, a cost that never
  takes you below 1; one that fires n times counts as n), **WAIVE** (your
  next SACRIFICE this turn costs nothing but still counts), **EXILE** (the
  card leaves combat instead of going to discard), **HEAL** n (mind-scaled,
  capped at maximum VITAE; "heal the damage dealt" heals what landed,
  unscaled), **TETHER** n (for n turns each SACRIFICE x makes the foe take
  DEAL x, unscaled, VULNERABLE applies) and **LEECH** n, a debuff on the foe
  with turns and potency: each LEECH n adds `LEECH_TURNS_PER_APPLICATION` =
  3 turns and adds n (heart-scaled when applied) to the potency, the first
  included; at the start of each foe turn the foe loses the potency in VITAE
  (not a DEAL), you heal what it lost, and a turn ticks off; the potency
  never decays and resets when the turns run out. "The foe loses n" is
  plain VITAE loss, not a DEAL. Crimson Pact's "your next DEAL this turn
  deals +n" adds n unscaled before VULNERABLE, stacks across SACRIFICES,
  goes to the next DEAL (a card's, a Global's or TETHER's) and expires at
  the end of the turn. A SACRIFICE that "counts twice" (a `next-twice`
  SACRIFICE modifier) is paid once and fires its triggers and TETHER twice.
  A signature can arm the next SACRIFICE, across turns, until one resolves:
  Crimson Return makes it HEAL what it would have cost instead of costing it
  (it still counts: TETHER deals that amount, the 🩸 Globals fire, the count
  moves); Ruby Tithe makes it also add LEECH equal to the VITAE paid,
  unscaled, with LEECH's 3 turns.
  The Elementalist's are the weather and DRAW (`Combat/combat.elements.ts`),
  all unscaled, lasting the whole combat and stacking by adding:
  **INFERNO** n burns both sides (at the start of each foe turn the foe loses
  its INFERNO; at the start of each of your turns you lose half of it, rounded
  down; plain loss, and yours can kill you; a "foe only" line burns only the
  foe), **BLIZZARD** n takes n off each foe attack, **FROZEN** comes when the
  foe is about to attack and its every hit is at most the BLIZZARD (the next
  DEAL it takes is doubled, then FROZEN ends), **STORM** n makes the foe lose
  n at the start of its turn, then grows by 1, and **DRAW** n draws n now.
  BLIZZARD and INFERNO drop by 1 at every round boundary after the round they
  went up in. The Defender's are the spikes (`Combat/combat.spikes.ts`) and
  RETRIEVE: **THORNS** n deals n back as a DEAL for each foe strike
  (heart-scaled when applied, VULNERABLE applies, a FROZEN foe takes it
  doubled, drops by 1 at every round boundary after its round), **REFLECT**
  n% sends n% of each strike's damage before GUARD back as a DEAL without
  reducing what you take (2 turns, a new REFLECT adds its % and refreshes to
  2, no cap, unscaled), and **RETRIEVE** n returns n random cards from your
  discard to your hand. Its PAID lines may also cost discarding random cards
  from your own hand, a cost the engine refuses when it cannot pay.
- **The starting deck is ten cards:** Blow ×5, Ward ×3, Word ×2
  (`STARTING_CARD_IDS`, `Combat/combat.rewards.ts`). The deck never drops
  below `MIN_COMBAT_DECK_SIZE` = 10.
- **Rewards:** a won fight offers 3 cards (`COMBAT_REWARD_OFFER_COUNT`,
  mobile) drawn from `rewardPoolFor`: the cards of every lane in
  `unlockedLaneIds`, which is the character's two starting lanes
  (`player.startingLaneIds`, always, worn or not) plus the lane of each
  relic worn (an unworn relic opens nothing), grey never. A run with no
  character and no worn lane relic draws the grey office. The guaranteed
  lane slots (`rewardLaneSlots`, D100) count worn relics only, so starting
  lanes widen the pool and never add a slot. A cache offers one. The dev
  menu's REWARD POOL can narrow the draft to card lanes (`CARD_LANES`: the
  grey office, Blood Price, the Elementalist and the Defender). A won elite fight
  (`difficulty: 'elite'`, the Green Jelly) pays the elite reward instead
  (`rollEliteReward`, Phase UP1f): the best 3 cards by rarity, one from a
  lane the deck draws on (`deckLaneIds`), or one upgrade of a random owned
  card at the highest rarity owned that can take one, read on the shared
  upgrade screen; the upgrade option hides when nothing can be upgraded.

## Dice

- **Four dice are rolled each threat phase**, one per colour: body, mind,
  heart and gold (wild) (`UPGRADEABLE_DIE_COLORS`,
  `Combat/combat.upgradeable-dice.ts`). The tray is rolled once per phase;
  a second roll is refused (`startTurn`, `Combat/combat.engine.ts`).
- **Faces** (`DEFAULT_DIE_GEAR`): a coloured die has 1 special, 2 mana and 3
  miss faces; the gold die has 1 special, 1 mana and 4 miss. A miss cannot
  power a card. A special face pays `SPECIAL_CONVICTION_DEFAULT` = 2
  Conviction when the die is used.
- **The Color Law** (`dieSatisfiesColorLaw`): a die powers a card when the
  card is `any`, the die is gold, or the colours match. A mismatch fizzles.
  Powering is all a die does: PAID numbers land as printed (scaled by stats)
  and statuses keep their printed turns, whatever legal die pays (D79).
- **Reserve:** at turn end one unspent die is banked (`RESERVE_MAX` = 2). A
  banked die gains a pip per phase, up to `RESERVE_PIP_CAP` = 2. Each pip
  adds `PIP_GUARD_BONUS` = 5 GUARD or `PIP_INTENSITY_BONUS` = 2 status
  intensity.
- **Momentum (the Surge meter):** using heart, body and mind dice in chain
  order (`MOMENTUM_CHAIN_ORDER`, `MOMENTUM_SURGE_LENGTH` = 3) grants a
  temporary gold die. At most `UPGRADEABLE_TABLE_CEILING` = 7 dice sit on the
  table; a grant past that becomes +1 Conviction. The die is a floating die,
  which the tray names GHOST.
- **The board's words** (Conviction, the BOON, MANA and MISS faces, BANKED,
  GHOST, the X die, the piles, the phase ledger, GLOBAL) are glossed from one
  source, `BOARD_GLOSSARY` in `axiomancer-mobile/state/combat/keywords.ts`.
  A player long-presses a die or taps the chip, pile, ledger or `IN PLAY`
  label to read its entry. A card's amount the face does not print reads
  `varies`, never a bare X (the X die is a different thing).

## A fight

- **The hand** is `COMBAT_HAND_SIZE` = 5. Unplayed cards stay; the hand
  refills to 5 each phase. The discard reshuffles when the draw pile empties.
  EXILED cards and Globals in play are out of the cycle.
- **Scrap:** discarding a card pays +1 Conviction, for the first
  `SCRAP_CONVICTION_CAP_PER_TURN` = 2 each turn. A Curse cannot be scrapped.
- **Conviction** is capped at `CONVICTION_CAP` = 12. It is spent only on
  signatures, each at its own cost (`SignatureSkill.cost`,
  `Combat/combat.signature.ts`), one per worn signet relic: The Open Hand
  ◆4, Crimson Return ◆5, Ruby Tithe ◆3, Open Vein ◆4, Eye of the Storm ◆6,
  Kindle the Gale ◆4, Thaw into Thunder ◆3, Thorn Mantle ◆5, Mirror Ward
  ◆3, Hold the Line ◆4. A signature that would
  do nothing is refused with a reason the bar prints (Crimson Return and Ruby
  Tithe while one is already armed); Open Vein never is, its HEAL always lands. The Elementalist's three are refused
  when the weather would not change (no INFERNO on you and no STORM; no foe-only
  INFERNO; no BLIZZARD). Thorn Mantle is refused with no GUARD to turn into
  THORNS and Hold the Line while your GUARD is already held; Mirror Ward
  never is.
- **GUARD** resets to 0 after each threat phase.
- **The program ledger** (`CombatEncounterState.program`) exists only when
  the deck holds a trial card: Globals in play with their turns left,
  EXILED cards, the turn's WAIVE and doubling, TETHER and LEECH on the foe,
  a death ward and a delayed HEAL. The board lists the Globals and shows
  LEECH and TETHER on the foe.
- **The enemy** plays an ordered deck, one card per threat phase, the last
  card repeating (`ENEMY_DECKS`, `Combat/combat.enemy-decks.ts`). Tier 2 and
  3 cards unlock at rounds `TIER2_DEFAULT_ROUND` = 3 and 6. The telegraph
  shows the intent (damage, debuff, buff, combo or pass) before the player
  acts.
- **The phase turn (D116).** A foe that declares `phases` (`Enemy.phases`,
  `Enemy/enemy-phases.ts`) does not use that deck. It plays the moves of its
  current phase as a fixed loop, in order, repeating. It changes phase at HP
  lines by tier: a normal at 30% (`PHASE_LINES`), an elite at 60% and 30%, a
  boss at 75%, 50% and 25%. At most one change happens per turn boundary, and
  each change plays that phase's DANGER move, once, and nowhere else. Its move
  numbers are authored at `PHASES_AUTHORED_LEVEL` (normal 2, elite 3) and
  scale with the foe's level the way damage does. A foe without `phases`
  keeps the deck path above.
- **The telegraph names a kind, not a number.** For a `phases` foe the
  intent is ATTACK, DEFEND, STATUS, DANGER or UNKNOWN, with the move's name
  and no damage, WARD or stack number anywhere on the board. A DANGER move's
  name shows only once the foe is in the defeat ledger
  (`codex.defeatedEnemies`, written on a win or a befriend); before that the
  DANGER icon shows with no name, and it stays unnamed when it fires.
- **Enemy words (D116).** A foe's move may carry the five enemy words (WARD,
  MEND and SCOUR count as one, then BRINE, TANGLE, UNDERTOW, BARNACLE), and
  may land the player's own VULNERABLE and LEECH on you. Each is a field on
  `EnemyMove` with a counter its gloss names
  (`Enemy/enemy-keywords.ts`, resolved in `Combat/combat.enemy-words.ts` and
  `combat.enemy-words.resolve.ts`). They land after the move's hits.
  - **WARD n** is the foe's GUARD: it soaks your DEALs before its VITAE and
    is gone at the start of its next turn. Counter: VULNERABLE, LEECH and
    INFERNO get past it.
  - **MEND n** heals the foe. Counter: burst.
  - **SCOUR n** strips n statuses off the foe, the last one too. Counter:
    lay more statuses than it can strip.
  - **BRINE n** cuts each GUARD you gain until the end of your next turn.
    Counter: one big GUARD play.
  - **VULNERABLE** and **LEECH** land on you: more damage from the foe's next
    attacks, and a VITAE drain at your turn start that heals the foe. Counter:
    GUARD still blocks the larger hit; race the LEECH.
  - **TANGLE n**: your next n cards cannot use their FREE line. A FREE play is
    refused, each landed PAID play counts one card off, and what is left fades
    at the start of the foe's next turn. Counter: pay with dice. A count, not
    scaled with level.
  - **UNDERTOW** names one die (body, mind or heart): it does not roll on your
    next turn. Counter: a banked Reserve die is not on the tray, so it is not
    lost.
  - **BARNACLE** puts a Barnacle Curse in your hand (`barnacle`, outside the
    player library). It cannot be played or scrapped and holds a slot; it
    falls off when you spend a body die on a card, one Barnacle per such
    play. A count, not scaled with level.
  A foe-only counter (the Tithe-Collector's LEDGER, a hoard) is fight state
  on the pane, not a word. No live foe carries a word until the Breakwater
  foes land.
- **Escalation:** enemy damage rises `THREAT_ESCALATION_PER_ROUND` = 0.22 per
  round after `THREAT_ESCALATION_GRACE` = 1 round, up to
  `THREAT_ESCALATION_MAX` = ×2, and `THREAT_ESCALATION_BOSS_MULT` = 1.6×
  faster against a boss. A normal or elite foe that declares `phases` is
  exempt; the HP phases carry its ramp.
- **Live foes have double VITAE.** The app doubles every live encounter's
  foe VITAE (`LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER` = 2,
  `Combat/live-encounter.ts`), a testing knob; the engine's own fights use
  the authored VITAE. The pacing sim (`Combat/combat.pacing.sim.ts`,
  `npm run lane-pacing`) applies the same knob so its turn counts compare
  with play.
- **Ending:** the player wins when the foe's VITAE reaches 0, or by sparing
  a befriended foe. The player loses a fight at 0 VITAE or after `MAX_PHASES`
  = 60. A first loss does not end the run; the next one does (see Death under
  The world).

## VITAE and stats

- **VITAE is the one bar.** Player maximum: `PLAYER_VITAE_BASE` 50 + 12 ×
  body + 6 × mind + 6 × heart (`RESOURCE_MULTIPLIERS`,
  `Game/game-mechanics.constants.ts`): 170 at the starting 5/5/5.
- **Enemy VITAE:** round((30 + 8 × level) × the difficulty multiplier),
  `enemyVitae` (`Enemy/index.ts`), unless the enemy sets `vitae`.
- **Stats** are body, mind and heart. An effect scales by its family's stat:
  body for damage to the foe, mind for anything on the player, heart for
  anything on the foe (`effectFamily`, `Combat/stat-scaling.ts`).
- **S3 scaling** (`scaleAmount`): a one-shot amount is base × stat ÷ 5; a
  repeating amount is base × (stat + 5) ÷ 10. Durations do not scale. The
  result floors, minimum 1, no cap. `NEUTRAL_STAT` = 5. The card face
  prints the scaled number.
- **Levels:** level 1 to 2 costs `EXPERIENCE_BASE` = 70 XP. Each later step
  costs the one before it times its band's growth (`EXPERIENCE_GROWTH`):
  10% more for the steps out of levels 2-20, 15% more out of 21-40, 20%
  more after 40, each rounded to a whole XP (`experienceToNext`,
  `Character/experience.ts`). Levels 5, 10 and 20 sit at 325, 950 and
  3,582 total; level 40 at 47,440. A level gives `STAT_POINTS_PER_LEVEL`
  = 1 stat point and does not refill VITAE (healing comes from rest and
  items). A kill gives level × `DEFAULT_XP_BY_DIFFICULTY` (normal 20, elite
  50, boss 200). A full Act 1 clear ends at level 20, meeting the four
  doors at levels 4, 9, 14 and 18 (`npm run act1-progression`). Level 50
  costs 229,326 XP in total, about 63 times Act 1's income: a projection
  for Acts 2 and 3, which do not exist yet.
  How each door and fight measures at the level a full clear brings:
  `docs/reports/measured/latest.md` (a measurement, stamped with its commit).

## The foes

Three enemies (`EnemyLibrary`, `Enemy/enemy.library.ts`). None carries a
word yet (`ENEMY_KEYWORDS` lists nine ids: D116's five enemy words with MEND
and SCOUR split from WARD, plus VULNERABLE and LEECH, see A fight).

- **Float-Eye:** level 1, normal, 38 VITAE. The only foe drawn at random,
  in every region.
- **Green Jelly:** level 7, elite, 120 VITAE. Placed on certain nodes. The
  only foe that can be befriended.
- **The Death Beholder:** boss, 320 VITAE at level 8, two stages (at 60% and
  25% VITAE). It holds every region's door, pinned at level 1, 2, 3 and 4
  (`World/MapEvents/content.ts`); `scaleEnemyToLevel` scales its VITAE to
  the pin. Its deck opens tier 2 on round 4 and tier 3 on round 7 (the
  default gates are 3 and 6) and its card weights sit at 0.8-1.15, so its
  damage steps up at rounds 7-8 and the fight runs about seven turns.

## Befriend and mercy

- **Ten relics** (`relicLibrary`, `Items/relic.library.ts`), and a run
  starts with none: no relic is handed over at the first node (phase
  SG1). The Suppliant's Ring's signature is The Open Hand; old saves keep
  the ring they were given. Blood Price's three (phase LR1d), all opening the
  `blood-price` lane while worn: the Crimson Circlet (the elite drop's; +5 Body,
  +20 max VITAE; Crimson Return), the Ruby Signet (a quest's; +5 Heart; Ruby
  Tithe) and the Bleeding Signet (a quest's; +5 Mind; Open Vein: HEAL 5,
  then trigger the foe's LEECH, which loses its potency now and heals you
  that, no turn ticking off). The Elementalist's three (phase LR1e), opening
  the `elementalist` lane: the Signet (the elite drop's; +5 Heart, +20 max VITAE; Eye
  of the Storm), the Brooch (a quest's; +5 Mind; Kindle the Gale) and the Belt
  (a quest's; +5 Body; Thaw into Thunder). The Defender's three (phase DF1),
  opening the `defender` lane: the Thornback Signet (the elite drop's; +5
  Heart, +20 max VITAE; Thorn Mantle: THORNS equal to your GUARD), the Mirror
  Brooch (a quest's; +5 Mind; Mirror Ward: REFLECT 50%) and the Carapace Belt
  (a quest's; +5 Body; Hold the Line: your GUARD is not lost at the end of the
  foe's next turn); no quest hands the Brooch or the Belt out yet. A worn relic's stat lines and signature are
  read from the library by id, so a saved copy takes the current ones; Heart,
  Body and Mind lines join the fighter's stats for each fight, `maxHp` folds
  onto `maxHealth`. The elite drop (`rollEliteRelicDrop`) draws from the
  three elite-drop relics (the Circlet and the two Signets) the player does
  not carry, unless the fight lists drops of its own; no relic is elite-only: a quest may pay any of them; the Breakwater questline's last step pays the Belt (through
  `/item-reward`); the dev menu's relic chips, which wear the relic while a
  position is free, hand over the rest; a relic
  carried unworn shows NOT WORN in the satchel, its signature off until the
  player taps WEAR. A character wears one weapon, one armor and up to three
  relics (`SLOT_CAPACITY.relic`); any relic fits any relic slot, and the
  signature bar lists every signature the worn relics grant.
- **The Open Hand** befriends a foe that has a `friendshipReward` and sits
  under its `hpGate` (the Green Jelly: below 30% VITAE; `Enemy/befriend.ts`).
- **The mercy choice** (`selectMercyChoice`) follows. Spare ends the fight
  as mercy and pays the friendship reward. Exploit strikes for max(10, 50%
  of the foe's maximum VITAE); the fight goes on if the foe survives.
  Befriending is the only non-lethal ending.

## The world

- **Act 1 only:** Breakwater, Charcoal Wood, Beacon Crags, the Lantern
  Deep. Each region ends at a Death Beholder's door. The Lantern Deep's deep stair
  (`ld-18`) and the Labyrinth vault door (`ld-15`) are sealed cutscenes.
  The Labyrinth and the other continents' maps are parked and unreachable.
- **Nodes** in play: encounter, hazard, rest, village (one per region, with
  the Anvil), loot-cache, cutscene, travel, quest (the Breakwater only) and
  the empty waypoint. Act 1 has no NPCs; that plumbing is kept and tested
  with fixtures.
- **The Breakwater questline** (`World/quest.library.ts`, phase QL1d): four
  quest nodes, bw-19..bw-22. Node 1 (off the windmill) offers step 1; nodes
  2-4 turn in the step before and offer the next. Placeholder steps and
  rewards until T's sitting (`[content]`): cross 1 hazard (40 XP, 10
  shillings), win 2 fights (40 XP, a minor healing potion), beat the elite
  (40 XP, a card pick of three), beat the watchtower boss (40 XP, 15
  shillings, the Elementalist's Belt). Every fight and hazard sits in a
  pocket behind its step's quest node, with one spare; the roads into nodes
  2-4 are locked until the step before is met; the quest nodes and the
  watchtower open their roads only once spent, so the bridge needs the boss.
- **Several quests at once** (`World/questline.ts`, phase MQ1a): any number
  of questlines run side by side, each reading only its own steps off the
  one quest log; a side quest is a one-step questline turned in at its own
  `turnInAt` node, which is then spent. One kill or hazard counts for every
  active objective that wants it. A step's **quest gates** (`gatesPast`) are
  roads past the node where it settles, seeded shut with the quest named and
  opened only when the step is completed (turned in, or paid on the fight),
  through the one settle seam. `questGateProblems` (`World/quest-gates.ts`)
  fails a map where roaming can walk around a gate. A step can also be
  **given from anywhere** (a dialogue choice's `giveQuestStep` effect, `giveQuestStep`:
  it counts from 0 and needs the step before it done, no quest node), **done
  on arrival** (`settle: 'on-arrival'`: entering its `reach` node completes and
  pays it, and that node then offers the next step as a turn-in node does),
  and can ask the player to **carry** an item (objective `carry`: met while
  the item is in the inventory, unmet when it leaves, one of it used up when
  the step completes). Built and proved on test fixtures only
  (`Game/fixtures/quest-chain*.fixture.ts`, phases MQ1a and MQ1b); the Breakwater
  declares no gates yet. On screen (phase MQ1c): the exploration screen carries
  a quest tracker (each active quest's name and next unmet objective with its
  count, three rows then `+n more`, a tap opens the memoir; none for an empty
  log), a tap on a node behind a shut road shows the road's reason and the
  quest holding it on the node confirm panel (no travel), and `/quest` shows
  an arrival-settled step's payout, a `carry` objective as `Bring: <item>`, and
  the nodes of any questline.
- **Currency:** shillings.
- **Death** (`Game/death.ts`, `resolveDeath`): the first time VITAE reaches 0
  in a fight or on a node hazard, the player is put back on the node they
  walked from (`MapState.arrivedFrom`) with 1 VITAE and `GameState.dying`
  set. The node they died on is open again, so it can be walked into and
  retried. A death while dying ends the run as a reset does: a fresh run and
  world, full VITAE, the character kept. `clearDying` takes
  dying off: the rest's heal choice and the village's paid rest clear it,
  and the upgrade choice does not. A player with no previous node comes back on the
  map's starting node. The store verb is `playerDied`. In the app a lost
  fight on the map calls it: a first death shows a full-screen return moment
  (`/death-return`) and then the map on the node walked from; a death while
  dying resets the run. A defeat inside the Labyrinth still resets the run.
  A lethal hazard crossing in the app still resets the run until phase DY1c.
  While dying, the combat board shows a skull in place of the player's
  portrait (the footer-dock medallion and the pilgrim modal head); the
  character tab keeps the portrait. This is dying's visible effect so far; the
  rule is provisional and may gain others after playtests.
- **Rest** offers one choice (`World/RestChoice/`): heal
  `restHealFraction` = 25% of maximum VITAE, upgrade one card the player
  picks (free, no heal; the shared upgrade screen shows it before and after,
  beside a locked "???" slot). Card removal is the village's.
- **The village** (one per region, near its exit; `World/Village/`,
  `VILLAGE_TUNING`) is a hub of three counters. A paid rest heals 25% of
  maximum VITAE for 6 shillings, once per visit. The card shop offers three
  cards from the player's reward pool at 6 shillings each, seeded by the run
  and the node so a village offers the same three all run (each sells once a
  visit), and removes a card for 5, 10, 15 … shillings
  (`CARD_REMOVAL_PRICING`). It sells no items and buys nothing back. Every
  refusal (a short purse, rested this visit, the deck floor) is shown.
- **The Anvil** (the village's third counter; `ANVIL_VERB_PRICING`,
  `World/Blacksmith/blacksmith.engine.ts`): HONE turns a miss face to mana
  (3 shillings), TEMPER a mana face to special (5), SWAP changes a die's
  gear (8). This is the only way dice grow. It also upgrades one card a
  visit for 5 shillings (Phase UP1e), on the rest site's upgrade screen;
  refused when the purse is short or no card can take another upgrade.
- **Items** are healing potions (`Items/consumable.library.ts`): Minor 10
  VITAE (15 below half), Healing 20 (30), Greater 50 (75).
- **Is X reachable in play?** `npm run roster-health -w axiomancer-mechanics`
  (`World/roster-health.ts`) lists dangling references and orphaned
  enemies, items, NPCs, dialogue nodes and quests.
- **The hazard minigame** (`World/Hazard/`): a ten-card deck
  (`hazardLiveDeck()`, `HAZARD_DECK` less its puzzle-only cards) and four dice rolled once; the player fills the route's meters with FORCE
  and ESCAPE cards for shillings or VITAE. A failure scars: maximum VITAE
  drops (`HAZARD_MAXHP_SCAR`) until the next rest.
- **The hazard puzzle demos** (`World/Hazard/puzzle/`, dev menu only): a
  hazard played as one fixed round with no roll, on the same cards and dice.
  A layout sets the hand, a reserve the DRAW cards pull from, the dice, a goal
  per route and optional stat unlocks. A puzzle has no bin: a hand card is
  staged or held, never discarded. A solver counts the distinct ways
  through (an outcome is the staged cards that change the result, the dice
  and the reserve left), and the library test holds each of the three demos
  (`HAZARD_PUZZLE_LIBRARY`) in its band (easy, medium, hard). A puzzle
  draws only from `HAZARD_PUZZLE_CARD_POOL`, the cards T approved from the
  card audit (`npm run puzzle:audit -w axiomancer-mechanics` writes
  `docs/reports/hazard-puzzle-card-audit.md`): no RE-CAST or dead card, and
  no two cards that play the same once salvage, rarity and weight are set
  aside (CLIFFRUNNER plays as SCRAMBLE). The validator refuses any other
  card; `HAZARD_DECK` and the live hazard keep every card. The pool also
  holds five puzzle-only cost cards (`puzzleOnly`; the live hazard never
  draws, offers or grants one): two Tolls, a cost on the free line that a die
  cancels (WAYFARER'S TITHE, purple, -2/-2 for DRAW 2, 0/0 powered; TURN THE
  STONES, red, -2 FORCE for a reroll, +2 FORCE and two rerolls powered), a
  Debt, a cost on both lines (PAWNED BREATH, purple, -2/-2 for a gold die, and
  DRAW 2 as well when powered), and two Overdrives, one meter for the other on
  both lines with a utility on each (BREAKNECK HAUL, red, 3 FORCE -1 ESCAPE and
  DRAW 1 free, 6 FORCE -3 ESCAPE and a blue die powered; HEADLONG DIVE, blue,
  the mirror: -1/3 and a reroll free, -3/7 and a red die powered). Every free
  line carries a utility, so no cost card plays as a plain number card.
  `npm run puzzle:report -w axiomancer-mechanics` prints, per demo and
  route, how many winning outcomes stage each card and which are required
  or unused (`hazardPuzzleCardReport`), and the solve's five difficulty
  features (`HazardPuzzleFeatures`): winning lines (the outcome count),
  opening share (the first placements, a card with its die left open or
  powered by one die kind, from which a win is still reachable), near misses
  (losing outcomes one short), shortest win (fewest moves) and draw
  dependence (the share of wins that stage a DRAW card). Calibration picks
  the one that tracks first-time solve times. Each route also prints its
  decision pressure (`hazardPuzzleDecisionPressure`): the optional cards
  (staged in some wins but not all), the required share, and how many first
  placements can still win and how many cannot. A route where every card is
  required is marked `forced` and one where every first placement still wins
  is marked `free`: findings, not failures. The library test fails, naming the
  cards, on a worse copy: a card no win stages in any demo that holds it, or
  one a pool card beats in every demo that holds it (at least as many
  winning outcomes everywhere, more in one: `hazardPuzzleDominatedCards`).
  Card values are signed: a negative
  number is a cost, on either line or both, and a meter can go below 0. The
  engine also has two utilities only the cost cards carry: `gainDie` (temporary
  dice on apply) and `reroll` (dice turned to the layout's `rerollFaces`, in
  order, never rolled). Neither has a default: a card declares its counts
  unpowered and powered (and a `gainDie` card its colour). A card with a
  cost on its powered line also carries a `poweredEffect`, a second utility
  that fires after its `effect` when a die powers it. `validateHazardCardDef`
  checks these rules and a puzzle refuses a card that fails them. Neither
  utility has a keyword yet. The dev menu's
  HAZARD PUZZLES board plays them on the live hazard board (the same cards,
  dice, drag and route select as a live hazard, with no bin) under a per-band clock. The outcome pays XP,
  a modest consumable and a region material; full completion adds the purse,
  and falling short costs VITAE. Act 1's live hazards are unchanged; the
  puzzles reach the map only after T approves the demos.

## What the game does not have

These were deleted in the revamp. They are not parked and do not come back
without a ruling from T.

- No stances, no hidden read, no rock-paper-scissors check.
- No preset decks and no deck draft. Every run starts with the grey deck.
- No card pricing or power budget. The only prices are the village's
  counters and the Anvil. The trial cards keep their printed numbers, untuned.
- No themes or synergy. The only reward steering is the elite reward's one
  card from the deck's lanes (UP1f).
- No enemy keywords beyond D116's five enemy words and the player's VULNERABLE
  and LEECH landing on you (see A fight), and no summons.
- No alternate wins beyond befriend: no RELENT, no CONDEMN, no capitulation.
- No alignment, GRACE or faction reputation.
- No bonus for paying with the card's own colour: the die powers the card
  and adds nothing (D79). The gold die stays wild.
- No die growth beyond the Anvil (D20, parked). The rest site and the Anvil
  grant card upgrades (Phases UP1d, UP1e), and so does an elite win (UP1f); the upgrade law (Phase UP1b, `Cards/card-upgrades.ts`):
  rarity limits upgrades (common 1, uncommon 2, rare 3) as `<id>+`, `++`,
  `+++`; each raises payoffs (Blood Price programs through `programAt`) and
  never a cost; `REPLACE_CARD` swaps one owned copy. Blood for Blood, the
  one rare, takes three (its FREE DEAL grows; PAID's X cap rises and the
  third is 4X: the one cost an upgrade grows, by T's ruling).
- No measured balance baseline (D57). A balance question gets "not
  measured".

## Where this comes from

The revamp ([`plan/revamp/README.md`](../plan/revamp/README.md)) and its
decisions (`plan/2026-09-25-refactor-strategy.decisions.md`, D46-D80).
Where this page and the code disagree, the code is right and this page is
a bug.
