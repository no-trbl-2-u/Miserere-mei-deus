# 144 — The mercy check replaces befriending

> Now and then a normal foe falls and the player must spare it or finish it, not knowing what mercy pays. Finish pays XP, shillings and a card reward; Spare pays no XP, more shillings and one roll on a weighted table. Every win now pays shillings, and befriending, The Open Hand's gate, Exploit and YIELDING are gone.

## Why

### Sources

- `/pitch` then `/plot asap` from T, 2026-11-03, attended. The pitch is `braindump/2026-11-03-mercy-check.md`; its before/after
  mock-up is scratch, on T's machine only.
- T's words:
  - "remove the befriending system and replace it with a 'mercy check' event where the player is asked to 'spare' or 'finish' the enemy"
  - The itch: "Reward feels flat and there's an entire mechanism for one relic"
  - "Finish=XP, some shillings, card reward... Spare=extra shillings and a roll on the loot table"
  - "Normal foes, one chance small chance of it occurring (15%?), player does not see the reward before spareing"
  - The transform: "Completely random, minus the 3 grey starters, any card, any lane, even outside the reward pool"

### What exists today (read 2026-11-03, at 444d0673a)

- A win pays XP, a roll on the foe's loot table and a card reward, and no shillings (`Game/store.ts:401-411`).
- A befriend needs The Open Hand, the Suppliant's Ring's signature, on a foe under its gate (`Enemy/befriend.ts`, 30% by
  default). The mercy choice follows (`selectMercyChoice`; the modal is `axiomancer-mobile/docs/adr/ADR-0007-befriend-mercy-choice-modal.md`).
  Spare ends the fight as `friendship`, and Exploit strikes.
- Only `friendship` grants a foe's story flag and journal entry (`Game/game.reducer.ts:375-395`), so removing it strands them.
- `Combat/combat.rewards.ts` already rolls relics and equipment. `rollEliteUpgrade` draws only the highest rarity owned,
  so a random upgrade needs its own draw. The engine has no card transform; the elite reward's `replaceCard` swap is the seam.
- YIELDING lives in `Combat/combat.mercy.ts`; card M-02b grants it (`Cards/library/merciful.cards.ts:180-183`).
- The Open Hand is the Chosen's only signature (`plan/114-sk1-signature-skills.md`), and `EQUIPMENT_DROP_TUNING.befriendedElite`
  pays a befriended elite a lane piece every time (EQ3).

## Design

**The check.** When a foe of `difficulty: 'normal'` falls to 0 VITAE, the combat rng rolls `MERCY_CHECK_CHANCE`. On a hit,
the fight's end asks spare or finish and shows no reward. On a miss, the fight pays as Finish. VITAE stays the one way to
win: this is a choice about what the win pays, not a second ending. The existing mercy modal carries the prompt; its copy
follows `DELIVERY_REGISTER.md` and adds no story canon.

| Ending | XP | Shillings | Rewards |
|---|---|---|---|
| Finish, or a fight with no check | yes | 3 x foe level | the card reward |
| Spare | none | 1.5 x that | one table roll, no card reward |

Every fight pays the wage, elites and bosses included, on the lead foe's level. Foe loot tables stop paying, for every
fight. The elite reward and its relic and equipment rolls stay.

