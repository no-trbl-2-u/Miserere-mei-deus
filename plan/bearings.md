# Bearings — Miserere Mei, Deus

<!-- lexicon-ok: retired-keyword — names RELENT and CONDEMN to forbid them -->
<!-- lexicon-ok: revamp-mode — the one historical paragraph on THE REVAMP names it to record its end -->

> Standing context for every command invocation. Read this
> alongside the relevant skill file (`skills/<name>.md`) and the
> matching phase brief. If anything here changes, update in the
> same commit.

## What we're building

`spec.md` at the repo root is the product spec, and
[`docs/game-model.md`](../docs/game-model.md) is the game as the code
stands, every number with its constant. Read both once at session start.
The TL;DR:

> A turn-based, single-player dark fantasy deckbuilding RPG for mobile,
> backed by a deterministic TypeScript rules engine, where what you owe,
> and to whom, is a mechanical input rather than flavour.

Two-package npm-workspaces monorepo: a pure rules **engine**
(`axiomancer-mechanics`) and an Expo/React-Native **app**
(`axiomancer-mobile`) that consumes the engine as local source. The game
is the Act 1 core the revamp left: three grey cards, four dice, three foes,
four regions, befriend and mercy. There is no governing combat objective
function; simulations keep bug detectors only.

**Product name: "Miserere Mei, Deus".** Player- and doc-facing prose uses
it. Internal identifiers keep the former title: the npm workspaces
(`axiomancer-mechanics`, `axiomancer-mobile`), the repo and folder name,
`GH_REPO`, the `axiomancer` URL scheme and `com.axiomancer.mobile`. The
splash, title screen and main menu share one typeset wordmark over Doré's
Purgatorio I plate, and the launcher icon is cropped from that plate
(2026-10-11; `state/presenters/title.engine.ts`).

**One hosted web surface: the public DevLog.** The product ships as
a mobile app via manual EAS builds; the app itself does not
auto-deploy. The DevLog + catalog are published from `main` by the
Cloudflare Pages project `axiomancer-devlog` at
https://axiomancer-devlog.pages.dev (built by `npm run site:public`;
proof: `node scripts/check-devlog-public-live.mjs <url>`; see
`docs/devlog-public-deploy.md`). See "Verify gate + deploy gate"
below.

## Surface

**Surface:** `app` (mobile) + `library` + `cli`

This is not a website. `axiomancer-mechanics` is a `library` +
`cli`; `axiomancer-mobile` is a native `app` (with an
expo-web build used only for dev/e2e/playtesting). The game has
no public human-facing URL; the DevLog above is the only one.

Consequences for the loop:
- The opt-in branding capability (`/ship-asset` + `brander`) is
  **not adopted** — there is no site to render assets for.
- `/critique`'s "visit the live site as a stranger" maps to
  **driving the local expo-web build (or a running dev server)
  with the `playtester` agent**, not fetching a hosted URL. See
  "Sub-agents" below.

## Auth

**Auth:** `none`

Single-player local app; no login wall, no server, no accounts.
`/critique` and `playtester` run against the local build
with no session handshake.

## Stack (locked — do not re-litigate)

Decided across the two source projects and the monorepo merge.
Revisit only if a phase genuinely cannot ship without changing
one of these — then decide it deliberately and file the call as
`[loop-call]` residue.

> **Exception (2026-08-08) — the Expo decouple: partly shipped, the rest
> parked on a native project.** *(Status corrected 2026-09-25, T4: this
> note previously said the Expo rows were "scheduled to change" ahead of
> Phase 47. Source: build plan 47a-47e, `axiomancer-mobile/package.json`,
> `lib/platform/*`.)* Shipped: **47a** (every `expo-*` import routed
> through `lib/platform/*`) and **47b** (navigation is
> `@react-navigation/*` behind `lib/platform/router.ts`; no code imports
> `expo-router`). Partly shipped (`[-]`): **47c** (`@expo-google-fonts/*`
> vendored), **47d** (`expo-status-bar` -> RN `StatusBar`, `expo-haptics`
> -> `react-native-haptic-feedback`), **47e** (`expo lint` -> `eslint app
> components`). Still on Expo, each blocked on a native `ios/`/`android/`
> project that does not exist yet (residues in the 47c-47e briefs): the
> Expo SDK 54 host itself, `expo-image`, `expo-font`, `expo-constants`,
> `expo-linking`, `expo-splash-screen`, `expo-navigation-bar`, the
> `jest-expo` preset, `expo start`, and the EAS build path. Reanimated 4 /
> gesture-handler / rn-svg / screens / safe-area-context are bare-RN and
> carry over unchanged. The rows below describe the tree as it is; do not drift further off Expo except through
> a phase that ships that native project.
>
> **Post-decouple, the RN<->native-lib version matrix becomes manually
> managed (Phase 47e, 2026-08-21).** Today `expo install` / `expo-doctor`
> curate compatible version ranges across `react-native-reanimated`,
> `react-native-svg`, `react-native-screens`,
> `react-native-gesture-handler`, `react-native-safe-area-context`, and
> `react-native-worklets` for the pinned Expo SDK (54) — a version bump
> to any of them, or to `react-native` core itself, is currently a
> curated `expo install <pkg>` call. Once the native project + build/CI
> re-platform lands (47e's still-open follow-ups: Jest preset,
> dev-server, EAS path), that curation goes away — a future upgrade
> needs a manual peer-dependency cross-check per library (each ships
> its own `peerDependencies` range against `react-native`) instead of
> one Expo-curated command. React Native's own upgrade-helper diff tool
> is the closest bare-RN equivalent once that day comes.

