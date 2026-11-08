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

## Acceptance

- **A11** Every card name draws on one line in a band sized for one line, on the hand card, the Spoils tile and the large face: a name too long for the line steps its font down to fit (floor about 10 pt) rather than wrapping or truncating, and art height is the same on every card of a size.
- **A12** The free cost pill never prints a leading "+" ("+2" reads "2", "+35%" reads "35%"); a "-" stays. This holds everywhere a card face draws the pill: hand, Spoils tiles, the large inspect face, and the Deck.
- **A13** The card face's name band and text panel are one black (`HUE.black`, via an AXM token), and the art meets them with no visible line: a short fade from the art into the black at each edge, so a painting whose edge is not pure black blends rather than cuts.
- **A14** The Deck's open card prints keywords in capitals (VULNERABLE), matching the card faces and combat, in both play lines, and they stay pressable.

## Open questions

1. How tall is the tab bar? Default: about 76 pt plus the bottom inset. Or: 84 pt; or keep 60 and only fix width and fill. Accepted at merge (default).
2. How much bigger is the player's token? Default: about 25%. Or: 50%. Accepted at merge (default).
3. Should Settings' Dev Tools row be the last row, or sit under a "Developer" heading? Default: the last row, no heading. Or: a heading. Accepted at merge (default).

## Chunks

Measure: 4 open · 10 closed · next A15


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
- [ ] **159.5** Card names on one line that shrink to fit; no "+" on the free pill; one black text panel the art fades into; Deck keywords in capitals · M · closes A11, A12, A13, A14 · needs — · alias: TU1e
  - `components/combat/encounter/CombatBoard.tsx`: `nameBandHeight` reserves one line (`PLATE_NAME.*.lineHeight` plus pill room when the face shows one) for normal, narrow and large faces; the name `Text` is `numberOfLines={1}` with a computed font size per face width (largest step that fits the longest word line, floor about 10 pt), not `adjustsFontSizeToFit` alone, so web and native agree. Find the longest names from the card data (today "Stir the Thundersnow", "Call Lightning Twice", "Call Back a Kindness"); say the size each gets on the 95 pt hand column and the 71 pt narrow column.
  - Update the name-band tests (`CombatCardFace.name-band.test.tsx`, `CombatCardFace.glyph-mode.test.tsx`) so a two-line band or a wrapped name fails them.
  - `state/presenters/deck.engine.ts` / `components/deck/DeckOpenCard.tsx`: the keyword run draws its word in capitals (`run.word`, already "VULNERABLE"), not the registry's title case; the a11y label stays. Test: the open card of A Plain Word shows "VULNERABLE" in both play lines and the keyword is still pressable.
  - `CombatBoard.tsx` `compactFree`: drop the leading "+" it adds (`+${im[1]}`, `+${nm[1]}${nm[2]}`); keep a "-" when the value is negative. Check every other place the pill value is built (presenters such as `card-program.engine.ts` that format `+N%`) and strip the "+" only where it feeds the pill, not floating combat numbers. Test: the pill for a +2 card reads "2", a +35% card reads "35%", a negative value keeps "-".
  - `faceOuter`, `faceCard`, `plateBand`, `plateLedger` backgrounds: one black (add an AXM token for `HUE.black` if none exists; no hex literals). Add an edgeless gradient (about 12 pt, clear to black) at the art's top and bottom inside `plateArtFrame`, `pointerEvents="none"`, so no seam shows. Test: the band and ledger share the face's black, and the fade views render on normal, narrow and large faces.
  - Measure: `npm run verify -w axiomancer-mobile`; CI re-stamps `combat-board`, `village` and `deck` where they change.
