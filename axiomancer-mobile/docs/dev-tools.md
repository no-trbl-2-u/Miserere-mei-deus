# Dev tools — the `/dev` route

> Reference for the developer surface rebuilt in the 2026-09 dev-tools
> audit. Reached from the SELF tab's **DEV TOOLS** link
> (`self-dev-tools-link`) in dev builds; production renders an inert
> placeholder. Gate: `isDevToolsEnabled()` in `lib/buildProfile.ts`
> (browser harnesses opt in with `globalThis.__AXM_FORCE_DEV_TOOLS__`).

## Boot from a state fixture (2026-09-07)

A dev build (or a `BUILD_PROFILE=preview` export, or any export with
`globalThis.__AXM_FORCE_DEV_TOOLS__ = true`) can boot straight into a
known game state instead of the persisted save:

| Channel | Example | Notes |
|---|---|---|
| URL deep link (web) | `/exploration?fixture=sage-bw-door-gate` | Hand-typable; any route works, the fixture applies before the store mounts |
| Init-script global | `globalThis.__AXM_FIXTURE__ = 'wanderer-staged-village'` or an inline fixture object | `scripts/fixture-injector.mjs` → `injectStateFixture(context, …)` |

Ids come from the engine registry (`STATE_FIXTURES`;
`npm run game -w axiomancer-mechanics -- --fixture list`). The run is
**ephemeral** — the AsyncStorage save slot is never read into the store
nor written — and a fixture with `arrive: true` fires the current node's
event once navigation is ready (`components/FixtureBoot.tsx`), so
`/dialogue`, `/village`, `/cutscene`, `/event` open cold.
The title menu is skipped on a fixture boot. Production ignores both
channels (`persistence/fixture-boot-ignored`); an unknown id or invalid
document falls back to a normal boot (`persistence/fixture-boot-failed`
carries the field-path problems). Code: `state/fixtures.ts`,
`state/persistence/fixtureBootAdapter.ts`; proof: `npm run e2e:fixture`.
In Jest, `test-utils/fixtureStore.ts` boots the same documents.
Guide: `docs/state-fixtures.md` at the monorepo root.

## Skip the current event (2026-09-26)

A playtest escape hatch for AI drivers stuck on a node they cannot finish.
`skipCurrentEvent(store, actions)` (`state/dev/skip-event.ts`) resolves
whatever the player is in with a plausible outcome and leaves the state
consistent — node consumed, rewards applied, session cleared, checkpoint
taken — by driving the same store actions the screens use:

| In | Resolves as |
|---|---|
| live fight, or a pending combat prelude | VICTORY through the engine's real `endCombat` (XP, loot, quest objectives, level-ups). The engine combat sim (`runOneEncounter`, greedy witness) plays it first; its outcome rides the log and its HP toll (capped at half max VITAE, never fatal) is taken. No card draft. |
| hazard | median crossing: `complete` tier, ceil(rounds/2) cleared, engine outcome path, first offered card claimed |
| rest | the free REST offer, claimed |
| loot-cache | the ITEM offer, claimed |
| blacksmith | leave unchanged, claimed |
| interaction / narration / village / cutscene / gathering | dismissed (the screen pops itself) |
| queued item reward | every item confirmed |
| nothing active, arrival owed on the node under the player | the node's event fires, then resolves as above; a travel door reports the crossing |

Two ways in, both dev-tools-gated (production: logged no-op, nothing
loaded — the module and the sim it imports are only reached by lazy
imports behind `isDevToolsEnabled()`):

| Channel | Where | Returns |
|---|---|---|
| `/dev` → ENCOUNTERS → SKIP EVENT (`debug-skip-event-button`) | `components/DebugSkipEvent.tsx` | feedback line, then jumps to WILDS |
| `globalThis.__AXM_SKIP_EVENT__()` | installed by `components/DevSkipBridge.tsx` (mounted lazily from `app/_layout.tsx`) | `{ kind, nodeId, outcome, detail? }` — `kind` is the map-event kind (`encounter`, `hazard`, …, `item-reward`, or `none`), `outcome` a short token (`victory`, `complete:2/3`, `rest:healed=9`, `dismissed`, `nothing-to-skip`, `ignored:dev-tools-disabled`) |

