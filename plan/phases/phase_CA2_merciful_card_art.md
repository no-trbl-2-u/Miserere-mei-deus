# Phase CA2 — Merciful card art

## Sources

- T, 2026-10-30 (attended), while Phase CA1 (the Defender's card art, PR #1139) was being plotted: "When you're done,
  plot the merciful cards as well." T painted the Merciful's 29 cards in ChatGPT from the session's prompts; the
  session cut all five sheets cleanly with the prototype cutter (29 tiles, one borderline background warning on
  `mc-p-08b`, ring mean 20 of 255).
- The art direction and cutter spec ride CA1's plot: `art-department/masters/cards/prompts/art-direction.md`
  ("Names are actions"; rule 9, no animals or insects) and `prompts/slicer-spec.md`. This plot adds the Merciful's
  ChatGPT script, `prompts/merciful.md`.
- The masters, committed with this plot: `art-department/masters/cards/merciful/sheet-1.webp` … `sheet-5.webp`
  (lossless WebP of T's sheets) and `manifest.json` (29 card ids by tile; sheet 5's last tile is `null`).
- Names (T, 2026-10-30, "rename the card itself so that the card is a verb instead of a noun" and "I don't want any
  animals/insects, not only in the names"), from the art direction's table:

  | Id | Was | Now |
  |---|---|---|
  | `mc-p-06c` | Shelter of Grace | Spread the Mantle |
  | `mc-p-10c` | Morning Absolution | Absolve at Dawn |
  | `mc-m-09c` | Remembered Kindness | Call Back a Kindness |

- Code read while shaping this: the same files as Phase CA1 (`assets/images/cards/index.ts`, `provenance.json`,
  `card-art.test.ts`, `scripts/ingest-art.mjs`), plus `axiomancer-mechanics/src/Cards/library/merciful.cards.ts`,
  `Cards/e2e/merciful.engine.test.ts` and `Cards/e2e/card-upgrade-law.engine.test.ts` (which name the three),
  `plan/card-ledger/rehearsal-merciful.md`.

## Outcome

Every Merciful card shows its own painting instead of the grey fallback, and three Merciful cards carry their action
names.

Size: multi-phase (CA2a S, CA2b S).

## Acceptance

- **A1** The 29 Merciful paintings ship as `axiomancer-mobile/assets/images/cards/mc-*.webp`, cut from the five
  committed masters by Phase CA1a's `art-department/tools/split-card-sheet.py` and encoded by
  `ingest-art.mjs --no-grade`, with one `provenance.json` entry covering all 29 that names the masters, the prompts,
  the tool and T's approval. The `null` tile is skipped.
- **A2** `CARD_ART_BY_ID` maps each of the 29 Merciful ids to its own painting, and `card-art.test.ts` gains "gives
  every Merciful card its own painting" (every id of `getCardLane('merciful')` mapped, none the fallback, all
  distinct).
- **A3** The PR shows before/after shots of a Merciful hand and one inspect view (`skills/heads-down.md` §4).
- **A4** The three cards in Sources carry their new names in `merciful.cards.ts`; every test that names them is
  updated; the library's no-duplicate-name test passes; `rehearsal-merciful.md` gets a dated line recording the
  rename. Ids, text, numbers and colours do not change.

Measure: on a local web build, a Merciful hand shows its own paintings and no grey fallback, and "Spread the Mantle",
"Absolve at Dawn" and "Call Back a Kindness" read on their faces.

## Decisions made upfront — DO NOT ASK

- Everything Phase CA1 decided holds here: masters in `art-department/masters/cards/`, cut in Python, encode only
  with the ingest, `--no-grade`, no card-face change.
- **CA2a waits on CA1a**: it uses the cutter CA1a builds rather than a second copy.
- **`mc-p-08b`'s faint background ships.** Its outer ring averages 20 of 255, at the cutter's warning line; the face
  crops the edge and the painting reads on black.
- **"What Grace Owes" keeps its name.** Blood Price's "What Is Owed" becomes "Collect the Debt" only when Blood
  Price's art lands, so the Merciful name it collided with is not freed yet.

## Phases

### CA2a — The Merciful's paintings (closes A1, A2, A3)

Size: S. Requires CA1a.

- **Scope:** run the cutter on the five masters into a staging directory outside the repo; ingest the 29 PNGs with
  `--category cards --no-grade`; register them in `index.ts` and update its header comment; extend
  `card-art.test.ts`.
- **Consumers:** every card face, through `getCardArt`. No code change there.
- **Save/schema:** none.
- **Tests:** `card-art.test.ts`; the art-department suite; `scripts/art-department-sealed.test.mjs`.
- **Verify gate:** `npm run verify -w axiomancer-mobile`, root `npm test`, `npm run art:test`. A `verify:visual`
  baseline that shows a Merciful card changes on purpose and is re-approved in the PR.
- **Measure:** the hand shot in the PR shows Merciful paintings and no fallback.

### CA2b — The Merciful's action names (closes A4)

Size: S. Requires nothing.

- **Scope:** three `name:` fields in `merciful.cards.ts`; the tests that name them; one dated line in
  `plan/card-ledger/rehearsal-merciful.md`.
- **Consumers:** every surface reads names from the library.
- **Save/schema:** none: saves store ids.
- **Tests:** `merciful.engine.test.ts`, `card-upgrade-law.engine.test.ts`, the duplicate-name check.
- **Verify gate:** `npm run verify -w axiomancer-mechanics`, root `npm test`.
- **Measure:** `grep` finds none of the three old names in `axiomancer-mechanics/src`.

## Definition of done

Both phases merged; a Merciful hand shows its own paintings under the new names on a local web build.

## Follow-ups

- MF1e, T's check on the preview build, now plays the Merciful with its art.
- "What Grace Owes" may return to "What Is Owed" when Blood Price's rename lands (T to decide then).
- The MERCY dove icon is UI, not card art (see Phase CA1's Follow-ups).
