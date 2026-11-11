# Fonts: which type does which job

The ledger for the font ballot (`fonts.ballot.html`, ballot id
`fonts-2026-11-06`), opened 2026-11-06 for spec 156.

## Why

A friend of T's said the screens read as made with Claude design. T, the
same day: "We definitely need to work on the font. I want an
artifact/ballot where I could have several options to decide which
screen/area gets which font with a lot of thematic font options."

Type is the clearest of the tells in the code as it stands (read at
origin/main, 2026-11-06):

- `FONTS.mono` (JetBrains Mono) is set about 220 times, mostly on labels
  and numbers. Monospace as a "technical" shortcut is on every published
  list of AI-design tells.
- `FONTS.sans` (Bebas Neue) is set about 240 times, nearly always in
  capitals with 1 to 2 points of letter spacing: the tracked-out eyebrow
  label, another listed tell.
- Pirata One and IM Fell English, the gothic and the book face, are the
  identity (`theme/palette.ts`) and are kept on the ballot as "now".

## The ballot

15 places type does a job, in five groups (Headings, Words, Buttons and
labels, Numbers, Cards and foes), 8 to 10 fonts each, from a pool of 43
Google Fonts families. Every one has an `@expo-google-fonts` package, so
any pick can be built. A Browse tab sets every font the same way with one
line on what it is. Each place with backdrop art in the game is set over
that screen's own plate (`fonts/`, resized from `assets/images/maps` and
`combat`), dimmed as `ScreenBg` dims it. Six places sit inside T's own kit
piece where T's kit-mixer picks put it (the brass section header and
HEART / BODY / MIND tile, the vellum panel, button and tab); cards carry
no kit piece (T, 2026-11-05). A toggle shows every specimen flat. One tick per place; the footer counts how many
families the picks add up to.

## Verdicts

T voted 2026-11-06 and pasted the generated sheet into the session (Save and
Submit could not reach the Worker from this host: `BALLOT_ORIGINS` still
lists only `axiomancer-ballots`). Twelve places were ticked; T's notes fill
the other three (marked *by note*). Eight families in all.

| Place | Job | Font |
|---|---|---|
| H-01 | Screen titles and place names | Uncial Antiqua |
| H-02 | Small labels above titles | Marcellus SC |
| H-03 | Section headings inside panels | MedievalSharp |
| W-01 | Omens and narration | Eagle Lake |
| W-02 | The spoken line in dialogue | Eagle Lake (*by note*: "Can we do \"The eagle lake\" here as well?") |
| W-03 | Rules and explanations | Rosarivo |
| B-01 | Buttons | Uncial Antiqua |
| B-02 | Chips, tabs and tags | Uncial Antiqua (*by note*: "Can we do Uncial Antiqua here as well?") |
| B-03 | Map node names | Uncial Antiqua |
| N-01 | Big numbers | Spectral |
| N-02 | Small counts and stats | Grenze |
| C-01 | Card names | Uncial Antiqua |
| C-02 | Card rules text | Rosarivo |
| C-03 | Foe names | Uncial Antiqua (*by note*: "Try Uncial Antiqua here as well") |
| C-04 | Quest and ledger entries | Fondamento |

Families: Uncial Antiqua (6 places), Eagle Lake (2), Rosarivo (2), Marcellus
SC, MedievalSharp, Spectral, Grenze, Fondamento. Faces of today no place
kept: Pirata One, IM Fell English (and its italic), Bebas Neue, JetBrains
Mono.

The verdict text, as pasted:

```
BALLOT: Fonts, which type does which job (fonts-2026-11-06)
answered 12 of 15; 8 families: Uncial Antiqua, Marcellus SC, MedievalSharp, Eagle Lake, Rosarivo, Spectral, Grenze, Fondamento
-- Headings --
H-01 Screen titles and place names: Uncial Antiqua
H-02 Small labels above titles: Marcellus SC
H-03 Section headings inside panels: MedievalSharp
-- Words --
W-01 Omens and narration: Eagle Lake
W-02 The spoken line in dialogue: no answer | note: Can we do "The eagle lake" here as well?
W-03 Rules and explanations: Rosarivo
-- Buttons & labels --
B-01 Buttons: Uncial Antiqua
B-02 Chips, tabs and tags: no answer | note: Can we do Uncial Antiqua here as well?
B-03 Map node names: Uncial Antiqua
-- Numbers --
N-01 Big numbers: Spectral
N-02 Small counts and stats: Grenze
-- Cards & foes --
C-01 Card names: Uncial Antiqua
C-02 Card rules text: Rosarivo
C-03 Foe names: no answer | note: Try Uncial Antiqua here as well
C-04 Quest and ledger entries: Fondamento
```
