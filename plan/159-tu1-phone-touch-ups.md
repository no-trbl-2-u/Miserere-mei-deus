# 159 — Touch-ups from T's phone: the Spoils, the fight, card faces, the Wilds, the tab bar and Self

> T played the latest preview build on the phone (2026-11-08), liked it, and marked what still looks wrong on five screens. This spec fixes those marks, in four chunks, one per area of the app.
>
> - **The Spoils** lose four lines of small print.
> - **The fight** loses its phase/round/turn line, the dock fits, END shrinks, and a fog hides the seam between the arena and the hand.
> - **Card faces** show names in a face with real lowercase, and the Deck's open card loses its black band and its repeated effect.
> - **The Wilds** lose the black behind the quest card and the lower half of the band behind the status card; the player's token grows; the tab bar is vellum edge to edge with nothing behind it, taller, icons inside.
> - **Self** fits its stat plaques, and Dev Tools moves to Settings.

## Why

### Sources

- **T, 2026-11-08, five phone screenshots with marks** (the card reward with four lines struck out; the fight; Self; the Wilds with the bands circled in red; the Deck's open card), and these words, verbatim:
  - "I crossed out the things I don't want in the card reward screen."
  - "I don't want card titles to be in all caps. The bottom-most section, not everything fits right. The end button is too big and let's get something to try to cover up the hard line between the arena plate and the card area, just don't let that cover the enemy. The phase, round, turn text at the top can go, especially because that's incorrect with how phases work."
  - "The character screen, it's pretty obvious what's wrong there. Nothing major, just touch ups (and dev tools needs to be moved to settings)."
  - "Remove the black where I have it marked red (so no black behind the quest card, nor behind the 'Travel here' buttons. Let's make the player circle a little bigger, remove the white behind the bottom tabs section. Ideally I'd want nothing behind it and it fits the whole width of the bottom and was taller and the icons need to fit."
  - "Lastly, the deck screen. I have no idea what went wrong here. It's got a black overlay. The description doesn't make any sense. I see the paid effect twice. Nothing is on the same line."
  - "ideally into as few chunks as you can safely fit them"
- **T's answers in the same session (AskUserQuestion, 2026-11-08):**
  1. Card title face: **Fondamento**.
  2. The Wilds' bands: "Delete band for bottom but for the top, I only want the bottom half of the black deleted. I still want the top half as an experiment. (so the top half of the top section)".
  3. The seam between arena and hand: **a fog gradient**.
  4. The Deck's repeated effect: **drop the summary line**.

### What exists today (read 2026-11-08, at 4c8a83f)

- **The Spoils** (`components/combat/encounter/CombatRewardsOverlay.tsx`): the panel prints `✦ SPOILS` (eyebrow), the title "Add a card to your deck", a sub-line (`SPOILS_SUB`, or `ELITE_REWARD_SUB` on an elite), and under each button a note: TAKE NOTHING's "a lean deck draws its best more often", TAKE CARD's "choose a card first" / "it joins your deck for the run". The vellum look is 152.4's (UK1d, pending close).
- **The meta line** (`state/presenters/combat-encounter.engine.ts`, `metaLine: PHASE i/n · ROUND r · TURN t`), drawn by `CombatCombatantPane.tsx` as `hudMeta` under the foe's name rail. T: the count is wrong for how phases work, and it goes.
- **The dock** (`components/combat/encounter/CombatFooterDock.tsx`): 153.4 (UX1d, pending close) took its phase marks off and set END to 88 x 56 in a 66 pt row. On T's phone the portrait ring clips at the left, the pile counts and the VITAE number read faint and small, and END is still the biggest thing in the dock.
- **The seam:** the arena plate (spec 146) ends in a hard horizontal edge above the hand; nothing softens it. A dated T act (Nov 8, "Fix the title and combat image cut with a light fog blur") asked for options; T picked the fog gradient for the fight here. The title screen's half of that act is not this spec.
- **Card names:** `TYPE_ROLES.cardName` (`theme/axm.ts`) is Uncial Antiqua, whose lowercase is drawn as uncial capitals, so every card name reads as ALL CAPS (hand, Spoils tiles, Deck thumbnails, the Deck's open card). Fondamento is already loaded (`theme/fontFaces.ts`, the `entry` role) and has true lowercase.
- **The Deck's open card** (`components/deck/DeckOpenCard.tsx`, 155.1-155.4): a 96 pt `nameScrim` at 55% black lies across the bottom of the painting (T's "black overlay"). Its lines are the outcome line, then `◇ NO DIE` and `◆ +DIE`, each label on its own row above its text. The outcome line restates the +DIE effect, so the paid effect shows twice. The free line prints its keyword in lower case ("vulnerable"), so it is not pressed as a keyword, while the paid line prints it in capitals.
- **The Wilds** (`app/(tabs)/exploration/index.tsx`): with the dev setting `wildsBlackBand` on (the default, T's Nov 6 answer to spec 152 #2) the status card sits in a solid `BAND_BLACK` band and the map starts under it. At the bottom, the quest tracker and the node panel (with BACK / TRAVEL HERE) sit under the map on the screen's black. The player's token is drawn by `components/exploration/ExplorationNode.tsx` / `MapCanvas.tsx`.
- **The tab bar** (`app/(tabs)/_layout.tsx`): with `VELLUM_DOCK` on, `tabBarStyle` is `styles.tabBar` (60 pt, `backgroundColor: AXM.panelBg`) plus the vellum art. A light strip shows behind the art's ragged edge, the art does not reach the screen edges, and the 30 pt icons crowd its border.
- **Self** (`app/(tabs)/character/index.tsx`): the HEART / BODY / MIND plaques overflow their frames at 390 (labels cut by the frame, the numbers cut at the foot, the third plaque runs off the right edge). `components/dev/DevToolsLink.tsx` (testID `self-dev-tools-link`) is drawn at the foot of Self. Seven scripts reach `/dev` through it from `/character`: `live-fight-entry.mjs`, `audit-capture.mjs`, `exploration-combat-roundtrip-e2e.mjs`, `hazard-e2e.mjs`, `feature-map-e2e.mjs`, `encounter-routing-e2e.mjs`, `combat-round-e2e.mjs` (and any other `grep -rl self-dev-tools-link scripts` finds).

## Design

### 1. The Spoils (TU1a)

- The panel shows the title "Add a card to your deck", the three offers, and the buttons. No eyebrow, no sub-line (normal or elite), and no note under either button: each button is its label alone, centred in its plate.
- The accessibility labels keep their meaning ("Take nothing — keep the deck lean", "Take the selected card"); a disabled TAKE CARD still reads as disabled.
- The copy constants that lose their last reader are deleted, not left orphaned.

### 2. The fight (TU1a)

- **No meta line.** `metaLine` leaves the view-model and the pane; nothing replaces it. `phaseBadge`, `roundLabel` and `turnLabel` stay if something else reads them (`turnLabel` keys a pending-die reset in `CombatBoard.tsx`).
- **The dock fits.** At 360, 375 and 390 widths: the portrait ring is whole, the VITAE number and the two pile counts read at a size and contrast a player can see on the brass, and nothing overlaps or clips.
- **END is smaller:** about 72 x 48 (from 88 x 56), still the dock's one button, still a 44 pt touch target at least. The space it gives goes to the VITAE bar.
- **The seam fog.** A soft dark fog gradient sits over the plate's bottom edge, fading from the hand's background up into the plate, so no hard line shows. It never reaches the foe: its top stays below the foe sprite's lowest drawn pixel on every staged foe, checked on the reveal's seed and on the largest Chapter 1 sprite. It takes no touches (`pointerEvents="none"`) and is drawn under the hand and the dice.

### 3. Card faces (TU1b)

- **Names in Fondamento.** `TYPE_ROLES.cardName` becomes Fondamento, so names read in mixed case everywhere the role is used (hand, Spoils tiles, Deck thumbnails and open card). Every place that names a card face directly (not through the role) is moved onto the role. Sizes are re-fit so the longest Act 1 card name fits on a hand card and a Spoils tile in at most two lines without an ellipsis cutting the first word (today's "OVER..." on the Spoils).
- **The Deck's open card:**
  - No black band: the `nameScrim` goes. The name stays legible over the painting by a soft text shadow or a short gradient that has no visible edge, at most a quarter of the banner tall.
  - No summary line: the outcome line is not drawn on this screen (T's answer 4). The two play lines remain.
  - Each label sits on the same line as its effect: `◇ No die · Vulnerable +10% · 1 turn`, `◆ +Die · Vulnerable +25% · 2 turns`, then the stacks footnote. Labels and effect text use the same case rules; the keyword in the free line is pressed as a keyword exactly as in the paid line (155.4's runs), so the same word never shows in two casings.
  - The block keeps its fixed height (155's tabs must not move).

### 4. The Wilds and the tab bar (TU1c)

- **The top band, halved.** The band behind the status card keeps only its top half: the black runs from the top of the screen to the status card's vertical middle, and below that the map shows behind the card's lower half (T's "experiment"). The `wildsBlackBand` toggle stays; on (default) it now means this half band; off is today's floating card.
- **No bottom black.** The quest tracker and the node panel (BACK / TRAVEL HERE) float over the map's foot, edge to edge as today, with nothing drawn behind them but their own vellum. The map runs to the tab bar.
- **The player's token** is about 25% larger than today, centred on the same node; node hit areas and the selected node's ring are unchanged.
- **The tab bar, app-wide:** nothing behind it (no `panelBg` fill, no strip at the ragged edge, the screen shows through), the vellum art spans the full screen width, the bar is taller (about 76 pt from 60, plus the bottom inset), and the six icons sit inside the vellum's border at every width from 360 to 430. The selected tab is still shown by its oxblood ink alone (152.2).

### 5. Self (TU1d)

- **The stat plaques fit:** at 360 and 390, each label (HEART, BODY, MIND) sits inside its frame, each number is whole, and all three plaques are on screen. Fix by sizing the plaques from the available width, not by shrinking text below 11 pt.
- **Dev Tools moves to Settings:** the `DevToolsLink` row leaves Self and is the last row of Settings, under the same dev gate as today (shown in dev builds and with `__AXM_FORCE_DEV_TOOLS__`). Its testID becomes `settings-dev-tools-link`, and every script that reached `/dev` through Self now goes `/settings` then that link. Self keeps everything else.

### Decisions made upfront (do not ask)

- Four chunks, one per area, so each PR touches one corner of the app and its own visual routes: the fight with the Spoils, card faces, the Wilds with the tab bar, Self with Settings.
- TU1a needs 158.1 so the board's new visual route exists first and the dock and fog changes arrive as a reviewable baseline diff, not as the first stamp.
- The Wilds' toggle survives with a new meaning (half band), since T called the top half an experiment.
- Fondamento is T's pick; no ballot. If a name cannot fit two lines at the hand-card size, the builder shrinks that role's size, never the face, and says by how much.

### Out of scope

- The title screen's image cut (the other half of T's Nov 8 fog act).
- Any change to card rules text, keywords, or what the Spoils offer.
- Settings' own look (152.6).

## Sources

- **T's end-gate answers (2026-11-08, after `/pilot 158.1 159`),** shown a 3x crop of the hand with the two-line name band: "Always one line, shrink text" (names on one line, long names shrink); on the Deck reader's title-cased keywords: "Keywords should remain caps". Then: "I don't want the "+" in the free cost. "-" can stay." and "I want the card text background to be the same color as the art's background so there's [no] cutoff line between sections", answered as: no visible line (blend), "One black for them all", "+" removed everywhere a card shows the pill.

- **T, 2026-11-08,** after a browser playthrough of the current build that reported four small faults (shots `081` and `004` in the playthrough folder, `C:\Users\notrb\Workspace\Miserere-playthrough-2026-11-08`): "plot 1-4 all together".
- **Read 2026-11-08, at 9ebb8e890.** LOAD GAME: with a save the menu has four buttons and LOAD GAME sits at y 664 on a 390 x 844 screen. `document.elementFromPoint` at its centre returns the Embark scroll's image inside `title-cta`, which `TitleScreen.tsx` keeps mounted at opacity 0 after the menu appears. Its parent has `pointerEvents="none"`, but a real mouse click at the centre still did nothing, with reduced motion on and off, and `/saves` opened only on a direct DOM click. Measured on the web export; not measured on a device. The foe's name: `enemyName` in `CombatCombatantPane.tsx` wraps in a row across the full width while the HP shield rises through the middle of it. The relic name: `relicName` at `app/character-select/index.tsx:175`, `numberOfLines={3}` in a narrow plate. Self's name: `characterName` at `app/(tabs)/character/index.tsx:144`, `numberOfLines={1}` beside the level badge.

## Acceptance

- **A15** With a save present, a tap anywhere on LOAD GAME opens the Load screen, and nothing left over from the title screen's Embark block takes a touch once the main menu is up.
- **A16** The foe's name on the fight board never runs under the VITAE shield: every Act 1 foe's name reads whole at 360, 375 and 390 wide, the longest included ("The Death Beholder", "The Saint Beneath", "The Tithe-Collector").
- **A17** A relic name on character select never breaks inside a word ("Suppliant's Ring" reads "Suppliant's / Ring", not "Suppliant' / s Ring").
- **A18** Self shows the character's whole name ("The Chosen", not "The Ch...") at 360, 390 and 430 wide.

## Open questions

1. How tall is the tab bar? Default: about 76 pt plus the bottom inset. Or: 84 pt; or keep 60 and only fix width and fill. Accepted at merge (default).
2. How much bigger is the player's token? Default: about 25%. Or: 50%. Accepted at merge (default).
3. Should Settings' Dev Tools row be the last row, or sit under a "Developer" heading? Default: the last row, no heading. Or: a heading. Accepted at merge (default).

## Chunks

Measure: 4 open · 14 closed · next A19


### 159.1 (TU1a) — The Spoils and the fight · M · closes A1, A2, A3, A4 · requires 158.1

- `CombatRewardsOverlay.tsx`: drop the eyebrow, the sub-line and both `btnNote`s; delete copy constants left unread. `combat-encounter.engine.ts` and `CombatCombatantPane.tsx`: drop `metaLine` and `hudMeta`. `CombatFooterDock.tsx`: END about 72 x 48, the freed width to VITAE, the portrait inset so its ring is whole, the counts' size and ink raised. A fog view (new, in `components/combat/encounter/`) laid over the plate's foot in `CombatBoard.tsx`, under the hand and dice, `pointerEvents="none"`.
- Find the foe's lowest drawn pixel from the sprite box the board already lays out; pin in a test that the fog's top is above the hand and below that box for the reveal seed's foe and the largest Chapter 1 sprite.
- Tests: the Spoils' text (no eyebrow, no sub, no notes), the view-model has no `metaLine`, the dock's layout pins (`CombatBoard.layout-pins.test.tsx`) updated for END and the portrait.
- Measure: `npm run verify -w axiomancer-mobile` (piecewise with a worker cap), and the `combat-board` route's re-stamp diff in the PR shows the fog, the smaller END and no meta line; a 360 and 390 capture of the dock and the Spoils in the PR body.

### 159.2 (TU1b) — Card faces · M · closes A5, A6 · requires —

- `theme/axm.ts`: `TYPE_ROLES.cardName` to `Fondamento_400Regular`; grep every card-name style that names a face directly (`CombatBoard.tsx`, `CombatEncounterPanel.tsx`, `CombatRewardsOverlay.tsx`, `DeckCardTile.tsx`, `DeckOpenCard.tsx`) and move it onto the role. Re-fit sizes for the longest Act 1 name (find it from the card data, say which in the PR).
- `DeckOpenCard.tsx`: remove `nameScrim`; legibility by text shadow or an edgeless gradient (at most 85 pt). `deck.engine.ts`: the open card's lines are the two play lines only (no outcome line on this screen; keep `outcomeLine` on the VM if another reader uses it); each line carries its label as the first run, so label and effect render on one line. Case: the free and paid lines print the keyword the same way so `keywordsInText` finds it in both.
- Tests: `deck.engine` (no outcome line, labels inline, the keyword run found in both lines on a card like A Plain Word), `DeckOpenCard` (no scrim, fixed height kept), a role test that `cardName` is Fondamento.
- Measure: `npm run verify -w axiomancer-mobile`; the `deck` visual route (158.2, if landed) re-stamps; 360 and 390 captures of a hand, a Spoils tile and the open card in the PR body.

### 159.3 (TU1c) — The Wilds and the tab bar · M · closes A7, A8, A9 · requires —

- `app/(tabs)/exploration/index.tsx`: the band becomes a black block behind the status card's top half only (measure the card, or lay the band to half its height), with the map starting under the band's top; the toggle keeps its name with the new meaning, and `state/dev/dev-settings.ts`' comment says so. The tracker and node panel are laid over the canvas's foot (absolute), not below it, and the screen draws no black under them.
- The player's token: about 1.25x in `ExplorationNode.tsx` / `MapCanvas.tsx`, centred.
- `app/(tabs)/_layout.tsx`: the vellum bar's `backgroundColor: 'transparent'`, no border or elevation, the art stretched to the full width, about 76 pt plus the inset, the icons sized and padded to sit inside the border; check every tab screen's bottom padding still clears the taller bar.
- Tests: the band's height is half the card's, no view behind the tracker, the token's size, the tab bar's style (transparent, height).
- Measure: `npm run verify -w axiomancer-mobile`; the `exploration` and tab routes re-stamp; 360, 390 and 430 captures of the Wilds (with and without a node chosen) in the PR body.

### 159.4 (TU1d) — Self and Settings · M · closes A10 · requires —

- `app/(tabs)/character/index.tsx`: plaque widths from the row's width (three in a row with gaps), label and number sizes kept at or above 11 pt, the frame art scaled to the plaque.
- Move `<DevToolsLink />` from Self to the end of `app/(tabs)/settings/index.tsx`; testID `settings-dev-tools-link`. Update every script that clicked `self-dev-tools-link` from `/character` to open `/settings` and click the new testID (`grep -rl self-dev-tools-link axiomancer-mobile/scripts .github`); update the docs and comments that say "the SELF tab's DEV TOOLS" (`app/dev/index.tsx` header, `scripts/live-fight-entry.mjs`, spec text is history and stays).
- Tests: Self no longer renders the link; Settings renders it under the dev gate; the plaque layout at 360 and 390.
- Measure: `npm run verify -w axiomancer-mobile`, then `npm run verify:visual -w axiomancer-mobile` locally on the `combat-encounter` route (its entry walks the new path) and one e2e that used the old link (`node scripts/encounter-routing-e2e.mjs` or the lightest of the seven).
- [ ] **159.6** LOAD GAME takes its tap; foe names clear the shield; relic names keep their words; Self shows the whole name · M · closes A15, A16, A17, A18 · needs — · alias: TU1f
  - `components/TitleScreen.tsx`: once the phase is `menu`, nothing in the faded Embark block can take a touch at any layer, on web as well as native. Smallest fix first: stop rendering the block once its fade ends, if nothing else reads it; otherwise carry the no-touch rule down to the button and its image. Test: with the menu up the Embark button is gone or takes no press, and a browser check that the element at LOAD GAME's centre is LOAD GAME. Check all four menu buttons, with and without a save.
  - `components/combat/encounter/CombatCombatantPane.tsx`: lay the name so it cannot meet the shield (`hudNameRow`, `enemyName`, the `hpBlock` it sits above). Keep the name on one line where it fits; shrink rather than truncate. The shield's position and the HP bar do not move. Find the longest name from the enemy library and say its width in the PR. The `combat-board` visual route re-stamps.
  - `app/character-select/index.tsx`: the relic name breaks only between words; fit the longest relic name in the plate. Test the break on "Suppliant's Ring".
  - `app/(tabs)/character/index.tsx`: the name column gets the room to show the whole name; shrink rather than truncate if it must. Test at 360 and 430.
  - Tests per item above, and pin the fits against measured widths from a render rather than an estimate the code also uses (footgun `font-width-estimates-stale`; spec 99's 99.6 guards the same trap, so whichever lands second reuses the first's measured widths).
  - Measure: the mobile gate run piecewise with a worker cap; before and after shots of the main menu with a save, the fight board with the Death Beholder, character select and Self at 390 in the PR body.
