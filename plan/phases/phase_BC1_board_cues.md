# Phase BC1 — The board says what it does: your own INFERNO, "after BLIZZARD", and END on a dead tray

> Agent-facing brief, plotted by T (`/plot`, 2026-10-25, unattended run of
> T's "plot them all, one plot run, one PR"). Mobile cues reading engine
> state, plus one additive field on one engine selector. No rule, card,
> keyword or enemy change (D88, D99); no layout change (D92). Ship without
> asking; record judgment calls in the commit body.

## Sources

- T's `/messy` of 2026-10-24 (the Elementalist swarm): part plan
  `plan/revamp/mobile.md` "The board says what it does (T, 2026-10-24,
  `/messy`)", items 2, 3 and 4. Item 1 is withdrawn (T, 2026-10-24); items
  5-7 are plotted separately (GL1, TQ1).
- The candidate this plot promotes: `plan/PHASE_CANDIDATES.md` "The board
  says what it does: the player's own INFERNO, "after BLIZZARD", and the
  END consequence on a dead tray" (moved to Promoted by this plot).
- Evidence: `docs/reports/playtest-elementalist-act1-2026-10-24.md`
  (four `playtester` agents, HEAD 1fb78ac87): R3 (self-burn with no
  on-board cause: `weather-changed your-inferno 0→2`, `dot-tick inferno
  target self 4` every round; on the door fight every VITAE lost after
  round 3 was self-burn), R9 (the intent drops after BLIZZARD with no cue,
  `blizzard-softened` in the log only; the intent's a11y line reads "(12
  damage). Deals 8"), R15 and §3 line 104 (END with cards in hand and an
  all-MISS tray in six of eight door-fight rounds, `combat-end-consequence`
  absent in all six).
- T's additions on PR #906 (2026-10-25, in session): "the damage numbers
  float closer to the enemy and float for longer so the player can see.
  Furthermore, for all DoT ticks, have each tick: 1) font = colour of the
  element; 2) each tick is its own unique damage tick (instead of
  aggregating the numbers)." Closed by A8-A10; "base, DEAL, be white numbers to separate" closed by A11.
- Decisions: **D88/D99** (content per surface; cues and labels are new UI
  strings, not card text), **D91** (one card face; untouched), **D92**
  (board layout: intent and chips top-left, footer dock, no corner chrome,
  LOG not on the board), **D84** (code by `loop:pr` PR), **D93** (this plot
  lands by PR).

## What exists (mapped 2026-10-25 on `main` 171d85c64)

