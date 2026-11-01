# Chapter 1's weapons and armor — 2026-11-01

## Surface question
"We need weapons and armor but I have no idea what their effect(s) should be. Perhaps they have some sort of
synergy by helping their related lane in some way? Maybe their just global, right? (Sword = DEAL does n extra
damage ... Armor = +n on every GUARD). Stuff like that. Just normal stat bumps just seem a little light." (T)

## Better question surfaced
Relics already hand out stat lines (+5 to one stat, +20 max VITAE on the elite ones), a signature and a lane, so a
weapon with a stat bump is a worse relic. The open question was what the two top slots are *for*. T's answer: each
piece carries one fight effect and nothing else, and a lane's pieces cover where that lane has a hard time instead of
pushing what it already does well; a grey pair, worn from the start, gives the early game the bump the measured
report says it needs. The effects work in any build, so the pieces still open no lane.

## Path taken this session
1. Open: between converge and diverge (one adjective, "light"; two mechanisms offered, no numbers). Offered three
   directions: every DEAL / GUARD, lane-tied, one rule per piece.
2. t2: T took all three: one weapon per lane, one effect each, aimed at the lane's weak spot (Blood Price weapon
   HEAL 3 every DEAL; Elementalist armor Flame Guard, 1 Conviction every INFERNO); careful they don't get carried
   away; the early game could use a little bump. GOAL narrowed.
3. t3: ten pieces (a weapon and an armor per lane, plus a grey pair every character starts wearing); drops from the
   shop, loot caches, quests and elites at rates to experiment with; effect only, no stat line.
4. t4: the drafted slate kept as is, tuned later; the Blood Price heal fires on a card's DEAL only.
5. t5: T: "I wanted armor and weapons to effect the dice as well (ie. 1 extra hit on the blue die or Turn one hit
   into a special on your red die). I also wanted the weapons to control what happened when you used a special die";
   and "let's just keep it as pitch for now, no plotting". GOAL rewritten (effects reach the dice). Offered three
   shapes (all dice / split by slot / both); T picked **both, everywhere**: every piece keeps its trigger effect and
   adds a dice effect.
6. t6-t7: a weapon's dice effect is what its special does, **replacing** today's +2 Conviction (no weapon worn: +2
   Conviction); an armor's is one face change on one die; the dice slate kept as drafted, tuned later.