| Layer | Choice | Notes |
|---|---|---|
| Repo | npm workspaces monorepo (2 flat packages) | **npm, never pnpm/yarn** |
| Engines | Node ≥22, npm ≥10 | root `package.json` `engines` |
| React | 19.1.0 (pinned via root `overrides`) | react / react-dom / react-test-renderer |
| **mechanics** language | TypeScript strict, CommonJS | `type-check` = `tsc --noEmit` |
| mechanics runtime | ts-node (CLI) | no build needed to run CLIs |
| mechanics build | `tsc && tsc-alias` → `dist/` | consumed as source, but build is a gate leg |
| mechanics test | **Vitest** (`vitest run`) | hermetic; RNG stubbed |
| mechanics lint | ESLint 9 flat config, `@typescript-eslint` | |
| mechanics state | zustand (`createGameStore`) | |
| **mobile** framework | Expo ~54, RN 0.81, TS 5.9 strict | router: `@react-navigation/*` via `lib/platform/router.ts` (Phase 47b); `expo-router` no longer imported |
| mobile test | **Jest** (jest-expo) | no build leg — Metro bundles at runtime |
| mobile lint | `eslint app components` | |
| mobile e2e | Playwright (expo-web) + per-minigame scripts | `scripts/*-e2e.mjs` |
| Structured data | **none** — content is in-repo TS libraries | no gh-as-db; `/ship-data` not adopted; no `data/BACKLOG.md` |
| Design layer | **none** — no `design/` export dir | during the revamp, design lands in `plan/revamp/` and T's sessions |
| Deploy (mobile) | EAS Build (manual, release-time) | not per-push |
| CI / deploy gate | **GitHub Actions** — `verify-*` workflows | see deploy gate below |

### The `@mechanics` alias (load-bearing)

Mobile consumes mechanics as **local TypeScript source** via
`@mechanics` / `@mechanics/*` → `../axiomancer-mechanics/src`.
Mobile's Metro transpiles mechanics TS directly. **A mechanics
rename/removal can silently break it** — when changing mechanics'
public surface, verify mobile
(`npm run verify --workspace axiomancer-mobile`).

## URL / API / CLI contract (locked)

Add new surfaces via new phases; do not change existing shapes.

### Mechanics CLI (`src/CLI/game.cli.ts`)

```
npm run game -- <sub>          # sub in combat | hazard | labyrinth (no sub = the full run)
npm run combat | hazard | labyrinth   # named shortcuts
npm run combat-sim             # Monte-Carlo balance witness
npm run combat-playtest        # stage x policy matrix
# agent flags: --script <path> | --stdin | --json-events | --state-log
```

### `@mechanics` public export barrel (`src/index.ts`)

The barrel is the **locked public contract** for mobile. Additive exports are fine; a rename/removal is a
deliberate, semver-major phase that migrates the consumers in the
same change. No deprecated aliases remain: the former
`skillLibrary`->`cardLibrary`, `getSkillById`->`getCardById` and
`Skill*` -> `Card*` shims are gone from the barrel and no consumer
references them.

### Mobile routes (`app/`, registered in `app/_layout.tsx`)

