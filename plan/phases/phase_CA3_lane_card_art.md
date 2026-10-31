# Phase CA3 — Lane card art: all four lanes get their own paintings

## Sources

- T, 2026-10-31 (attended): "here's what I would like ultimately, I want to swap out all the new art I've gotten on
  to the 4 lanes' cards. Can you start plotting their rows while we wait for this last sheet?" Then: "Blood price's
  5th sheet just landed."
- Phases CA1 and CA2 (the Defender's and the Merciful's first art, plotted 2026-10-30) were removed unshipped on
  2026-10-31 (Queue change log): T regenerated all four lanes and did not keep those sheets. This plot replaces both
  and adds Blood Price and the Elementalist.
- **The masters, committed with this plot**, under `art-department/masters/cards/<lane>/`: five 1536 x 1024 sheets
  per lane (`sheet-1.webp` … `sheet-5.webp`, WebP q95 of T's PNGs, 3 x 2 tiles divided by magenta `#FF00FF`
  gutters), a `manifest.json` naming the card id in each tile (row-major; the Merciful's last tile is `null`), and,
  where T saved them, each sheet's exact generation prompt (`sheet-<n>-prompt.txt`), a `README.md` and the
  character references the prompts used (`references/`). Lanes: `blood-price` (30), `defender` (30), `elementalist`
  (30), `merciful` (29).
- **The look of record is the per-sheet prompts**, not `prompts/art-direction.md`. T's later runs moved from the
  Doré-and-torio look that file describes to the app's own character-portrait style (the Merciful README: "match
  their illustrated style as closely as possible"; the prompts say "NOT Dore engraving"). This plot adds a note at the
  top of `art-direction.md` saying so; its other rules (black ground, no text, centred subject, magenta gutters, no
  animals, action names) still describe the sheets.
- **Names** (T, 2026-10-30): "rename the card itself so that the card is a verb instead of a noun. Some type of
  action." and "I don't want any animals/insects, not only in the names, but also in the descriptions." The table is
  the art direction's "Names are actions" section; the lane scripts in `prompts/` carry the same names.

  | Lane | Id | Now | Was |
  |---|---|---|---|
  | Defender | `df-e-03b` | Turn the Blow | Mirrorhide |
  | Defender | `df-m-04b` | Draw In | Turtle Up |
  | Defender | `df-p-10b` | Don the Brambles | Bramble Carapace |
  | Defender | `df-m-10n` | Lacquer the Plate | Lacquered Shell |
  | Defender | `df-m-09a` | Loose the Barbs | Loose Spine |
  | Blood Price | `bp-p-06d` | Collect the Debt | What Is Owed |
  | Blood Price | `bp-m-03d` | Gorge | Famished |
  | Merciful | `mc-p-06c` | Spread the Mantle | Shelter of Grace |
  | Merciful | `mc-p-10c` | Absolve at Dawn | Morning Absolution |
  | Merciful | `mc-m-09c` | Call Back a Kindness | Remembered Kindness |

  **The Elementalist is named for the first time** (today every card is "Elementalist <slot>"): `el-p-01b` Strike the
  Burning, `el-p-02b` Burn Together, `el-p-03a` Raise the Drift, `el-p-04a` Shatter the Frost, `el-p-05b` Call
  Lightning Twice, `el-p-06b` Ride the Gale, `el-p-07a` Sear the Frozen, `el-p-08b` Stir the Thundersnow, `el-p-09a`
  Hurl Your Fire, `el-p-10b` Bind the Three, `el-e-01b` Wreathe in Flame, `el-e-02c` Ignite the Wound, `el-e-03b`
  Breathe Winter, `el-e-04c` Encase in Ice, `el-e-05b` Gather the Storm, `el-e-06a` Draw the Lightning, `el-e-07b`
  Scatter the Pages, `el-e-08c` Boil to Steam, `el-e-09b` Bring the Hail, `el-e-10c` Trade Elements, `el-m-01a` Douse
  the Flames, `el-m-02a` Cool the Burn, `el-m-03a` Study in Frost, `el-m-04a` Weave the Three, `el-m-05c` Read the
  Elements, `el-m-06a` Brace in Rime, `el-m-07b` Pin with Lightning, `el-m-08c` Turn with the Wind, `el-m-09c` Spit
  Fire, `el-m-10n` Drink the Rain.
- The session cut all 20 masters with its prototype cutter (the spec is `prompts/slicer-spec.md`, amended in #1146):
  119 tiles, none refused. The Elementalist's lightning holds magenta inside its tiles; only an edge fringe is
  refused, per #1146.
- Code read while shaping this:
  - `axiomancer-mobile/assets/images/cards/index.ts` (`CARD_ART_BY_ID`, `getCardArt`, `FALLBACK_CARD_ART`; the 30
    `bp-*.webp` torio paintings this replaces), `cards/provenance.json`, `cards/__tests__/card-art.test.ts`.
  - `axiomancer-mobile/scripts/ingest-art.mjs`: the one encoder (longest edge 640, WebP q44) and provenance writer.
    Its default grade is **grayscale**, so card art goes in with `--no-grade`.
  - `art-department/README.md` (the sealed tree) and `art-department/tools/split-spritesheet.py` with its test (the
    precedent: Python does the geometry and writes PNG; the ingest encodes and records).
  - `axiomancer-mechanics/src/Cards/library/{blood-price,defender,elementalist,merciful}.cards.ts`; the tests that
    name the renamed cards: `Cards/e2e/{blood-price,defender,elementalist,merciful}.engine.test.ts`,
    `Cards/e2e/card-upgrade-law.engine.test.ts`; `docs/card-spec.md` (names two Blood Price cards); the four ledgers
    in `plan/card-ledger/`. `elementalist.cards.ts` builds every name as `` `Elementalist ${e.slot}` ``.

## Outcome

Every card in all four lanes shows its own painting from T's sheets, in hand, on inspect and in the reward pick; no
lane card shows the grey fallback or a torio painting. Ten cards carry their action names and the Elementalist's 30
have real names.

Size: multi-phase (CA3a M, CA3b S, CA3c S, CA3d S, CA3e M).

## Acceptance

- **A1** `art-department/tools/split-card-sheet.py --sheet <master> --manifest <manifest.json> --out <dir>` finds the
  magenta gutters, cuts each tile named in the manifest to a lossless PNG named `<card id>.png`, skips a `null` tile,
  and refuses (non-zero exit, a message naming the file) a sheet whose grid is not the manifest's, a tile more than 4%
  off square or under 400 px, or a tile whose edge band (the outer 4 px after a 3 px inset trim) holds gutter colour.
  Magenta inside a tile is kept. It warns, naming the card, when a tile's outer ring is not near black.
- **A2** `art-department/tests/test_split_card_sheet.py` (run by `npm run art:test`) builds synthetic sheets in the
  test and pins: a good 3 x 2 sheet gives six named cells; a `null` tile is skipped; a 3 x 1 sheet, a non-square tile
  and a fringe on a tile's edge are each refused; a magenta stroke in a tile's middle is kept; the warning fires on a
  grey ring. No test reads the committed masters.
- **A3** The Defender's 30 paintings ship as `axiomancer-mobile/assets/images/cards/df-*.webp`, cut by A1's tool from
  the committed masters and encoded by `ingest-art.mjs --no-grade`, with a `provenance.json` entry for the lane that
  names the masters, the prompts, the tool and T's selection. Its PR shows before/after shots of a Defender hand
  and one inspect view (`skills/heads-down.md` §4).
- **A4** The Merciful's 29 paintings ship as `mc-*.webp` the same way, with the same shots.
- **A5** The Elementalist's 30 paintings ship as `el-*.webp` the same way, with the same shots.
- **A6** Blood Price's 30 paintings ship as `bp-*.webp` the same way, with the same shots, replacing the torio files of the same names in
  place; the torio provenance entry is replaced by the new one, and no torio `bp-*` file is left behind.
- **A7** `CARD_ART_BY_ID` maps every card of all four lanes to its own painting, `index.ts`'s header comment says so,
  and `card-art.test.ts` has one "gives every <lane> card its own painting" test per lane (every id of
  `getCardLane(<lane>)` mapped, none the fallback, all distinct within the lane), Blood Price's existing test kept.
- **A8** The ten renamed cards and the Elementalist's 30 carry the names in Sources (`elementalist.cards.ts` gains a
  `name` per entry and stops building one from the slot); every test and doc that names an old name is updated; the
  library's no-duplicate-name test passes; each lane's ledger in `plan/card-ledger/` gets one dated line recording the
  names and this source. No id, text, number, colour or type changes. The PR shows one renamed card's inspect view
  per lane, before and after.

Measure: on a local web build, the dev menu's test deck for each of the four lanes shows a hand of its own paintings
with no fallback and no torio art, and the renamed cards read under their new names.

## Decisions made upfront — DO NOT ASK

- **Masters live in `art-department/masters/cards/`** as WebP q95 (about 7.7 MB for all four lanes, against about
  25 MB lossless; the shipped art is q44 at 640 px either way). They never ship (`art-department/README.md`).
- **Cut in Python, encode only with the ingest**, `--no-grade` (the art is in colour), `--category cards`. The tool
  writes PNG cells; nothing else encodes card art or writes its provenance.
- **Card art is square** and the face crops it with `contentFit="cover"`. No card-face code changes.
- **One painting phase per lane**, after the cutter: each is one ingest, one registry block and one test, so each is
  its own small PR and a bad sheet holds up only its lane.
- **All names land in one phase** (CA3e): renames touch only the mechanics library, its tests, two docs and the
  ledgers, so they need neither the art nor the cutter and can ship first.
- **Blood Price is repainted**, not added beside: the torio paintings go (T: all four lanes get the new art).
- **The Elementalist's names ship as listed** in Sources. [T to confirm #1]
- **The Merciful's "What Grace Owes" keeps its name**, though "What Is Owed" is now free. [T to confirm #2]
- **Paintings ship as T selected them**, including the Elementalist's winged figure. Confirmed by T (2026-10-31):
  ship it as painted; wings are allowed, and the art direction's rule 9 no longer bans them.

## Phases

### CA3a — The card cutter and the Defender's paintings (closes A1, A2, A3)

Size: M. Requires nothing.

- **Scope:** `art-department/tools/split-card-sheet.py` and its test; cut the Defender's five masters into a staging
  directory outside the repo; `node scripts/ingest-art.mjs --in <staging> --category cards --no-grade` from
  `axiomancer-mobile/` (license and source fields as in the masters' manifest); register the 30 in `index.ts`; add the
  Defender's test to `card-art.test.ts`.
- **Consumers:** every card face through `getCardArt` (`CombatBoard.tsx` `CombatCardFace`, the reward pick, the dev
  deck views). No code change there.
- **Save/schema:** none.
- **Tests:** A2's suite; `card-art.test.ts`; `scripts/art-department-sealed.test.mjs` stays green.
- **Verify gate:** `npm run verify -w axiomancer-mobile`, root `npm test`, `npm run art:test`. A `verify:visual`
  baseline that shows a Defender card changes on purpose and is re-approved in the PR.
- **Measure:** the PR's hand shot shows Defender paintings and no fallback.

### CA3b — The Merciful's paintings (closes A4)

Size: S. Requires CA3a.

- **Scope, consumers, tests, gate:** as CA3a, for `art-department/masters/cards/merciful/` and `mc-*`, without the
  tool; the Merciful's test in `card-art.test.ts`. The `null` tile is skipped.
- **Save/schema:** none.
- **Measure:** the PR's hand shot shows Merciful paintings and no fallback.

### CA3c — The Elementalist's paintings (closes A5)

Size: S. Requires CA3a.

- **Scope, consumers, tests, gate:** as CA3b, for `elementalist/` and `el-*`.
- **Save/schema:** none.
- **Measure:** the PR's hand shot shows Elementalist paintings and no fallback.

### CA3d — Blood Price's new paintings (closes A6, A7)

Size: S. Requires CA3a.

- **Scope:** as CA3b, for `blood-price/` and `bp-*`, overwriting the torio files in place and replacing their
  provenance entry; then `index.ts`'s header comment and the per-lane test set (A7), since this is the last lane in.
- **Consumers, tests, gate:** as CA3b.
- **Save/schema:** none.
- **Measure:** the PR's hand shot shows the new Blood Price paintings and no torio art.

### CA3e — Action names for all four lanes (closes A8)

Size: M. Requires nothing.

- **Scope:** the ten `name:` changes; a `name` field on each of the Elementalist's 30 entries and `toCard` reading it;
  the tests that name old names (`elementalist.engine.test.ts` checks the built name), `docs/card-spec.md`, and one
  dated line in each of the four ledgers.
- **Consumers:** every surface reads names from the library; saves store ids.
- **Save/schema:** none.
- **Tests:** the four lane engine tests, `card-upgrade-law.engine.test.ts`, the duplicate-name check.
- **Verify gate:** `npm run verify -w axiomancer-mechanics`, root `npm test`.
- **Measure:** `grep` finds none of the ten old names and no `Elementalist ${` in `axiomancer-mechanics/src`.

## Definition of done

All five phases merged; each lane's test deck shows its own paintings under its names on a local web build.

## Follow-ups

- T's plays: the Defender check (Nov 12) and the Merciful check (MF1e) now see the new art.
- The MERCY icon is a dove (UI, not card art); the no-animals rule as written covers paintings and names.
