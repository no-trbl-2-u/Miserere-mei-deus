# Phase AN1 — The enemy animates: a frame engine, then the enemy's turn

## Sources

- The `/plot` request from T, 2026-10-21 (attended), in T's sequence: the engine first and the enemy's
  turn animated; **once T sees it work**, three states per enemy; **after all of that**, the art pipeline
  generating the sheets.
- `axiomancer-mobile/assets/images/enemies/index.ts` — `ENEMY_ART_BY_KEY` maps three `portraitAsset`
  keys to `require()`d single `.webp` files, with `getEncounterEnemyArt(artKey, nonce)` resolving 1:1 and
  falling back to an FNV-1a hash pick over the pool, plus `hasEnemyArt(artKey)`. The resolver seam this
  phase extends already exists.
- `axiomancer-mobile/components/combat/encounter/CombatCombatantPane.tsx` — the enemy portrait is drawn
  here through `getEncounterEnemyArt` and `Image` from `@/lib/platform/image`. **The trigger already
  exists**: the `fx.seq` effect walks `fx.events` for `threat-fired`, `damage-dealt`, `effect-landed`,
  `dot-tick`, `vitae-sacrificed` and `player-healed`, and drives recoil / flash / squash / contact at
  `IMPACT = 100` through `react-native-reanimated` (`withDelay`, `withSequence`, `withTiming`,
  `runOnJS`). Reduced motion is already tracked in this file — `AccessibilityInfo.isReduceMotionEnabled()`
  plus a `reduceMotionChanged` listener held in a ref — and already gates those animations with
  `if (!reduceMotion.current)`. This phase follows that pattern; it does not invent one.
- `axiomancer-mechanics/src/Enemy/enemy.library.ts` — the roster: `enemy-float-eye` (`float-eye`),
  `enemy-brine-hag` (`brine-hag`), `enemy-the-doorwarden` (`the-doorwarden`), and `sandbag-01`, the dev
  dummy, which carries **no** `portraitAsset`. This is what makes T's "used enemy" guard checkable.
- `axiomancer-mobile/scripts/generate-art.mjs` and `scripts/art/{prompt,style,adapter,qa}.mjs` with
  `backends/openai.mjs` — the ruled generation route (phase 73): compile → generate → ingest, sharing
  `RECIPE` and `mergeProvenance` with `ingest-art.mjs`, inert with no `OPENAI_API_KEY`. It has no sheet,
  grid or frame concept today.
- `axiomancer-mobile/app/devart/` (and `devpuzzle/`, `devaftermath/`) — the dev-route precedent that lets
  T see a surface work before any shipped art changes.
- **The 1:1 art law is retired**, not standing: `plan/2026-09-02-big-numbers-overhaul.prompt.md` L16
  retires it — "keep every existing `portraitAsset` binding … but the *law* is gone." The header comment
  in `enemies/index.ts` still asserts it, which is stale and this phase corrects. Without that check a
  reviewer would read a sprite sheet as breaking a standing law.
- **D88, D37 and THE OPEN GATE** — art and content are owner-only. T's ruling below narrows that for one
  specific case, and the narrowing is the reason this brief records a new decision.

## Outcome

The enemy's turn is something you watch rather than infer. A frame set, when one exists, plays on the
enemy's attack beat; an enemy with no frames renders exactly the single image it renders today.

Measure: `npm run verify -w axiomancer-mobile` passes; a dev route plays a supplied sheet end to end; and
a test over every key in `ENEMY_ART_BY_KEY` shows the static fallback while no frame set is installed.

## Acceptance

- **A1** A frame-set registry keyed by `portraitAsset`, beside `ENEMY_ART_BY_KEY`, mapping a key to an
  ordered frame list plus a manifest (cell count, intended fps, and the resting frame index). An
  enemy with no entry resolves exactly as today.
