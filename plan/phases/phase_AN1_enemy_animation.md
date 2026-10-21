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
- **A6 (the frame contract)** Frames are anchored on the **foot line**, not the bounding box, and the
  contract is written down with the evidence: T's supplied sheet measured 8 cells of 443×443 with the
  foot line stable to 23px (5.2% of cell) while the bounding-box centre wandered 49.5px (11.2%) because
  the weapon swings. Anchoring on the bbox would make the creature bob; anchoring on the feet does not.
  Each cell is alpha-matted (that sheet carried 0.85% red matte fringe, which would read as a rim glow
  against `AXM.bg` `#0b0a09`) and goes through the **same** `RECIPE` as every other asset — longest edge
  ≤640, WebP q44, brightness 0.62 / contrast 1.08 — so an animated enemy cannot look graded differently
  from a static one.
- **A7 (T can see it work)** A dev route under `app/` in the manner of `devart/` plays an installed frame
  set at its manifest fps, with controls to step frames and to toggle the reduced-motion path, so T can
  judge the engine before any shipped enemy changes.
- **A8** `enemies/index.ts`'s header comment stops asserting the retired 1:1 art law and says what is
  actually true: one *or more* assets per enemy, bindings preserved.

Measure: the A2 enumeration test green with an empty registry; the A5 fixture matrix green; the dev route
plays a sheet; `npm run verify -w axiomancer-mobile` green.

## Scope

- `axiomancer-mobile/assets/images/enemies/`: the frame registry and the manifest type. No art.
- `axiomancer-mobile/components/`: the frame-player component and its tests.
- `axiomancer-mobile/components/combat/encounter/CombatCombatantPane.tsx`: in AN1b only.
- `axiomancer-mobile/app/<dev route>/`: the harness (A7).
- `axiomancer-mobile/scripts/`: in AN1d only.
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
- **Anchor on the foot line** (A6), from measurement, not taste.
- **Reuse the pane's existing `reduceMotion` ref** (A4) rather than adding a second source of truth for
  the same preference; two mechanisms drift and one of them will be the one that is wrong.
- **One grid image, split after** for AN1d. Generating frames one at a time is what breaks character
  consistency; the single grid is why T's own sheet came out consistent. The split, matte and per-cell
  ingest happen locally after one generation call.
- **A dev route, because "T sees it work" is an acceptance** (A7), and the repo already has three.
- **Slot: asap.** T asked now, it blocks no open row, and AN1b/AN1c/AN1d all wait on AN1a.

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

Closes A1–A8. Requires nothing. Attended: no.

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

## Follow-ups (not in this phase)

- **A smoke test for the OpenAI backend.** `backends/openai.mjs` defaults to `ART_MODEL=gpt-image-2` and
  its own comment admits this code has never called it. Before AN1d is trusted, one keyed call should
  prove the request shape. T supplies the key; nothing in this phase spends.
- **Bundle cost.** N frames per enemy where there is now one image, at WebP q44 / ≤640px. AN1a should
  record the per-frame size it measures so AN1c and AN1d can be judged against a number rather than a
  feeling.
- **The player's own frames.** The player portrait is static too; whether the player animates is a
  separate design question this phase does not raise.
