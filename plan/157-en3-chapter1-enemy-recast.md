# 157 — Chapter 1's enemy roster recast: six new faces onto six cut foes' nodes, four more benched, the wandering pool on the survivors

> T cut ten of Chapter 1's seventeen foes and settled six new portraits onto six of the ten slots (T, 2026-11-06).
>
> - Each new portrait becomes a **new library entry** that takes over the cut foe's node(s), reusing that foe's level, VITAE and moves, so nothing is designed or re-tuned here.
> - **The cut creatures are never deleted.** T: "Don't delete them, they're just not in chapter 1." Their entries, art and 24-cell frame sets all stay in the library, placed nowhere in Chapter 1.
> - The four cut with no replacement face have their nodes refilled with **repeats of foes that stay**. T: "I want to see duplicates of the most thematic enemies." In the table below that is two keeper duplicates (`bw-t3` Brine-Widow, `bw-d1` Net-Mender) and three repeats of a new recast face (`bw-w2` and `bw-m1` Quay-Crab, `bw-w3` Coralback).
> - **The Saint Beneath is Chapter 1's boss.** T: "100% Saint beneath, the big fish is the chapter boss."
> - Float-Eye is also the wandering pool for every Act 1 map; the pool **repoints to the Chapter 1 survivors**.
> - **No keeper is touched, face included.** T: "We're not replacing or reskinning any enemies I want to keep, right? only the ones I named above."
>
> This is also what unjams the repo: `main`'s `verify-mobile` is red because six portraits sit in the tree that no registry reaches, and every open PR is gated behind it. Chunk 157.3 closes it.

## Why

### Sources

- **T's ruling, 2026-11-06** (attended). T named the ten cuts, the six portraits and the slot each takes, the four benched with duplicates in their place, the wandering-pool repoint, and the seven keepers. Every call below marked "T" is from that session and is settled; nothing here re-opens one.
- **T's portrait set**, landed image-only as `c2842354e` (PR #1406), whose own body says "This image-only PR leaves those entries for integration". Six `.webp` under `axiomancer-mobile/assets/images/enemies/`: `saint-beneath`, `saltwick-swarm`, `wreckmaster`, `quay-crab`, `bilge-stalker`, `coralback`.
- **The six 24-cell frame sets** are authored and open as PR **#1409** (`codex/breakwater-enemy-animations`, 79 animation files plus the art-department masters, `risk:high`). They are not merged.
- **EN1i's tuning table**, the levels and repeat policy this recast keeps: chunk `256.12 / EN1i`, commit `26162cd05`, PR #1167. Its live output is `docs/reports/chapter1-enemies.md`, measured at `d65d03240`. Its policy lines, verbatim from the EN1 brief:

  ```
  - **Levels and repeats** follow "The Breakwater table" below, every foe under level 10
    [Accepted at merge (default), #1]. Each fight node binds one foe; a zone's two foes alternate across its nodes
    [Accepted at merge (default), #2]. Both are starting points for T's tuning session.
  ```

- **`plan/AUDIT.md`** carries the Pending row this plot answers: `[content] Six Breakwater enemy portraits break verify-mobile on main, and no CI-side fix closes it (fix-ci, verify-mobile run 42305194119, 2026-11-06)`. Its `next:` offers three routes; this spec takes route (a), "author the six frame sets as a normal content chunk so the roster invariant holds the way it does for every other foe" — the sets already exist in #1409.

### What exists today (read 2026-11-06, at 0162b5d84)