- **A2 (ships changing no pixel)** With the registry empty, every key in `ENEMY_ART_BY_KEY` —
  `float-eye`, `brine-hag`, `the-doorwarden` — renders the same single image it renders now, proven by a
  test that enumerates the registry rather than naming three keys, so a fourth enemy is covered without
  editing the test.
- **A3** A player component drives a frame list through `react-native-reanimated`, the same library the
  pane already uses. It never mutates the pane's existing recoil / flash / squash / contact values.
- **A4 (reduced motion and e2e)** When `reduceMotion.current` is true, the component renders the
  manifest's resting frame and plays nothing — gated by the **same ref the pane already maintains**, not
  a second mechanism. The e2e path likewise short-circuits to the resting frame so suites stay hermetic
  and fast, and a test asserts both.
- **A5 (a partial loop is a failure, not a shrug)** A frame set whose file count disagrees with its
  manifest, or whose resting index is out of range, fails a test. It must never render a truncated
  animation.
- **A6 (the frame contract)** The manifest declares an **anchor kind**, and the contract is written
  down with the evidence for each.
  - `foot-line` is the kind for a creature that stands, and the default. T's supplied sheet measured 8
    cells of 443×443 with the foot line stable to 23px (5.2% of cell) while the bounding-box centre
    wandered 49.5px (11.2%) because the weapon swings. Anchoring on the bbox would make that creature
    bob; anchoring on the feet does not.
  - `centre` is the kind for a creature that floats, where **no foot line exists** and the hover *is* the
    idle animation — an anchor that tracked the body would cancel the very motion the clip is for. The
    float-eye is the case: `art-department/masters/enemies/float-eye.sheet.json` declares
    `anchor: {kind: "centre"}` and its rig holds that point fixed by construction, every pose being an
    offset from it.
  - A manifest naming neither kind fails, the same way A5 fails a count mismatch. A single universal rule
    would have shipped an engine that breaks on the first enemy it was pointed at.
  Each cell is alpha-matted (T's sheet carried 0.85% red matte fringe, which would read as a rim glow
  against `AXM.bg` `#0b0a09`).
- **A6b (grade once, never twice)** A cell goes through the same `RECIPE` as every other asset — longest
  edge ≤640, WebP q44 — but the **grade is applied exactly once in an asset's life**, and the manifest
  records whether it has been. Two corrections to the original wording, both found by measurement:
  - `RECIPE` in `scripts/ingest-art.mjs` is `{maxEdge: 640, quality: 44, grayscale: true, brightness:
    0.62, contrast: 1.08}`. **`grayscale: true` was omitted** from this brief's first draft. Run on the
    float-eye it flattens the corona from RGB (62, 61, 16) to a flat grey 56 — and the corona flare is the
    entire read of the attack frame. A colour enemy cannot be greyscaled on the way in.
  - A sheet **derived** from an already-ingested painting has its source's grade baked in. Re-running the
    grade darkens it twice. A derived set therefore ingests with `--no-grade` (the flag
    `scripts/ingest-art.mjs` already parses) and says so in its provenance; only a **newly generated**
    sheet, whose cells have never been graded, takes the full `RECIPE`.
  An animated enemy must not look graded differently from a static one — which is an argument for
  grading once, not for grading again.
- **A7 (T can see it work)** A dev route under `app/` in the manner of `devart/` plays an installed frame
  set at its manifest fps, with controls to step frames and to toggle the reduced-motion path, so T can
  judge the engine before any shipped enemy changes.
- **A8** `enemies/index.ts`'s header comment stops asserting the retired 1:1 art law and says what is
  actually true: one *or more* assets per enemy, bindings preserved.

- **A9 (the first enemy is actually installed)** `float-eye` has a frame-set registry entry and animates
  in live combat. The acceptance is behavioural, not structural: a test drives the encounter pane for
  `float-eye` and asserts the frame player mounts and advances, where the same test for an enemy with no
  entry asserts the static image — so "the registry is wired" and "an enemy animates" cannot pass
  separately. A1–A8 build an engine that is allowed to have nothing in it; A9 is the statement that
  stops that being the shipped state. `float-eye` passes D97's used-enemy test: `enemy-float-eye` is in
  `enemy.library.ts`'s roster with `portraitAsset: 'float-eye'`, and `float-eye` is a key of
  `ENEMY_ART_BY_KEY`.
