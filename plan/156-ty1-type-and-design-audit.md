# 156 — Type and colour by T's ballots, then a design audit of every screen against the AI-design tells

> A friend of T's said the screens look made with Claude design. They were, and T doesn't want them to read that way. This spec does three things:
>
> - **Type.** T picks a font for each of 15 jobs type does in the game on a ballot. The game then sets every word through those 15 roles.
> - **Colour.** Once the fonts and every UI round in flight have landed, a second ballot offers whole palettes drawn from real references, shown on the real screens with T's kit pieces. T's pick replaces the near-black brown ground and the gold-on-everything accent.
> - **The audit.** Once every UI round in flight has landed (specs 152 to 155, and the type), one pass screenshots every screen and lists what still reads as AI-made, why, and the fix. For the three worst screens it mocks three directions each for T to pick from.

## Why

### Sources

- T, 2026-11-06, in a session: "a friend of mine mentioned that the screens for Miserere all look very much like they've been made with Claude design. Now they were, but I don't want the screens to look AI generated."
- T, the same session, after the research below: "We definitely need to work on the font. I want an artifact/ballot where I could have several options to decide which screen/area gets which font with a lot of thematic font options." And: "plot a phase where after all the UI work is done, we do a design audit pass with all this as the direction."
- T, the same session, after a second outside read of one of T's pages named the tells (near-black warm brown background, muted gold accent on everything, blackletter titles, condensed capital buttons, tiny letter-spaced mono labels): asked whether this work covers them, then chose a colour ballot "but only after 1) The new fonts are chosen and landed and 2) All UI treatment from today land in main".
- The research: five web-research passes the same day. Their findings, with sources, are the Design section's "The direction". Evidence is thin across the field: almost no controlled comparisons. The firmest sources are Anthropic's frontend-design skill, its frontend-aesthetics cookbook, and the Claude Design blog post by the designer who built it.

### What exists today (read 2026-11-06, at origin/main)

