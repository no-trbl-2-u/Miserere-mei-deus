---
date: 2026-11-02
---
## Add plan/135-sm2-sim-follow-ups.md
~~~ section Design
### Tuning with the sim (T, 2026-11-02)

T spent 2026-11-02 running `sim:run` as The Chosen to tune enemies against cards and stats, patching each experiment
in by hand from scratch files. T then picked what to keep ("the no stat elementist relic / the guard logic / no
befriend / And the anvil logic") and accepted three extras ("Do it"). Nothing from that session is in the repo. These
are measurement tools: nothing here grades a number, and no engine constant or game data file moves.

**What the session measured** (boss at level 8, 10 seeds per bot, clears of 50; readings, not bars): baseline 24;
anvil 27; anvil at double shillings 33; guard when hit 23; a two-relic start with the anvil and guard when hit 32, with
the Elementalist at 10 of 10 and the Merciful at 6 of 10. That two-relic run still carried the Brooch's +5 Mind, so the
no-stat start has not been measured with the others. "Ease off when the foe guards" lowered a total from 23 to 18, and
keeping the starting weapon barely moved one (24 to 22): neither is built.

**SM2h, how the bots fight.**

- **No bot spares.** Only the Merciful lane bot still does; `laneFightPolicy('merciful')` drops the mercy signature
  (`KILLER_SIGNATURES`) and takes `mercyChoice: 'exploit'`, keeping its mercy lines first. T is taking sparing out of
  the game in a separate plot, and this change stands either way.
- **Guard when hit.** The Defender's rule (`card.verbClass === 'defend'` or a `guard`/`holdGuard` verb, while
  `foeMeansToHit`, scores `BAND_FIRST`) becomes one shared helper, and the Blood Price, Merciful and Elementalist
  rankings use it. A ranking's `-Infinity` refusals stay refusals. [T to confirm #1] The Wanderer and the personas keep
  `PLAYER_WITNESS` as A6 and A7 state, because the rule cost the Wanderer clears (7 to 4).