Every call writes `action/dev-skip-event` to the AXM log
(`__AXM_LOG__.entries({ kind: 'dev-skip-event' })`), so captured logs show
each skip. The in-place combat overlay tears down via `_devSkipSeq` on the
store (watched by the exploration screen). Not covered: a fight hosted by
`/labyrinth`, and the `/combat-encounter` sandbox (its state is panel-local
and persists nothing). Tests: `state/dev/__tests__/skip-event.test.ts`.

## Post puzzle attempts to the solve-time API (2026-10-21)

Each `/devpuzzle` attempt that ends (a CONFIRM or the clock running out) is
posted once to the `miserere-api` Worker (`backend/`) as
`POST /v1/puzzle-attempts`, in the shared `PuzzleAttemptPost` shape from
`@mechanics` (phase BE1c). A candidate carries its `intendedBand`; a demo
carries null. The poster is `lib/puzzleAttempts.ts`, called from
`components/hazard/puzzle/usePostEndedPuzzleAttempts.ts`, which remembers
each attempt by layout and clock start, so renaming the SOLVER after a solve
never posts it twice.

It posts only when **all three** hold, and otherwise makes no network call:

| Needs | Where it comes from |
|---|---|
| dev tools on | `isDevToolsEnabled()`: a preview build, or a local dev session |
| `EXPO_PUBLIC_PUZZLE_API_URL` | the Worker's origin, no path (a trailing slash is dropped) |
| `EXPO_PUBLIC_PUZZLE_API_TOKEN` | the shared dev bearer token, the Worker's `PUZZLE_API_TOKEN` |

A failed post (network, or any non-2xx) is dropped with one
`[puzzleAttempts] attempt not posted` console warning: no retry, no queue,
nothing on screen. The COPY LOG export is unchanged.