`(tabs)/`: character, exploration, inventory, memoir, deck. Plus
`index` (title → main menu), `saves` (the three save slots),
`character-select` (after the slot pick once the roster holds a character),
`settings`, `combat-encounter`, `hazard`, `hazard-deck`,
`item-reward`, `rest`, `cache`, `blacksmith`, `labyrinth`,
`dialogue`, `event`, `cutscene`, `village`, and dev routes (`dev`,
`devaftermath`, `devart`). The `gathering` and `quest` routes are
retired; `app/_layout.tsx` + `lib/platform/router.ts` are the
registration truth.
Canon combat copy: **VITAE** (not HEALTH) — copy regressions are
rejected. The stance layer is gone (D65, R7d); no player-facing copy
says "stance".

### Deterministic seeded-RNG invariants

RNG lives in mechanics only (`setRng`/`getRng`/`setSeed`, `Rng`
type; `seedInputToUint32`, `minigameRunSeed`, `branchMinigameSeed`,
per-minigame aliased seed helpers). Tests stub via
`src/test-utils/rng.ts` (`mockFixedRng`/`mockAlternatingRng`/
`mockSequentialRng`) — never hand-roll `vi.spyOn(Math,'random')`.
`GAME_STATE_VERSION` + `migrate` gate persistence compatibility.

## Repository shape

```
Axiomancer/
├── spec.md                     # product spec
├── AGENTS.md                   # monorepo guide + nexus standing rules
├── CLAUDE.md                   # pointer at AGENTS.md
├── README.md
├── package.json                # workspaces + root verify/deploy:check
├── axiomancer-mechanics/       # engine + CLI (has its own AGENTS/CLAUDE)
├── axiomancer-mobile/          # Expo-hosted RN app (has its own AGENTS/CLAUDE)
├── skills/                     # nexus LOOP verbs (this harness)
├── plan/                       # nexus state files (this dir)
│   ├── bearings.md             # this file
│   ├── AUDIT.md · CRITIQUE.md · PHASE_CANDIDATES.md
│   ├── revamp/                 # THE REVAMP record + part plans (D46–D83)
│   ├── reflexes.md · lessons.md (counted retro ladder) · north-star-mork-borg.md
│   ├── steps/01_build_plan.md
│   ├── phases/                 # template, V masterplan, open/partial + recent briefs
│   ├── ideas/ · labyrinth/     # art-pipeline options · Labyrinth design + acts
│   └── <date>-<topic>.{prompt,decisions,spec}.md   # live dated records
├── docs/                       # truth-sources, asking-well, devlog deploy, reports/
├── devlog/                     # DevLog entries (build input for the public site)
├── telemetry/                  # append-only invocation log, one shard per session
├── Potential Assets/           # icons-TBR source pool (D11) · MCP-Axiomancer images
├── scripts/                    # deploy-check · notify · loop-issue · pr-resolve · check-* lints (check-lessons) · devlog/catalog builders
├── .github/workflows/          # verify-* gates · march/night/triage crons · pr-autofix · pr-resolve · weekly perf audit · verb workflows
├── .claude/
│   ├── commands/               # loop-verb pointers
│   ├── agents/                 # scout · playtester
│   ├── hooks/                  # guard.mjs · telemetry.mjs
│   └── settings.json           # enforcement, always on
```

Loop verbs live in root `skills/`; `.claude/commands/` holds their doorways
(the `combat-playtest` command was archived in R0; R12 rebuilds it). `plot`
and `messy` live there too but are T's intake, never loop verbs, and so
does `heads-down`, T's attended parallel-shipping orchestrator. The content
stewards, the design skills and four agents were archived in R0 (2026-09-28,
D58); a content agent is written at the first owner-led content session.
There is no `plan/archive/` (D66, R10b2): pre-revamp history is read with
`git show archive-pre-revamp:plan/archive/<path>`, only when T asks.

## Sub-agents

Defined under `.claude/agents/`. Spawn aggressively.

| Agent | When to spawn | Returns |
|---|---|---|
| `scout` | External fact, prior-art, spec, date, signal | Structured findings with citations |
| `playtester` | Play the game in its own browser through the playtest session tool (`axiomancer-mobile/scripts/playtest-session.mjs`: Bash restricted to that tool, no Playwright MCP; the caller runs `prepare` once and hands each an agent name, seed and screenshot directory, four at once) — the real attended `/critique` observer for this project | Structured playtest report |

`reader`, `mechanics-expert`, `content-curator` and `card-expert` were
archived in R0 (D58); a fresh card agent is written at the first card
session (B6).

## Plan expansion posture

- **Mode: bold** (default) — `/expand` files candidates to
  `plan/PHASE_CANDIDATES.md`; `/oversight` promotes them.

## Decisions standing for the autonomous loop

(So the loop never has to ask. Add to this list any recurring
ambiguity.)

