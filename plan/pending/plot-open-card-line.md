---
date: 2026-11-01
---
## Edit plan/137-cf1-card-face-grammar.md
~~~ old
else; the large face shows the glyph beside the word in both modes, so a glyph is learnt once. The glyph set per the
~~~
~~~ new
else; the open card prints the same line as the hand, in the chosen mode, never both. The glyph set per the
~~~

## Edit plan/137-cf1-card-face-grammar.md
~~~ old
small size, the art shrinking to make room; the large face keeps its own layout. The one-line `paidLedgerFit`
~~~
~~~ new
small size, the art shrinking to make room; the large face prints the same line bigger. The one-line `paidLedgerFit`
~~~

## Add plan/137-cf1-card-face-grammar.md
~~~ section Design
### The open card prints the hand's line (T, 2026-11-01, on the preview APK at `dab4c03b0`)

T's ruling: "It was all keywords would be REPLACED by glyphs, not both." The pitch's round 5 mock prints a face's
whole line in one of two runs, all words or all glyphs. "The large face shows the glyph beside the word in both
modes, so a glyph is learnt once" was never T's: it was added while writing 137.4, and it is struck.

The bug, seen in Words mode. Draw the Fever opened printed `<die>: <DEAL glyph> Deal 2`, with `Deal 2` in grey mono
title case and LEECH 2 gone, while the same card in hand printed `DEAL 2, LEECH 2`; Siphon opened printed a glyph, the
stat-family heart and `LEECH 4` together. The cause: `CombatCardFace`'s large branch still rendered the one-keyword
headline from before 137.3 (`f.keyword` and `f.heroText`, not `f.paidLine`). A plain DEAL has no headline keyword, so
the whole `Deal 2` became the value, in `FONTS.mono`, tinted `AXM.ash` when a stat lowered the number, and every later
step of the line was dropped.

**CF1g, the open card prints the hand's line.** Both faces print `f.paidLine` through one component, from
`paidLineRuns` and `paidLineWords`, in the parchment ink rule, with the die and colon leading the line's first row.
The large face prints at `largePaidLineSize(width)` and wraps with no row cap. The stat-family icon goes from the
line, since the die already says it. An armed card's glyph-mode words and glyphs follow the same ink rule on the small
face (the grey the words lost in Words mode), and so does the colon. The FREE pill, the name, the art and the rows
below the card are not this chunk's.
~~~
~~~ acceptance
- **A?openline** An opened card prints the card's whole PAID line, the same line as the hand, in capitals and parchment
  whatever a stat did to the number: all words in Words mode (no keyword glyph, no stat-family icon), all glyphs in
  Glyphs mode (no keyword word), wrapped with nothing clipped at 208, 259, 264 and 300 wide, with no glyph under a Text.
~~~
~~~ chunks
- [ ] **137.?openline** The open card prints the hand's whole line, in words or in glyphs, never both · S · closes A?openline · needs 137.4 · alias: CF1g
~~~
