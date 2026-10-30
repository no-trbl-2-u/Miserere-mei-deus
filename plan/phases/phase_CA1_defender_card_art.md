# Phase CA1 — Defender card art (the first lane in the house style)

## Sources

- T, 2026-10-30 (attended): "let's have another agent try to build an image sheet for each lane ... You can then
  later use a script to cut out the images for all the cards." T painted the Defender's 30 cards in ChatGPT from the
  session's prompts, approved them in the session's proof page ("Holy shit! They're sick!"), then: "Alright, the
  defender work is in, let's plot the card art replacement." Asked about four paintings made before the
  no-animals rule, T chose "Ship all 30 now".
- The art direction, committed with this plot: `art-department/masters/cards/prompts/art-direction.md` (the house
  look; "Names are actions"; rule 9, no animals or insects; the Defender's midnight-navy cloak) and the Defender's
  ChatGPT script `prompts/defender.md`. `prompts/slicer-spec.md` is the session's spec for the cutter.
- The masters, committed with this plot: `art-department/masters/cards/defender/sheet-1.webp` … `sheet-5.webp`
  (lossless WebP of T's 1536 x 1024 PNG sheets) and `manifest.json` (which card id sits in which tile, left to right
  then top to bottom; grid 3 x 2; magenta `#FF00FF` gutters).
- Names (T, 2026-10-30): "rename the card itself so that the card is a verb instead of a noun. Some type of action."
  and "I don't want any animals/insects, not only in the names, but also in the descriptions." The Defender's five,
  from the art direction's "Names are actions" table:

  | Id | Was | Now |
  |---|---|---|
  | `df-e-03b` | Mirrorhide | Turn the Blow |
  | `df-m-04b` | Turtle Up | Draw In |
  | `df-p-10b` | Bramble Carapace | Don the Brambles |
  | `df-m-10n` | Lacquered Shell | Lacquer the Plate |
  | `df-m-09a` | Loose Spine | Loose the Barbs |

- Code read while shaping this:
  - `axiomancer-mobile/assets/images/cards/index.ts` (`CARD_ART_BY_ID`, `getCardArt`, `FALLBACK_CARD_ART`; Blood
    Price's 30 `bp-*.webp` are the precedent), `cards/provenance.json`, `cards/__tests__/card-art.test.ts`.
  - `axiomancer-mobile/scripts/ingest-art.mjs` (the one encode recipe: longest edge 640, WebP q44, a provenance entry
    in the same run; its default grade is **grayscale**, so card art goes in with `--no-grade`).
  - `art-department/README.md` (the sealed tree: nothing outside it resolves a path in; nothing in it ships) and
    `art-department/tools/split-spritesheet.py` (the precedent: geometry in Python writes PNG cells, the ingest does
    the encode and the record), `art-department/tests/test_split_spritesheet.py`, `run-tests.py`.
  - `axiomancer-mechanics/src/Cards/library/defender.cards.ts` (names), `Cards/e2e/defender.engine.test.ts` and
    `Cards/e2e/card-upgrade-law.engine.test.ts` (both name some of the five), `plan/card-ledger/rehearsal-defender.md`.

## Outcome

Every Defender card shows its own painting, in hand, on inspect and in the reward pick, instead of the grey
fallback, and five Defender cards carry their new action names. The cutter that made those paintings is a tool in
`art-department/`, so the Blood Price, Elementalist and Merciful sheets go through the same two commands.

Size: multi-phase (CA1a M, CA1b S).

## Acceptance

- **A1** `art-department/tools/split-card-sheet.py --sheet <master> --manifest <manifest.json> --out <dir>` finds the
  magenta gutters, cuts each tile named in the manifest to a lossless PNG named `<card id>.png`, skips a `null` tile,
  and refuses (non-zero exit, a message naming the file) a sheet whose grid is not the manifest's, a tile more than 4%
  off square or under 400 px, or a tile whose edge band (the outer 4 px after a 3 px inset trim) still holds gutter
  colour. Magenta inside a tile is the painting's own colour and is kept: the Elementalist's STORM lightning glows
  pink-violet well inside the gutter test (T's sheets, 2026-10-30, refused by the first prototype). It warns, naming
  the card, when a tile's outer ring is not near black.
- **A2** `art-department/tests/test_split_card_sheet.py` (run by `run-tests.py`) builds synthetic sheets in the test
  and pins: a good 3 x 2 sheet gives six named cells; a `null` tile is skipped; a 3 x 1 sheet, a non-square tile and a
  fringe left on a tile's edge are each refused; a magenta stroke in a tile's middle is kept; the warning fires on a
  grey ring. No test reads the committed masters.
- **A3** The 30 Defender paintings ship as `axiomancer-mobile/assets/images/cards/df-*.webp`, cut from the five
  committed masters by A1's tool and encoded by `ingest-art.mjs --no-grade` (in colour, longest edge 640, q44), with
  one `provenance.json` entry covering all 30 that names the masters, the prompts, the tool and T's approval.
- **A4** `CARD_ART_BY_ID` maps each of the 30 Defender ids to its own painting, and `card-art.test.ts` gains "gives
  every Defender card its own painting" (every id of `getCardLane('defender')` is mapped, none is the fallback, all
  are distinct), as Blood Price's test does.
- **A5** The PR shows the change: before/after shots of a Defender hand and one Defender card's inspect view
  (`skills/heads-down.md` §4 hosting), beside a Blood Price card for comparison.
- **A6** The five Defender cards in Sources carry their new names in `defender.cards.ts`; every test that names them
  is updated to the new names; the library's no-duplicate-name test passes; `rehearsal-defender.md` gets a dated line
  recording the rename and its source. Card ids, text, numbers and colours do not change.

Measure: on a preview or local web build, a Defender hand shows 30 distinct paintings across the lane's cards and no
grey fallback, and "Turn the Blow", "Draw In", "Don the Brambles", "Lacquer the Plate" and "Loose the Barbs" read on
their faces.

## Decisions made upfront — DO NOT ASK

- **Masters live in `art-department/masters/cards/`**, as lossless WebP, beside the prompts that made them. They do
  not ship; only the ingested 640 px WebPs do (`art-department/README.md`).
- **Cut in Python, encode with the ingest.** The tool writes PNG cells only; `ingest-art.mjs` is the only encoder and
  the only provenance writer, exactly as `split-spritesheet.py` does. `--no-grade` is required: the house style is in
  colour (art direction, "Never black and white only").
- **Card art is square** and the face crops it with `contentFit="cover"`; the art direction keeps subjects in the
  middle 70% for that reason. No face code changes.
- **All 30 ship now** (T, 2026-10-30, "Ship all 30 now"), including the four painted before the no-animals rule
  (Polished Shell's nautilus, Draw In's shell, the quills of Bristling Blow and Prickly Resolve). Their redo is a
  Follow-up: a new master sheet and a re-run of A3's two commands.
- **Renames touch names only.** No description, keyword, number or id changes; the ballot ledger keeps its history
  and gains one dated line.
- The other three lanes are not in this plot. The Merciful is plotted next (T, 2026-10-30); Blood Price and the
  Elementalist follow when their sheets are in.

## Phases

### CA1a — The card cutter and the Defender's paintings (closes A1, A2, A3, A4, A5)

Size: M. Requires nothing.

- **Scope:** `art-department/tools/split-card-sheet.py` and its test; run it on the five masters into a staging
  directory outside the repo; ingest the 30 PNGs with `node scripts/ingest-art.mjs --in <staging> --category cards
  --no-grade` from `axiomancer-mobile/` (check the flag for the existing card category and the license fields against
  the `bp-*` provenance entry); register the 30 in `index.ts`; extend `card-art.test.ts`; update `index.ts`'s header
  comment (the Defender now has its own paintings).
- **Consumers:** `CombatBoard.tsx` `CombatCardFace` (hand, inspect, staged card), the reward pick and the dev deck
  views, all through `getCardArt`. No code change there.
- **Save/schema:** none.
- **Tests:** A2's Python suite (`npm run art:test` or `python art-department/run-tests.py`); `card-art.test.ts`;
  `scripts/art-department-sealed.test.mjs` stays green (no tracked file outside the tree names it as a path).
- **Verify gate:** `npm run verify -w axiomancer-mobile`, root `npm test`, the art-department suite. A
  `verify:visual` baseline that shows a Defender card changes on purpose and is re-approved in the PR.
- **Measure:** the hand shot in the PR shows Defender paintings and no fallback.

### CA1b — The Defender's action names (closes A6)

Size: S. Requires nothing (runs beside CA1a; different workspace).

- **Scope:** five `name:` fields in `defender.cards.ts`; the tests that name them; one dated line in
  `plan/card-ledger/rehearsal-defender.md`.
- **Consumers:** every surface that prints a card name reads it from the library; no presenter change.
- **Save/schema:** none: saves store card ids, never names.
- **Tests:** `defender.engine.test.ts`, `card-upgrade-law.engine.test.ts`, the library's duplicate-name check.
- **Verify gate:** `npm run verify -w axiomancer-mechanics`, root `npm test`.
- **Measure:** `grep` finds none of the five old names in `axiomancer-mechanics/src`.

## Definition of done

Both phases merged; a Defender hand shows its own paintings under their action names on a local web build.

## Follow-ups

- Amended 2026-10-30 before any build: A1 and A2 refuse gutter colour only on a tile's edge, after the
  Elementalist's lightning tripped the prototype's whole-tile check.

- Redo the four early Defender paintings with animal shapes (T paints; a new master; re-run A3's commands).
- The Merciful's paintings and names (plotted next, reusing CA1a's tool).
- Blood Price's repaint (replaces the torio paintings) and the Elementalist's paintings and first names, when T's
  sheets are in. The Elementalist's names and Blood Price's renames are listed in the art direction.
- The MERCY icon (a dove) on the card face and the status badge is UI, not card art; the no-animals rule as written
  covers paintings and names. T to decide whether it reaches the icons.