For a local session, export both values before `npm start`. For a preview
APK, `.github/workflows/preview-build.yml` reads the repo secrets of the same
names and writes them into the build profile's `env` in its checkout's
`eas.json` (an EAS cloud build does not see the runner's env); it skips this
for `production`, and with either secret unset the build simply never posts.
The token ships inside the preview APK, which the brief accepts for dev-only
puzzle times; rotating it means a new secret and a rebuild. Tests:
`lib/__tests__/puzzleAttempts.test.ts`,
`components/hazard/puzzle/__tests__/HazardPuzzlePost.test.tsx`.

**The live Worker (phase BE1b).** `miserere-api` is deployed at
**https://miserere-api.no-trbl-2-u.workers.dev**, backed by the D1 database
`miserere` on T's Cloudflare account (its id is in `backend/wrangler.toml`).
`.github/workflows/backend-deploy.yml` applies the D1 migrations, deploys the
Worker and sets its `PUZZLE_API_TOKEN` secret on every push to `main` touching
`backend/**`, or from the Actions tab (`workflow_dispatch`). The repo secrets
`EXPO_PUBLIC_PUZZLE_API_URL` and `EXPO_PUBLIC_PUZZLE_API_TOKEN` hold that URL
and the same token. To read the stored attempts by hand:

```bash
curl -H "Authorization: Bearer $PUZZLE_API_TOKEN"   "https://miserere-api.no-trbl-2-u.workers.dev/v1/puzzle-attempts?layout=<id>"
```

## Layout

| File | Role |
|---|---|
| `app/dev/index.tsx` | Route shell: header + back + `<DevToolsSections>` |
| `components/dev/DevToolsSections.tsx` | Section grouping; every leaf is `React.lazy` so prod bundles never import `Debug*` |
| `components/dev/DevControls.tsx` | Shared primitives: `DevRow`, `DevButton`, `DevChip(s)`, `DevButtons`, `DevKv` |
| `components/Debug*.tsx` | One leaf per control group (behaviour only; styling comes from the primitives) |
| `state/dev/*.ts` | Pure, React-free helpers the leaves call (each with a hermetic test) |

Sections read top-down in the order a tester thinks: **see state → shape
the player → shape the deck → stand somewhere → fight / play a minigame →
collect rewards → drive the story → tweak the UI → manage the run and
read the log.** Section container ids are `dev-section-<key>`; each
section starts closed and its header (`dev-section-<key>-toggle`) opens it.
Open state is route-local: leaving `/dev` closes every section, so each
visit starts on the nine headers alone (changed 2026-10-16 — the open set
used to outlive the route for the life of the app, which left every header
open after one session of poking).

## Sections and controls

### STATE — `dev-section-state`

| Leaf | Helper | What it does |
|---|---|---|
| `DebugStateInspector` | `state/dev/inspector.ts` → `selectInspectorSections` | Live read-only key/value view. Groups: RUN (run id, save version, rng, open session), PLAYER (level/xp/points, vitae, stats, shillings, souls, effects), DECK & GEAR (known/reward cards, removals, hazard deck, dice, die gear, worn relics, inventory), WORLD (continent/map/node, node counts, maps done/open/locked, exploited/spared), STORY (quests, journal, flags), THE APORIA (act, acts done, completed, pocket, gates, debt, waystones, boss outcomes). Tap a chip to expand a group. |

### PLAYER — `dev-section-player`

| Leaf | What it does | Test ids |
|---|---|---|
| `DebugXpGrant` | +100 XP, +1000 XP, or force a LEVELUP through the engine dispatch (`state/dev/rewards.ts`) | `debug-xp-grant-button`, `debug-xp-grant-large-button`, `debug-xp-levelup-button` |
| `DebugEffectApply` | One chip per buff/debuff in `effectsLibrary` (engine `applyEffect`); CLEAR | `debug-effect-<id>`, `debug-effect-clear` |

The wallet moved out of this section to RUN & DIAGNOSTICS on 2026-10-16:
granting shillings is a harness chore like SAVE or RESET, not a way of
shaping who the player is.

### DECKS & ITEMS — `dev-section-decks`

| Leaf | What it does | Test ids |
|---|---|---|
| `DebugItemPicker` | One chip per relic (red) and consumable → `actions.addItemById` | `debug-item-<id>` |

### WORLD — `dev-section-world`

| Leaf | Helper | What it does | Test ids |
|---|---|---|---|
| `DebugWorldTravel` | `state/dev/world-travel.ts` | **Map chips** travel to any map on any continent (start node). **Node chips** jump to a node on the current map and fire its authored event through the live `resolveCurrentMapEvent` (travel doors in red). **RESET MAP** re-seeds the map; **COMPLETE MAP** stamps it done and unlocks the next. **THE APORIA** act buttons enter act I / II / III and open `/labyrinth`. | `debug-travel-map-<map>`, `debug-travel-node-<id>`, `debug-map-reset-button`, `debug-map-complete-button`, `debug-aporia-act{1,2,3}` |

### ENCOUNTERS — `dev-section-encounters`

| Leaf | What it does | Test ids |
|---|---|---|
| `DebugTriggerEncounter` | Quick triggers on the WILDS tab: COMBAT (gentlest foe), BOSS, HAZARD, REST, GATHER, TREASURE, VILLAGE, CUTSCENE | `debug-trigger-encounter-<kind>` |
| `DebugEnemyPicker` | Any foe from any roster (`EnemiesByMap`), bosses in red; stages a real combat prelude so rewards pay out (`state/dev/enemy-picker.ts`) | `debug-enemy-map-<map>`, `debug-enemy-<enemyId>` |
| `DebugSkipEvent` | SKIP EVENT — resolve whatever the player is in (or the arrival owed on the node under them) with a plausible outcome and jump to WILDS; see "Skip the current event" below (`state/dev/skip-event.ts`) | `debug-skip-event-button` |

### MINIGAMES & REWARDS — `dev-section-rewards`

| Leaf | What it does | Test ids |
|---|---|---|
| `DebugHazardButton` | Start a hazard (BRAVE IT) | `debug-hazard-button` |
| `DebugHazardPuzzlesButton` | Open the HAZARD PUZZLES board (`/devpuzzle`): three fixed demo puzzles (`HAZARD_PUZZLE_LIBRARY`) played on the live hazard surface. Below the demos the list shows the labelled candidate puzzles (`HAZARD_PUZZLE_CANDIDATES`, phase HP4b: each with a `label`, an `intendedBand` and one nominated `route`, checked by `auditHazardPuzzleCandidate` and never by the library's band gate) in three groups, EASY, MEDIUM and HARD by `intendedBand`, each headed with its count and each row headed by the candidate's label (phase HP4d); a band with no candidate shows "None authored yet.". Picking a candidate skips the route select and starts the live board on its nominated route, on its intended band's clock (`?id=<candidate id>` deep-links the same). The board is the live route select, the live hazard board with its drag controls (shared with `/hazard`, less the bin: a puzzle has no discard) under the puzzle's clock, and the outcome. The board rolls in like a live hazard: the live dice roll lands on the layout's own faces and the clock starts after it, and a DRAW's cards enter the hand with the live hand animation in reserve order, a reroll replays the cast tumble in the tray on each die it turns (landing on the layout's next set face), and a gained die arrives conjured like a live salvage die; nothing is random (`?id=<demo>&route=safe\|risk` deep-links a demo; `&confirm=1` confirms at once, `&paused=1` holds the clock). The list screen also carries the dev-only MOVE LOG (phase HP2c): a SOLVER field typed once for the session, one line per attempt with its moves and solve time, COPY LOG (the log as JSON, through the `copyText` seam (`lib/clipboard.ts`) — the web Clipboard API, or the native share sheet; when neither takes it the JSON is printed selectable) and CLEAR. An attempt's clock starts when the opening roll settles, which is when the puzzle clock starts, and ends on the CONFIRM or the expiry with the result, so `end.ms` is the solve time the clock-tuning and calibration phases read. Each ended attempt is also posted to the solve-time API when the build carries its URL and token (see "Post puzzle attempts to the solve-time API" above). Production builds record nothing, post nothing and render no panel | `debug-hazard-puzzles-button`, `hazard-puzzle-candidates`, `hazard-puzzle-candidate-group-<band>`, `hazard-puzzle-candidate-<id>`, `hazard-puzzle-log`, `hazard-puzzle-log-solver`, `hazard-puzzle-log-copy`, `hazard-puzzle-log-clear` |
| `DebugRestButton` | Start the night watch at a camp or an inn | `debug-rest-button`, `debug-rest-inn-button` |
| `DebugRewardTriggers` | RELIQUARY MODEST / RICH (loot-cache tiers), ANVIL ×500 (fixed budget), UNLOCK JOURNAL (every foe codex entry), and one chip per authored hazard id (`state/dev/rewards.ts`) | `debug-cache-button`, `debug-cache-rich-button`, `debug-anvil-budget-button`, `debug-journal-unlock-button`, `debug-hazard-id-<id>` |

### STORY — `dev-section-story`

| Leaf | Helper | What it does | Test ids |
|---|---|---|---|
| `DebugDialogueJump` | `state/dev/story-catalog.ts` → `listNpcs` | One chip per staged NPC with a tree (all maps); opens `/dialogue` with the real tree | `debug-dialogue-<map>-<npc-slug>` |

### UI — `dev-section-ui`

| Leaf | What it does | Test ids |
|---|---|---|

### RUN & DIAGNOSTICS — `dev-section-run`

| Leaf | What it does | Test ids |
|---|---|---|
| `DebugCurrencyControl` | +50S, +500S, BROKE (wallet to zero). Lived under PLAYER until 2026-10-16 | `debug-currency-{small-grant,large-grant,broke}` |
| `DebugRunControls` | SAVE, RESET RUN (keep character), NEW RUN; gallery links to `/devart`, `/devart/rooms`, `/devaftermath?panel=defeat|parley` | `debug-run-{save,reset,new}`, `debug-gallery-{enemy-art,rooms,defeat,parley}` |
| `DebugLogViewer` | AXM Log ring buffer with level / domain filters and the previous-session tail | `debug-log-viewer`, … |

## Retired in the 2026-09 audit

| Removed | Why |
|---|---|
| `DebugLootRarityButtons`, `state/dev/loot-rarity.ts`, `loot*Item` actions, `scripts/loot-rarity-e2e.mjs` | The rarity model was retired in Phase 21; all four buttons granted the same relic. |
| `DebugEncounterButtons` | Duplicated the rest + cache launchers and collided on `debug-rest-button`. |
| `DebugPlaythroughPresets` (FRESH / ENDGAME) | Raw `setState` with a hand-rolled card list; superseded by the L1–L50 ladder. |
| `DebugSeedButton` | Composite of POPULATE + RESET MAP; the `debugSeed` action is dev-only and on demand — nothing auto-seeds at launch since 2026-09-23 (a new game starts empty in every build). |
| `DebugAporiaButton`, `DebugMapResetButton` | Folded into `DebugWorldTravel`. |
| `DebugCombatEncounterButton`, `DebugCombatTutorialButton`, `DebugCombatSandbox` | The pre-v1 `/combat-encounter` sandbox (mock foe, demo deck, nothing persisted); deleted in phase CR1a when the route became the live fight. A fight is entered through the quick triggers or the enemy picker. |
| `DebugAddItemById` | Free-text input replaced by `DebugItemPicker` chips. |
| `DebugPopulateAllItems` | POPULATE overlapped `DebugItemPicker` (any one item) + `DebugGetAllRelics` (every relic); the only unique reach was "every consumable at once". |
| `DebugQuestState` | No `MapDefinition` authors a quest, so `listQuests()` was empty and the leaf rendered nothing. Restore it with the quest content, not before. |
| `DebugPresetPicker`, `DebugPlayerTierPresets` | Owner call 2026-10-16. Both built players off the real stat curve (CRITIQUE.md: sage carries 75 stat points where a L15 pilgrim reaches 29; `kid-l50` 126 vs 64). The preset *data* stays — `STATE_FIXTURES` and `state/actions.ts` build from it — so a fixture boot (`?fixture=sage-bw-door-gate`) reaches the same player without a button. `e2e:combat-round:boss` / `:levelup` were repointed at fixtures first. |
| `DebugHazardDeckRandomize` | Owner call 2026-10-16. `HAZARD_DECK_PRESETS` and `actions.randomizeHazardDeck()` stay; only the dev-menu leaf is gone. |
| KNOW ALL CARDS (in `DebugRewardTriggers`) | Owner call 2026-10-16. `learnAllCards` (`state/dev/rewards.ts`) stays and is now unreferenced by any surface. |
| `DebugBlacksmithButton` | Owner call 2026-10-16. ANVIL ×500 in `DebugRewardTriggers` strictly dominated it: `BLACKSMITH_WITNESS_VARIANTS` *is* `[HEART_RICH_PAYLOAD_VARIANT]`, the single variant this button offered, and ANVIL adds a 500-shilling budget. The only reach lost is the Anvil on the player's real wallet, which the `wanderer-bw-blacksmith` fixture gives (180 shillings). It carried no test and no harness drove it. |
| `DebugGetAllRelics` | Owner call 2026-10-16. `DebugItemPicker` chips every id in `relicLibrary` — the same library `grantAllRelics` walks — so the only unique reach was every relic in one tap. The action stays on the store surface; its behaviour (once each, nothing displaced, a free trinket position worn for real) moved from the deleted component test to `state/e2e/dev-presets.engine.test.ts`. |
| HIDE MANA / HIDE STANCE toggles | The HUD presenter never read them. |
| `DebugHudOverrides`, the `devOverrides` store slice, `state/presenters/combat-hud.engine.ts` | HIDE EFFECTS fed a presenter no screen rendered, so the toggle was a no-op (TRIM THE FAT T3, 2026-09-25). |
| `DebugCombatDeck`, `applyCombatDeckPreset` / `randomizeCombatDeck` actions | Superseded by the Deck tab (TRIM THE FAT T3, 2026-09-25). |
| Synthetic OMEN / FRIEND / NARRATION trees, two synthetic quests | Replaced by the real NPC and quest catalogues. |

## CI coupling

`scripts/ci-e2e-scope.mjs` (monorepo root) maps `Debug*` files to the Playwright journey
they can launch (`DebugEnemy|DebugQuest|DebugRest|DebugReward|
DebugTriggerEncounter|DebugWorld` → encounters; `DebugHazard*` → hazard;
`CombatGate` → combat). Browser scripts depend on these ids staying
stable: `self-dev-tools-link`, `debug-trigger-encounter-*`
(`scripts/live-fight-entry.mjs` enters every scripted fight through it),
`debug-hazard-button`, `debug-currency-large-grant`, `debug-rest-button`,
`debug-cache-button`, `debug-xp-grant-button`.

`debug-currency-*` answers to `dev-section-run`, not `dev-section-player`,
since 2026-10-16: a harness reaching it through `openDevSection`
(`scripts/dev-section.mjs`) passes `run` as the section key.

The preset ids (`debug-preset-*`, `debug-player-tier-*`) are gone with
their leaves (2026-10-16). A harness that needs a built-out player boots
a committed state fixture instead — `combat-round-e2e.mjs` maps its
`PRESET` env values to fixture ids in `PRESET_FIXTURES`.
