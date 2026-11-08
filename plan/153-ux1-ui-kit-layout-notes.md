# 153 — The kit mixer's layout notes: fewer words, a calmer map, no burden, and a Deck to pick

> The notes T wrote beside the kit picks, built. These change what is on screen, not which art is behind it.
>
> - The main menu says only its three words.
> - The Wilds' quest tracker steps aside while a node is chosen, and loses its label and a lone 0/1.
> - The tab bar is bigger icons with no words.
> - The fight loses the reveal's kicker line and the dock's row of circles, so END shrinks and the dock grows.
> - The Self tab loses the hazard deck link.
> - The Satchel loses burden entirely.
> - The Deck gets three mocked directions for T's owner-led revamp.

## Why

### Sources

- T's notes in the kit mixer paste, 2026-11-06, verbatim in the Verdicts of `plan/card-ledger/ui-kit.md`. The looks are spec 152. T: "Plot this, open the PR, then we'll plot the other things I mentioned."
  - M-01: "Remove any text below each option so we can make space. They should each only say "New Game" / "Load Game" / "Settings""
  - W-02: "when a user clicks a node and this pops up, the "quests" section disappears."
  - W-04: "We can remove the "QUESTS" text at the top. And if the quest ends up being tracked as "0/1", then just don't have it there."
  - W-06: "remove the text from underneath each option and make the icons bigger." The gold wrapper part of this note is spec 152.
  - S-01: "remove "A FOE RISES""
  - S-09: "We can remove the little circles underneath the VITAE to make room and make the END button smaller and this image at the bottom taller."
  - F-04: "We can actually remove this entirely since it's no longer relevant as the hazard puzzle has changed"
  - B-02: "This shouldn't exist. Mark this as "remove" and make sure we have no "burden" or weight. The player can hold anything and everything"
  - D-01: "This whole screen needs an adjusted UX treatment. When we discuss plotting all these changes, suggest that we plot a UX treatment for "Deck" to provoke a feeling of minimalist order while still providing images."

### What exists today (read 2026-11-06, at b88e6c3)

- **Main menu.** `state/presenters/main-menu.engine.ts` gives each row a hint ("begin at the very start — nothing in hand"). `components/menu/MenuButton.tsx` draws it under the label, and Settings' rows use the same component.
- **Quest tracker.** `components/exploration/QuestTracker.tsx` heads itself `TRACKER_HEAD = 'QUESTS'` (`state/presenters/quest.copy.ts`) and prints each row's `progress` when non-empty. `NodeConfirmPanel` and the tracker are both on screen while a node is chosen.
- **Tab bar.** `app/(tabs)/_layout.tsx` draws an icon over a small caps label for each of the six tabs.
- **Reveal.** The reveal prints a kicker line above the portrait, one per tier: "⚔ A FOE BARS THE WAY", "⚔ A CHAMPION HOLDS THE WAY" and "⚔ THE WAY ENDS HERE" (`REVEAL_EYEBROW_FIGHT`, `_ELITE`, `_BOSS` in `reveal.copy.ts`, carried as `RevealFrameVM.eyebrow`). "A FOE RISES", the words T quoted, was the kit mixer's mock; the app never printed it.
- **The dock's circles.** These are the phase ledger. `CombatFooterDock.tsx` draws one `LedgerMark` per phase under the VITAE bar: O for a phase cleared, X for overwhelmed, a ring for one still to come (`DOCK_LEDGER_MARK = 14`). Tapping them opens their gloss. The name rail already reads "PHASE 1/8".
- **Hazard deck.** Self's "Hazard Deck" link pushes `/hazard-deck`, a screen showing the saved hazard deck. Nothing else links to it.
  - The saved hazard deck is already one of the W2 "cuts" (`plan/deadlines.md`: "the cuts (RE-CAST cards, the saved hazard deck, `deadcard`)"), still `needs plot` in the Nov 3 Item.