- **Your INFERNO is already a chip.** EL1b (#864) put it in the player
  status strip: `weatherChips(state, 'player')`
  (`state/presenters/combat-encounter.engine.ts:1774`, mark
  `your-inferno`, glyph label "Your Inferno") rendered by `EffectChips`
  (`components/combat/encounter/CombatCombatantPane.tsx:211`) inside the
  board's `statusStrip` (`CombatBoard.tsx:1405`). It is the same flame
  glyph and bare number as the foe's INFERNO chip, with no word saying it
  is yours or what it costs; its a11y line reads "intensity 4, 0 turns
  left". The engine's number is `yourInferno(el)`, what you lose at the
  start of your turn (`axiomancer-mechanics/src/Combat/combat.elements.ts:69`).
- **The self tick floats as a bare number.** `PlayerMedallion` collects
  `dot-tick` events with `target: 'self'` and floats `-4` in tick purple
  (`CombatCombatantPane.tsx:321`, float push at about :348) with no cause.
  The engine emits the INFERNO tick as `{ kind: 'dot-tick', effectId:
  'inferno', label: 'INFERNO', target: 'self' }`
  (`combat.card-program.ts:1201`). The log says "INFERNO ticks for 4 on
  you." (`combat-encounter.engine.ts:795`), but LOG is not on the board
  (D92).
- **The intent already nets BLIZZARD, silently.** `projectIncomingThreat`
  (`combat.engine.ts:1914`) returns `projectedDamage` as the per-hit sum
  `max(0, h − blizzard)` over `threatHits(state)` when BLIZZARD is up; the
  pill prints it (`IntentIcon.tsx:31,62`), so the number drops (−16 → −11)
  with nothing saying why. Neither the cut nor the pre-BLIZZARD figure is
  exposed, and `threatHits` is not exported from `@mechanics`.
- **The intent's a11y line carries two numbers.** `IntentIcon` builds
  `Enemy intent: ${label}. ${description} Deals ${hit} damage.`
  (`IntentIcon.tsx:36-37`); `description` is `buildThreatAction`'s
  `"<action> (<authored payload>)."`, so the authored figure and the
  scaled one disagree. The presenter already has `stripThreatPayload`
  (`combat-encounter.engine.ts:614`) for the log.
- **The dead-tray test skips MISS.** `CombatBoard.tsx:1224-1233`:
  `playableDice` keeps only `draggable` dice, and a MISS face is never
  draggable (`diceVM`, `combat-encounter.engine.ts:996`), so an all-MISS
  tray yields `playableDice.length === 0` and `deadTray` false: no
  `combat-dead-tray` line, no FREE prominence, no `combat-end-consequence`.
  The rule and its copy live in the component, against the house style (no
  player-facing copy in a component; rules derived in the presenter).

- **The floats sit high and leave fast.** The enemy float layer is pinned
  at `top: 116` (`CombatCombatantPane.tsx:891`), under the HUD crest, while
  the figure is bottom-anchored in `enemyFigureWrap` (`:813`, `top:
  COMBAT_HUD_HEIGHT - 14`, `bottom: '9%'`, `justifyContent: 'flex-end'`),
  so on a tall screen the numbers rise from above the foe's head, well
  clear of its body. Every combat float uses the shared number-pop timeline
  `JUICE_TIMING.numberPop` (`lib/juice/juice.timing.ts:55`: rise 34 px over
  880 ms, fade starting at 120 ms over 760 ms), so a number is readable for
  well under a second.
- **DoT floats are one colour and land on top of each other.** The engine
  already emits one `dot-tick` per DoT source (`dotTickBreakdown`,
  `combat.engine.ts:1672`, one entry per active effect; the weather ticks
  one per element, `combat.card-program.ts:1201,1290`), but the board
  paints every enemy tick `HUE.hexAmber` (`CombatCombatantPane.tsx:556-560`)
  and every self tick `HUE.tickPurple` (`:347`), all in the same frame with
  a 20-36 px jitter, so two or three ticks read as one smeared number, and
  nothing says which element each one is. The element colours already exist
  once, in the presenter (`WEATHER_WORD`, `combat-encounter.engine.ts:700`:
  INFERNO `damageRed`, STORM `goldAccent`; status DoTs via `effectGlyph`).

## Outcome

On the combat board, the player can see without opening LOG that their own
INFERNO is burning them and by how much, that the foe's hit is smaller
because of BLIZZARD and by how much, and what END does whenever no unspent
die can power any card in hand (MISS faces included). Damage numbers rise
from the foe's body and stay long enough to read, and every DoT tick lands
as its own number in its element's colour.

Size: M

## Acceptance

- **A1** While your INFERNO is above 0, the player status strip shows it as
  yours in words: the chip carries a visible caption `YOUR INFERNO −n each
  turn` (testID `combat-self-burn`), where `n` is `yourInferno(el)` read
  through the presenter, and the copy is a presenter export, not a
  component literal. The foe's INFERNO chip is unchanged. A weather chip's
  a11y line no longer says "0 turns left" (it says it lasts the combat).
- **A2** A self `dot-tick` float on the player medallion names its cause:
  `INFERNO −4`, not `-4` (any self DoT float carries its event `label`).
  The log line for a self INFERNO tick reads `Your INFERNO burns you for
  4.`; enemy-side and non-weather tick lines are unchanged.
- **A3** `projectIncomingThreat` returns one more field, `blizzardCut`: the
  total BLIZZARD takes off this phase's hits, as the engine applies it (the
  sum over `threatHits` of `min(h, blizzard)`; 0 with no BLIZZARD or when
  the foe is denied). `projectedDamage` and every existing field are
  unchanged. A mechanics test pins `projectedDamage + blizzardCut ===
  sum(threatHits)` with BLIZZARD up, and `blizzardCut` equals the
  `blizzard-softened` amount the engine emits when that phase resolves with
  no guard.