- **THE REVAMP (history, T 2026-09-28 to 2026-10-12, D46–D83).** A reset
  of the game to its Act 1 core: content purged, the engine and app
  rebuilt around three grey cards, four dice, three foes and four regions.
  While it ran, revamp mode (D58) limited the loop to ratified revamp
  phases and forbade it to create content. It ended when RC cut
  `v0.1.0-checkpoint`; Phase R11 (2026-10-12) removed revamp mode and set
  the rules below. `plan/revamp/` is kept as the record and the part
  plans the owner-led B-rows still point to.
- **THE LOOP SINCE R11 (T, attended session 2026-10-12, D84–D90).**
  - **Code lands by PR; T merges.** A tick whose diff touches anything
    outside `plan/`, `telemetry/`, `docs/reports/` or `devlog/entries/` opens a `loop:pr` PR
    onto `main` (D84); at most 5 are open (raised from 3 via /oversight 2026-10-17), after which `/march` reports
    "waiting on T" (D85); a non-plan PR merges when its adversarial
    review is green (D95), with no daily limit (phase RV4, T 2026-10-21):
    the per-PR holds still stop it (kill switch `PR_AUTO_MERGE=off` or
    `no-auto-merge`, a plot or pipeline PR, `review:needs-T`,
    `loop:pr-stuck`, a draft or fork, an untrusted verdict author, a
    moved head, a `not-pass` or missing verdict, a `verify-gate` not
    green), and the open-PR cap bounds what is in flight; T merges `plot` PRs (D101: a `review:plan-only` PR merges on a pass like any other); a PR open 7 days is
    flagged, never closed (D86). `pr-autofix` (Haiku, two
    runs per PR, then `loop:pr-stuck`) keeps them green and `pr-resolve`
    keeps them mergeable (D87). The flow: `skills/march.md` §3 "Landing a
    change".
  - **Content per surface (D88, D99).** Cards, keywords, art, enemies,
    relics, maps, NPCs and events: the loop may propose them (`/expand`, bold, D89) and builds them only from
    a build-plan row whose brief T wrote or approved. Owner-led B-rows
    stay `[blocked: owner-led]`.
  - **The loop builds only briefed rows and never writes a brief.** A
    briefless row is filed "needs a brief: `/plot <N>`". T's intake is
    `/plot` (one task → one spec brief with acceptance IDs and a
    `Measure:` line, split into as many one-tick phases as it needs,
    one row each, opened as a `plot` PR T merges to approve, D93) and
    `/messy` (a dump → part plan + `[owner]` candidates); only
    T fires them (AGENTS.md rule 8). `/plot` is to the build plan what
    `/jot` is to `plan/CRITIQUE.md`.
  - **`/iterate` fixes in-tick defects** in their own commit (D90).
  - **Every closing verb ends with a Retro** into the counted
    `plan/lessons.md` ladder: seen 2× → automated that tick; seen 3×
    across verbs → `reflexes.md`, reviewed by `/oversight` after the fact.
    Only the loop's own moves are lessons: a fix only T can make (a
    token, a secret, an OAuth, a console click) goes to
    `plan/NEEDS_T.md`, listed every tick and asked first by
    `/oversight`, never automated around (D94).
  **The Act 1 checkpoint is tagged `v0.1.0-checkpoint`** (commit `9ddba0f8`,
  2026-10-02; GitHub release and EAS preview APK linked from it). To reset to
  it: `git switch -c <branch> v0.1.0-checkpoint`.
  **`v0.2.0`** (commit `eb75f451`, 2026-10-11, D83) adds the Blood Price trial
  set on that core; GitHub release, no APK from the tag.
