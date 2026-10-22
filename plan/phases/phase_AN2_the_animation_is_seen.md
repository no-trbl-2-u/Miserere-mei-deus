# Phase AN2 — The animation is seen

## Sources

- `axiomancer-mobile/components/combat/encounter/EnemyActionCard.tsx` — a centred
  `StyleSheet.absoluteFillObject` layer at `zIndex: 45`, `ENTER_MS 160` + `HOLD_MS 1500` +
  `EXIT_MS 240`, mounted from `CombatEncounterPanel.tsx:796` after END PHASE. It sits over
  the enemy for roughly two seconds during the turn the lunge plays.
- `axiomancer-mobile/state/presenters/combat-encounter.engine.ts` — `selectEnemyActionCard`
  and `EnemyActionCardVM`, the card's shaping.
- `axiomancer-mobile/components/combat/frames/useEnemyClipSelection.ts` — `struck` is
  selected at t=0; `attacking` waits `ENEMY_ATTACK_IMPACT_MS` (100 ms,
  `components/combat/frames/enemyAttackBeat.ts:26`).
- `axiomancer-mobile/components/combat/encounter/CombatCombatantPane.tsx` — the pane's own
  recoil / flash / squash / contact all already run `withDelay(IMPACT, …)`.

## Outcome

The float-eye's three clips are visible when they play. T watched the shipped build
(2026-10-21) and reported the flinch landing mostly behind the player's own cards, and the
enemy action card covering part of the lunge.

Measure: the struck clip is not selected while the played card is still over the enemy; no
centred overlay renders during the enemy's turn; `npm run verify -w axiomancer-mobile` green.

## Acceptance

- **A1 (the enemy action card goes)** `EnemyActionCard.tsx`, its mount in
  `CombatEncounterPanel.tsx`, `selectEnemyActionCard`, `EnemyActionCardVM` and the two test
  files that cover them are deleted. T's ruling, attended, 2026-10-21: "that's gotta go.
  It's mostly pointless and blocks part of the animation."
- **A2 (nothing else dims for it)** Removing the card does not change the threat-sequence
  telegraph, the `IntentIcon`, the damage floats or the combat log. Those are what still
  tell a player what happened, and a test or the diff shows each untouched. The card's own
  header claimed it stopped an END PHASE reading as "some damage happened"; T judged the
  glyph before and the floats after sufficient, and this records that it was a judgement
  rather than an oversight.
- **A3 (the flinch waits for the board to clear)** The `struck` clip is selected only once
  the player's played-card animation is no longer over the enemy. The delay is **derived
  from that animation's own duration**, not a new magic number — if no constant is
  exported for it today, export the one that already governs it rather than typing a
  second copy. `attacking` keeps the existing `ENEMY_ATTACK_IMPACT_MS` offset it shares
  with the pane's recoil.
- **A4 (the wait does not eat the clip)** A struck clip that is delayed still plays in full
  and still returns to idle; two hits in quick succession do not leave the enemy stuck in
  `struck`, and the monotonic play token AN1c introduced still decides which return wins.
- **A5 (reduced motion is unchanged)** With reduced motion on, the enemy holds its resting
  frame and no delay is introduced, because nothing is animating to wait for.

Measure: a test asserting `struck` is not selected before the card-clear delay and is after;
the A4 double-hit case; the existing reduced-motion and juice-comparison suites still green.

## Scope

- `axiomancer-mobile/components/combat/encounter/` — the card's deletion and its mount.
- `axiomancer-mobile/state/presenters/combat-encounter.engine.ts` — the presenter's removal.
- `axiomancer-mobile/components/combat/frames/useEnemyClipSelection.ts` — the struck delay.
- Not touched: the frame engine itself (`useFramePlayback.ts`), the registry, the cells, the
  art, the threat sequence, the pane's recoil / flash / squash / contact values.

## Save / schema contracts

None.

## Decisions made upfront — DO NOT ASK

- **T watched it and ruled on both, attended, 2026-10-21**, after installing the first
  preview APK carrying AN1. The idle hover, the flinch and the lunge all play correctly on
  device; these are two visibility defects, not animation defects.
- **Delete the card rather than move or shrink it** (A1). T was offered keeping its text in
  the log and shrinking its hold, and chose outright removal.
- **Delay the flinch rather than reroute the card** (A3). T was offered moving the played
  card's flight path instead and chose the delay, so the hit reaction is slightly later and
  always seen.
- **The delay is derived, not typed.** `ENEMY_ATTACK_IMPACT_MS` already exists because the
  pane and the frame engine must agree about when a blow lands; a second hand-typed
  constant for when a card clears would drift the same way.
- **This phase does not touch the driver.** T confirmed on device that the per-frame hover
  ticks, so the `web-mapper-does-not-tick` lesson is a web-export limitation only. Nothing
  here is a fix for it.

## Tests matrix

- `components/combat/frames/__tests__/` — struck not selected before the delay, selected
  after; the double-hit case; reduced motion introduces no delay.
- `components/combat/encounter/__tests__/` — the two `EnemyActionCard` suites are deleted
  with the component; the juice-comparison and frames suites stay green unchanged.

## Verify gate

`npm run verify -w axiomancer-mobile`.

## Commit body template

```
combat: the enemy's animation is not covered while it plays

T watched the first preview build and found two things hiding the work:
the flinch fired while the played card was still over the enemy, and the
enemy action card held a centred overlay for nearly two seconds across
the lunge. The card is gone, and the struck clip waits for the board to
clear, off the same constant the pane already uses rather than a second
copy of it. The frame engine, the registry and the cells are untouched.
```

## DoD

A1–A5 ticked.

## Phases

### AN2a — The enemy action card goes (Size: S)

Closes A1, A2. Requires nothing. Attended: no.

A deletion: the component, its mount, its presenter and its two suites. The telegraph glyph
and the damage floats stay.

Measure: nothing renders a centred overlay during the enemy's turn; verify green.

### AN2b — The flinch waits for the board to clear (Size: S)

Closes A3, A4, A5. Requires nothing — it touches the clip selection, not the card.
Attended: no.

Measure: struck is not selected before the derived delay and is after; the double-hit case
holds; reduced motion is unchanged; verify green.

## Follow-ups (not in this phase)

- **A damage-over-time tick still counts as struck.** AN1c read "struck on damage taken"
  broadly, so poison makes the eye flinch each tick while the pane's own recoil does not.
  T has seen it and not objected; if it reads wrong once a DoT enemy is common, it is one
  line in `isEnemyStruckBeat`.
- **A self-targeting enemy will need a fourth clip** (T, attended, 2026-10-21: "not yet, but in
  the very near future, when we have an enemy that targets itself (ie. a buff or a heal) it'll
  need a unique animation"). Today that case is *correct but mute*: #747's gate means
  `isEnemyAttackBeat` requires `intentDamage > 0`, so a heal or buff selects `idle` rather than
  miming a swing. The thing to decide before the clip is authored is the **contract**, because
  AN1c made `REQUIRED_CLIPS` exactly `idle` / `struck` / `attacking` and `validateFrameSet`
  FAILS a manifest missing any of them. A fourth name is therefore either optional with a
  declared fallback, or mandatory and every sheet must be regenerated to carry it. While the
  float-eye is the only installed set that regeneration is free, which is an argument for
  settling it soon rather than when there are three sheets. The rig would also need a fourth
  row, and `float-eye.sheet.json` currently declares `rows: 3`.
- **The hag and the doorwarden have no frame sets.** T is weighing replacement source images
  chosen for riggability against rigging what exists. Neither needs AN1d's generator or any
  API spend. Not plotted.
