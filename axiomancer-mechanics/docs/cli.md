# CLI

The command-line drivers in `src/CLI/`. They run from source through
`ts-node` and only parse flags, prompt, call engine functions and print; the
logic is in the engine modules. Rules of play are in
[`../../docs/game-model.md`](../../docs/game-model.md).

| Script | Entry | What it runs |
| --- | --- | --- |
| `npm run game` | `game.cli.ts` | The tabbed game loop. |
| `npm run combat` | `game.cli.ts combat` → `combat.cli.ts` | One fight. |
| `npm run hazard` | `game.cli.ts hazard` → `hazard.cli.ts` | The hazard minigame. |
| `npm run labyrinth` | `game.cli.ts labyrinth` → `labyrinth.cli.ts` | The Aporia. |
| `npm run combat-sim` | `combat-sim.cli.ts` | Bot win rates against a small roster. |
| `npm run act1-progression` | `act1-progression.cli.ts` | The Act 1 XP ledger and door win table. |
| `npm run combat-playtest` | `combat-playtest.cli.ts` | The stage x policy x deck matrix. |

`combat`, `hazard` and `labyrinth` are subcommands of the game CLI, so
`npm run combat -- <flags>` and `npm run game -- combat <flags>` are the same
command. Pass flags after `--`.

## Shared I/O

`io.ts` gives the interactive CLIs three input modes and two output modes:

| Flag | Effect |
| --- | --- |
| (none) | Prompts at the terminal (inquirer). |
| `--script <path>` | Answers come from a JSON array of answer objects. The run fails when the array runs out. |
| `--stdin` | Answers come line by line from stdin (JSONL), for an external agent. |
| `--json-events` | Prints events as one JSON object per line instead of human text. |
| `--state-log <path>` | Appends a JSONL record of each state change to `path`. |
| `--log-level <trace\|debug\|info\|warn\|error>` | Turns on the structured logger (`src/Log/`) at that level. |
| `--log-file <path>` | Appends logger entries to `path` as JSONL (level defaults to `info`). |

`game`, `combat`, `hazard` and `labyrinth` take the first five. `game` and
`combat` also take the two logger flags.

## game

```bash
npm run game -- [flags]
```

Tabs: Map, Journal, Cards, Codex, Inventory, Character, DEV, Begin again,
Save, Load, Quit. The DEV tab calls the helpers in `dev-tools.ts`
(`devSetLevel`, `devSetStats`, `devLearnCards`, `devGrantAllEquipment`,
`devGrantAllConsumables`, `devSpawnEnemy`, `devMaxOut` and others).

| Flag | Effect |
| --- | --- |
| `--save-file <path>` | The Save and Load tabs read and write this JSON file. Without it they have nowhere to save. |
| `--fixture <id\|path.json\|list>` | Boot from a state fixture instead of a new character. `list` prints the registry and exits. See [`../../docs/state-fixtures.md`](../../docs/state-fixtures.md). |
| `--start-map <map>` | Start a new game on another campaign map (any of `STARTABLE_MAPS`: `breakwater`, `charcoal-wood`, `beacon-crags`, `lantern-deep`). Ignored with `--fixture`. |
| `--route <node,node,...>` | Walk these nodes in order without prompts, then exit. |
| `--resolve-start` | With `--route`, resolve the start node's event before walking. |
| `--route-audit <map>` | Print every node of a map with its event kind, without walking. |
| `--auto-combat` | A bot plays the fights the map starts. Fights already auto-play under `--route`, `--script` or `--stdin`. |
| `--combat-policy <policy>` | Bot policy for auto-played map fights (see `combat --policy`). |
| `--combat-max-turns <n>` | Phase cap for auto-played fights (default 20). |
| `--combat-seed <n>` | Seed for map fights. |
| `--combat-enemy <slug>` with `--combat-enemy-node <id>` | Replace the enemy at one node (used by tests). |

```bash
npm run game -- --fixture list
npm run game -- --route-audit breakwater
npm run game -- --stdin --json-events --state-log /tmp/game.jsonl
```

## combat

```bash
npm run combat -- [flags]
```

Builds a player and an enemy and runs `initializeCombatEncounter`, then the
turn loop from `combat.engine.ts` ([`combat.md`](./combat.md)). Interactive
by default; `--auto` lets a bot play.

| Flag | Effect |
| --- | --- |
| `--enemy <slug>` | An `ENEMY_REGISTRY` slug: `float-eye` (default), `green-jelly`, `death-beholder`. |
| `--preset <id>` | Character preset from `src/Character/presets.ts`: `apprentice` (default), `wanderer`, `sage`, `kid-l1`, `kid-l15`. |
| `--stage <early\|mid\|late>` | Use that playtest stage's player (unless `--preset` is given) and an enemy from its roster (unless `--enemy` is given). |
| `--deck <grey\|cards:a,b,c>` | The deck: the grey deck, or these card ids. Without it the deck is built from the player's known cards. |
| `--seed <n>` | Seeds the RNG; the same seed replays the same fight. |
| `--auto` | A bot plays; no prompts. |
| `--policy <naive\|safe\|aggressive\|status>` | The bot's card ranking (default `status`). |
| `--max-turns <n>` | Stop an auto run after this many phases (default 8). |

In a `--script` file, a card answer is `top:<uid>` or `bot:<uid>`; a card
with a chosen X takes `bot:<uid>:<X>`.

Events on stdout: `hazardCombat:start`, `hazardCombat:card`,
`hazardCombat:turnEnd`, `hazardCombat:resolvedPhase`, `hazardCombat:mercy`,
`hazardCombat:end`. The end event's outcome is a `CombatOutcome`
(`src/Combat/combat.encounter.types.ts`).

