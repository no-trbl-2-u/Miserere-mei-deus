# Phase GL1 — A glossary a sighted player can reach

## Sources

- T, 2026-10-25 (conversation, unattended plot run): "plot them all, one plot run, one PR", over the Elementalist
  swarm's candidates. This brief is the run for the `PHASE_CANDIDATES` candidate "A glossary a sighted player can
  reach: Conviction, momentum, SURGE, GHOST, BANKED, BOON/MANA/MISS, the rail, and "X" as "varies"" (T's `/messy`,
  2026-10-24).
- Part plan: `plan/revamp/mobile.md` "The board says what it does (T, 2026-10-24, `/messy`)", item 5 and proposed
  split (b): "tap-to-read on each chip and "X" rendered as "varies"".
- Evidence: `docs/reports/playtest-elementalist-act1-2026-10-24.md` R9 (unglossed vocabulary for a sighted player:
  Conviction ◆, momentum, SURGE, GHOST die, BANKED / Reserve / ripened, BOON / MANA / MISS faces, the rail
  "▮16 ▯0", "overwhelmed", ⟳ GLOBAL, ⏳3/∞, the "+N" free corner, and "X" on a face, read as unplayable when it
  means variable; "most exist only as aria-labels") and R18 (15 of 32 door-fight dice were MISS; BOON and MANA
  differ with no board explanation). `plan/CRITIQUE.md` RC2 walk item 15 (the word "Momentum").
- Decisions: D91 (one card face; a later face change needs T's say-so), D92 (board layout: footer dock, intent and
  Conviction top-left, no corner medallions, LOG off the board), D88/D99 (content per surface; this phase adds UI
  strings, not card text), D45 (glossary rows only for live carriers).
- Code read while shaping this:
  - `axiomancer-mobile/state/combat/keywords.ts`: `KEYWORD_GLOSS` (card keywords, incl. BOON), `SYSTEM_GLOSSARY`
    (CONVICTION ◆, RESERVE & PIPS, WILD / X, GLOBAL, CURSE) read today only by the card detail
    (`systemTermsForCard`). Its `WILD / X` entry says "A dead X die powers nothing", the same letter the card face
    prints for a variable amount: the collision behind R9's "read as unplayable".
  - `components/combat/encounter/CombatBoard.tsx`: the Conviction chip (`:273-284`, a plain `View`, not
    pressable); the dice tray (`:476-535`): each live die is `Gesture.Exclusive(pan, tap)` (`:1137-1156`) where
    **tap powers a staged card** (`tapDieJS`), the struck X die is a static `View` (`:492`), BANKED and GHOST are
    captions under the die; the momentum chip (`:754-813`) already opens a how-it-works popup and wears an ⓘ mark;
    the globals row (`:1381-1398`, an `IN PLAY` label, chips whose tap reads the card); `EffectChips` taps open
    the effect plaque (`onChip`).
  - `components/combat/encounter/CombatFooterDock.tsx:162-185`: the deck/discard piles and the phase ledger
    (O cleared, X overwhelmed, pending ahead), both `accessible` text only.
  - `components/combat/encounter/CombatEncounterPanel.tsx`: the effect plaque (`tipEffect`, `:976-`), the
    momentum popup (`:1046-1066`, which never names SURGE), the signature popup (long-press or unaffordable tap).
  - `state/presenters/card-program.engine.ts:43-122`: `HEADLINES` and `FREE_CELL` print a bare `X` for an
    amount the card does not print as a number (`Deal X`, `Foe −X`, `GUARD X`, `HEAL X`, `LEECH X`,
    `SACRIFICE X`, `Deal 2X`).
  - `components/combat/encounter/CombatDie.tsx:40,69` (BOON vs MANA faces);
    `state/presenters/combat-encounter.engine.ts:270-307,982-992` (Reserve dice and pips, floating dice, die
    faces `special | mana | miss`), `ledgerA11y` (`:905`), globals' `turnsLabel` (`:1717`).

## Outcome

Every word and mark the swarm found only in aria-labels opens a short gloss when a sighted player touches it on the
combat board, from one glossary source, and a card's variable amount reads "varies" instead of an "X" that looks
like the dead die.

Size: M

## Acceptance

- **A1** One source. `state/combat/keywords.ts` exports the board glossary (a `BOARD_GLOSSARY` keyed by term id)
  with entries for: CONVICTION ◆, the BOON, MANA and MISS die faces, a BANKED Reserve die and its pips (ripening),
  a GHOST die, the X die, X on a card ("varies"), DECK & DISCARD, the PHASE LEDGER (cleared, overwhelmed, ahead)
  and GLOBAL (with ⏳n and ∞). Entries that `SYSTEM_GLOSSARY` or `KEYWORD_GLOSS` already define (Conviction,
  Reserve & pips, Global, Boon) are referenced, not copied. A unit test fails an empty definition, a definition
  over two sentences, and a number in a definition that disagrees with the engine constant it states (the BOON
  default payload, the pip cap), read from the constant, not a literal.
