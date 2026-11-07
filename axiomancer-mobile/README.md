# Axiomancer — Mobile Client

Expo / React Native client for Axiomancer — a dark fantasy deckbuilding
RPG campaign exploring mercy and consequence through tactical combat.
This package lives in the Axiomancer monorepo
(npm workspaces) and is the **presentation layer** only. Game rules,
state shape, and randomness live in the sibling
[`axiomancer-mechanics`](../axiomancer-mechanics/) workspace, consumed
as **local source** via the `@mechanics` / `@mechanics/*` path aliases
(→ `../axiomancer-mechanics/src`) — not as an npm package.

If you are looking for "how does combat work" or "what does an effect
do", read the engine. If you are looking for "what does the combat
screen show in the `choosing_stance` phase", read this package.

## Package navigation

This package keeps its documentation in several directories. They do
**not** overlap — each answers a different question. Pick the directory by
the question you are trying to answer, not by topic:

| You want to…                                              | Go to        | Not to       |
| --------------------------------------------------------- | ------------ | ------------ |
| Get the app running / build / deploy on a fresh machine   | [`setup/`](./setup/)     | `docs/`      |
| Understand a runtime concept (testing standard, engine upgrade, AI-assist prompts) | [`docs/`](./docs/)       | `setup/`     |
| Know **why** a durable architecture or product call was made | [`docs/adr/`](./docs/adr/)  | `docs/`      |
| Understand T's game vision / UX doctrine before major UX work | [`VISION.md`](./VISION.md) | `docs/adr/`  |

The boundaries, stated plainly:

- **[`setup/`](./setup/)** is **operational** — step-by-step runbooks to
  stand up the repo, EAS Build, store config, and AI testing. If a doc
  tells you *which command to run on a new machine*, it belongs here.
  Start at [`setup/01_repository.md`](setup/01_repository.md).
- **[`docs/`](./docs/)** is **conceptual / reference** — durable
  technical guidance you read *while developing* (testing standards,
  architecture notes, prompt templates). No machine-bootstrap steps.
- **[`docs/adr/`](./docs/adr/)** is **decisions** — Architecture Decision
  Records capturing the *why* behind durable architecture and product
  calls that sit above day-to-day build-plan execution.
- The former **`specs/`** folder (the 2026-05 screen-wiring contracts,
  all shipped) is archived at
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mobile/specs/`.
  New work is planned through the root loop (`plan/`, `skills/`).
- **[`VISION.md`](./VISION.md)** is **doctrine** — T's game vision and UX
  guardrails. Read before major mobile UX, combat, or mercy check
  work.

---

## Quick start

*For comprehensive repository setup including environment configuration, development tools, and troubleshooting, see [`setup/01_repository.md`](setup/01_repository.md). **Use the comprehensive setup guide when you:***

*- **Don't have Node.js, Expo CLI, or mobile development tools** installed yet*
*- **Haven't worked with React Native/Expo before** and want step-by-step guidance*  
*- **Encounter errors** during the quick start (dependency issues, build failures, etc.)*
*- **Need deployment setup** (EAS builds, .env configuration, store publishing)*
*- **Are joining as a new maintainer** and want full project context and troubleshooting resources*

*The quick start below assumes you already have Node.js 22+, Expo CLI, and basic React Native familiarity.*

### Prerequisites

This mobile app uses **React Native** (cross-platform mobile framework) with **Expo** (toolchain that simplifies React Native development). Each prerequisite serves a specific role in the mobile development pipeline:

- **Node.js 22+** (`engines` in `package.json`) — React Native's JavaScript bundler (Metro) and development tools require modern Node.js versions for performance and compatibility
- **Expo CLI** — the command-line interface for Expo's development tools; install globally with `npm install -g @expo/cli`
- **Target platforms:**
  - **iOS:** Xcode (Mac only) for iOS Simulator, or Expo Go app for testing on physical devices
  - **Android:** Android Studio for Android Emulator, or Expo Go app for testing on physical devices  
  - **Web:** Any modern browser — Expo supports web compilation for development and testing

### Development workflow

```bash
# 1. Install dependencies (from the monorepo root — npm workspaces)
npm install