**SM2i, the anvil.** `RunVillageDecision` has no anvil today. `RunPolicy` gains `visitAnvil(ctx)`, asked when the
village has one, before the rest and shop steps. Its context carries VITAE, the purse, the bed's price, the prices and
the upgradable cards, and its answer is a budget, a card to upgrade or none, and the colours to hone and temper in
order. The driver carries that out through the app's own `state/blacksmith/store-actions.ts`, the way a player's
session runs, and a refused step ends that colour rather than the run. One shared greedy helper reads everything from
data: it keeps back the bed's price when under half VITAE, upgrades one card first (the bot's own lane's when it has
one) when the budget reaches the upgrade's price, then hones and tempers its lane's stat colour before the others.
Prices come from the blacksmith code, never retyped here. [T to confirm #2] Every bot uses it, the Wanderer and the
personas included, because T's complaint was that none of them did.

**SM2j, run options.** New `sim:run` flags, all carried on `SimRunRequest` and applied only inside
`axiomancer-mobile/sim/`:

- `--shillings <n>`: multiplies the shillings a run gains (a store subscriber set in `onStart`, rounding as the
  session did).
- `--boss-level <n>`: the boss node's foe at that level. The sim's jest setup wraps the pool lookup in
  `World/MapEvents/content.ts`, leaving `BW_DOOR_LEVEL` alone. If that lookup cannot be wrapped from the sim, the chunk
  stops and says so rather than editing the game.
- `--start-relic <id>`, repeatable: wears that relic at the run's start, with the opening relic kept on (`equipItem`).
  It must name a real relic and is refused otherwise.
- `--no-relic-stats`: those start relics add no stat lines. The sim's jest setup wraps `relicStatLines` for those ids;
  the library entry is never edited. `--start-relic relic-elementalist-brooch --no-relic-stats` is T's no-stat start.
- `--fight <policy>`: the mix-and-match. Choices come from `--policy` and fights from this one, shown as
  `merciful+defender` in the output.
- `--no-anvil` and `--no-guard`: turn off SM2i and SM2h's guard rule for one batch, so a comparison needs no code edit.
- `--policy` also takes a comma list, or `lanes` for the four lane bots and the Wanderer.

All default to off, so a plain `sim:run` and the nightly personas measure the game as it is. `--post` is refused with
any of them, so a tuning batch never reaches the nightly data.

**SM2k, the report columns.** `RunResult` gains `bossDamagePct`: the share of the boss's VITAE gone at the end of the
run's last fight with it, null if the run never met it. The run line prints it and `endNodeId`, beside the level and
deck by lane it already prints. A batch ends with one table, one row per policy: clears, average level, average boss
damage, average deck by lane, and where failed runs ended, most first. `--json` carries the same. It is a reading, and
no exit code depends on it.
~~~
~~~ acceptance
- **A?simfight** No lane bot spares: `laneFightPolicy('merciful')` has `mercyChoice: 'exploit'` and no mercy signature,
  and a Merciful batch through the driver spares no foe. Its rule test and `run-archetypes.test.ts` say so.
- **A?simguard** One shared helper holds the guard-when-hit rule; the Defender, Blood Price, Merciful and Elementalist
  rankings use it, seam tests over a hitting and a non-hitting foe cover each, and a card ranked `-Infinity` stays
  `-Infinity`. `PLAYER_WITNESS` and `combat.sim-policies.ts` are unchanged.
- **A?simanvil** `RunPolicy` has a `visitAnvil` seam, the driver carries its answer out through the blacksmith store
  actions before the village's other steps, an illegal answer throws as other seams do, and the no-id guard covers the
  helper. A driver test shows a bot with shillings at an anvil spends them there and owns the result; another shows it
  keeps back the bed's price when under half VITAE.
- **A?simoptions** `sim:run` takes `--shillings`, `--boss-level`, `--start-relic`, `--no-relic-stats`, `--fight`,
  `--no-anvil`, `--no-guard` and a list for `--policy`. Tests show each changes the run as named, and that with
  `--no-relic-stats` the worn relic adds no stat while `relicLibrary`'s entry and the library's own tests are unchanged.
  No file outside `axiomancer-mobile/sim/`, `scripts/sim-run.mjs` and its test changes for this chunk. `--post` with any
  of these flags exits non-zero before a run is played; an unknown relic or policy is refused.
- **A?simreport** A run's line and `--json` carry `bossDamagePct` and `endNodeId`, and a batch ends with one row per
  policy: clears, average level, average boss damage, average deck by lane and where failed runs ended. Tests cover a
  run that never met the boss (null, left out of the average). No exit code depends on these numbers.
~~~
~~~ questions
- [T to confirm #1] Which bots use guard when hit? Default: Blood Price, Merciful and Elementalist, joining the Defender;
  the Wanderer and personas stay as they are, since the rule cost the Wanderer clears. Or: every sim fighter, as first
  asked on 2026-11-02.
- [T to confirm #2] Which bots use the anvil? Default: every bot, the personas and Wanderer included, which also changes
  what the nightly report measures. Or: only when a batch asks for it.
~~~
~~~ chunks
- [ ] **135.?simfight** The lane bots never spare, and guard when hit · S · closes A?simfight, A?simguard · needs — · alias: SM2h
- [ ] **135.?simanvil** The bots use the anvil · M · closes A?simanvil · needs 135.3 · alias: SM2i
- [ ] **135.?simoptions** Tuning flags on the sim: shillings, boss level, start relics, mix-and-match · M · closes A?simoptions · needs 135.?simfight, 135.?simanvil · alias: SM2j
- [ ] **135.?simreport** Boss damage, where runs ended and a batch table in the sim's output · S · closes A?simreport · needs 135.?simoptions · alias: SM2k
~~~