- **Burden.** Burden is a number on screen only:
  - `state/presenters/inventory.engine.ts` sums it (`BURDEN_MAX = 50`).
  - The Satchel draws it as "BURDEN · STONE" with a tooltip about going over the cap, and the section header reads "SATCHEL · PURSE · BURDEN".
  - No rule in `axiomancer-mechanics` reads it: nothing slows, blocks or costs the player for carrying.
- **Deck.** Chunk 134.7 (B7), "Deck tab UI revamp (owner-led)", is held for T's own session after Act 1 is complete (`plan/deadlines.md`).

## Design

- **Main menu.** Each main-menu row shows only its label: New Game, Load Game, Settings. The hints leave the main menu's presenter. `MenuButton` keeps its optional `hint` for other callers, so Settings' rows are unchanged. Screen readers keep the hint as the accessibility hint.
- **Quest tracker.** While a node is chosen (the node panel is up), the quest tracker is not drawn, and it returns when the panel closes.
  - The tracker drops its "QUESTS" head.
  - A row's counter is hidden when the quest has a single step, so it would only ever read 0/1 or 1/1 (Confirmed by T (2026-11-07): single-step quests).
- **Tab bar.** Six icons and no words, each icon larger (about 30 pt, from today's smaller size) and centred in its slot. Each tab keeps its name as its accessibility label, so nothing is lost to a screen reader.
- **Reveal.** No kicker line on any tier: the eyebrow field and its three strings go, and the tier still reads off the portrait's frame and the boss's held title card. Everything else on the reveal screen stays, since it is T's reference screen ("I do love the screen looking like this").
- **Dock.** The phase ledger's marks leave the dock (`[T to confirm #2]`). The END button narrows, and the dock grows taller so the brass dock art (spec 152) reads. VITAE, the piles and the portrait keep their order.
- **Hazard deck.** Self's link goes, and so does the `/hazard-deck` route and screen, which nothing else reaches (Confirmed by T (2026-11-07): the route and screen go). The saved hazard deck in the save file is left to the W2 cuts plot. This spec removes only what the player sees.
- **No burden.** The Satchel has no burden bar, tooltip or number, and its header loses the word. The presenter stops computing it. Nothing in the rules changes, because nothing in the rules read it: the player can hold anything and everything (T).
- **Deck directions.** The loop mocks three Deck tab directions as one page in `plan/card-ledger/`, like the kit mixer: real deck data, the same phone frame and switchable. Each one aims at T's brief, "minimalist order while still providing images". T picks one in 134.7 (B7), the owner-led revamp, which then builds it.

### Decisions made upfront (do not ask)

- The notes are T's (2026-11-06). The wording of what stays is unchanged.
- Burden is gone as a concept, not hidden. No cap, no weight and no word for it anywhere a player looks (T: "make sure we have no "burden" or weight").
- Accessibility labels survive every visual label removal.
- The Deck treatment itself is T's owner-led session (B7). This spec only mocks the directions for it.

### Out of scope

- Which art each place wears: spec 152.
- The saved hazard deck's data, RE-CAST cards and `deadcard`: the W2 cuts plot.
- Building any Deck direction: 134.7 (B7).
- Every screen the mixer did not cover: village, blacksmith, rest, hazard and the rest. T asked for a separate check of those.

## Acceptance

- **A4** The reveal screen has no "A FOE RISES". The dock has no phase-ledger marks, a narrower END and a taller dock, and VITAE, the piles and the portrait keep their order.

## Open questions

1. When should a quest row hide its counter? Confirmed by T (2026-11-07): single-step quests. The rule is `questCounterText` in `quest.copy.ts`.
2. Where do the phase-ledger marks go? These are the circles: one per phase, O cleared, X overwhelmed. Default: off the board entirely, since the rail's "PHASE 1/8" keeps the count. Or: a small row under the enemy's name rail. [T to confirm #2]
3. What happens to the hazard deck screen with its link? Default: the route and screen go too, since nothing else reaches it. Or: keep the screen and reach it from the dev menu. Confirmed by T (2026-11-07): the route and screen go
4. When should the Deck directions be mocked? Default: table order now, ready for B7 after Act 1 is complete. Or: pull B7 itself ahead of it. [T to confirm #4]

## Chunks

Measure: 1 open · 6 closed · next A8

- [ ] **153.4** No "A FOE RISES"; the dock trades its circles for room · M · closes A4 · needs — · alias: UX1d

### 153.1 (UX1a) — The main menu says only its three words · S · closes A1 · requires 152.6

- Drop the three hints from `main-menu.engine.ts` and keep them as accessibility hints. Update its test and any e2e text match.
- Measure: `npm run verify -w axiomancer-mobile`. The PR carries a main menu screenshot.

### 153.2 (UX1b) — The quest tracker steps aside, and loses its label and a lone 0/1 · S · closes A2 · requires 152.2

- The exploration screen hides `QuestTracker` while `NodeConfirmPanel` is open.
- `TRACKER_HEAD` goes. The quest presenter blanks `progress` per #1.
- Measure: a screen test (choose a node, then the tracker is absent; close it, then the tracker is back), a presenter test for #1, and `npm run verify -w axiomancer-mobile`. The PR carries screenshots of the Wilds idle and with a node chosen.

### 153.3 (UX1c) — The tab bar is bigger icons, no words · S · closes A3 · requires 152.2

- `app/(tabs)/_layout.tsx` stops rendering labels (`tabBarShowLabel: false` or the custom bar's equivalent), sets each icon to about 30 pt, and keeps `tabBarAccessibilityLabel`.
- Measure: a test that each tab has its accessibility label and no visible text, then `npm run verify -w axiomancer-mobile`. The PR carries screenshots.

### 153.4 (UX1d) — No "A FOE RISES"; the dock trades its circles for room · M · closes A4 · requires 152.3

- Remove the reveal's kicker line.
- In `CombatFooterDock`, the ledger marks and their gloss target go per #2. If #2 moves them, they go under the rail instead.
- END narrows, and the dock's height grows.
- Update `CombatBoard.footer-dock.test.tsx` and the board's layout pins from 152.3.
- Measure: `npm run verify -w axiomancer-mobile` and `npm run verify:visual` for the combat screen. The PR carries screenshots of the reveal and the board.

### 153.5 (UX1e) — The hazard deck link and screen go · S · closes A5 · requires 152.5

- Remove Self's link. Per #3, also remove `app/hazard-deck/`, its `_layout.tsx` registration, `hazard-deck.engine.ts` if nothing else imports it, and their tests (`hazard-deck.screen.test.tsx`, and the hazard-deck half of `hazard-stat-key.S7-hazard-C04.test.tsx`).
- The save's hazard deck data stays.
- Measure: `git grep hazard-deck -- axiomancer-mobile/app axiomancer-mobile/components` finds only the hazard board's own counts, then `npm run verify -w axiomancer-mobile`.

### 153.6 (UX1f) — No burden, anywhere · S · closes A6 · requires 152.5

- Remove `burden`, `burdenMax`, `BURDEN_MAX` and `computeBurden` from `inventory.engine.ts`, the bar and its `TooltipTarget` from the Satchel, the `burden` tooltip kind from `tooltip.engine.ts`, and the word from the header.
- Fix `critique-drive.mjs`'s mention.
- Measure: `git grep -i burden -- axiomancer-mobile/app axiomancer-mobile/components axiomancer-mobile/state` finds nothing, then `npm run verify -w axiomancer-mobile`. The PR carries a Satchel screenshot.

### 153.7 (UX1g) — Three Deck directions to pick from · M · closes A7 · requires —

- Mock three directions on one page (`plan/card-ledger/deck-directions.html`), built like `ui-kit-mixer.html`, on a real deck's data and card art.
  - Each direction gets one line on what makes it feel ordered.
  - Each one keeps the card images.
- Add the page to 134.7's notes.
- Measure: the page loads with no console errors in a headless browser, and the PR carries a screenshot of each direction.