- **The library.** `axiomancer-mechanics/src/Enemy/enemy.library.ts`: 17 roster foes (1 boss, 6 elites, 10 normals) plus the `sandbag-01` dev dummy, which carries no `portraitAsset`. An entry is a `createEnemy({...})` literal; `CreateEnemyOptions` is at `src/Enemy/index.ts:20`. The same file holds `ACT1_POOL` (line 1136, `[FloatEye]`), `EnemiesByMap` (1142), `ENEMY_REGISTRY` (1157), `EnemySlug` (1179) and `LIVE_ENEMY_IDS` (1182).
- **VITAE** is `round((30 + 8 × level) × MULT[difficulty])` (`enemyVitae`, `src/Enemy/index.ts:78`; multipliers in `src/Game/game-mechanics.constants.ts:146`, elite 1.4, boss 1.9). An authored `vitae` wins outright. Only the Death Beholder authors one: **320**.
- **The phase model.** A normal has 2 phases, an elite 3, a boss 4 (`PHASE_LINES`, `src/Enemy/enemy-phases.ts:20`). The Death Beholder is the one foe left on the enemy-deck path (`ENEMY_DECKS`), its four phases being its opening plus three `stages` at `vitaePct` 0.75 / 0.5 / 0.25.
- **The nodes.** `axiomancer-mechanics/src/World/MapEvents/content.ts` is the single site: `BW_ENCOUNTER_FOES` (line 296) binds **14 fight nodes**, `BW_ELITE_DRAWS` (line 325) binds **3 elite nodes** at two foes each, and the `boss` case (line 361) pins `death-beholder` at `bw-k2`. **18 combat nodes in all.** `eliteDrawPool` (339) gives each foe of a pair one `weight: 1` entry, so the map's seeded roll picks one 50/50.
- **A node rebuilds its foe, it does not use the library object.** `sourceAtTier` (`src/World/encounter-tier.ts:28`) re-tiers it and `scaleEnemyToLevel` (`src/World/encounter.ts:105`) rescales it to the node's level. So a foe authored at one level can hold a node at another, and the recast needs no renumbering.
- **The portraits.** `axiomancer-mobile/assets/images/enemies/index.ts` maps `portraitAsset` to a static `require()` in `ENEMY_ART_BY_KEY` — 17 keys. `frames.ts` holds `ENEMY_FRAME_SETS` (line 735, 17 sets, each 8x3 = 24 cells, clips `idle`/`struck`/`attacking`) and `FRAME_SET_EXEMPTIONS` (line 761), **today empty**.
- **The anchor** is per frame set, mobile-side only: `FrameSetManifest.anchor`, `kind: 'foot-line'` for a creature that stands, `'centre'` for one that floats (`frames.ts:97`). Two foes float today: `float-eye` and `death-beholder`.
- **The backings** are **directory-driven, not registry-driven**: `rosterKeys()` in `scripts/bake-backings.mjs:66` lists every `<key>.webp` beside the registry, and `drawnFiles()` (line 56) takes its `anim/<key>/` cells when they exist, else its single still. Dropping a `.webp` into that folder enrolls it.
- **23 `.webp` are on disk; 17 are drawn.** The six new ones are in no registry, have no `anim/` directory, no `backing/` directory and **no `provenance.json` record**.

### Why `main` is red, and what closes it

Two gates fail on `main` and so on every branch cut from it:

1. `axiomancer-mobile/scripts/asset-provenance.test.mjs:260` "every art file is reachable from a registry" — six orphans. The walk is transitive from `assets/images/enemies/index.ts` through `frames.ts` to each `anim/<key>/index.ts` and `backing/index.ts`, so a key is reachable only once something in that graph names its file.
2. `axiomancer-mobile/scripts/enemy-backings.test.mjs` **aborts at module load**: `rosterKeys()` returns all 23, `bilge-stalker` sorts first, and line 86 reads its backing unconditionally — `readAlpha` (`bake-backings.mjs:77`) does a bare `readFileSync`, so `ENOENT backing/bilge-stalker/bilge-stalker.backing.webp` is thrown before a single test runs.

And PR #1409, which carries the sets, fails its own guard: `axiomancer-mobile/components/combat/encounter/__tests__/CombatCombatantPane.action-clip.test.tsx:84` asserts

```tsx
expect(FRAMED.map((e) => e.portraitAsset).sort()).toEqual(Object.keys(ENEMY_FRAME_SETS).sort());
```

with `FRAMED = EnemyLibrary.filter(e => getEnemyFrameSet(e.portraitAsset) !== null)` (`test-utils/enemyTurnStreams.ts:19`). That demands a **bijection**: every library foe's portrait has a set, and every set belongs to a library foe. Six sets installed with no foe drawing them breaks it in the second direction.

