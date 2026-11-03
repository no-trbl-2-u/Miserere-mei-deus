# The mercy check replaces befriending — 2026-11-03

## Surface question
"Remove the befriending system and replace it with a 'mercy check' event where the player is asked to 'spare' or
'finish' the enemy. Spare = No xp, normal shillings reward, and a random reward from the reward table (which includes
extra shillings and minor consumables the most, random card upgrade, random card transform, random relic, weapon, or
armor. Not all a flat drop rate)"

## Better question surfaced
Fight rewards feel flat, and a whole ending exists to serve one relic. So the question is not how to fix befriending
but how a fight's payoff can vary without its own ring, gate, keyword and outcome. Firing the choice as the foe falls
answers that: VITAE stays the one way to win, and mercy becomes a choice about what the win pays.

## Path taken this session
1. Opened on diverge: a named mechanism with no stated problem and one solution.
2. t1: replace befriending with a spare-or-finish check.
3. t2: T named the trigger (certain enemies, sometimes, by chance), Finish's pay and the itch. Moved to converge.
4. t3: normal foes only, about 15%, blind reward, normal pay 3 x level. The Chosen's ring stays; YIELDING goes.
5. t4: transform, loot, table gear and weights settled. Ready.
6. Parked: nothing.

## Raw material read
- `axiomancer-mechanics/src/Enemy/befriend.ts`: the 30% gate, `BEFRIEND_TUNING`, and a payout of shillings or a potion.
- `axiomancer-mechanics/src/Game/store.ts:401-411`: a victory pays no shillings; only a befriend does.
- `axiomancer-mechanics/src/Game/game.reducer.ts:337-431`: the `friendship` outcome, including the story flag
  (`:375`) and journal entry (`:388`) that only a befriend grants.
- `axiomancer-mechanics/src/Combat/combat.rewards.ts`: reusable relic, equipment and upgrade rolls. `rollEliteUpgrade`
  only draws the highest rarity owned, so "random card upgrade" needs its own draw.
- `axiomancer-mechanics/src/Combat/combat.mercy.ts`: the MERCY keyword and YIELDING. Only YIELDING goes.
- `axiomancer-mechanics/src/Cards/library/merciful.cards.ts:180-183`: M-02b grants YIELDING.
- `axiomancer-mechanics/src/Items/consumable.library.ts`: three healing potions are the only consumables.
- `docs/game-model.md:402-410`, `plan/bearings.md` (Win condition), `spec.md:35`, `axiomancer-mechanics/CLAUDE.md`: the
  doctrine that befriending is the only other ending. All of it must change.