- **The type system** (`axiomancer-mobile/theme/axm.ts`): five faces in `FONTS` (`gothic` Pirata One, `serif` and `serifItalic` IM Fell English, `sans` Bebas Neue, `mono` JetBrains Mono) and six `TYPE` sizes. Components mostly set `fontFamily: FONTS.<face>` directly, not through `TYPE`. Counts over `app/` and `components/`: `FONTS.sans` about 243, `FONTS.mono` about 220, `FONTS.gothic` about 181, `FONTS.serif` and `serifItalic` about 177. `letterSpacing` of 1 to 2 is set on about 290 styles, nearly always on Bebas capitals.
- **Font loading** (`app/_layout.tsx`): Pirata One and both IM Fell faces load first; the rest load after start.
- **The tells in the code** (the same session's read): monospace on labels and numbers, tracked condensed capitals, cards with a hairline border and a 6 to 10 radius on nearly every panel, translucent washes derived from each accent (`sulfurSubtle`, `bloodSubtle`, ...), and screens built as centred stacks of like panels.
- **The ballot** `plan/card-ledger/fonts.ballot.html` (id `fonts-2026-11-06`, ledger `fonts.md`), added by this plot: 15 places, 8 to 10 live Google Fonts each from a pool of 43, a Browse tab, and a running count of font families picked. It saves and submits through the ballot kit.
- **The UI rounds in flight:** spec 152 (looks, round 1), 153 (layout notes), 154 (looks, round 2), 155 (the Deck reader). The Brass Gothic and Vellum & Ink kit pieces they place are hand-made art. They are the largest step away from the generated look already under way.
- **Mock pages for a pick:** 153.7 built a three-direction mock page for the Deck that T picked from. 156.5 reuses that shape.

## Design

### The direction

What the audit checks against. 156.1 writes it as `docs/design-direction.md` so later UI work reads it too.

1. **Hand-made surfaces over drawn rectangles.** A painted frame, texture or kit piece reads as made; a coded box with a 1 px border and a radius reads as generated. Game devs told their UI "looks AI" got the same advice: use real art.
2. **The ban list** (the published AI-design tells, as they show up in this game):
   - monospace for anything but debug;
   - tracked-out condensed capitals as the default label;
   - one radius and one hairline border on every panel;
   - translucent accent washes instead of a painted ground;
   - centred stacks of identical cards;
   - every button styled as primary;
   - thin generic icons over every heading;
   - text that sounds like a product ("Build faster").
3. **Be bold in one place.** Each screen has one element that is its memorable thing, and the rest stays quiet (Anthropic's frontend-design skill: "Spend your boldness in one place").
4. **Each screen has an emotional job.** One line of what the player should feel there, such as "judged" or "tempted". It is checked against a screenshot, not trusted as a prompt word alone. The research found no proof that mood words beat a specific visual brief, so the job always comes with concrete constraints.
5. **The manuscript, not the app.** Margins, drop capitals, rubrication, uneven edges and overlap over grids of tiles. Reference real manuscripts and printed books, not other apps.
6. **The method:**
   - Render the screen and critique it in a table (`Where | Why it reads as AI | Fix`), without redesigning yet. Then fix the top three only.
   - For a screen that needs more, mock several distinct directions, each from a different reference, and let T remix (the Claude Design blog: "ask for ten options, then remix").

### Type

- **Roles, not faces.** `theme/axm.ts` gains `TYPE_ROLES`, one entry per ballot place: title, eyebrow, sectionHead, narration, spoken, rules, button, chip, mapName, bigNumber, count, cardName, cardRules, foeName, entry. Each sets family, size, line height, case and letter spacing. A component names the job (`TYPE_ROLES.button`), never a face.
- **T's picks fill the roles** (voted 2026-11-06; the table is in `plan/card-ledger/fonts.md`). Eight families: Uncial Antiqua carries titles, buttons, chips, map names, card names and foe names; Eagle Lake the omens and the spoken line; Rosarivo the rules and card rules; Marcellus SC the small labels; MedievalSharp the section headings; Spectral the big numbers; Grenze the small counts; Fondamento the quest and ledger entries.
- **Fonts load from their `@expo-google-fonts` packages.** The faces the title and body roles use load first, the rest after start, as today. A face no role uses is removed with its package (`[T to confirm #2]`).
- **Letter spacing follows the face.** The 1 to 2 point tracking stays only where T's pick for that role is a condensed capital face.

### Colour

- **After the type and the UI rounds** (T, 2026-11-06). 156.6 needs 156.3, which needs the last chunks of specs 152 to 155, so the ballot is built on the screens as they will stand.
- **The ballot offers whole palettes, not single colours:**
  - 4 to 6 of them, each a ground, an ink, one accent and a danger red;
  - each drawn from a named real reference: an illuminated manuscript, a woodcut, a fresco, a printed book, or a painting in the game's own art set;
  - none of them the warm near-black with gold;
  - today's palette is on it as "now".
- **Shown on the real screens:**
  - the Wilds, a fight, Self, the Deck and one node screen, at 390×844, from a build with each palette swapped in;
  - T's kit pieces in place;
  - the brass pieces are gold by nature, so each palette says how it treats them: kept as the one bold metal, toned, or kept to fewer places.
- **One accent, one place.** Whichever palette wins, the accent goes on the screen's one bold element. Everything else uses the ink and the ground (the direction's part 3).
- **Applied as a theme.** The pick becomes a `ThemeSpec` in `theme/palette.ts`, made the default. The other themes stay selectable in Settings.

### The audit

- **Every screen, 390×844**, through the existing e2e drivers, in its main states: Wilds, the fight (with a foe and with the hand open), Spoils, Self, Satchel, Deck, Ledger, Settings, main menu, and each node screen of spec 154.
- **Per screen:**
  - its emotional job, proposed for T to confirm;
  - the tells table;
  - the bold thing (or "none");
  - the top three fixes, each labelled look-only or layout.
- **A tell count over the code**, before and after the UI rounds:
  - monospace sets;
  - tracked capitals;
  - distinct radii;
  - translucent washes;
  - hairline borders.

  It is a number to watch, not a gate.
- **Words are flagged, not rewritten.** Copy that sounds generated is listed by screen; T writes the replacements (D88).
- **The three worst screens get three directions each** as a mock page in `plan/card-ledger/`, like 153.7, each direction from a different named reference (a manuscript, a printed book, a game). T picks; the picks are plotted.

### Decisions made upfront (do not ask)

- EMBARK on the title screen is not touched (T, 2026-11-05).
- The audit changes no code on screens. It reports and mocks; T's picks are plotted after it.
- The type roles change type only. Layout, colour and the kit pieces stay where specs 152 to 155 put them.

### Out of scope

- New art. Frames, textures and kit pieces are T's (D88). The audit may say a screen wants one, and T commissions or makes it.
- The village, until its own pitch (Item, Nov 7).

## Acceptance

- **A3** No component under `app/` or `components/` sets a `FONTS.<face>` directly. Every text style goes through a role, and a lint test fails a new direct use.
- **A4** The audit report `docs/reports/design-audit-<date>.md` covers every screen in the list, each with its emotional job, its tells table, its bold thing and its top three fixes. It also carries the tell count before and after the UI rounds, and the copy flagged by screen.
- **A5** A mock page offers three directions for each of the audit's three worst screens, under the ballot index, and T's picks come back through the ballot kit.
- **A6** A colour ballot offers 4 to 6 whole palettes from named references, plus today's as "now", each shown on five real screens with T's kit pieces, under the ballot index.
- **A7** T's palette is the default theme. The accent appears only on each screen's bold element and the controls that need it, and the audit's gold-accent count drops against its before figure.

## Open questions

1. A place T leaves blank on the font ballot keeps today's face. Confirmed by T (2026-11-06): moot; T's notes filled the three places left unticked, so no place is blank.
2. A face no role uses after T's picks leaves the app entirely. T's picks keep none of today's four: Pirata One, IM Fell English, Bebas Neue and JetBrains Mono would all go (EMBARK is an image and is unaffected). Default: yes, package and all. Or: keep it for the dev menu only. [T to confirm #2]
3. The audit waits for every UI chunk of specs 152 to 155 and the type. Default: yes, all of them. Or: start once 152 to 154 land and leave the Deck to a second pass. [T to confirm #3]
4. The audit proposes each screen's emotional job for T to confirm. Default: yes, the loop drafts and T edits. Or: T writes them before the audit runs. [T to confirm #4]
5. The audit runs after the colour pick lands, so it audits the finished look. Default: yes. Or: run the audit right after the fonts, before colour. [T to confirm #5]

## Chunks

Measure: 5 open · 2 closed · next A8

- [ ] **156.3** Every screen sets its type through a role · L · closes A3 · needs 152.4, 153.4, 154.6, 155.4 · alias: TY1c
- [ ] **156.4** The design audit of every screen · M · closes A4 · needs 156.7 · alias: TY1d
- [ ] **156.5** Three directions for the three worst screens · M · closes A5 · needs 156.4 · alias: TY1e
- [ ] **156.6** The colour ballot: whole palettes on the real screens · M · closes A6 · needs 156.3 · alias: TY1f
- [ ] **156.7** T's palette, the default theme · M · closes A7 · needs 156.6 · alias: TY1g

### 156.1 (TY1a) — The design direction, written down · S · closes A1 · requires —

- Write `docs/design-direction.md` from the Design section's "The direction", with the sources the plot's session found:
  - Anthropic's frontend-design skill and frontend-aesthetics cookbook;
  - the Claude Design blog post;
  - the published tell lists;
  - the game devlogs.
- Name it in `AGENTS.md`'s reading order for design work.
- Measure: the root `npm test` (the docs links check).

### 156.2 (TY1b) — The type roles, filled from T's font ballot · M · closes A2 · requires —

- T's verdict is in `plan/card-ledger/fonts.md` (voted and pasted 2026-11-06, written there by the plot's session; the ballot is closed).
- Add `TYPE_ROLES` to `theme/axm.ts` and the picked faces' `@expo-google-fonts` packages. Load them in `app/_layout.tsx`, the title and body faces first.
- Keep `FONTS` and `TYPE` working. T's answer at the pilot gate (2026-11-07) overrides "no screen changes": this chunk also repoints today's five `FONTS` slots to T's picks (gothic and sans to Uncial Antiqua, serif to Rosarivo, serifItalic to Eagle Lake, mono to Grenze), so every screen shows T's fonts on the next build. 156.3 does the exact per-job mapping (Marcellus SC labels, MedievalSharp headings, Spectral big numbers, Fondamento quests) by moving components to `TYPE_ROLES`.
- Measure: a test that every role names a loaded face, then `npm run verify -w axiomancer-mobile`. The PR carries a 390×844 specimen page of the 15 roles.

### 156.3 (TY1c) — Every screen sets its type through a role · L · closes A3 · requires 156.2 and the last open chunks of specs 152 to 155

- Move every `fontFamily: FONTS.<face>` under `app/` and `components/` to the role for its job. Drop tracking where the role's face is not condensed capitals.
- Add the lint test for A3. Remove a face no role uses, with its package (`[T to confirm #2]`).
- Waits for the UI rounds so it does not fight their diffs.
- Measure: the lint test, then `npm run verify -w axiomancer-mobile`. The PR carries before and after shots of the Wilds, the fight, Spoils, Self and the Deck.

### 156.4 (TY1d) — The design audit of every screen · M · closes A4 · requires 156.1, 156.7

- Screenshot every screen in the audit's list at 390×844, with the e2e drivers (`enterLiveFight` stops on the reveal card: press `combat-enter`).
- Write `docs/reports/design-audit-<date>.md` per the Design section. The tell count is taken at the commit before spec 152's first chunk and at this chunk's base.
- Rank the screens by how much still reads as generated, and name the three worst.
- Measure: the report covers every screen in the list. The PR links the shots.

### 156.5 (TY1e) — Three directions for the three worst screens · M · closes A5 · requires 156.4

- For each of the three worst screens, mock three directions, each from a different named reference, as one ballot page under `plan/card-ledger/` (the kit, an index entry, no colours on candidates).
- Each direction is a still at 390×844 with a one-line idea and its reference.
- Measure: `node --test scripts/ballot-kit.test.mjs`. The PR links the page's branch preview.

### 156.6 (TY1f) — The colour ballot: whole palettes on the real screens · M · closes A6 · requires 156.3

- Draft 4 to 6 palettes per the Design section's "Colour", each from a named reference, plus today's as "now". Write each as a `ThemeSpec` on the branch only; no default changes.
- Shoot the Wilds, a fight, Self, the Deck and one node screen at 390×844 under each palette, kit pieces in place.
- Build `plan/card-ledger/colours.ballot.html` with the kit, an index entry and a ledger `colours.md`. It takes one pick, plus a note on how the brass pieces are treated.
- Measure: `node --test scripts/ballot-kit.test.mjs`. The PR links the page's branch preview.

### 156.7 (TY1g) — T's palette, the default theme · M · closes A7 · requires 156.6

- Held until T submits the colour ballot. Read the verdict into `colours.md` and close the ballot.
- Add T's palette to `THEME_SPECS` and make it `DEFAULT_THEME_ID`. Move the accent off every place but each screen's bold element and the controls that need it.
- Measure: the palette tests, then `npm run verify -w axiomancer-mobile`. The PR carries before and after shots of the five ballot screens.