- **A10 (cells are shipped, the master is not)** What the app loads is **per-cell WebP**, one file per
  frame, produced from the master by a tool in `art-department/` and ingested with `--no-grade` per A6b
  because this set is derived. The 2048x768 master PNG is a build input and never enters
  `axiomancer-mobile/assets/`. This is not a preference. The master already lives in
  `art-department/masters/enemies/`, because `scripts/asset-provenance.test.mjs` fails any file under
  `assets/images` that no registry reaches - correctly, since an unregistered file in a bundled tree is
  dead weight (it failed #720 on exactly that, and the masters moved rather than the test bending).
  AD1b then lands D98's guard that nothing in the repository resolves a path into that tree, so a
  registry entry pointing at the sheet file would fail that guard the day AD1b merged. Per-cell is also what A1's "ordered frame list" already asks for.
- **A11 (the bundle cost is a number)** The phase records the measured per-frame and per-set size against
  the static image it adds to, and a test asserts no cell exceeds a recorded ceiling, so a later
  regenerated set cannot quietly triple. Measured on the existing sheet at `RECIPE` q44: 24 cells,
  149.5 KB total, mean 6378 B, max 9020 B, against 23624 B for `float-eye.webp` — 6.5x, +126 KB for one
  enemy. This closes AN1's own "Bundle cost" follow-up, which asked for a number rather than a feeling.

Measure: the A2 enumeration test green with an empty registry; the A5 fixture matrix green; the dev route
plays a sheet; the float-eye animates in a live encounter test while an unregistered enemy still renders
its static image; `npm run verify -w axiomancer-mobile` green.

## Scope

- `axiomancer-mobile/assets/images/enemies/`: the frame registry and the manifest type. No art.
- `axiomancer-mobile/components/`: the frame-player component and its tests.
- `axiomancer-mobile/components/combat/encounter/CombatCombatantPane.tsx`: in AN1b only.
- `axiomancer-mobile/app/<dev route>/`: the harness (A7).
- `axiomancer-mobile/scripts/`: in AN1d only.
- `art-department/`: in AN1e only — the sheet splitter. No app code lives there (D98).
- `axiomancer-mobile/assets/images/enemies/anim/float-eye/`: in AN1e only — the shipped per-cell WebP.
- Not touched: the FX event vocabulary, the engine, `enemy.library.ts`, the existing recoil/flash/squash
  animations, any timing or colour value outside the new component.

## Consumers to update

- `axiomancer-mobile/docs/asset-conventions.md` — the frame-set layout, the foot-line anchor and the
  manifest shape.
- `axiomancer-mobile/assets/images/enemies/provenance.json` — a frame set is several files under one
  record; state how a set is recorded.
- `plan/bearings.md` — D97 (below).

## Save / schema contracts

None. Frames are assets and a manifest; nothing is persisted and no save reads them.

## Decisions made upfront — DO NOT ASK

- **D97 — a sprite sheet for an already-used enemy is enhancement, not content creation (T, attended,
  2026-10-21).** It may therefore run as ordinary `/march` ticks. The guard is T's own and is narrow:
  **only** for an enemy that is used, never one we merely hold an image for. Machine-checkable as: the id
  appears in `enemy.library.ts`'s roster **with** a `portraitAsset`, **and** that key is in
  `ENEMY_ART_BY_KEY`. Today exactly three qualify; `sandbag-01` does not, having no `portraitAsset`.
  Anything outside that set — a new enemy, a new creature, art for a surface other than enemies — stays
  owner-only under D88/D37, and the generator refuses it rather than asking. The reach of this ruling is
  deliberately the smallest thing that satisfies what T asked for.
- **The engine ships before the art, and changes no pixel** (A2). A frame engine and a frame set in one
  phase would make the engine's review hostage to an art review. The registry starts empty.
- **An anchor kind, not one anchor** (A6), from measurement, not taste. The foot line is right for a
  creature that stands and wrong for one that floats, and the roster already contains both.
- **Grade once** (A6b). The failure this prevents is silent: a double-graded or greyscaled cell still
  renders, still passes every count and range check, and simply looks wrong next to the static art.
- **Reuse the pane's existing `reduceMotion` ref** (A4) rather than adding a second source of truth for
  the same preference; two mechanisms drift and one of them will be the one that is wrong.
- **One grid image, split after** for AN1d. Generating frames one at a time is what breaks character
  consistency; the single grid is why T's own sheet came out consistent. The split, matte and per-cell
  ingest happen locally after one generation call.
- **A dev route, because "T sees it work" is an acceptance** (A7), and the repo already has three.
- **Slot: asap.** T asked now, it blocks no open row, and AN1b/AN1c/AN1d all wait on AN1a.
- **An engine with an empty registry is not what T asked for** (A9). T's words, attended 2026-10-21:
  "I want, once the animation phases are done, to see the floating eye animated." A1–A8 are
  deliberately satisfiable with nothing installed, AN1b and AN1c explicitly leave an enemy with no
  frame set untouched, and AN1d builds a generator that calls `gpt-image-2` through
  `backends/openai.mjs` — code this brief already notes has never been executed, on an account with
  no credits. All four rows could therefore ship green with the float-eye as static as it is today.
  AN1e is the row that makes the stated outcome an acceptance rather than an expectation.
- **Per-cell WebP, not the sheet file** (A10), forced by D98 rather than chosen. AD1b lands the guard
  that nothing in the repository resolves a path into `art-department/`, and moves the masters there;
  a `require()` of `float-eye.sheet.webp` would break on the day AD1b merged. The split happens in
  `art-department/` and emits into the app's asset tree, which is the direction D98 permits.
- **AN1e requires AD1a, not just AN1c.** The splitter is art tooling and belongs in `art-department/`,
  which AD1a creates; writing it inside `axiomancer-mobile` would mean moving it immediately after.
  It does **not** wait on AD1b: #720 already landed the masters outside the bundled tree, so AD1b's
  remaining work - the `.easignore` entry and the boundary guard - neither blocks nor is blocked by
  the split. AD1a requires nothing, so this adds no wait to the AN1 chain.
- **The set is derived, so it ingests with `--no-grade`** (A6b). Its cells descend from an already
  graded painting; the full `RECIPE` would grade them twice and greyscale the corona.

## Tests matrix

- `components/__tests__/`: the frame player — advances frames, stops at the end for a one-shot, holds the
  resting frame under reduced motion and under the e2e flag (A3, A4).
- `assets/images/enemies/__tests__/`: the A2 enumeration over `ENEMY_ART_BY_KEY`, and the A5 manifest
  mismatch fixtures (count disagreement, resting index out of range).
- AN1b adds a pane test that the attack beat selects the attack animation and that the existing
  recoil/flash values are unchanged.
- No change to the existing combat suites' intent.

## Verify gate

`npm run verify -w axiomancer-mobile`.

## Commit body template

```
enemies: a frame engine, with today's single image as the fallback

Enemies rendered one static webp each and nothing in the app animated
frames. A frame-set registry sits beside ENEMY_ART_BY_KEY and an enemy
with no entry renders exactly what it rendered before, so this lands
changing no pixel. Frames anchor on the foot line, not the bounding box:
the reference sheet held its feet to 5.2% of cell while the bbox centre
wandered 11.2% as the weapon swung. Reduced motion reuses the pane's own
ref and holds the resting frame.
```

## DoD

A1–A8 ticked.

## Phases

### AN1a — The frame engine, the fallback, and the dev route (Size: M)

Closes A1–A8, including A6b. Requires nothing. Attended: no.

The primitive and the harness, with the registry empty. Nothing in live combat changes.

Measure: the A2 enumeration green with an empty registry; the dev route plays a supplied sheet; verify green.

### AN1b — The enemy's turn is animated (Size: M)

Closes nothing new; it wires AN1a into combat. Requires AN1a. Attended: no.

The attack animation plays on the enemy's beat in `CombatCombatantPane`, off the **existing** `fx.seq`
walk — `threat-fired` and `damage-dealt` — at the existing `IMPACT` offset, gated by the existing
`reduceMotion.current`. An enemy with no frame set is untouched.

Measure: a pane test shows the attack animation selected on the beat and the existing recoil/flash values
unchanged; verify green.

### AN1c — Three states per enemy: idle, struck, attacking (Size: M)

Requires AN1b, **and T having seen AN1b work** — T sequenced it that way. Attended: no.

The manifest grows to name three animations; the engine selects idle as the resting loop, the struck
animation when the enemy takes damage, and the attack animation on its beat. Idle loops; the other two
are one-shots returning to idle.

Measure: a test per state selecting the right animation, idle looping and the one-shots returning.

### AN1d — The pipeline generates sheets for used enemies only (Size: L)

Requires AN1c. Attended: no — this is the phase D97 makes march-tickable.

`generate-art.mjs` gains a `frames: { cols, rows }` block in the spec: one grid image per generation,
then split, alpha-matte and ingest each cell through the existing `RECIPE`, with one provenance record
covering the set and carrying backend, model, prompt, style version and date as the route already does.
It **refuses** an id that fails D97's used-enemy test, and says so rather than generating.

Measure: a dry run compiles a sheet request for a used enemy and refuses an unused one by name; a fixture
grid splits to the manifest's cell count; `npm run art:test` green.

### AN1e — The float-eye is installed, and animates (Size: M)

Closes A9, A10, A11. Requires AN1c and AD1a. Attended: no — D97 makes a used enemy's sheet
enhancement, and this row generates no art at all: it installs one that already exists.

The payoff row. `art-department/masters/enemies/float-eye.sheet.png` (landed by #720) is split by an
`art-department/` tool into 24 per-cell WebP, ingested `--no-grade`, and registered against
`float-eye`. Its manifest already declares `anchor: {kind: "centre"}` per A6 and names its clips
`idle` / `struck` / `attacking`, which is AN1c's vocabulary exactly, so this is a registry entry and
a split, not a remap. No model is called and nothing is spent.

Measure: an encounter test for `float-eye` shows the frame player mounting and advancing while the
same test for an unregistered enemy shows the static image; reduced motion holds the resting frame;
no cell exceeds the recorded ceiling; `npm run verify -w axiomancer-mobile` green.

## Follow-ups (not in this phase)

- **A smoke test for the OpenAI backend.** `backends/openai.mjs` defaults to `ART_MODEL=gpt-image-2` and
  its own comment admits this code has never called it. Before AN1d is trusted, one keyed call should
  prove the request shape. T supplies the key; nothing in this phase spends.
- ~~**Bundle cost.**~~ Closed by A11, measured on the real sheet: 24 cells at q44 cost 149.5 KB against
  23624 B for the static image, mean 6378 B per frame. 6.5x for one enemy is the number AN1c, AN1d
  and AN1e are judged against.
- **AN1d's first sheet is no longer the only path to a working animation.** AN1e proves the engine end
  to end on a free, already-rigged asset, so the keyed smoke test above gates AN1d's *generator*
  rather than gating whether anything animates at all. Whether the other two enemies are rigged from
  their paintings the way the float-eye was, or generated, is a question for AN1d and is not answered
  here: the rig exploited a composition the float-eye happens to have — an eye floating in a black
  disc, where a moved layer's seam is black on black — and it does not generalise.
- **The player's own frames.** The player portrait is static too; whether the player animates is a
  separate design question this phase does not raise.
