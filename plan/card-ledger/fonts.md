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
`combat`), dimmed as `ScreenBg` dims it; a toggle shows them flat. One tick per place; the footer counts how many
families the picks add up to.

## Verdicts

Not voted yet. When T submits, the session holding spec 156 reads the
newest `final` row for `fonts-2026-11-06` (README "Reading a verdict
back") and writes it here, place by place.
