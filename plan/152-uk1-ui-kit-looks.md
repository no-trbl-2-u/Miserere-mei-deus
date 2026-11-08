# 152 — The UI kit, place by place: Brass Gothic, Vellum & Ink or as it is, per T's picks

> T's experience kit goes in where T kept it and nowhere else. Forty-four places in the app each have one look on record (Brass Gothic, Vellum & Ink or Normal), chosen by T in the kit mixer. The Wilds and the Spoils go to parchment and ink, the fight, Self and Settings take the brass fittings T liked, and everything T kept plain stays exactly as it is today.

## Why

### Sources

- T closed the Brass Gothic PR (#1398, branch `experience-brass-full`, commit `5dd8cf6e9`) on 2026-11-05: "I like some of this, I love a few, but I hate the rest." Standing call, same message: "I don't want the title screen's embark changed. It already looks great."
- The triage: a phone ballot of three crops per place (`plan/card-ledger/ui-kit.ballot.html`), then the kit mixer (`plan/card-ledger/ui-kit-mixer.html`), a live mock where each of the same 44 places switches between Normal, Brass Gothic and Vellum & Ink. T picked in the mixer and pasted the result on 2026-11-06. The picks and T's notes, verbatim, are the Verdicts section of `plan/card-ledger/ui-kit.md`; T's exact mix opens at `https://miserere-mei-deus.pages.dev/ui-kit-mixer#s=wilds&p=bccccacbabbabaabccccbbbabbcaaabcaaaaababbbbb`.
- T, 2026-11-06: "Plot this, open the PR, then we'll plot the other things I mentioned." This spec plots the looks. The notes that change layout or behaviour (labels removed, the quest tracker hiding, the tab bar's labels, the hazard deck link, burden, the Deck screen) are spec 153.

### What exists today (read 2026-11-06, at b88e6c3)

- `axiomancer-mobile/assets/images/experience/`: all 86 kit pieces as delivered PNGs with `provenance.json`, registered in `index.ts`, imported by nothing.
- Branch `experience-brass-full` (PR #1398, closed, kept as the reference build):
  - `components/experience/KitBackdrop.tsx`, which provides the nine-slice `KitBackdrop`, `KitImage`, `KitHeader` and `KitDivider`. Each piece is a flex row-and-column split with percentage insets, because Android ignores `capInsets`. It comes with a test.
  - `assets/images/experience/brass/`: the brass pieces converted to webp, with `index.ts`, `provenance.json` and `scripts/brass-kit.test.mjs`.
  - Every brass placement wired. The files are listed in its PR. Note that its `TitleScreen.tsx` change must not be carried.
- No vellum piece has been converted or wired anywhere. The mixer's vellum looks were mocked in HTML, and the ballot's vellum crops swapped files on the brass build.
- Known RN-web trap from #1398: an absolutely positioned backdrop hides a static `Svg` sibling unless the `Svg` is wrapped in a `View`.

## Design

**One look table.** A module (e.g. `components/experience/looks.ts`) maps each of the 43 place ids (the mixer had 44; F-04, the hazard deck link, went with its screen in 153.5) (`M-01` ... `O-07`, the ledger's ids) to `normal`, `brass` or `vellum`, with T's picks as the values. Each wired component reads its place's look from it, so a later change of heart is a one-line edit, not a re-wire. `normal` means the component's code path is today's, untouched.

**T's picks:**

| Look | Places |
|---|---|
| Brass Gothic | M-01 main menu buttons; S-01 ENTER COMBAT / WITHDRAW; S-03 intent badge; S-04 conviction chip; S-06 player dock; S-09 player VITAE bar; F-01 portrait frame; F-02 level badge; F-03 HEART / BODY / MIND tiles; F-05 section headings and divider; F-06 VITAE pool bar; B-04 gear slot rows; O-01 section headings; O-03 segmented choices; O-04 radio choices; O-05 on/off toggles; O-06 volume steppers; O-07 menu row buttons |
| Vellum & Ink | W-01 status card; W-02 node panel; W-03 BACK / TRAVEL HERE; W-04 quest tracker; W-06 bottom tab bar; P-01 fight summary; P-02 CONTINUE; P-03 card offer; P-04 TAKE NOTHING / TAKE CARD; L-01 Ledger headings and dividers; B-05 ALL / GEAR / PHIALS tabs |
| Normal (unchanged) | W-05 map node marks; S-02 name rail and VITAE bar; S-05 momentum chip; S-07 END; S-08 portrait ring; B-01 purse; B-02 burden bar; B-03 worn-gear panel; B-06 item cards; D-01 to D-04 (the whole Deck screen); O-02 colour theme list |

**Brass** reuses #1398's wiring for exactly the brass places above, and nothing else.

**Vellum and ink.**

- Text that sits on a vellum piece is inked: body text in dark iron-gall brown (about `#2b1f14`), and accents in oxblood (about `#6e1a10`; `#7a1f14` measures 4.35:1 on the darkest parchment and fails A5's 4.5:1 floor) where today's text is gold or amber (T, 2026-11-06: oxblood red, not the dark-brown body ink).
- Every inked colour meets 4.5:1 contrast on the parchment.
- Green is darkened to a readable ink. An example is the fight summary's "Victory".
- T's note on P-01 ("adjust the font to be easier to read, and change the yellow font to be readable") is satisfied by the ink rule and a body face at least as large as today's.

**Places that need care beyond a swap:**

- **W-01 status card:** everything sits inside the panel's oval (T: "tighten everything up so it all fits inside the oval"), at 360 and 390 widths.
  - It ships in two variants for T to compare, one with a solid black band behind the whole top of the Wilds and one without (T: "try it with and without a black background behind the whole top part so minimize the chaotic lines").
  - A dev toggle switches between them; the default is `[T to confirm #2]`.
- **W-06 tab bar:** the vellum dock with no tile, wrapper or marker behind the selected tab. The selected tab is shown only by its oxblood ink (T: "Let's not have the Gold wrapper around the current selection. The red text is enough").
- **S-01 to S-09, the fight:** every element keeps today's position and size on the board (T: "make sure the layout is maintained. (ie. keep intent in the upper right and momentum in the bottom-middle center)"). Only the art behind each element changes.
  - The cards stay untouched in every look (T, 2026-11-05: "do not put anything on the cards in combat").
  - The reveal screen (S-01, ENTER COMBAT / WITHDRAW) is T's reference for the whole treatment: "I do love the screen looking like this, so when we do the UI treatment work, refer to this screen".
- **O-02 colour theme list:** stays as it is, and keeps showing each theme's colours (T: "Make sure this still shows what the theme changes the colors to (as it is today)").
- **The title screen:** draws no kit piece, and its EMBARK is unchanged from main (T, 2026-11-05).

**Assets.** Only the pieces the table names are converted (webp, per `docs/asset-conventions.md`) and bundled. A piece no place uses stays a PNG outside the bundle, as today.

### Decisions made upfront (do not ask)

- The looks are T's picks (T, 2026-11-06, in the mixer). A place the table marks `normal` keeps today's code path byte for byte.
- No kit piece goes on a combat card (T, 2026-11-05).
- The title screen's EMBARK is never re-skinned (T, 2026-11-05).
- One look table is the single source; components never hard-code a look.
- The nine-slice is built from flex rows and columns with percentage insets, never `capInsets` (Android ignores them; learned in #1398).

### Out of scope

- The layout and feature changes in T's notes are all spec 153:
  - the shorter menu labels;
  - the quest tracker hiding when a node is chosen, and its label and counter;
  - the tab bar's labels and icon size;
  - "A FOE RISES" removed;
  - the player dock's circles removed and its END and height changed;
  - the hazard deck link and burden removed;
  - the Deck screen's treatment.
- Screens the ballot did not cover: the village, blacksmith, rest, hazard, quest, cutscene, travel, cache and other node screens. T asked for a separate check of every other screen once spec 153's PR is open.
- New kit art.

## Acceptance

- **A5** The fight summary, card offer, CONTINUE and TAKE NOTHING / TAKE CARD are on vellum. No gold or amber text sits on parchment, and every inked colour on vellum measures at least 4.5:1.

## Open questions

1. When should this be built? Default: the Asap lane, after the entries already there, so T sees it at the MVP demo on Nov 16. Or: table order. [T to confirm #1]
2. **Answered** (T, 2026-11-06): the black band ships as the default. Both tops stay built behind the dev toggle (without the band the map runs up under the status card, as in the mixer).
3. **Answered** (T, 2026-11-06): gold and amber accents on parchment become oxblood red, as in the mixer, not the dark-brown body ink.
4. **Answered** (T, 2026-11-06): the intent badge uses the oxblood ring for an attack and the brass ring for anything else (guard, buff), matching today's colour split. Both rings are converted and registered (152.1).

## Chunks

Measure: 1 open · 7 closed · next A9

- [ ] **152.4** The Spoils on vellum, inked to read · S · closes A5 · needs — · alias: UK1d

### 152.1 (UK1a) — The look table, the kit primitives and the pieces it names · M · closes A1 · requires —

- Port `KitBackdrop.tsx` (with `KitImage`, `KitHeader`, `KitDivider`) and its test from `experience-brass-full`.
- Add `looks.ts` with the 44 places and T's picks.
- Convert and register the brass pieces the brass places use, and the vellum pieces the vellum places use (`menu-panel-vellum`, `modal-panel-vellum`, `action-button-vellum`, `quest-row-vellum`, `nav-dock-vellum`, `section-header-vellum-*`, `divider-*-ink`, `filter-tab-vellum`, plus any a vellum place needs). Provenance goes with them.
- Add a test over the table, the bundle and the title screen (A1).
- Measure: the new tests, then `npm run verify -w axiomancer-mobile`.

### 152.2 (UK1b) — The Wilds on vellum, and the tab bar · M · closes A2, A3 · requires 152.1

- `StatusCard`, `NodeConfirmPanel`, its two buttons, `QuestTracker` and the tab bar in `app/(tabs)/_layout.tsx` read their looks from the table.
- Ink the text. Fit the status card inside the oval. Add the black-band variant behind a dev toggle (default per #2). The selected tab shows ink only.
- Measure: `npm run verify -w axiomancer-mobile`. The PR carries 390×844 screenshots of the Wilds: idle, node chosen, and both band variants.

### 152.3 (UK1c) — The fight in brass where T kept it, layout held · M · closes A4 · requires 152.1

- `CombatEncounterPanel` (reveal), `IntentIcon` (ring per #4), `CombatBoard`'s conviction chip, `CombatFooterDock` and the player VITAE bar read their looks.
- The name rail, momentum chip, END and portrait ring keep today's code.
- A test pins each element's box against today's layout.
- Measure: `npm run verify -w axiomancer-mobile` and `npm run verify:visual` for the combat screen. The PR carries screenshots of the reveal and the board.

### 152.4 (UK1d) — The Spoils on vellum, inked to read · S · closes A5 · requires 152.1

- `CombatSummaryModal` and `CombatRewardsOverlay` on `modal-panel-vellum`, with vellum buttons and inked text.
- A contrast check measures each inked colour against the parchment (A5).
- Measure: `npm run verify -w axiomancer-mobile`. The PR carries screenshots of both overlays.

### 152.5 (UK1e) — Self in brass; the Ledger and Satchel pieces · M · closes A6, A7 · requires 152.1

- `character/index.tsx` and `StatBar` take the brass places on Self.
- `memoir/index.tsx` takes vellum headings and ink dividers.
- `EquipmentSlot` takes brass, and `InventoryTabs` takes vellum.
- `EquipmentDock`, `ItemCard`, the purse, the burden bar and the Deck screen keep today's code.
- Measure: `npm run verify -w axiomancer-mobile`. The PR carries screenshots of Self, the Ledger and the Satchel.

### 152.6 (UK1f) — The main menu and Settings in brass · M · closes A8 · requires 152.1

- `MenuButton`, `OptionRow` (segmented, radio and toggle variants), `StepperRow` and `SettingsBody`'s headings take brass.
- `ThemeSwitcher` keeps today's code.
- The title screen is untouched.
- Measure: `npm run verify -w axiomancer-mobile`. The PR carries screenshots of the main menu, Settings (top and lower) and the title screen beside main's.