- `plan/114-sk1-signature-skills.md:48,125`: The Open Hand is the Chosen's only signature. BUG1j, which makes every foe
  befriendable, is built (#1242), though its plan row still reads open. BUG1a, the refused rune's caption, is not built.
- Scale: 38 non-test references to the befriend symbols across 13 engine files, plus the app's mercy board, friendship
  panel and e2e scripts.

## Measured
| Finding | Data |
|---|---|
| Act 1 ledger win rate, grey pair worn | 99-100% (`docs/reports/measured/latest.md`, commit 1264737, 300 runs, seed 1) |
| Ledger fights and foe level sum | 18 fights, level sum 77 (same report) |
| New wage per full clear at 3 x level, all fights counted | about 231 shillings, roughly 38 shop cards at 6 each |
| Checks per full clear at 15%, all fights counted | at most about 2.7 |
| Clears with no check at 15%, all fights counted | at least 5% (0.85^18); more once elites and bosses are excluded |

The clear figures are arithmetic on the report's ledger, not a run of the change. Spare rates and XP pacing are not
measurable before build: no sim policy can choose yet.

## Prior art consulted
The hosted knowledge base held no spare-or-kill reward case (`kb_search`, scope all), so these are memory reads, not KB
citations.
- **Undertale — spare or fight:** sparing withholds EXP, so the choice costs growth; widely acclaimed, though that
  reception is for its story as much as the mechanic.
- **Slay the Spire — card transform:** a random replacement, valued most on starter cards and risky on a built deck; no
  confident read beyond that.
- **Shin Megami Tensei — demon negotiation:** talking replaces killing and pays in recruits or items instead of EXP, with
  unpredictable replies; no confident read on the unpredictability's reception.

## Rulings (T, this session)
- Befriending is removed (t1).
- Normal foes only, one shared chance of about 15%; elites and bosses are always finished (t3).
- The player does not see the reward before sparing (t3).
- Normal shillings are 3 x foe level (t3).
- Finish, and a fight with no check, pays XP, normal shillings and a card reward (t2, t3).
- Spare pays no XP, 1.5x normal shillings and one roll on the table (t1, t2, t3).
- Weights: extra shillings 30, minor consumable 30, card upgrade 15, card transform 10, relic 5, weapon or armor 10 (t4).
- Transform: completely random, any card and any lane, even outside the reward pool, never the 3 grey starters (t4).
- Foe loot tables stop paying (t4).
- Table relics, weapons and armor: anything not carried (t4).
- The Suppliant's Ring stays and gets a new signature T authors (t3).
- YIELDING is cut, and T rewrites M-02b (t3).

## Directions considered
### Option A — A blind chance as the foe falls *(inspired by Undertale's withheld EXP)*
Chosen. VITAE stays the one win, and the check is a rare event. **Trade-off:** simple, but rare results seldom appear.
**Telltale failure mode:** players barely meet it, so rewards still feel flat.
### Option B — Every won fight
**Trade-off:** a constant growth-or-goods decision, but it can become a chore. **Telltale failure mode:** one habit
solves it, and the prompt gets skipped without thought.
### Option C — The foe breaks mid-fight, under a VITAE gate
**Trade-off:** sparing saves damage as well, but the gate carries a lot of weight. **Telltale failure mode:** players
always spare to avoid damage, or stall to reach the gate.

**Player fantasy:** I hold this creature's end in my hands, and I do not know what mercy will bring.

**Telltale failure mode of the chosen direction:** the spare rate sits near 0% or 100% across sim policies, or a spare-all
run falls far behind on levels.

**Content boundary:** T authors the ring's new signature, M-02b's rewritten text and its upgrades, and the art for any
new surface. The loop builds the engine, table, prompt and removal. Check copy follows the delivery register and adds no
story canon. The MERCY keyword and the Merciful lane stay.

## What proves it (not T, not the agent)
A seeded engine test: normal foes offer the check at 15%, elites and bosses never; each table result lands near its
weight over many rolls; Finish and Spare pay their ruled amounts. A run-sim comparison of spare-all against finish-all
then reports XP, level and shillings at the end of Act 1. A pass is both sets of numbers printed, and no `befriend`
symbol left in non-test code. Numbers are a measurement, not a gate (D57).

## Handoff to /plot
Task: Replace befriending with a blind spare-or-finish check on normal foes (15% as the foe falls), so that fight rewards vary and no ending hangs on one relic.
Source: this file
Visual: `plan/messy/mercy-check-mockup.html` (before/after mock-up; scratch and gitignored, so it exists only on T's machine)
Acceptance:
- A1 A normal foe falling offers spare or finish at the tuned chance (default 15%), seeded; elites and bosses never do, and the prompt shows no reward.
- A2 Finish, and a fight with no check, pays XP, 3 x foe level shillings and the card reward, with no foe loot roll.
- A3 Spare pays no XP, 1.5x normal shillings and one roll on the table at the ruled weights, and each result applies to the save.
- A4 A transform swaps one random owned card for any library card, whatever its lane, never a grey starter.
- A5 No Open Hand, gate, Exploit, YIELDING or `friendship` outcome remains in non-test engine or app code; old saves load, and the MERCY keyword still works.
- A6 Doctrine and `docs/game-model.md` describe the check, and sims can choose spare or finish.
Measure: the seeded engine test passes, and a run-sim comparison prints spare-all against finish-all XP, level and shillings at the end of Act 1.
Decisions made upfront: every item under Rulings above; the shilling wage's economy effect is known and accepted as a measurement to read, not a gate.
Out of scope: T's signature and M-02b text; shop repricing; per-foe chances; the check on elites and bosses.
To confirm:
- Chance: default 15% [T to confirm]
- Rounding of 1.5x: default round up [T to confirm]
- Extra shillings result: default a further 1 x normal [T to confirm]
- Minor consumable result: default the minor healing potion, the only minor one that exists [T to confirm]
- Transform range: default excludes Curses as a result and upgraded copies; a grey starter can be the card replaced [T to confirm]
- A result with nothing to give (all gear carried, nothing upgradable): default pays the extra shillings result [T to confirm]
- Spare's records: default counts as a win for quests, the defeat ledger and node settling, and inherits the story flag and journal entry unlock [T to confirm]
- Removal order: default removes The Open Hand and YIELDING only once T's signature and M-02b text exist, and BUG1a still builds; the Nov 9 check plays whatever is on the preview build [T to confirm]
Suggested slot: asap, because further befriend work would otherwise be built on a system this removes.
