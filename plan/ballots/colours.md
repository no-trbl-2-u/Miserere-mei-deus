# Colour: which whole palette

The ledger for the colour ballot (`colours.ballot.html`, ballot id
`colours-2026-11-09`), opened 2026-11-09 for spec 156 (chunk 156.6, TY1f).

## Why

A friend of T's said the screens read as made with Claude design, and the
near-black warm brown ground with a muted gold accent on everything is the
tell they named. T chose a colour ballot after the fonts and the UI rounds
landed (2026-11-06). 156.7 was to read the verdict from here; it was dropped on 2026-11-12 (Verdicts).

## The ballot

Six whole palettes: today's as "now" (P-01a) and five drawn from named
references (P-01b to P-01f). Each is a ground, a panel, an ink, one accent and
a danger red, and none is the warm near-black with gold. Each is shown on five
real screens at 390x844 (the Wilds on a sage fixture, a live fight on seed 16,
Self, the Deck, and a dialogue node), from a web export with that palette
swapped in. The kit pieces are art, so the brass and vellum stay as drawn in
every shot; each palette's line on the page says what it would do with brass.
The accent shows where the app uses the accent token today, which is on many
things; tightening it to each screen's one bold element was 156.7, dropped on 2026-11-12.

P-02 asks one thing apart from the palette: how the brass pieces sit in the
winner (kept as the one bold metal, toned to the palette, or kept to fewer
places).

Every palette holds the readable pairs the palette test pins (ink on ground at
12:1 or more, bone, accent, danger and rust on ground at 4.5:1) and keeps the
twelve map node kinds apart. The `ThemeSpec`s below are on this page only; no
theme was added to `theme/palette.ts` and the default is unchanged.

## The ThemeSpecs

156.7 would have pasted the winner into `THEME_SPECS` and made it `DEFAULT_THEME_ID`; it was dropped on 2026-11-12 and today's palette stays the default.
The kind tokens (`kind*`) derive from these hues in `makePalette`.

### P-01b Night of the Hours

The Limbourg brothers, Tres Riches Heures (c. 1411). Ground `#0a1020`, panel `#101a30`, ink `#ece6d2`, accent (`sulfur`) `#e8744a`, danger (`blood`) `#e0587a`.

```ts
'limbourg': {
  id: 'limbourg',
  name: 'Night of the Hours',
  blurb: '...',
  spec: {
    bg: '#0a1020',
    parchment: '#ece6d2',
    blood: '#e0587a',
    sulfur: '#e8744a',
    rust: '#c8694a',
    heal: '#7fae8c',
    bone: '#9aa3b8',
    ash: '#343c54',
    panelBg: '#101a30',
    deepBg: '#060a16',
    dockBg: '#0c1426',
    silhouette: '#080d1b',
    selectFill: '#1a2a4c',
    debuff: '#2a1c3c',
    buff: '#18304a',
    pixelShadow: '#1c2c5a',
    pixelHighlight: '#f2eddc',
    lapis: '#6f93d8',
    murex: '#a77ab8',
  },
},
```

### P-01c Apocalypse Woodcut

Durer, the Apocalypse woodcuts (1498). Ground `#121314`, panel `#1a1b1c`, ink `#ece8dc`, accent (`sulfur`) `#d9533a`, danger (`blood`) `#e8685a`.

```ts
'durer': {
  id: 'durer',
  name: 'Apocalypse Woodcut',
  blurb: '...',
  spec: {
    bg: '#121314',
    parchment: '#ece8dc',
    blood: '#e8685a',
    sulfur: '#d9533a',
    rust: '#c9725c',
    heal: '#7fb08a',
    bone: '#a09d94',
    ash: '#3c3d3e',
    panelBg: '#1a1b1c',
    deepBg: '#0b0c0d',
    dockBg: '#151617',
    silhouette: '#0e0f10',
    selectFill: '#2a2b2c',
    debuff: '#262230',
    buff: '#2c2a24',
    pixelShadow: '#4a2a24',
    pixelHighlight: '#f6f2e6',
    lapis: '#7f94b0',
    murex: '#a08098',
  },
},
```

### P-01d Scrovegni Green Earth

Giotto, the Arena Chapel frescoes (c. 1305). Ground `#0d1510`, panel `#142019`, ink `#e8e8d6`, accent (`sulfur`) `#7d9ae8`, danger (`blood`) `#e0654f`.

```ts
'giotto': {
  id: 'giotto',
  name: 'Scrovegni Green Earth',
  blurb: '...',
  spec: {
    bg: '#0d1510',
    parchment: '#e8e8d6',
    blood: '#e0654f',
    sulfur: '#7d9ae8',
    rust: '#c0745a',
    heal: '#8db48a',
    bone: '#98a393',
    ash: '#34423a',
    panelBg: '#142019',
    deepBg: '#080e0a',
    dockBg: '#101a14',
    silhouette: '#0a110d',
    selectFill: '#1c3042',
    debuff: '#2a2038',
    buff: '#1c3328',
    pixelShadow: '#24402e',
    pixelHighlight: '#f2f2e2',
    lapis: '#5fb0c8',
    murex: '#a47ab0',
  },
},
```

### P-01e Isenheim Night

Grunewald, the Isenheim Altarpiece (c. 1515). Ground `#0b1517`, panel `#112024`, ink `#e4e8d8`, accent (`sulfur`) `#d8849a`, danger (`blood`) `#e0554a`.

```ts
'isenheim': {
  id: 'isenheim',
  name: 'Isenheim Night',
  blurb: '...',
  spec: {
    bg: '#0b1517',
    parchment: '#e4e8d8',
    blood: '#e0554a',
    sulfur: '#d8849a',
    rust: '#c27a68',
    heal: '#86b8a0',
    bone: '#93a3a0',
    ash: '#2e4244',
    panelBg: '#112024',
    deepBg: '#060d0f',
    dockBg: '#0d191c',
    silhouette: '#08110f',
    selectFill: '#2c2030',
    debuff: '#2a1c34',
    buff: '#183430',
    pixelShadow: '#5a2430',
    pixelHighlight: '#f0f2e4',
    lapis: '#7a96c0',
    murex: '#b07aa8',
  },
},
```

### P-01f Purple Vellum, Silver Ink

The Rossano Gospels (6th century). Ground `#150e1c`, panel `#1d1428`, ink `#ebe7f0`, accent (`sulfur`) `#b6c2dc`, danger (`blood`) `#e8604e`.

```ts
'purpureus': {
  id: 'purpureus',
  name: 'Purple Vellum, Silver Ink',
  blurb: '...',
  spec: {
    bg: '#150e1c',
    parchment: '#ebe7f0',
    blood: '#e8604e',
    sulfur: '#b6c2dc',
    rust: '#c27a8a',
    heal: '#8eb89c',
    bone: '#a39cb2',
    ash: '#403650',
    panelBg: '#1d1428',
    deepBg: '#0c0712',
    dockBg: '#180f22',
    silhouette: '#100a18',
    selectFill: '#2c2244',
    debuff: '#2c1a40',
    buff: '#22303c',
    pixelShadow: '#40205a',
    pixelHighlight: '#f4f1f8',
    lapis: '#7a92d0',
    murex: '#b684c0',
  },
},
```

## Verdicts

Closed unvoted by T, 2026-11-12: "the current coloring is fine." Today's palette stays the default; 156.7 (TY1g), which waited on this verdict, is dropped.