So the three failures have one cause and one fix: **the six portraits must become six library foes that draw them.** Chunk 157.1 creates the entries; chunk 157.3 wires the art and the sets and takes all three gates green.

### The cut entries are retained, so no frame set is retired

T's "don't delete them" has a consequence worth stating, because `enemies/index.ts:16` anticipates the opposite case:

> "…an enemy with no set (one exempted in `FRAME_SET_EXEMPTIONS`, say after a portrait swap retires its set) renders through `getEncounterEnemyArt` exactly as it always did."

That path is for a **swap**, where a new painting replaces an old one under the same key and orphans its sheet. This recast is not a swap: each new portrait is a **new key** on a **new entry**, and every cut foe keeps its own key, its own painting and its own sheet. So no set is retired, **`FRAME_SET_EXEMPTIONS` stays `{}`**, and `__tests__/every-portrait-has-a-set.test.ts:27`'s `expect(FRAME_SET_EXEMPTIONS).toEqual({})` is left exactly as it is. **Verified against the code; the reading holds.** The same test's hard count `expect(ENEMY_ART_KEYS.length).toBe(17)` does change — to 23.

The one thing the retention does cost: `orphanEnemies` (`src/World/roster-health.ts:320`) reports a library foe that no pool draws as `enemy-unpooled`, so the ten benched foes will show on that lens. It is a reporting lens, not a gate — its only test (`src/World/e2e/roster-health.engine.test.ts:170`) runs on synthetic fixtures, never the live library — so nothing breaks. 157.2 records the ten as deliberately benched so the lens reads as intent rather than rot.

### The smallest version on what exists

Almost none of this is new design. The moves, the phase shapes, the level and VITAE numbers, the deck and stages, the node tables, the elite draw and the scaling are all built and tuned. What is genuinely new is three things: six entries that copy an existing foe's numbers under a new id and portrait key, a repointing of two node tables and one pool, and the art wiring the six portraits have been waiting for. No move is written, no number is retuned, no keyword is added, and the engine is not changed.

## Design

### The six new faces and the slots they take

Each new entry is created by copying its cut foe's `level`, `baseStats`, `difficulty`, `vitae` (where authored), `phases` (or `cards` and `stages`), `xpReward` and `effects` verbatim, and giving it a new `id`, `name`, `description`, `portraitAsset` and `mapName`. Nothing else changes.

| New entry | id | portraitAsset | Takes the node(s) of | Tier | Level | VITAE | Anchor |
|---|---|---|---|---|---|---|---|
| The Saint Beneath | `enemy-saint-beneath` | `saint-beneath` | the Death Beholder, `bw-k2` | boss | 8 | 320 (authored) | centre (floats) |
| Saltwick Swarm | `enemy-saltwick-swarm` | `saltwick-swarm` | Green Jelly, `bw-t2` and `bw-t6` | normal | 5 | 70 | centre (floats) |
| The Wreckmaster | `enemy-wreckmaster` | `wreckmaster` | the Toll-Keeper, `bw-w5` pair | elite | 8 | 132 | foot-line |
| Quay-Crab | `enemy-quay-crab` | `quay-crab` | Crane-Hook, `bw-h2` | normal | 3 | 54 | foot-line |
| Bilge-Stalker | `enemy-bilge-stalker` | `bilge-stalker` | Wreck-Picker, `bw-l1` and `bw-d3` | normal | 6 | 78 | foot-line |
| Coralback | `enemy-coralback` | `coralback` | Lamprey-Knot, `bw-t1` | normal | 4 | 62 | foot-line |

The grounded/floating split is T's: grounded are `bilge-stalker`, `coralback`, `quay-crab`, `wreckmaster`; floating are `saint-beneath` and `saltwick-swarm` (a five-jelly cluster anchored as one unit). It is declared as each set's `anchor` in `frames.ts`, where `centre` means "no foot line exists and the hover IS the idle clip" — the same anchor the Float-Eye and the Death Beholder already use.