**The table** (T's weights, of 100; all in one tuning table):

| Result | Weight |
|---|---|
| Extra shillings | 30 |
| Minor consumable | 30 |
| Card upgrade: one random owned card that can take one | 15 |
| Card transform: one random owned card becomes any library card | 10 |
| Weapon or armor not carried | 10 |
| Relic not carried, from the whole library | 5 |

### Decisions made upfront (do not ask)

- Befriending is removed: The Open Hand, `Enemy/befriend.ts`'s gate and payout, Exploit, `friendship` and the befriended-elite
  drop (T, 2026-11-03).
- Normal foes only, with one shared chance; elites and bosses are always finished (T, 2026-11-03).
- The player does not see the reward before choosing (T, 2026-11-03).
- Normal shillings are 3 x foe level, and Spare pays 1.5 x (T, 2026-11-03).
- Finish pays XP, normal shillings and the card reward; foe loot stops (T, 2026-11-03).
- The table's results and weights are as above (T, 2026-11-03).
- A transform's result is any card, in any lane, even outside the reward pool, and never one of the 3 grey starters (T, 2026-11-03).
- Table gear is anything not carried, the grey pair excepted (T, 2026-11-03).
- The Suppliant's Ring stays and gets a new signature T authors (T, 2026-11-03).
- YIELDING is cut, and T rewrites M-02b and its upgrades (T, 2026-11-03).
- The MERCY keyword and the Merciful lane stay.

### Out of scope

- T's signature and M-02b's text (the loop builds from what T writes, D88, D99).
- Repricing the shop. The wage adds about 231 shillings to a full clear of the 18 ledger fights (level sum 77, commit
  1264737), a change T accepted; read it in MR1d's comparison.
- Per-foe chances, and the check on elites or bosses.

## Acceptance

- **A1** A normal foe falling offers spare or finish at `MERCY_CHECK_CHANCE`, seeded; elites and bosses never do; the prompt
  shows no reward.
- **A2** Finish, and a fight with no check, pays XP, 3 x the lead foe's level in shillings and the card reward, with no foe
  loot roll, on every difficulty; a test pins each number.
- **A3** Spare pays no XP, no card reward, 1.5x normal shillings and one table roll; over many seeded rolls each result lands
  near its weight, and each result's effect reaches the save.
- **A4** A transform replaces one random owned card with any library card whatever its lane, never a grey starter.
- **A5** Spare counts as a won fight for quests, the defeat ledger and node settling, and grants the foe's story flag and
  journal entry. [T to confirm #7]
- **A6** Sims can choose spare or finish by policy, and one comparison prints spare-all against finish-all XP, level and
  shillings at the end of Act 1. A measurement, not a gate (D57).
- **A7** The Suppliant's Ring carries T's new signature, and M-02b carries T's new text.
- **A8** No Open Hand, befriend gate, Exploit, YIELDING, `friendship` outcome or befriended-elite drop remains in non-test
  engine or app code; a save made before this loads; the MERCY keyword still heals, counts and bursts.
- **A9** `docs/game-model.md`, `spec.md`, `plan/bearings.md` and the package doctrine describe the check, not befriending.

## Open questions

1. How often should the check fire? Default: `MERCY_CHECK_CHANCE` 15%, at most about 2.7 checks per clear, some clears none. [T to confirm #1]
2. How does 1.5x round on an odd amount? Default: up, so a level 5 foe's 15 becomes 23. [T to confirm #2]
3. How much is the extra shillings result? Default: a further 1 x normal, on top of Spare's 1.5 x. [T to confirm #3]
4. Which item is the minor consumable? Default: the minor healing potion, the only minor one that exists. [T to confirm #4]
5. A transform's range? Default: Curses and upgraded copies are not results, and a grey starter can be the card replaced. [T to confirm #5]
6. A result with nothing to give (all gear carried, nothing upgradable)? Default: it pays the extra shillings result. [T to confirm #6]
7. Spare's records? Default: as A5. [T to confirm #7]
8. When does befriending leave? Default: only once T's signature and M-02b text exist; until then the Open Hand and the check
   live side by side, and 114.2 still builds. [T to confirm #8]

## Chunks

Measure: 9 open · 0 closed · next A10

- [ ] **144.1** Every win pays shillings, and foe loot stops · M · closes A2 · needs — · alias: MR1a
- [ ] **144.2** The Spare table and the card transform · M · closes A3, A4 · needs 144.1 · alias: MR1b
- [ ] **144.3** A falling foe may ask spare or finish · L · closes A1, A5 · needs 144.2 · alias: MR1c
- [ ] **144.4** Sims choose, and spare-all meets finish-all · M · closes A6 · needs 144.3 · alias: MR1d
- [ ] **144.5** T writes the ring's signature and M-02b (attended) · S · closes A7 · needs — · alias: MR1e
- [ ] **144.6** Befriending leaves the game · L · closes A8, A9 · needs 144.3, 144.4, 144.5 · alias: MR1f

### 144.1 (MR1a) — Every win pays shillings, and foe loot stops · M · closes A2 · requires —

- `Game/store.ts` `endCombat` and `Game/game.reducer.ts`: a victory pays `MERCY_TUNING.shillingsPerLevel` x the lead foe's
  level and rolls no foe loot. Keep `rollEncounterLoot` only if another caller needs it. Show the shillings on the win's aftermath.
- Find every test and fixture that expects a foe's drop or zero shillings; quests' own rewards do not change.
- Measure: a seeded engine test per difficulty, then `npm run verify -w axiomancer-mechanics` and `-w axiomancer-mobile`.

### 144.2 (MR1b) — The Spare table and the card transform · M · closes A3, A4 · requires 144.1

- A pure, seeded `rollSpareReward(player, rng)` in mechanics beside `Combat/combat.rewards.ts`, with the weights in one table,
  reusing the equipment and relic rolls' carried checks. Add a uniform upgrade draw (not `rollEliteUpgrade`) and `transformCard`.
- Applying a result goes through the reducer, so it reaches the save. Not reachable from play until 144.3.
- Measure: a weight-distribution test over many seeds, a per-result effect test and a grey-starter exclusion test.

### 144.3 (MR1c) — A falling foe may ask spare or finish · L · closes A1, A5 · requires 144.2

- The roll at the fall, for `difficulty: 'normal'` only, from the combat rng. Reuse the mercy modal for the prompt (Spare, Finish).
- Spare ends as a won fight marked spared, paying per Design, granting the story flag and journal entry. The aftermath reveals the
  roll. Add `MERCY_CHECK_CHANCE` to the tuning table.
- Add it to the dev menu so T can force the check on a fight, and add a `combat-round-e2e` journey.
- Measure: a seeded engine test for the chance and for each difficulty, a screen test that no reward text shows before the
  choice, then both verify gates.

### 144.4 (MR1d) — Sims choose, and spare-all meets finish-all · M · closes A6 · requires 144.3

- `combat.sim-policies.ts`: the mercy check choice as a policy field. `run-policy.*` and the personas read it.
- The comparison prints XP, level and shillings at the end of Act 1 for spare-all and finish-all, at a stated seed.
- Measure: the printed comparison in the PR body, with its commit.

### 144.5 (MR1e) — T writes the ring's signature and M-02b (attended) · S · closes A7 · requires —

- T authors the signature's name, cost and effect, and M-02b's text and upgrades. Content, so T's alone (D88, D99).
- Measure: T's text is in this spec, or in a brief this chunk names, and 144.6 can build from it.

### 144.6 (MR1f) — Befriending leaves the game · L · closes A8, A9 · requires 144.3, 144.4, 144.5

- Remove The Open Hand, `Enemy/befriend.ts`, Exploit, YIELDING, the `friendship` outcome, `befriendabilityConfig`,
  `EQUIPMENT_DROP_TUNING.befriendedElite` and the friendship panel, migrating `@mechanics` consumers in the same change
  (a barrel removal, per `plan/bearings.md`). Build T's signature and M-02b. Old saves keep the ring, which reads its new signature.
- Rewrite the Win condition in `plan/bearings.md`, `spec.md`, `docs/game-model.md`, `axiomancer-mechanics/CLAUDE.md` and
  `axiomancer-mobile/VISION.md`.
- Measure: `git grep -i -E "befriend|yielding|open hand" -- axiomancer-mechanics/src axiomancer-mobile/app axiomancer-mobile/components axiomancer-mobile/state`
  finds only migration code, then a pre-change save loads, and both verify gates pass.