7. Parked: the EQ3 dock fix stays its own plot (PR #1268); the first WA1 plot (PR #1276) was closed at T's word.

## Raw material read
- `axiomancer-mechanics/src/Items/types.ts:81`: `Equipment` carries `statModifiers`, `grantsSignature`, `laneId`,
  `relicSource`; no per-fight effect hook exists, so the effects need a new engine primitive.
- `docs/game-model.md` ("Ten relics", "VITAE and stats", the four trial sets): relics give stats, a signature and a
  lane; GUARD resets after each threat phase; INFERNO burns both sides; TETHER and Blood Price's Globals DEAL outside
  cards; Thorn Mantle sets THORNS equal to GUARD.
- D105 (one weapon, one armor, three relics), EQ2 calls 1-2 (weapons and armor open no lane, grant no signature),
  D112 (the village holds the shop; loot caches are a node kind), D88 (content in a phase T approves; T is asking).
- `plan/phases/phase_EQ3_equipment_dock.md` (PR #1268): the dock fix and drag and drop for all five slots.

## Raw material read (dice, t5)
- `axiomancer-mechanics/src/Combat/combat.upgradeable-dice.ts:81` `DEFAULT_DIE_GEAR`: per colour `specialFaces`,
  `manaFaces`, `specialConviction`; body red, mind blue, heart purple, gold wild; coloured dice 1 special / 2 mana /
  3 miss, gold 1 / 1 / 4. A special powers the card and pays +2 Conviction when used; the payload is a number only.
- `honedDieGear` and `Character/dieGear.reducer.ts:136` `honeDieGear`: HONE turns a miss into a mana face; a coloured
  die runs out of miss faces after three.
- D110: colour is only payment, so a lane has no die of its own; each armor picks its die by the colour its lane's
  cards ask for most.

## Measured
| Finding | Data |
|---|---|
| Grey deck's closest early call: Toll-Keeper (bw-w5, L2 v L8) | 94% wins, lowest-VITAE p10 0.08 (measured at 546e84a, 2026-10-31) |
| Grey deck at the first door (bw-k2, Death Beholder, L9), even stats | 91% wins, p10 0.02 (546e84a) |
| Blood Price runs lowest of the lane decks | p10 about 0.66-0.90 across the ledger, 0.66 at the first door (546e84a) |
| Elementalist | p10 about 0.92-0.98 (546e84a) |
| Defender, Merciful | not measured |
| Any equipment effect | not measurable before build: no effect hook exists and no sim knob wears a piece |

## Prior art consulted
- **Dawncaster — Equipment cards with one triggered rule** (Aeternal Staff: "Activate to trigger your Start of Turn
  effects. Reactivate whenever you complete a Performance", src-001): equipment as a single trigger, not a stat
  line; no confident read on reception.
- **Slay the Spire — Strength and Dexterity** (flat +n per attack / per Block card): readable and liked; the known
  lever is that multi-hit cards multiply it, which is why the Blood Price heal is limited to a card's DEAL (memory
  read, not a KB citation).
- **Darkest Dungeon — conditional trinkets** ("while X, +Y"): build identity from small conditions; trinkets with
  heavy downsides were divisive (memory read, not a KB citation).

## Rulings (T, this session)
- Plain stat bumps alone are too light (t1).
- One weapon and one armor per lane, one effect each, aimed at where the lane has a hard time; don't let them get
  carried away (t2, t3).
- A grey weapon and armor too; every character starts wearing the grey pair (t3).
- Pieces drop from the village shop, loot caches, quest rewards and elite drops; rates are a tuning table to
  experiment with (t3).
- Effect only, no stat line (t3).
- The drafted slate is kept; numbers are tuned later (t4).
- The Blood Price weapon heals on a card's DEAL only (t4).
- Keep it as a pitch for now; no plotting (t5).
- Weapons and armor also affect the dice; both, everywhere: each piece keeps its trigger effect and adds a dice
  effect (t5).
- The weapon controls what a special does, replacing today's +2 Conviction (t5, t6).
- An armor's dice effect is one face change on one die: a miss becomes a hit, or a hit becomes a special (t5).
- The dice slate is kept as drafted; numbers tuned later (t7).
- The starting grey sword's special is the +2 Conviction (T, t8: "the starting grey sword is the 2 conviction
  special"); today's special lives on the sword every run starts with.

## Directions considered
### Option A — Every DEAL / every GUARD *(Slay the Spire's Strength and Dexterity)*
A flat add on a verb in every build. **Trade-off:** simplest to read, uneven across lanes (BURN and STORM are not
DEALs; GUARD-heavy builds double-dip through THORNS). **Telltale failure mode:** one lane always wears the armor,
another never wants a weapon. Kept for the grey pair only.
### Option B — Lane-tied boosts
A piece pushes its lane's keyword. **Trade-off:** builds click, but the piece is dead outside its lane and close to a
relic. **Telltale failure mode:** players only wear the piece matching their relics. Rejected as written.
### Option C — One small rule per piece *(Dawncaster's equipment)*
**Trade-off:** most identity, most writing and reading. **Telltale failure mode:** players can't say what their
weapon does.
### Chosen — C's one rule, lane-flavoured but aimed at the lane's weakness, with A's flat add for the grey pair
**Telltale failure mode:** a lane piece is worn in every build (it is too strong outside its lane) or never worn
outside its lane (it is too narrow); either shows in the play log's equip counts and the sims' worn-piece runs.

## The slate (T kept it at t4; names are T's)
| Lane (where it struggles) | Weapon | Armor |
|---|---|---|
| Grey (the early spike; worn from the start) | Your first DEAL each turn deals +2 | Your first GUARD each turn gives +2 |
| Blood Price (drains itself) | HEAL 3 on each card's DEAL | Each SACRIFICE gives you GUARD 2 |
| Elementalist (slow set-up, INFERNO burns you) | Your DEALs deal +2 while the foe has any weather on it | Flame Guard: +1 Conviction each time you lay INFERNO |
| Defender (low damage, discards its own hand) | Your DEALs deal +2 while your GUARD holds | Each time you pay by discarding, draw 1 |
| Merciful (heals the foe, long fights) | Your DEALs deal +2 while the foe is above half VITAE | Each HEAL gives you GUARD 2 |

## The dice slate (T kept it at t7)
| Lane | Weapon: your special... | Armor: die change |
|---|---|---|
| Grey | pays +2 Conviction (today's special, now the grey sword's; T, t8) | +1 hit on the gold die (a miss becomes mana) |
| Blood Price | heals 4 | one hit becomes a special on the red (body) die |
| Elementalist | lays INFERNO 2 on the foe only | +1 hit on the blue (mind) die |
| Defender | gives GUARD 6 | +1 hit on the purple (heart) die |
| Merciful | lays VULNERABLE on the foe for a turn | one hit becomes a special on the blue die |

Watch: an armor's +1 hit stacks with the Anvil's HONE until the die has no miss face left (a fully honed coloured die
gains nothing); the Blood Price pair is a combo (more specials, each one heals) and the first place to check for
"carried away".

## What proves it (not T, not the agent)
An engine test per piece that drives its trigger and reads its payoff in the fight state; the measured report re-run
with the grey pair worn, showing the grey deck's lowest-VITAE p10 at the Toll-Keeper and the first door above
today's 0.08 and 0.02 (stamped with its commit); the satchel showing the grey pair worn on a new run.

## Handoff to /plot
Task: Chapter 1 gets ten weapons and armor, each with one fight effect and no stats: a grey weapon and armor every
character starts wearing, and a weapon and an armor for each of the four lanes whose effect covers where that lane
struggles. They drop from the village shop, loot caches, quests and elites.
Source: this file
Acceptance:
- A1 The engine gives equipment one fight effect: a trigger (a card's DEAL, the first DEAL or GUARD each turn, a
  SACRIFICE, laying INFERNO, paying by discarding, a HEAL) or a condition (foe has weather, your GUARD holds, foe
  above half VITAE) and a payoff (HEAL n, GUARD n, Conviction n, +n to a DEAL, draw n); a worn weapon's and armor's
  effects apply in every fight and only while worn; an engine test per trigger and condition.
- A2 The ten pieces of the slate exist in the library with those effects and no stat line, slot weapon or armor, no
  lane and no signature; a content test pins each piece's effect, and that no weapon or armor has `statModifiers`,
  `laneId` or `grantsSignature`.
- A3 Every new run starts wearing the grey weapon and armor (every character); an old save with empty slots is
  given nothing.
- A4 The pieces drop from all four sources: the village shop sells them, loot caches, quest rewards and the elite
  drop can hand them over, each at a rate from one `[content]` tuning table; a test per source.
- A5 The card face and the dock say what each piece does: the satchel row, the detail card and the fight show the
  effect line in Dawncaster-terse words, and a triggered effect is shown on the board when it fires.
- A6 The measured report gains a column with the grey pair worn, and the sims can wear a piece.
- A7 A worn armor changes one die's faces for the fight, on top of the character's die gear: a miss becomes a mana face,
  or a mana face becomes a special; a die with no face to change gains nothing; a test per armor rolls the changed
  table.
- A8 A worn weapon sets what a special does when used (DEAL, HEAL, GUARD, INFERNO on the foe, VULNERABLE), replacing
  the +2 Conviction; the grey sword's special is the +2 Conviction; with no weapon worn a special only powers its
  card [T to confirm]; a test per weapon; the tray's long-press gloss
  names the worn special.
Measure: the per-piece engine tests pass; `docs/reports/measured/latest.md` re-run with the grey pair worn shows the
grey deck's lowest-VITAE p10 at the Toll-Keeper and the first door above 0.08 and 0.02, with its commit stamp.
Decisions made upfront:
- Effects reach the dice: each piece keeps its trigger effect and adds a dice effect; weapons set the special
  (replacing +2 Conviction), armor changes one face on one die; the dice slate as drafted (T, t5-t7).
- One weapon and one armor per lane plus a grey pair; ten pieces in Chapter 1 (T, t3).
- One effect each, no stat line; lane pieces cover the lane's weakness; still no lane and no signature (T, t2-t3; EQ2).
- The slate above, kept as drafted; numbers tuned later (T, t4).
- The Blood Price weapon heals on a card's DEAL only (T, t4).
- Every character starts wearing the grey pair (T, t3).
- Drops from the shop, loot caches, quests and elites; rates are a tuning table (T, t3).
Out of scope: the dock fix and drag and drop (EQ3, PR #1268, its own plot); set bonuses (SB1); weapons and armor for Chapters 2-4.
To confirm:
- With no weapon worn (the grey sword taken off), a special only powers its card and pays nothing more [T to confirm].
- Names: placeholders ("Grey Blade", "Grey Coat", "<lane> weapon / armor") until T names them [T to confirm].
- Which quests and caches hand which piece: the plot picks one quest per lane piece where a quest already pays a relic
  of that lane, and caches draw from the rest [T to confirm].
- Starting rates: elite drop 25% a piece, cache 33%, shop stocks two pieces per visit [T to confirm].
Plotted: into spec 136 (plot PR #1268) at T's word, 2026-11-01 ("Yeah, plot this and integrate it into 1268"), as chunks
136.4-136.10 (EQ3d-EQ3j). Earlier: T paused plotting at t5 ("keep it as pitch for now, no plotting"); run `/plot` with this file when T
says. Suggested slot then: anytime (the plot itself is due Mon Nov 2 in `plan/deadlines.md`; nothing open is blocked on it), or
asap if it should land before the Nov 9 mid-MVP check.