**The names** follow the roster's own convention: elites and the boss take "The", normals do not. T dictated only the boss ("The Saint Beneath"); the other five are proposed here. [T to confirm #1]

### The boss

The Saint Beneath is Chapter 1's boss and takes the Death Beholder's whole fight: its `ENEMY_DECKS` entry (`tier1`/`tier2`/`tier3`, `tier2AtRound: 4`, `tier3AtRound: 7`), its authored **320** VITAE, and its three `stages` at `vitaePct` 0.75 / 0.5 / 0.25 — four phases in all, which is what `enemy-phase-counts.engine.test.ts` requires of a boss. Its `mapName` becomes `breakwater` (the Death Beholder's was `lantern-deep`), and like every boss it carries a `journalEntry` and **no `mercyLines`**: a boss is never spared, and `aftermath-lines.engine.test.ts` asserts it.

Its real moves are **not** designed here. The 0.5 stage it inherits is still marked in the source `// DRAFT (Claude): name, text and number for T to rewrite.` A later owner-led row designs the boss properly; this spec only puts T's chosen face and the chapter's boss slot together so the fight is playable with numbers that are already measured.

One number worth stating because it surprises: `bw-k2` stages its boss at `BW_DOOR_LEVEL = 1`, so the fight's live VITAE is `round(320 × 72/179) = 129`, not 320. That is today's behaviour for the Death Beholder, unchanged by this recast, and it is the boss-design row's to settle, not this one's. [T to confirm #5]

### The four benched with no replacement face

**Smokehouse Gutter, Curfew-Ringer, Gallows Crow and Float-Eye** leave Chapter 1. Their entries stay in the library untouched. Their five nodes are refilled with repeats of foes that stay — two of them duplicates of a keeper (`bw-t3`, `bw-d1`), three of them a second node for a new recast face (`bw-w2`, `bw-m1`, `bw-w3`) — following EN1i's own rule — "a zone's two foes alternate across its nodes" — so every zone still reads as two foes trading nodes:

| Node | Zone | Level | Today | After | Why |
|---|---|---|---|---|---|
| `bw-w2` | Fields & south road | 2 | Float-Eye | **Quay-Crab** | the zone's A foe |
| `bw-w3` | Fields & south road | 2 | Gallows Crow | **Coralback** | the zone's B foe |
| `bw-m1` | Fields & south road | 2 | Float-Eye | **Quay-Crab** | A again, alternating |
| `bw-t3` | Town | 5 | Curfew-Ringer | **Brine-Widow** | the town's B foe beside the Swarm; a widow in a shuttered house |
| `bw-d1` | Cliffs & hamlet | 6 | Smokehouse Gutter | **Net-Mender** | a net-mender in a fishing hamlet |

### Chapter 1's nodes after the recast

All 18 combat nodes, with the level each keeps:

| Node | Place | Level | Foe |
|---|---|---|---|
| `bw-w2` | Gallows crossroads | 2 | Quay-Crab |
| `bw-w3` | Field road | 2 | Coralback |
| `bw-m1` | South fork | 2 | Quay-Crab |
| `bw-h1` | Quay end | 3 | Net-Mender |
| `bw-h2` | Crane quay | 3 | Quay-Crab |
| `bw-h3` | Harbour light pier | 3 | Net-Mender |
| `bw-h7` | Long pier | 4 | Brine-Widow |
| `bw-t1` | Harbour steps | 4 | Coralback |
| `bw-t2` | Bridge approach | 5 | Saltwick Swarm |
| `bw-t3` | Town gate | 5 | Brine-Widow |
| `bw-t6` | Upper town | 5 | Saltwick Swarm |
| `bw-l1` | Cliff crossroads | 6 | Bilge-Stalker |
| `bw-d1` | Fishing hamlet | 6 | Net-Mender |
| `bw-d3` | Hamlet rise | 6 | Bilge-Stalker |
| `bw-c1` | Sea cave (elite) | 5 | The Cave Choir **or** The Tithe-Collector |
| `bw-l4` | Lighthouse path (elite) | 7 | The Lamplighter **or** The Wrecker |
| `bw-w5` | Keep causeway (elite) | 8 | **The Wreckmaster** **or** The Tide-Gate |
| `bw-k2` | Sea keep (boss) | 1 | **The Saint Beneath** |

Every level is unchanged from EN1i's table and every one is under 10. No node's level moves, so no foe's numbers move.

**The elite pair survives the cut.** T's cut of the Toll-Keeper would have left the keep causeway drawing one foe; the Wreckmaster takes its side, so `BW_ELITE_DRAWS['bw-w5']` keeps two entries and `eliteDrawPool`'s "one or two foes" guard is satisfied. **Confirmed against the code.** The other two pairs are untouched, and T's "Keep the light guy near the lighthouse" holds: the Lamplighter stays on `bw-l4`, paired with the Wrecker.

### Repeat rates, and whether the roster is thin

Six named normals now cover 14 fight nodes:

| Foe | Nodes | Repeats |
|---|---|---|
| Quay-Crab | `bw-w2`, `bw-m1`, `bw-h2` | 3 |
| Net-Mender | `bw-h1`, `bw-h3`, `bw-d1` | 3 |
| Coralback | `bw-w3`, `bw-t1` | 2 |
| Brine-Widow | `bw-h7`, `bw-t3` | 2 |
| Saltwick Swarm | `bw-t2`, `bw-t6` | 2 |
| Bilge-Stalker | `bw-l1`, `bw-d3` | 2 |

Today ten normals cover the same 14 nodes at a ceiling of 2 repeats; after the recast six cover them at a ceiling of 3. **That is thinner but it is not too thin for 14 nodes:** every zone still alternates two foes, no foe appears twice in a row on any route, and a run meets six distinct normals plus one of two elites at each of three elite nodes plus the boss — ten distinct fights.

**Where it does get thin is the board T has not filled yet.** The live map is 44 nodes and T ruled "about half the yellow nodes are combat" (`plan/revamp/breakwater-vision.md`), which points at roughly 22 combat nodes rather than today's 18. Binding eight more fight nodes against six normals pushes the ceiling to 4 or 5 repeats, which is where a run starts to feel like one foe wearing hats. **Flagged, not solved here:** if T wants the yellow nodes filled out, Chapter 1 wants two or three more normal faces, and that is a new portrait pick, not a chunk of this spec. [T to confirm #2]

### The wandering pool

`ACT1_POOL` is `[FloatEye]` and `EnemiesByMap` points all seven Act 1 maps at it, so every wandering fight in the act is a Float-Eye. Float-Eye is benched, so the pool repoints to **the six named normals of the recast roster** — Quay-Crab, Net-Mender, Coralback, Brine-Widow, Saltwick Swarm, Bilge-Stalker — and a wandering fight draws a kept enemy, as T ruled. The pool is drawn from, then scaled to the wandering encounter's level like any other, so no foe's numbers move.

All seven maps keep pointing at the one pool: the other Act 1 regions have no roster of their own yet, and giving them one is enemy sessions 3 and 4's work (Nov 21, Nov 22), not this spec's.

### The new entries' voice

`aftermath-lines.engine.test.ts` splits the roster: a hard-coded `DESCRIPTION_ONLY` set of the 14 stand-in foes carries **no** `finalBlowLines` or `causeLines`, and every other entry must carry both, plus `mercyLines` for every normal and none for anything else. Four of the six faces take a cut foe that is in that set, and the Green Jelly's lines name the Green Jelly and its "Face Broker" journal.

Writing a foe's voice is content T authors (D88, D99), and T's ruling settled faces and slots, not prose. So **every new entry joins `DESCRIPTION_ONLY`**: a `description` only, no final-blow, cause or mercy lines, no journal entry. The one exception is the boss, which keeps a journal entry (a boss must have one) carried over with its title reworded to its own name.

The `description` itself is the irreducible minimum — the field is required by `CreateEnemyOptions` — and is drafted in one line from what the portrait shows, in the game's voice, for T to rewrite. [T to confirm #4]

### Decisions made upfront (do not ask)

- **No move, number, keyword, effect or rider is written, retuned or removed.** Every new entry's mechanics are its cut foe's, copied.
- **No cut foe is deleted, edited or reskinned**, and no keeper is touched at all — not its entry, its numbers, its portrait or its frame set.
- **`FRAME_SET_EXEMPTIONS` stays empty.** Nothing here retires a set.
- **No node's level changes**, so `docs/reports/chapter1-enemies.md` re-measures the same levels against the new roster.
- **No new art is generated.** All six paintings and all six 24-cell sheets exist (the sheets in PR #1409).
- The ten benched foes stay reachable by `ENEMY_REGISTRY` and `LIVE_ENEMY_IDS`, so an old save naming one still resolves.

### Out of scope

- **The boss's real moves.** The Saint Beneath fights the Death Beholder's fight until an owner-led session designs it.
- **Tuning.** Levels, repeat rates and VITAE are EN1i's, carried over. A tuning pass over the new roster is T's act, after this ships.
- **Chapters 2-4's rosters and the Act Boss** (enemy sessions 3 and 4, chunk 134.5 / B2).
- **Placing the benched ten anywhere else.** They are out of Chapter 1 and in no other map's pool; where they land later is a future chapter's brief.
- **Filling T's remaining yellow nodes** with fights, and the extra faces that would need.

## Contracts

- Six new `createEnemy` entries in `enemy.library.ts`, each with a new `id`, `name`, `description`, `portraitAsset` and `mapName`, and every mechanical field copied from its cut foe. `EnemyLibrary`, `ENEMY_REGISTRY`, `EnemySlug` and `LIVE_ENEMY_IDS` all gain them; nothing is removed from any of the four.
- `ENEMY_DECKS` gains `enemy-saint-beneath` beside `enemy-death-beholder`; both keys stay.
- `ACT1_POOL` becomes the six named normals of the recast roster.
- `BW_ENCOUNTER_FOES` keeps its 14 keys with new slugs; `BW_ELITE_DRAWS['bw-w5']` swaps `toll-keeper` for `wreckmaster`; the `boss` case pins `saint-beneath`.
- `ENEMY_ART_BY_KEY` goes from 17 static `require()`s to 23; `ENEMY_FRAME_SETS` from 17 sets to 23; `ENEMY_BACKINGS` is regenerated for 23 keys.

## Open questions

1. The five new non-boss foes' names. The spec proposes **Saltwick Swarm**, **The Wreckmaster**, **Quay-Crab**, **Bilge-Stalker** and **Coralback**, following the roster's convention that elites and bosses take "The" and normals do not. The boss is **The Saint Beneath**, which is yours. Rename any of the five. [T to confirm #1]
2. Which keepers duplicate where, and whether six normals is enough. Default: the table in Design — Quay-Crab at `bw-w2`/`bw-m1`, Coralback at `bw-w3`, Brine-Widow at `bw-t3`, Net-Mender at `bw-d1`, giving a repeat ceiling of 3 across 14 nodes. Or: move any row. Separately, filling out the rest of your 44-node board at "about half combat" would push the ceiling to 4 or 5, which argues for two or three more portraits. [T to confirm #2]
3. How PR #1409 sequences. Default: you merge #1409 first, so the six frame sets are on `main` before 157.3 is built; `main` is already red, and while #1409 sits merged-but-unwired it carries one further contained failure for exactly one chunk. Or: 157.3's branch merges `codex/breakwater-enemy-animations` into itself, so the sets and their wiring land in one commit and `main` goes green in one step — at the cost of #1409's 79 files riding in on a loop PR. [T to confirm #3]
4. The new foes' voice. Default: each new entry is description-only — one drafted line from its portrait, no final-blow, cause or mercy lines, no journal (the boss keeps a journal entry, reworded to its own name), exactly as the 14 stand-ins are today. Or: you write the six voices, which makes that its own attended row. [T to confirm #4]
5. The boss's live VITAE. `bw-k2` stages its boss at level 1, so the authored 320 scales down to 129 in the fight. That is today's Death Beholder behaviour, carried over unchanged. Default: leave it to the boss-design row. Or: raise `BW_DOOR_LEVEL` for the boss node now. [T to confirm #5]

## Chunks

Measure: 0 open · 4 closed · next A5


### 157.1 (EN3a) — The six new library entries, each on its cut foe's numbers · M · closes A1 · requires —

- Six `createEnemy` entries in `enemy.library.ts`, each copying its cut foe's `level`, `baseStats`, `difficulty`, `effects`, `xpReward`, and `phases` (or, for the boss, `cards`, `vitae: 320` and its three `stages` at 0.75 / 0.5 / 0.25). New `id`, `name`, `description`, `portraitAsset`, `mapName: 'breakwater'`.
- `ENEMY_DECKS` gains `enemy-saint-beneath` with the Death Beholder's three tiers and round gates; the Death Beholder's entry stays.
- `EnemyLibrary`, `ENEMY_REGISTRY`, `EnemySlug` and `LIVE_ENEMY_IDS` gain the six. Nothing is removed.
- The six join `DESCRIPTION_ONLY` in `src/Enemy/e2e/aftermath-lines.engine.test.ts`, so they carry a description and no aftermath lines; the boss carries its journal entry with its own title.
- **The pinned lists that must be updated, all in `src/Enemy/e2e/revamp-roster.engine.test.ts`:** the explicit `ENEMY_REGISTRY` key list (18 → 24), the **ordered** `EnemyLibrary` id list (17 → 23), and the `LIVE_ENEMY_IDS` set. `enemy-phase-counts.engine.test.ts` derives per-foe, so the six new foes get their phase-count assertions for free — a normal must have 2 phases, an elite 3, the boss its three stages at exactly `[0.75, 0.5, 0.25]`.
- This chunk does not touch any node table, so `BW_ENCOUNTER_FOES` still draws the old roster and nothing in `axiomancer-mobile` moves. The six new foes are in the library and placed nowhere, which `orphanEnemies` reports and no gate fails.
- Measure: `npm run verify -w axiomancer-mechanics` green with the six entries present; a test asserting each new foe's level, VITAE, tier, phase count and portrait key equals its cut foe's, and that all ten cut foes are still in `EnemyLibrary`.

### 157.2 (EN3b) — Chapter 1's nodes repointed, the benched foes' nodes refilled, the wandering pool on the survivors · M · closes A2, A3 · requires 157.1

- `BW_ENCOUNTER_FOES`: all 14 rows repointed to the Design table's slugs, every level unchanged. `BW_ELITE_DRAWS['bw-w5']` swaps `toll-keeper` for `wreckmaster`, keeping two entries. The `boss` case in `poolFor` pins `saint-beneath`.
- `ACT1_POOL` becomes the six named normals; `EnemiesByMap` keeps pointing all seven maps at it.
- A comment at `ACT1_POOL` and at the benched entries records the ten as deliberately out of Chapter 1 (T, 2026-11-06, "they're just not in chapter 1"), so `orphanEnemies`' `enemy-unpooled` findings read as intent.
- **The pinned node tests to update:** `src/World/e2e/breakwater-chapter-foes.engine.test.ts` (its explicit 14-node array and the `bw-c1` / `bw-w5` draw orders), `src/World/e2e/revamp-roster.engine.test.ts` (the per-map `EnemiesByMap[map] toEqual([FloatEye])` assertions and the `death-beholder` door pin), `src/World/chapter1-content.test.ts` (the `bw-k2` boss staging), and the five `src/Enemy/e2e/chapter1-*.engine.test.ts` suites that pin node rows move to the foes that now hold those nodes. The four benched foes' own move-by-move suites are kept, retargeted off the node tables so they still prove the creatures work.
- `src/CLI/chapter1-enemies.cli.ts` derives its rows from the two node tables, so regenerate `docs/reports/chapter1-enemies.md` and let `chapter1-enemies.engine.test.ts` prove the table has one row per staged foe. Update `docs/truth-sources.md` if it names the old stamp.
- `axiomancer-mobile/scripts/measure-arena-separation.mjs`'s hard-coded `REGIONS` Breakwater list and `BOSSES` set name the old roster by hand; repoint them and regenerate `docs/reports/arena-separation.md`.
- Measure: `npm run verify -w axiomancer-mechanics` green; a walk of all 18 combat nodes asserting each draws the Design table's foe at its level and that no benched slug is reachable from any Chapter 1 pool; a wandering-draw test asserting the pool is the six normals; the regenerated report committed with its new commit stamp.

### 157.3 (EN3c) — The six portraits drawn: art registry, provenance, frame sets, backings · M · closes A4 · requires 157.1

**This is the chunk that takes `main` green.** It needs 157.1's entries (the bijection guard counts library foes, not files) and the six frame sets from PR #1409 per question 3.

> **What actually happened (2026-11-07).** PR #1409 landed far more than this section assumed: not only the `anim/` cells but the art registry, the six frame sets with their anchors, the baked backings, the provenance records and the count fixtures. So by the time EN3c was built, every bullet below was already true on `main` and acceptance A4 was satisfied in the tree. The chunk's real content was the regression guards that were missing: six per-foe pane suites, each carrying a `guard-test:` reason naming #1409, plus the `backing.test.tsx` floor. They pass on the merge base by design, which is what `verify-gate`'s fail-on-parent step is there to make explicit. `CombatCombatantPane.action-clip.test.tsx` was fixed by 157.1, not here. Read the bullets below as the state #1409 reached, not as work this chunk did.

- `ENEMY_ART_BY_KEY` gains six static `require()` literals — spelled out, because Metro resolves them statically.
- `frames.ts` gains the six `EnemyFrameSet` literals with their manifests and their `anchor` (`centre` for `saint-beneath` and `saltwick-swarm`, `foot-line` for the other four), each importing its `<KEY>_CELLS` from `./anim/<key>`. `FRAME_SET_EXEMPTIONS` is left `{}`.
- `node scripts/bake-backings.mjs` regenerates `backing/index.ts` and the six `backing/<key>/` directories, which is what clears the `enemy-backings.test.mjs` ENOENT. Its own assertions then apply to the new keys: 24 cells each, backing size equal to cell size, coverage and overreach bounds, and a byte-identical re-bake.
- A `provenance.json` record per new portrait (`covers`, `used_by`, `license` carrying the D115 string), plus the generated `anim/<key>/provenance.json` and `backing/<key>/provenance.json` each set of cells brings.
- **The hard counts and the prose that are test fixtures:** `__tests__/every-portrait-has-a-set.test.ts:22`'s `expect(ENEMY_ART_KEYS.length).toBe(17)` becomes 23; `frames.ts`'s BUNDLE COST sentence ("THE WHOLE ROSTER…: N sets, N cells, N B … against N B", lines 50-73) is regex-matched against disk by `scripts/frame-cells.test.mjs:143`, so it must be rewritten to the new totals; `frame-cells.test.mjs`'s hard-coded 17-key loop becomes 23; `CombatCombatantPane.backing.test.tsx:54`'s `toBeGreaterThanOrEqual(17)` still passes but should say 23.
- `scripts/frame-set-portraits.test.mjs` requires each set's `anim/<key>/provenance.json` to carry a `portrait_sha256` equal to the sha256 of its portrait on disk — the six sheets must be cut from the six portraits as committed.
- Six per-foe pane suites under `components/combat/encounter/__tests__/CombatCombatantPane.<key>.test.tsx`, matching the 17 that exist.
- Measure: `npm run verify -w axiomancer-mobile` green, which is the whole point — name the three previously failing suites (`asset-provenance.test.mjs`, `enemy-backings.test.mjs`, `CombatCombatantPane.action-clip.test.tsx`) in the PR body with their results. Run jest with `--maxWorkers=4`. The PR carries a `devframes` screenshot of each new set's idle clip, the two floating ones included.

<!-- Not chunked yet: hand absorb in progress -->