- **DEADLINES (T, attended session 2026-10-19).** `plan/deadlines.md` sets the v0.3 milestone ("Act 1 complete,
  playable", by 2026-12-28) in five two-week windows, each with a goal and a demo T checks. The loop is not
  restricted to the current window: `/march` keeps picking open rows top to bottom. New cards and the card-creator
  workflow are the lowest priority.
- **THE CARD HOLD IS LIFTED (T, attended session 2026-10-22, D99;
  supersedes D37).** Cards, keywords and art are ordinary content under
  D88: built only from a build-plan row whose brief T wrote or approved
  (`/plot`, attended `/plan-a-phase`, `/oversight` promotion), proposed by
  `/expand` as candidates, never invented unprompted.
  The card-rules inventory B4 required is merged
  (`plan/revamp/card-rules-inventory.md`). **The card process is Plan B
  (D73):** one slice per lane, lanes grouped into families (a relic names a
  family), a first pool of 3 families × 1 lane, and bridge cards within a
  family. See `plan/revamp/cards.md`.
- **Which package a phase touches:** scope the verify gate to that
  workspace (`--workspace <pkg>`); if a change touches mechanics'
  public surface, also verify mobile.
- **Combat:** Hazard-Pattern Combat (`initializeCombatEncounter`,
  `simulateHazardPatternCombat`) is the only combat engine. The rules are
  in `docs/game-model.md`.
- **Win condition:** VITAE is the one bar and emptying it is the main
  win. The only other ending is befriending, entered through The Open Hand
  into the mercy choice (D47, D63). Never reintroduce RELENT, CONDEMN,
  Pressure Tracks or `CombatPressureTracks`.
  <!-- lexicon-ok: pressure-tracks -->
- **No governing objective function.** Combat is not graded against a
  win-rate curve, a quality index or rank bands. There is no measured
  baseline during the revamp (D57); a balance question is answered "not
  measured" (`docs/truth-sources.md` § Measured truth). Hazard minigame
  targets: CDR-0006.
- **LOCKED MECHANICS — the keep-list (T direct, /oversight 2026-08-08).**
  T, verbatim: *"the Conviction, Surge meter, and Dice mechanics system,
  those are LOCKED into place and will need to stay. Cards can effect them,
  but agents should not remove the mechanics."* Three systems stay:
  1. **Conviction** — the banked combat resource that pays for signatures.
     Anchors: `CombatEncounterState.conviction`, `CONVICTION_CAP`, the
     `conviction-gained` / `special-fired` events,
     `SPECIAL_CONVICTION_DEFAULT`, `SIGNATURE_COST`.
  2. **The Surge meter** — the momentum chain (heart → body → mind) and
     its surge die. Anchors: `MOMENTUM_CHAIN_ORDER`,
     `MOMENTUM_SURGE_LENGTH`, `SURGE_DIE_PREFIX`, the `momentum-surged`
     event.
  3. **The Dice system** — `Combat/combat.dice.ts`,
     `Combat/combat.upgradeable-dice.ts`, `DEFAULT_DIE_GEAR`, the Anvil's
     HONE/TEMPER/SWAP die-gear economy.
  Cards, keywords, enemies and content may read, feed, spend, block or
  amplify all three. Removing, replacing, no-op'ing, flagging off or tuning
  any of them out of relevance needs overwhelming design evidence, a
  documented call and `[loop-call]` residue. The names stay too.
- **Copy canon:** VITAE. Never HEALTH / MORALE; never "stance" (the
  layer was removed, D65).
- **Content location:** engine content in mechanics `src/*`
  libraries; player-facing strings in mobile presenters /
  `*.copy.ts`; no hardcoded copy in components; no hex literals
  in `app/`, `components/` or presenters (use `HUE` / AXM tokens,
  R10).
- **Effect naming:** never rename engine effect ids for player
  text — add to the mobile keyword registry
  (`state/combat/keywords.ts`). Real-units-or-no-number on card
  faces.
- **Voice:** terse, archaic-flavoured, "cold and old" — but **no
  thee/thou/thy/thine/ye**. Mercy/exploit language reads as
  morally charged, never neutral. The full register (the V-bans,
  sentence form, the six lexicons, the delivery rules MB-1 to MB-8) is
  `axiomancer-mechanics/docs/narrative/DELIVERY_REGISTER.md`, enforced in
  part by `scripts/check-prose.mjs`. It governs every player-facing
  surface.
- **Story canon (THE BLANK PAGE, T direct, 2026-09-18, amended
  2026-09-24).** Canon is whatever
  `axiomancer-mechanics/content/story/story-overview.md` says, and nothing
  more. The overview grows only in attended sessions with T. The player is
  X: no name, and `X` is scaffolding, never shipped text; the overview is
  the only source for who X is. Shipped narrative is not canon. The loop
  does not invent canon: if a tick needs a story fact the overview does
  not hold, it says so and stops. `docs/narrative/` (style constitution,
  voice registers, lexicon, anti-imitation, the delivery register) is craft
  law and binds.
- **Direct pushes to `main` (amended by R11, D84).** Sanctioned for
  plan-only commits (`plan/`, `telemetry/`, `docs/reports/`, `devlog/entries/`;
  except `/plot`, which opens a `plot` PR, D93), for
  `/fix-ci` on red `main`, and for attended sessions at T's word (T
  direct, 2026-08-08: *"Direct pushes to main are fine, keep going."*).
  Every other loop change lands by a `loop:pr` PR that T merges. The
  verify gate still runs pre-commit, the CI gate after the push, and no
  force-push or destructive git op is permitted.