```bash
npm run combat -- --auto --policy status --enemy float-eye --seed 42 \
  --max-turns 12 --json-events --state-log /tmp/combat.jsonl

npm run combat -- --enemy green-jelly --preset wanderer
npm run combat -- --auto --stage mid --deck grey --seed 7
```

## hazard

```bash
npm run hazard -- [flags]
```

Plays hazards back to back through the session functions in
`src/World/Hazard/` (`createHazardSession`, `selectHazardRoute`,
`resolveHazardRound` and the rest). Each run starts a new hazard session; a
player ledger carries across runs until the process exits. An illegal action
is warned about and skipped, and logged as `illegalHazardAction` with a
state snapshot.

| Flag | Effect |
| --- | --- |
| `--hazard <id>` | Pick a hazard card (e.g. `cracked-cliff`). Prompts from `HAZARD_LIBRARY` when omitted. |
| `--route <top\|bottom>` | The safe or the risk route. Prompts when omitted. |
| `--auto` | A greedy heuristic plays each round. |
| `--seed <n\|str>` | Seeds the session. |
| `--runs <n>` | Hazards to play (default 5). |
| `--deck <id,id,...>` | Hazard card ids added to the starter bag. Ids are checked against `HAZARD_DECK`. |
| `--bag-file <path>` | A JSON array of hazard card ids that replaces the whole bag. |

Events: `hazard:complete` per run and `hazard:summary` at the end.

```bash
npm run hazard -- --auto --seed 42 --runs 1 --hazard cracked-cliff --route top \
  --json-events --state-log /tmp/hazard.jsonl

npm run hazard -- --auto --runs 3 --hazard flooded-undercroft --route bottom
```

## labyrinth

```bash
npm run labyrinth -- [flags]
```

Walks the Aporia room by room: doors, points of interest, gates, hints, the
Study and the act bosses, through `src/World/Labyrinth/labyrinth.engine.ts`.
Fights auto-resolve through `runHazardCombatCliEncounter` from
`combat.cli.ts`.

| Flag | Effect |
| --- | --- |
| `--act <act1\|act2\|act3>` | Starting act (default `act1`). |
| `--level <n>` | Player level (default 14). |
| `--preset <id>` | Character preset for fights (default `kid-l15`). |

It also takes the shared I/O flags.

## combat-sim

```bash
npm run combat-sim -- [--key=value ...]
```

Runs `simulateHazardPatternCombat` against each enemy in its roster and
prints win rate, outcome counts, average rounds and diagnostic columns. Values must use the `--key=value` form.

| Flag | Effect |
| --- | --- |
| `--enemy=<Name>` | Run against one enemy only (e.g. `GreenJelly`, `DeathBeholder`). Omit to run the full roster. |
| `--loadout=<id,id,...>` | Card ids for the player's deck. The default is the three grey cards, `grey-strike,grey-ward,grey-word`. |
| `--runs=<n>` | Runs per enemy (default 200). |
| `--seed=<n>` | Base seed (default 1). |
| `--blind` | Use the `blind` sim policy instead of `greedy`. |

The roster is the `ENEMIES` export of `combat-sim.cli.ts`: `FloatEye`,
`GreenJelly`, `DeathBeholder`.

```bash
npm run combat-sim -- --loadout=grey-strike,grey-ward,grey-word --runs=100
npm run combat-sim -- --enemy=FloatEye --loadout=grey-strike,grey-ward --seed=3
```

## act1-progression

```bash
npm run act1-progression -- [--runs=<n>] [--seed=<n>]
```

Prints every Act 1 fight with its level and XP (`act1FightLedger`,
`act1FightXp` in `src/Game/act1-progression.ts`), the level a full clear and
a door-only route reach at each door (`walkAct1`), and the sim's win rate at
each door for three stat spreads. `--runs` defaults to 200, `--seed` to 1.

## combat-playtest

```bash
npm run combat-playtest -- [--key=value ...]
```

Sweeps `runPlaytestMatrix` (`src/Combat/combat.playtest.ts`) over stages,
sim policies and decks and prints the report. Values use `--key=value`.

| Flag | Effect |
| --- | --- |
| `--stage=<early\|mid\|late\|all>` | Stages to sweep (default `all`). |
| `--policy=<id\|all>` | A policy from `COMBAT_SIM_POLICY_ORDER` (`greedy`, `blind`, `dot-weaver`, `control-lock`, `aggro-brute`, `turtle`, `chaos`, `mercy-seeker`), or `all`. Default `greedy`. |
| `--deck=<grey\|cards:a,b,c>` | Deck selection (default `grey`). |
| `--enemy=<slug>` | Only fights against this `ENEMY_REGISTRY` slug; stages that do not field it are dropped. |
| `--runs=<n>` | Runs per cell (default 60). |
| `--seed=<n>` | Base seed (default 1). |
| `--cards` | Append the per-card usage table. |
| `--json` | Print only the `PlaytestReport` as JSON. |
| `--log-level=<level>`, `--log-file=<path>` | Turn on the structured logger for the sweep. |

```bash
npm run combat-playtest -- --stage=early --policy=all
npm run combat-playtest -- --deck=cards:grey-strike,grey-ward --runs=100 --seed=7
npm run combat-playtest -- --json
```

## Tests

`src/CLI/e2e/` drives these CLIs in tests. `cli.docs-examples.engine.test.ts`
reads this file and fails if an `--enemy` or `--hazard` example names an
enemy or hazard that does not exist.