- **A2** The X collision is gone from the glossary: the `WILD / X` system entry names the X **die** as dead and
  says an X on a card's line means the amount varies; no glossary text says "X" powers nothing without saying
  "die". The card detail's system-term matching is unchanged.
- **A3** Tapping the Conviction chip opens the CONVICTION gloss with the live ◆ count. Its screen-reader label is
  unchanged; it gains `accessibilityRole="button"` and a hint.
- **A4** A long-press on any tray die (fresh face, BANKED Reserve die, GHOST die) opens a gloss for that die: its
  face (BOON with the gear's actual Conviction payload, MANA or MISS) and, when it applies, BANKED with its pips
  or GHOST. A tap on a die still powers the staged card (the tap-to-power suites pass unchanged), and a drag
  still drags. A tap on the struck X die opens the X-die gloss.
- **A5** In the footer dock, tapping the deck and discard piles opens DECK & DISCARD with the live counts, and
  tapping the phase ledger opens the PHASE LEDGER gloss naming each mark (O cleared, X overwhelmed, the pending
  mark ahead).
- **A6** Tapping the globals row's `IN PLAY` label opens the GLOBAL gloss (what ⏳n and ∞ mean); a global chip's
  tap still reads its card.
- **A7** The existing momentum popup names MOMENTUM SURGE (the moment the third node lights) and says what the
  forged die is called on the tray. Whether the forged die is the tray's GHOST die (`die.floating`) is read from
  the engine, not assumed; the popup's text is pinned by a test.
- **A8** On every card face (hand, staged, drag ghost, reward offer, card detail, reward preview; D91's one face),
  a PAID headline whose value is a bare `X` prints `varies` in its place: `Deal X` → `Deal varies`,
  `Foe −X` → `Foe − varies`, `GUARD X` / `HEAL X` / `LEECH X` / `SACRIFICE X` → `varies` after the keyword. It
  stays on one line at the hand size (the paid-column font test passes). Where the board already shows a chosen
  amount (the X picker on a staged "SACRIFICE any amount" card), the chosen number shows, not `varies`.
- **A9** Every gloss opens in the one shared plaque the effect chips use (`tipPlaque`), closes on a backdrop
  tap, and does not open while a drag is live or a phase is resolving.
- **A10** No card text changes and no layout change: `axiomancer-mechanics/src/Cards/` is untouched by the PR,
  no element is added to a board corner, and the existing board layout, footer-dock and sig-column suites pass
  unchanged.

Measure: a new board suite, starting from a real fight (`startRealFight`), touches each of R9's targets (the
Conviction chip, a BOON, MANA, MISS, BANKED and GHOST die, the X die, the piles, the ledger, `IN PLAY`, the momentum
chip) and reads its gloss, and every live card whose PAID headline was a bare `X` renders `varies`; on T's next
preview build each word R9 lists opens a gloss.

## Scope

- `axiomancer-mobile` only.
  - `state/combat/keywords.ts`: `BOARD_GLOSSARY`, the `WILD / X` wording (A1, A2).
  - `components/combat/encounter/CombatBoard.tsx`: Conviction chip pressable; a long-press added to the die
    gesture (`Gesture.Exclusive(pan, longPress, tap)` or equivalent) and a tap on the struck X die; the `IN PLAY`
    label pressable; one `onGloss(termId, live?)` prop beside `onChip` (A3, A4, A6).
  - `components/combat/encounter/CombatFooterDock.tsx`: the piles and the ledger pressable, calling the same
    `onGloss` (A5).
  - `components/combat/encounter/CombatEncounterPanel.tsx`: one gloss state rendered in the shared plaque; the
    momentum popup's SURGE line (A7, A9).
  - `state/presenters/card-program.engine.ts` (or the face's `paidValueFor`): the bare-`X` → `varies` mapping at
    the presentation layer (A8).
- Not touched: engine card text, card ids, the FREE corner pill's geometry, the board layout, the hazard board.

## Consumers to update

- The card detail overlay and reward preview read the same face (D91), so `varies` reaches them with no separate
  change; their text tests that pin `X` are updated.
- `docs/game-model.md` or the mobile glossary docs, if they list the board's words: one line naming the board
  glossary as their home.
- The visual baselines that show a variable-amount card face change by one word; `verify:visual` is report-only
  (VE1c) and the PR shows the diff.

## Save / schema contracts

- None. Presentation only; no save field, no engine type, no play-log kind (see Follow-ups).

## Carrier sweep

- Not an R-phase. The new entries are board systems with live carriers (the dice, the dock, the globals row),
  not card keywords, so D45's atlas rule does not add atlas rows; `allRegistryKeywords()` and the KW lints are
  unchanged.

## Decisions made upfront — DO NOT ASK

- **No card text changes; any face glyph change beyond the X is D91 and T's call** (T, 2026-10-25). The X → `varies`
  is the one face change in scope, because the part plan names it (T's `/messy`, 2026-10-24).
- **Dice open their gloss on a long-press, not a tap.** A tap on a die already powers the staged card
  (`tapDieJS`, `CombatBoard.tsx:1149-1152`); taking that tap would break the play path. A long-press is how the
  board already explains a signature rune. The struck X die has no gesture, so it reads on a tap.
  Accepted at merge (default): the candidate said "tap-to-read on each ... die". A die that cannot be dragged (a
  MISS face, a spent die) keeps a mounted detector with the long-press alone, so MISS reads too.
- **The FREE corner pill keeps its X.** D91 fixes the pill's geometry and a six-letter word does not fit it; the
  card detail (one tap on the card) prints the full rules text that says what sets the amount. Accepted at merge
  (default).
- **Only a bare `X` becomes `varies`.** `Deal 2X` (a formula) and the `n` amounts (`GUARD n`, `Next Deal +n`)
  keep their letter; changing them is a further face change, T's call (Follow-ups).
- **No new ⓘ marks.** The momentum chip keeps its mark; the other targets are found by touch, as the effect
  chips are (EL1b), so nothing is added to the board's chrome (D92).
- **One plaque, one gloss source.** The glosses render in the effect chips' plaque; the text lives in
  `keywords.ts` beside `SYSTEM_GLOSSARY`, so the card detail and the board cannot drift.
- **Gloss text is written from the engine, not from the swarm's reading.** The builder reads the rule each entry
  states (pip cap, BOON payload, what the ledger's X means, whether the forged momentum die is the GHOST die) and
  A1's test pins the numbers to their constants.
- **"The turn chip" in the part plan is read as the dock's phase ledger** (the only per-phase mark on the board;
  its X is "overwhelmed", a third meaning of the letter). The threat-phase header already prints its words.
- **The hazard surplus also called "momentum" (RC2 item 15) is not this phase**: it is the hazard board's word
  (Follow-ups).
- **GL1 does not require BC1** (the board-cues plot running in parallel). Both touch `CombatBoard.tsx` and the
  panel; whichever lands second merges `main` in.

## Tests matrix

- `state/combat/__tests__/keywords.board-glossary.test.ts` (new): A1 and A2 (entries, sentence cap, numbers pinned
  to engine constants, the X wording).
- `components/combat/encounter/__tests__/CombatBoard.glossary.test.tsx` (new, real fight via `startRealFight`):
  A3-A6 and A9 (each target opens its gloss with live values; die tap still powers; no gloss mid-drag or while
  resolving).
- `components/combat/encounter/__tests__/CombatEncounterPanel.*`: the momentum popup's SURGE line (A7).
- `CombatBoard.paid-column.test.tsx` and the card-program presenter tests: A8 (`varies` on every live bare-X card,
  one line at hand size; the X picker's chosen amount).
- The existing layout suites (`S1-board`, `footer-dock`, `sig-column`) unchanged and passing (A10).

## Verify gate

`npm run verify -w axiomancer-mobile` and the root `npm test`. `verify:visual` runs report-only in CI.

## Commit body template

```
Phase GL1 — A glossary a sighted player can reach

Closes A1-A10 of plan/phases/phase_GL1_board_glossary.md.
<the targets wired, the X wording, the varies mapping>
Verify: <commands and results>
```

## DoD

A1-A10 ticked in the PR body, each naming its test.

## Follow-ups (out of scope)

- `Deal 2X`, the `n` amounts and the FREE pill's X: further face changes, T's call under D91.
- A `ui-gloss-opened` play-log event (which word a player looks up), beside BE2d's `ui-detail-opened`: it adds a
  kind to `PLAY_LOG_UI_EVENT_KINDS` (`axiomancer-mechanics/src/Combat/combat.play-log-contract.ts:43`) and the
  Worker's contract, so it is its own row if T wants the number.
- The hazard board's "momentum" surplus renamed or glossed (CRITIQUE RC2 item 15), and "payload" / "the jar holds
  4 souls" from the same item.
- A single list of every board word (a WORDS view in the pilgrim modal beside LOG), if the per-target glosses
  prove hard to find.