- **THE OPEN GATE: no open question waits on the owner (T direct,
  2026-08-28).**
  `[needs-user-call]` is retired as a blocking state. The loop answers a
  question the state can settle, files the decision and reasoning as
  residue, and tags a genuinely owner-flavoured call `[loop-call]` for
  `/oversight` to review. This does not override the R11 rules above
  (PRs, content per surface, briefs), which are T's later rulings. Cron cadences are the loop's to
  manage; it weighs the Actions-minutes budget and documents changes.
- **The loop is authorized to make big calls on its own** (adopted via
  /oversight 2026-08-08, T verbatim: *"you are free to make big decisions
  like this"*). When the loop can see the decision is right from state it
  already holds, it **decides and ships**: promoting a candidate, merging
  overlapping candidates, setting scope. This does NOT relax: the
  `AskUserQuestion`-only-in-`/oversight` rule, the hard rules, irreversible
  or outward-facing actions, or anything an explicit T ruling settled the
  other way. A load-bearing call is filed as residue so T can audit it.
- **Art route: A-then-B (T direct, 2026-08-22).** Generation uses the
  hosted gpt-image-2 API behind a swappable adapter, with a later move to
  local ComfyUI + FLUX.2 [klein] + a style LoRA if style drift binds
  (`plan/ideas/AI_ART_PIPELINE_OPTIONS.md`). Generation needs an OpenAI key
  in `.env`. Every generated asset records generator, model, prompt and
  date in its `provenance.json` entry (also the Steam AI-disclosure
  record). Midjourney stays out of the automated pipeline. Art is
  content (D88, D99): built only from a brief T approved.
- **`Potential Assets/MCP-Axiomancer/images/` — license per image not on
  record.** The loop may not wire an image it cannot write a truthful
  `provenance.json` entry for. An untraceable image is replaced or
  regenerated, not wired.
- **THE REFACTOR STRATEGY (T, attended session 2026-09-25).** No restart
  and no procedural map generator; never re-propose either. Never
  re-propose cutting the Debug\* tools (D19). Record:
  `plan/2026-09-25-refactor-strategy.decisions.md`.
- **Source-of-truth hierarchy:** see `docs/truth-sources.md` §
  Source-of-truth hierarchy (the one copy).
- **Hermes-decided work lands in the queue** (adopted via /oversight
  2026-07-18): every work item decided on the Hermes side files a
  GitHub issue (or a build-plan phase row) before or alongside its
  code change, so both brains drain one queue via `/triage`. If the
  loop finds shipped code with no queue trace, treat it as drift and
  surface it rather than double-shipping.
- **Hermes-originated queue mutations get a provenance log entry**
  (adopted via /oversight 2026-07-30, issue #129): any time a
  Hermes-originated instruction changes `plan/steps/01_build_plan.md`'s
  queue (add/remove/reorder/reprioritize/split/merge/skip/block/
  unblock/material scope change to a phase row), the same commit adds
  a row to that file's `## Queue change log` section — date, actor
  (`T via Hermes`), the action + affected phase IDs, confirmation T
  requested it, T's stated reason (or "reason not stated"), and the
  resulting commit/issue/brief.

- **THE TROVE IS A STORE (T, attended session 2026-10-19, D96).**
  `Potential Assets/` holds candidate art, licensed packs and extracted
  reference material. Read it to find something; copy what you want out of
  it. Never use anything from inside it. An asset that is going to ship is
  moved to where it belongs in the project (and recorded in that
  directory's `provenance.json`, with its licence record copied into the
  tree) so the build includes it from there. Nothing in the repository may
  resolve a path into the trove — it is gitignored and `.easignore`d, so it
  exists only on T's machine and such a reference breaks every clone, CI
  runner and cloud container. A tool that needs the library takes its root
  as an argument. Canonical text: `AGENTS.md` § "Nexus standing rules"
  rule 9; enforced by
  `axiomancer-mobile/scripts/potential-assets-sealed.test.mjs`.

- **SHEETS FOR USED ENEMIES ARE ENHANCEMENT (T, attended session 2026-10-21,
  D97).** Generating a sprite sheet for an enemy that is **already used** in the
  game is enhancement of existing content, not content creation, so it may run
  as ordinary `/march` ticks. The guard is narrow and machine-checkable: the id
  appears in `axiomancer-mechanics/src/Enemy/enemy.library.ts`'s roster **with** a
  `portraitAsset`, **and** that key is in `ENEMY_ART_BY_KEY`
  (`axiomancer-mobile/assets/images/enemies/index.ts`). Three enemies qualify
  today; the `sandbag-01` dev dummy does not, carrying no `portraitAsset`. Art
  for anything outside that set — a new enemy, a new creature, any other surface
  — is content that needs a brief T approved (D88, D99), and the generator
  refuses it rather than asking. Phase AN1d is what this ruling unblocks;
  `plan/phases/phase_AN1_enemy_animation.md` carries the detail.

- **`art-department/` IS A TREE, NOT AN NPM WORKSPACE (T, attended session
  2026-10-21, D98).** Art tooling lives at the repo root in `art-department/`
  and may be written in any language — T's ruling, made on seeing a Python rig
  tool sitting inside the JS/TS mobile workspace. It is deliberately **absent**
  from root `package.json` `workspaces`, and the reason is recorded in
  `.easignore` itself: its Section 2 keep-list states that `npm ci` resolves
  every declared workspace, so a declared one must be uploaded to EAS. Since
  this tree exists partly to hold large build-time masters that must never
  ship, declaring it would defeat its purpose. It is reached by path, never
  `npm --workspace`; it is excluded from the EAS archive; and nothing in the
  repository resolves a path into it — the same boundary rule 9 (D96) puts on
  `Potential Assets/`, and enforced the same way, by a test. Phases AD1a and
  AD1b build it; `plan/phases/phase_AD1_art_department.md` carries the detail.

## AUDIT category taxonomy (this project)

`/iterate` and `/expand` read `plan/AUDIT.md`. Categories used
here (tokens match `skills/iterate.md` §4 "Audit categories"):

`contract` · `divergence` · `debt` · `gap` · `content` · `docs` ·
`tests` · `a11y` · `perf` · `external-critique`

## Hard rules

Rules 1-5 are the nexus standing rules, **canonical in `AGENTS.md`
§ "Nexus standing rules"** (which now numbers nine — including
`AskUserQuestion` only in `/oversight` (and `/plot`/`/messy`/`/heads-down` with T
present), **file the residue**, and **T's buildable direction goes
through `/plot` or `/messy`**, and **`Potential Assets/` is a store,
never a source** (D96)). Read them there; update them there
first — this file no longer carries a copy. In short: atomic
commit+push (code to a `loop:pr` PR, plan-only to `main`); no
trailers/emojis; foreground verify gate, no
`--no-verify`/force-push/destructive resets; tests alongside code; CI
gate after every push.

Rules 6-9 are project-specific additions that live here (numbering
preserved — phase briefs cite them by number):

6. **Rules/state/RNG live in mechanics, never in mobile
   presenters.**
7. **The `/archive` harness is gone** (consumed + removed at
   re-onboard). Do not resurrect its retired pre-monorepo patterns
   from git history.
8. **Never commit secrets** (`.env` is gitignored).
9. **Never reintroduce Pressure Tracks** or the npm-publish /
   engine-pin model (both deliberately retired).

## Verify gate (hermetic, mandatory) + deploy gate

Every shipping skill runs **two** gates around a commit.

### Pre-commit: `npm run verify`

The gate is **per-workspace** (a phase usually touches one
package). Root `npm run verify` fans out to both; scope to
the touched workspace when you can.

```bash
# whole monorepo
npm run verify

# scoped (preferred — pick the package the phase touches)
npm run verify --workspace axiomancer-mechanics   # type-check + type-check:tests + type-check:cli + lint + vitest + build
npm run verify --workspace axiomancer-mobile      # lint + typecheck + jest + assets:check + art:test + critique-drive:test
```

Mechanics changes to the public surface must ALSO run the mobile
gate (the `@mechanics` alias couples them).

Each leg is a hard gate. There is **no `data:validate` leg**
(no structured data layer). Mobile has **no build leg** (Metro
bundles at runtime); its `e2e:*` scripts are the hermetic UI
legs, run as part of CI (`verify-mobile.yml`) rather than the
per-commit local gate; the `verify:visual` smoke screens run only
as an opt-in step of `preview-build.yml`.

### Post-push: the PR's checks, or `npm run deploy:check` on `main`

A loop PR's gate is `gh pr checks <branch> --watch --fail-fast` (the
`verify-*` workflows run on `pull_request`; `skills/march.md` §3). After
a push to `main` (plan-only, `fix-ci`, an attended session):

```bash
npm run deploy:check
```

**Deploy gate = CI-green (GitHub Actions).** There is no
push-to-production; "deploy" for this project means "the
path-filtered `verify-*` workflows for HEAD's SHA went green."
`scripts/deploy-check.mjs` (`DEPLOY_PROVIDER=github-actions`)
polls the Actions API for HEAD's runs:

- exit 0 — all triggered `verify-*` runs concluded success (or
  the commit's paths triggered no gated workflow — nothing to
  check)
- exit 1 — a `verify-*` run failed -> read the run log, patch,
  push again (<=3 same-root-cause iterations)
- exit 2 — timeout (still running; loop re-checks next tick)
- exit 3 — config/auth (`GH_TOKEN` missing/rejected)

Needs `GH_TOKEN` (repo-scoped PAT, Actions:read) in `.env`;
`GH_REPO` defaults to `no-trbl-2-u/Miserere-mei-deus`. EAS release
builds (`preview-build.yml`, `npm run deploy:preview/production`)
stay a deliberate manual step — **not** part of the per-tick
gate.

**Cards-only carve-out (CI):** a change confined to
`axiomancer-mechanics/src/Cards/cards.library.ts` (card DATA edits) still runs the full mechanics gate + mobile
lint/typecheck/jest + bundler smoke, but `verify-mobile.yml` skips
its slow Playwright `e2e:*` steps (the `scope` step, via
`scripts/ci-e2e-scope.mjs`, gates them per journey; defaults to
running on any uncertainty). Any mobile
change or any *other* mechanics change runs the full e2e. The
deploy gate is unaffected — a skipped job does not fail the run.

## Operational notes

- **The loop was PAUSED for R11 (2026-10-12) and is live again.** `march`
  and `night` were disabled for the R11 rewrite and re-enabled the same day
  after #503 merged (R11 item 9). Still open from item 9: watch the first
  tick end to end, and dispatch `pr-autofix` / `pr-resolve` once each if no
  real red check or conflict triggers them.
- **Loop code lands by PR; plan-only pushes `main`** (D84). T reviews
  each `loop:pr` PR before it lands; `/oversight` audits the rest after
  the fact. Runner minutes for the PR flow are free (public repo); the
  paid part is Claude usage, a Haiku run per red check (≤2 per PR) or
  per non-union conflict.
- **Actions-minutes budget (2026-08-14 usage review, PR #205).**
  Half-month spend was ~2,955 min (march 42%, triage 17%, verify
  CI 21%, night 11%) against 3,000 included min/mo. Standing
  consequences for the loop:
  - **Issues are NOT triaged on arrival** — triage's per-issue
    trigger was removed; new issues wait for the next `/march`
    tick (its first gate). `workflow_dispatch` triage remains for
    an immediate manual pass.
  - **`/digest` (night) runs on odd days only**, not daily.
  - Timeouts are budget caps: march 75, night 45. A tick that
    genuinely needs more should be split, not have its cap raised
    silently.
  - March runs every 2h (12×/day; raised from 4×/6h on 2026-09-01
    at T's request) for now. If overage still stings, the
    next levers (loop-managed, in order)
    are march 2×/day, then a self-hosted runner (only inside a
    dedicated VM — the loop runs `--dangerously-skip-permissions`).
  - The weekly tuning crons stay disabled for budget reasons; the
    loop may re-enable them when it judges the minutes budget
    supports it, documenting the change.
- **A red `verify-*` run on a loop PR is `pr-autofix`'s after the
  tick's own 3 tries; on `main` it is `ci-autofix`'s.** Verify gate is
  pre-flight; the CI gate is post-flight.
- **Operational secrets** in `.env` (gitignored): `GH_TOKEN`
  (deploy gate + issue mirror + triage), optional
  `NOTIFY_NTFY_TOPIC`/`NOTIFY_WEBHOOK_URL` (pager), `EXPO_TOKEN`
  (only for manual EAS builds). See `.env.example`.

## Useful commands

```bash
npm run verify --workspace axiomancer-mechanics   # engine gate
npm run verify --workspace axiomancer-mobile      # app gate
npm run verify                                    # whole monorepo
npm run deploy:check                              # post-push CI-green gate (main)
gh pr checks <branch> --watch --fail-fast         # a loop PR's CI gate
node scripts/check-lessons.mjs                    # the lessons ladder lint
node scripts/check-plan-queues.mjs                # the queue-row structure lint (AUDIT, CRITIQUE, candidates, Status)
node scripts/check-deadlines.mjs                  # deadline plan vs build plan lint (DL1a)
node scripts/deadlines.mjs --today=YYYY-MM-DD     # the deadline reminder, pinned to a date
npm run game -- combat                            # play Hazard-Pattern Combat (CLI)
npm run mobile -- start                           # expo dev server
```