# 2. Start the development server
npm start              # Opens Metro bundler with QR code

# 3. Choose your target platform:
npm run ios            # iOS simulator (requires Xcode)
npm run android        # Android emulator (requires Android Studio)
npm run web            # Web browser (localhost:8081)

# 4. Before committing changes:
npm run verify         # Runs lint + typecheck + test + asset/art/critique-drive checks
```

**First time setup:** Install Expo Go on your mobile device and scan the QR code from `npm start`, or set up development simulators following [Expo's environment setup guide](https://docs.expo.dev/get-started/installation/).

## Scripts

| Script              | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm start`         | Start Metro dev server.                                      |
| `npm run ios`       | Start the iOS simulator.                                     |
| `npm run android`   | Start the Android emulator.                                  |
| `npm run web`       | Start the web target.                                        |
| `npm run web:container` | Start Expo web inside a `node:22-alpine` container (port 18081 by default). Used for the AI screenshot walkthrough below. |
| `npm run web:container:wait` | Block until the containerised dev server responds with HTTP 200. |
| `npm run web:container:down` | Stop and remove the container. |
| `npm run lint`      | `eslint app components` (ESLint with Expo's config).         |
| `npm run typecheck` | Type-check with TypeScript.                                  |
| `npm test`          | Run Jest (test harness already configured).                  |
| `npm run test:watch` | Run Jest in watch mode for interactive development.         |
| `npm run verify`    | Run lint + typecheck + test + `assets:check` + `art:test` + `critique-drive:test`. Development quality gate. |
| `npm run verify:visual` | Visual smoke tests — generate and compare screenshots.   |
| `npm run e2e:hazard`    | Browser-driven end-to-end hazard minigame playthrough.       |
| `npm run smoke:bundler` | Smoke test for bundler configuration.                    |
| `npm run baseline:approve` | Approve new visual baselines after UI changes.        |
| `npm run deploy:check` | Check EAS Build status for current commit.                |
| `npm run deploy:preview` | Build Android preview via EAS (requires .env setup).   |
| `npm run deploy:production` | Build all platforms for production (requires .env).  |

## Deploy environment

This repo does not auto-deploy from `main`. Native builds are produced on
demand by [EAS Build](https://docs.expo.dev/build/introduction/) (Expo's
cloud build service); the `deploy:*` scripts are thin wrappers that load
`.env` and shell out to the `eas` CLI.

One-time setup on a fresh checkout:

```bash
cp .env.example .env          # populate, then edit
npm install -g eas-cli        # if you don't already have it
eas login                     # one-time browser auth
```

For comprehensive setup beyond the quick start above, see the `setup/` directory:
- [`setup/01_repository.md`](setup/01_repository.md) — Complete repository setup with environment configuration, development tools, and troubleshooting
- [`setup/02_eas.md`](setup/02_eas.md) — EAS Build configuration
- [`setup/03_store_setup.md`](setup/03_store_setup.md) — Store setup guide  
- [`setup/04_claude_playtest.md`](setup/04_claude_playtest.md) — AI testing walkthrough

Set these vars in `.env` (all listed in `.env.example`):

| Var                | Required for                      | Where to get it                                       |
| ------------------ | --------------------------------- | ----------------------------------------------------- |
| `EXPO_TOKEN`       | `deploy:preview`, `deploy:production`, `deploy:check` polling | https://expo.dev/settings/access-tokens (scopes: `builds:read`, `projects:read`) |
| `EAS_PROJECT_ID`   | optional — EAS CLI auto-detects from `app.json` | `eas project:info` |
| `DEPLOY_PROVIDER`  | switch `deploy:check` between real polling (`eas`) and stub (`none`, default) | choose per environment |

Running a build:

```bash
npm run deploy:preview        # verify gate + eas build android --profile preview
npm run deploy:production     # verify gate + eas build --platform all --profile production
```

Both scripts run `npm run verify` first; a red verify gate blocks the
build before any cloud minutes are consumed. The `with-env.mjs` wrapper
exists because npm does not auto-load `.env`, but `eas build` needs
`EXPO_TOKEN` visible in its environment.

After pushing to `main`, run `npm run deploy:check` to confirm a build
exists for the pushed commit. With `DEPLOY_PROVIDER=none` (the default),
this is a stub
that prints HEAD and exits per the contract documented in
`scripts/deploy-check.mjs`:

```
exit 0  →  deploy ready (artifact uploaded)
exit 1  →  deploy errored / failed
exit 2  →  timeout / no build matched commit yet
exit 3  →  config / auth (EXPO_TOKEN missing or rejected)
```

When you set `DEPLOY_PROVIDER=eas` and provide `EXPO_TOKEN`, the same
script polls the EAS Build API for the build matching the current HEAD
commit and returns the real exit code.

## Project layout

```
app/                       expo-router routes
  _layout.tsx              root stack + font loader
  index.tsx                title screen → main menu (CONTINUE · NEW GAME · LOAD GAME · SETTINGS)
  saves/                   the three save slots (NEW GAME / LOAD GAME picker)
  settings/                player settings (theme, text size, motion, haptics, hints, sound)
  (tabs)/                  five-tab shell
    _layout.tsx            tab bar config
    exploration/           map / node graph
    character/             character sheet (links to /settings)
    memoir/                quests, chronicle, remains
    inventory/             inventory + equipment
    deck/                  the combat deck, read-only
  combat-encounter/        the live fight (CombatGate pushes it for every map and labyrinth encounter)
  hazard/                  hazard minigame
  rest/                    rest-choice encounter (Phase 52d)
  cache/                   loot-cache encounter (The Reliquary)
  dialogue/                NPC dialogue trees
  event/                   paced narrative events
  cutscene/                cutscenes
  village/                 village hub
  dev/ devart/  dev-only tooling routes
components/                reusable presentational components
  StanceGlyph.tsx          heart / body / mind glyphs (SVG placeholders)
  EffectGlyph.tsx          buff / debuff glyphs
  ActionIcon.tsx           sword / shield / etc. icons
  StatBar.tsx              HP / mana progress bar
  …                        see folder
theme/                     palette + font tokens
  axm.ts                   AXM.* colours + FONTS.* family names
assets/                    images + fonts (mostly empty placeholders)
docs/                      design notes
  testing.md               hermetic e2e testing standard (REQUIRED)
  prompts/                 AI-assist prompt templates
SVG_ASSET_SPEC.md          contract for replacing every placeholder SVG
```

## Architecture

This app follows a **"read upward, mutate downward"** pattern: data flows up from the engine to the UI (read), while state changes flow down from actions to the engine (mutate). This separation keeps business logic in the engine and presentation logic in the UI.

```
┌────────────────────────────┐
│        UI screens          │  app/**/index.tsx
│ (read view-models, render) │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│       Presenters           │  state/presenters/*.engine.ts
│  (pure: state → ViewModel) │  ← hermetic e2e lives here
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│       Engine store         │  state/store.ts (Spec 02)
│   (Zustand-backed wrapper  │
│    around createGameStore) │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│   axiomancer-mechanics     │  sibling workspace (local source
│   (rules, RNG, reducers)   │  via @mechanics alias) — engine
└────────────────────────────┘
```

The screens never reach past the presenter; the presenter never mutates state. 

**Presenters** are pure functions `(state) → ViewModel` that map engine 
state to screen-specific **view-models** (data objects containing exactly 
what a UI component needs to render, see [`docs/presenters.md`](docs/presenters.md)). 
Presenters are the hermetic-e2e contract — that's where the testing standard lives.

## AI workflow

This repo is developed through the root nexus loop. Pick it up here:

- **First time?** [`AGENTS.md`](./AGENTS.md) — orientation for any
  coding agent (Claude Code, Codex, or otherwise).
- **Picking up work?** The root [`plan/bearings.md`](../plan/bearings.md)
  and the loop verbs in [`skills/`](../skills/). The original mobile
  screen-wiring specs (01–12, all shipped) are archived at
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mobile/specs/`.
- **Writing tests?** [`docs/testing.md`](./docs/testing.md) — hermetic
  e2e standard. Every implementation must land with at least one.
- **Engine:** `axiomancer-mechanics` — sibling workspace, consumed as
  local source via the `@mechanics` alias. There is no version pin and
  no upgrade ceremony: engine changes land in the sibling workspace and
  this app picks them up on the next build.

## Hermetic E2E testing

Every implementation lands with at least one hermetic e2e test that
drives the change through the highest-level public entry point of
its module — typically a presenter (`select<Screen>ViewModel`) or
the engine store lifecycle (`createGameStore(memoryAdapter, …)`).

**Hermetic** = self-contained (no network / no real `AsyncStorage` /
no real timers / no real fonts) + deterministic (`Math.random`
stubbed) + isolated (`afterEach(() => jest.restoreAllMocks())`).

See [`docs/testing.md`](./docs/testing.md) for the full standard.
The harness itself shipped with spec 01 (archived:
`01-test-harness-setup.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mobile/specs/01-test-harness-setup.md`)).

## Theme

Dark-only by design; the player picks one of five palettes on `/settings`
(COLOUR THEME — the picker moved there from the SELF tab on 2026-09-23;
see `docs/save-slots-and-settings.md`). Tokens in `theme/axm.ts` (hex
values below are the default `ashen-gold` theme from `theme/palette.ts`):

| Token           | Hex        | Use                              |
| --------------- | ---------- | -------------------------------- |
| `AXM.bg`        | `#0b0a09`  | near-black background            |
| `AXM.parchment` | `#ece0c8`  | main text / inactive icon        |
| `AXM.blood`     | `#e05a45`  | HP, danger, bleed                |
| `AXM.sulfur`    | `#dcb04a`  | mana, selected, active           |
| `AXM.rust`      | `#c36431`  | rust accents                     |
| `AXM.bone`      | `#9c937f`  | secondary text, inactive tabs    |
| `AXM.ash`       | `#46403a`  | borders, disabled                |

Fonts:

- **Pirata One** — gothic display headers.
- **IM Fell English** — body serif (with italic variant).
- **Bebas Neue** — sans labels (button captions, section labels).
- **JetBrains Mono** — numerics (HP / damage / rolls).

## AI screenshot walkthrough

Claude Code can drive a real browser against the running app and take
screenshots — useful for "see what the user sees" regression checks
before shipping a screen change.

Wiring:

- [`.mcp.json`](./.mcp.json) declares a project-local
  [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp)
  server (`chromium`, `--headless`, `--isolated`). Claude Code loads
  it automatically when started in this repo.
- [`scripts/dev-server-container.sh`](./scripts/dev-server-container.sh)
  spins up Expo web inside a throw-away `node:22-alpine` container so
  the host doesn't accumulate Metro state between sessions.

One-time setup on a fresh checkout:

```bash
npx playwright install chromium   # ~170 MB, downloads the browser binary
```

Per-walkthrough flow:

```bash
npm run web:container             # starts container on http://127.0.0.1:18081
npm run web:container:wait        # blocks until the bundler is serving HTTP 200
# (Claude calls browser_navigate / browser_take_screenshot / browser_resize)
npm run web:container:down        # tear down when done
```

Mobile viewports live as inline args to the Playwright MCP — switch
between `Pixel 7` (412 × 915) and `iPhone 14` (390 × 844) by calling
`browser_resize` mid-walkthrough.

Native (Android emulator + `adb screencap`) is not wired in this pass;
web coverage catches most regressions.

## SVG assets

Every SVG in this codebase is a coded placeholder. The swap contract
lives in [`SVG_ASSET_SPEC.md`](./SVG_ASSET_SPEC.md); the ingest rules for
raster art are in [`docs/asset-conventions.md`](./docs/asset-conventions.md)
(the original spec 11 asset pipeline is archived under
`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mobile/specs/`).

## License

TBD. Ask the project maintainer.