- **A4** While `blizzardCut > 0` and the turn is not DENIED, the intent
  shows `after BLIZZARD −n` under its pill (testID
  `combat-intent-blizzard`, BLIZZARD's guard-blue), and the intent's a11y
  line says the same. With no BLIZZARD the intent renders exactly as today.
- **A5** The intent's a11y line carries one damage number: the
  description is passed through `stripThreatPayload` (moved to or exported
  from the presenter, one copy), followed by `Deals <hit> damage.` where
  `<hit>` is the pill's number. No "(12 damage). Deals 8".
- **A6** The dead tray is a presenter selector over the view model: true
  when dice are rolled, the hand is not empty, at least one tray or Reserve
  die is unspent, and no unspent die can power any card in hand under
  `dieCanPowerCardVM` (a MISS face or an X die powers nothing). An all-MISS
  tray with cards in hand is a dead tray: the board shows
  `combat-dead-tray`, lights FREE, and END carries
  `combat-end-consequence`. A tray whose every die is spent is not a dead
  tray (no line). The consequence and dead-tray copy are presenter exports.
- **A8** The enemy's floats rise from the foe's figure, not the HUD crest:
  the enemy float layer is positioned inside (or measured against)
  `enemyFigureWrap`, its origin over the upper third of the drawn figure for
  both the normal and the boss figure sizes. The player medallion's floats
  stay where they are. A component test pins the enemy float layer as a
  child of the figure wrap (or its computed top against the figure's).
- **A9** Combat floats stay on screen longer: `JUICE_TIMING.numberPop`
  becomes a full read of about 1.6 s (fully opaque for at least 700 ms,
  then fading over about 900 ms, rising over the whole span), set once in
  `juice.timing.ts` so every combat float (hits, ticks, BLOCKED, DENIED,
  status words) moves together. Reduced motion is unchanged (instant). The
  juice timing test pins the new numbers.
- **A10** Every DoT tick, on either side, floats as its own number in its
  element's colour: one float per `dot-tick` event, never summed with
  another tick or with the hit; ticks resolved in the same beat are
  staggered (each starts about 180 ms after the previous, and stacks
  vertically so none overlaps another); each float carries its source
  label (`INFERNO −4`, `STORM −3`, `POISON −2`, extending A2 to the enemy
  side). The colour comes from one presenter export keyed by the tick's
  `effectId` (INFERNO `damageRed`, STORM `goldAccent`, any other DoT its
  `effectGlyph` colour), so the float, the chip and the log line share one
  table; no hex or `HUE` literal picks a tick colour in a component. A
  presenter test pins the colour per element; a board test pins two ticks
  in one event batch as two floats with two colours.
- **A11** Base damage floats white on both sides: the `-n` for a hit the
  foe takes (a card's DEAL) and for a hit the player takes is `HUE.white`,
  read from one presenter export (a `HIT_FLOAT_COLOR` beside the tick
  colour table), never a literal in a component. DoT ticks keep their
  element colour (A10), so no tick is ever white and no plain hit is ever
  coloured. A board test pins a DEAL float and a player-hit float as white
  and an INFERNO tick in the same batch as red.
- **A7** `npm run verify -w axiomancer-mechanics` and `npm run verify -w
  axiomancer-mobile` pass, and `node scripts/combat-round-e2e.mjs` and
  `node scripts/exploration-combat-roundtrip-e2e.mjs` pass.

**Measure:** the presenter and board suites pin the three cues against the
swarm's own cases (a `your-inferno` reading of 4 shows `YOUR INFERNO −4
each turn` and the tick floats `INFERNO −4`; BLIZZARD 5 over a 16 hit shows
−11 and `after BLIZZARD −5`; an all-MISS tray with three cards in hand
renders `combat-end-consequence`; an INFERNO 4 and a STORM 3 tick on the
foe float as two separate numbers, red and gold (the second about 180 ms
after the first) beside a white DEAL; the enemy float layer sits inside the figure wrap;
numberPop holds at least 700 ms), and both workspace verifies pass. The
swarm's numbers move to zero on its next run: self-burn VITAE deltas with
no on-screen line, `blizzard-softened` events with no paired text, and
`consequence:null` on all-MISS rounds.

## Scope

`axiomancer-mechanics` (one additive field):
- `src/Combat/combat.engine.ts`: `projectIncomingThreat` returns
  `blizzardCut` (A3). No other engine change; `threatHits` stays internal.
- `src/Combat/e2e/weather.engine.test.ts` (or the nearest weather suite):
  the A3 pins.

`axiomancer-mobile`:
- `state/presenters/combat-encounter.engine.ts`: `wallMath.blizzardCut` on
  `CombatIntentVM`; the self-burn caption on the `your-inferno` chip VM
  (a `caption` field on `CombatEffectChipVM`, set only for player weather
  marks); the self INFERNO log line; an exported `selectDeadTray(vm)` (or
  a `deadTray` boolean on the view model) and the dead-tray and END
  consequence copy; `stripThreatPayload` exported for `IntentIcon` (or an
  `a11yDescription` field on the intent VM, the presenter's choice).
- `components/combat/encounter/CombatCombatantPane.tsx`: `EffectChips`
  renders a chip's `caption` when present; the weather chip a11y line;
  `PlayerMedallion` floats a self tick with its label.
- `components/combat/encounter/IntentIcon.tsx`: the `after BLIZZARD −n`
  line and the one-number a11y line.
- `components/combat/encounter/CombatBoard.tsx`: reads the presenter's dead
  tray and copy instead of deriving them; no layout change.
- `components/combat/encounter/CombatCombatantPane.tsx` (A8, A10): the
  enemy float layer moves under `enemyFigureWrap`; the tick loops on both
  sides read the presenter's tick colour and label and stagger their pushes.
- `lib/juice/juice.timing.ts` and its test (A9): the longer number-pop.
- `state/presenters/combat-encounter.engine.ts` (A10): an exported
  `dotTickFloat(event)` (or equivalent) returning `{ text, color }` from the
  one element table.

## Consumers to update

- `PROGRAM_KIT.incomingNet` reads `projectIncomingThreat(...).netDamage`
  only; the new field changes nothing for it. `legibility-sweep` and the
  weather e2e destructure the result; an added field breaks neither.
- Mobile is the only other consumer of `projectIncomingThreat` (via
  `intentVM`). A diff under `src/Combat/**` runs the mobile verify (AGENTS.md
  cross-package checklist).

## Save / schema contracts

None. No save field, no migration, no `CombatEvent` change.

## Carrier sweep

Not an R-phase. The INFERNO and BLIZZARD glosses already exist (EL1b);
the captions use the same words.

## Decisions made upfront — DO NOT ASK

- **Item 1 (the drag-to-stage hint) is out: no hint, no PLAY on the
  reading sheet** (T, 2026-10-24: the drag is "obvious enough").
- **The glossary (item 5) and the interstitials and purse (items 6-7) are
  separate plots, GL1 and TQ1** (T, 2026-10-25). This phase adds no
  tap-to-read and touches no rest, cache, spoils or anvil screen.
- **The self-burn caption rides the existing player status strip, not the
  footer dock.** The strip is in flow above the hand and already holds the
  chip; a line in the dock's VITAE column would change D92's dock, which
  needs T's say-so. `[T to confirm]` (the leading option; the alternative
  is a dock line under the phase ledger).
- **The caption names the per-turn loss, not the stack.** `n` is
  `yourInferno(el)` (half the both-sides INFERNO, rounded down, plus any
  INFERNO on you alone), the number the next tick takes; the chip's badge
  keeps the number it shows today. Engine truth, read through the
  presenter, never recomputed in a component (AGENTS.md: rules live in
  mechanics).
- **The BLIZZARD cut comes from the engine, as a field on the selector the
  pill already reads.** Adding `blizzardCut` to `projectIncomingThreat`
  keeps one source for the pill, the cut and the `blizzard-softened` event;
  exporting `threatHits` and subtracting in the presenter would duplicate
  the engine's per-hit floor in mobile.
- **`after BLIZZARD −n` is the copy**, the candidate's own words, one line
  in BLIZZARD's colour under the pill where `→n` (the wall-math net) sits
  today; when both apply, the BLIZZARD line comes first. No new chrome in
  a corner (D92).
- **The one number is the pill's number.** The a11y line drops the
  authored payload parenthetical (as the log already does) and keeps the
  scaled hit. Which number is "right" for every surface (the reveal panel,
  the card faces) is the "Printed equals applied" candidate's, not this
  phase's.
- **A dead tray counts MISS and X dice as unable to power, and needs one
  unspent die.** The engine's END (`endTurn`) discards unusable dice and
  banks one mana or special die; a MISS die is unusable, so the existing
  line ("unusable dice are discarded · fresh roll next phase") is true for
  an all-MISS tray as written. A fully spent tray has nothing to discard,
  so it shows no line.
- **The dead-tray rule moves into the presenter** with its copy (house
  style: no player-facing copy and no rule derivation in a component); the
  board only renders it.
- **No new float on BLIZZARD's resolution.** The intent cue says it before
  the hit and the log narrates it after; a third surface would carpet the
  board. The swarm's measure is that the softening is *paired with text*,
  which A4 gives.

- **Closer to the enemy means the figure, not the crest** (T, 2026-10-25).
  The float origin moves onto the drawn figure's upper third; the HUD,
  intent and chips do not move (D92). The player's floats are already on
  the medallion and stay.
- **Longer applies to every combat float**, through the one shared
  timeline, so hits, ticks and words keep one rhythm (T asked for "the
  damage numbers"; a tick lasting longer than the hit beside it would read
  as a different system). About 1.6 s total; the exact hold and fade are the
  tick's to tune inside "readable, not lingering into the next beat".
  Confirmed by T (2026-10-25): "yes to same timing for consistent tempo".
- **"Its own unique tick" is one float per DoT source per beat**, which is
  what the engine already emits; the fix is on the board (stagger, stack,
  colour, label), not a new engine event. An INFERNO of intensity 4 is one
  `INFERNO −4`, not four `−1`s. `[T to confirm]` (the alternative, one
  float per stack point, needs an engine event change and turns a 12-stack
  into twelve floats).
- **"Colour of the element"** is the colour each element already has on its
  chip and log line (INFERNO red, STORM gold); status DoTs (poison, bleed,
  creeping doom) have no element and take their own glyph colour.
- **Base damage floats white** (T, 2026-10-25: "let's have base, DEAL, be
  white numbers to separate"). The plain hit, a card's DEAL on the foe and
  the foe's hit on the player, floats `HUE.white` on both sides (today the
  foe's is `AXM.parchment`, the player's `HUE.damageRed`), so colour alone
  says "plain hit" versus "element tick": white is a hit, a colour is an
  element. SACRIFICE's paid cost (`-n`, today `damageRed`) is not a hit and
  keeps its colour; heals stay green; BLOCKED, DENIED and status words keep
  theirs.

## Tests matrix

- `axiomancer-mechanics/src/Combat/e2e/weather.engine.test.ts`: A3
  (`blizzardCut` with BLIZZARD 0, below a hit, above a hit, two hits, a
  denied turn; equality with the resolved `blizzard-softened` amount).
- `axiomancer-mobile/state/presenters/__tests__/weather-board.engine.test.ts`:
  the `your-inferno` chip's caption and its absence on the foe's chip
  (A1); the self INFERNO log line (A2); `wallMath.blizzardCut` (A3 through
  the VM).
- A presenter suite for `selectDeadTray` (A6): all-MISS with cards in hand
  is dead; one matching die is not; an off-colour die only is dead (today's
  case kept); X only is dead; everything spent is not; empty hand is not.
- `components/combat/encounter/__tests__/IntentIcon.test.tsx`: the BLIZZARD
  line present with a cut and absent without; DENIED hides it; the a11y line
  has no parenthetical and one number (A4, A5).
- `components/combat/encounter/__tests__/CombatBoard.S1-board.test.tsx`:
  `combat-end-consequence` and `combat-dead-tray` on an all-MISS tray (A6);
  the existing dead-tray case unchanged.
- `CombatCombatantPane` tests: the caption renders and the weather chip
  a11y line (A1); the self tick float text `INFERNO −4` (A2); the enemy
  float layer inside the figure wrap (A8); two enemy ticks in one batch
  float as two labelled numbers in two colours, the second staggered (A10).
- The numberPop timing test under `lib/juice/`: the new hold, fade and rise
  (A9).
- The presenter suite: `dotTickFloat` colour and label per element and for
  a status DoT (A10).

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w
axiomancer-mobile`; `node scripts/combat-round-e2e.mjs`; `node
scripts/exploration-combat-roundtrip-e2e.mjs` (foreground).

## Commit body template

```
feat(mobile): the board says what it does (BC1)

Your INFERNO reads as yours on the status strip with its per-turn loss,
and its tick floats with its name. The intent says "after BLIZZARD -n"
when BLIZZARD cuts the hit (projectIncomingThreat gains blizzardCut) and
its a11y line carries one number. The dead tray counts MISS faces, so
END carries its consequence on an all-MISS tray. The foe's floats rise
from its figure and every combat float reads for about 1.6 s; each DoT
tick floats on its own, labelled and in its element's colour; plain hits float white.
Acceptance A1-A11.
```

## DoD

A1 to A11 ticked.

## Follow-ups (out of scope)

- The intent does not include your own INFERNO in the round's VITAE
  stake (PT2: "threat says −16, lost 20"). A "this round costs you" total
  is a design call for T; not filed as a row.
- The reveal panel still prints each phase's authored payload
  (`CombatEncounterPanel.tsx:791`); and `projectIncomingThreat`'s
  no-BLIZZARD branch omits the stage-threat bonus that `threatHits`
  applies, so the pill can read below the hit once a stage is entered.
  Both are "Printed equals applied" (`plan/PHASE_CANDIDATES.md`), which
  owns the numbers; noted there by this plot.
- The glossary for chips, dice and rail counts: GL1. The interstitials,
  the spoils pick, the purse and the potion nudge: TQ1.
