# 176 — The ends of a fight and a run

> A won fight ends on one screen: the fallen foe stands greyed at the top, the headline, what the fight paid in shillings and XP, one panel that says either the new level or how much XP the next level needs, and the card offer. A first death ends on the player's own figure, YOU FELL, the VITAE bar at 1 and CONTINUE. The defeat panel and Game Over keep their content and take the same look.

## Why

### Sources

- **T's verdict, 2026-11-10** (the seven-screens ballot, `plan/card-ledger/screens.md`, verbatim): "S-07 Ends of a fight and a run: KEEP S-07c (The fallen foe) | note: Don't rotate the enemy after they fell, and none of that "The page turned itself" nonsense. Only mention how much experience is needed to level and if they leveled up."
- **The settled shot:** `plan/card-ledger/screens/S-07-settled.webp` (it lands with PR #1584): three screens, a victory with a level-up, a victory without one, and the death return. It is the reference picture for this spec. The winning look is `screens/S-07c.webp`; today's four moments, redrawn from the code, are `screens/S-07a.webp`.
- **The ledger's reading of the shot:** "S-07c. The fallen foe stays upright, greyed. The ledger line ("the page turned itself") is gone: the panel says either the new level ("LEVEL 2") or how much XP the next level needs ("30 XP to level 2"). Victory drawn both ways, then the death return as drawn."
- **T, 2026-11-09:** one button across the screens, the brass action plate.

### What exists today (read 2026-11-10, at origin/main 2a77e8c8a)

- **After a win.** `components/combat/encounter/CombatEncounterPanel.tsx` mounts `CombatRewardsOverlay` once the foe falls and the mercy check settles (three offers in `CombatCardFace`, a rarity word under each, TAKE NOTHING or TAKE CARD, a second tap opens the inspect; after an elite, UPGRADE INSTEAD opens `CardUpgradePicker`). Once the offer is claimed, `CombatSummaryModal` opens: the engine's headline (`buildCombatSummary` in `axiomancer-mechanics/src/Combat/combat.attribution.ts`, "Victory — the enemy falls"), DAMAGE BY CARD rows, the shillings paid, the best card, CONTINUE. Both panels wear the vellum (looks P-01 to P-04, `components/experience/looks.ts`).
- **No XP on screen.** `applyHazardOutcome` (same file) runs the engine's `endCombat` (XP, shillings, quest kill steps), then loops `levelUp()` while `experience >= experienceToNextLevel`, then logs the fight (`recordFightSettled`, `state/run-log.ts`). It returns only the shillings. `CombatEndReport.xpGained` (`Game/store.ts`) is the foe's XP; it is 0 on a defeat, on a spared foe, and when an elite's relic takes the XP's place (`settleEliteRelicAction`). Nothing on screen says XP was paid or a level was gained; the stat point and ascend choice wait on the Character tab (`components/levelup/LevelUpModal.tsx`, `LevelReadyStrip.tsx`).
- **The XP curve.** `axiomancer-mechanics/src/Character/experience.ts`: `experienceForLevel` (a running total; level 2 at 70), `experienceToNext`. `Character.experienceToNextLevel` holds the total for the next level.
- **Other wins.** A spared foe pays the Spare ending: no XP, no card offer, and the summary carries the spare lines and the mercy line ("Mercy — the enemy is spared"). An elite whose relic drops opens no card offer and goes straight to the summary. A kill that completes a quest may add a card pick to the offer (`offerCompletedQuestExtrasAction`).
- **After a loss.** The same `CombatSummaryModal` is the defeat panel: "Defeat", the damage rows or "No status effects contributed." with a coaching line, direct damage, CONTINUE. It never says why the fight was lost. The engine ends a fight past round 60 as a plain defeat (`MAX_PHASES` in `Combat/combat.engine.ts`); the player's VITAE is then above 0. There is no retreat inside a fight: `retreat` is dead code (`combat.encounter.types.ts`), and the fight reveal's WITHDRAW leaves before the fight and is no defeat.
- **The death rule** (`Game/death.ts`, `resolveDeath`): a first death returns the player to the node they walked from at 1 VITAE, dying, with the death node live again; a death while dying ends the run (`runOverState`, the codex kept). `app/combat-encounter/index.tsx` routes a lost fight to `/death-return` or `/game-over`.
- **The death return** (`app/death-return/index.tsx`, `state/presenters/death-return.engine.ts`, `death-return.copy.ts`): a title, one `[content]` line, CONTINUE on the vellum button (G-01), on a plain dark screen. `?preview=1` shows it on a dev build; `screenshots/baseline/death-return.png` is its baseline.
- **Game Over** (`app/game-over/index.tsx`, `game-over.engine.ts`, `game-over.copy.ts`): GAME OVER, one `[content]` line, NEW CHARACTER on the vellum button. Baseline `screenshots/baseline/game-over.png`.
- **Pictures already keyed by id:** the foe's art (`getEncounterEnemyArt`, `assets/images/enemies/index.ts`), the node's arena plate (`arenaBackdropFor`, `assets/images/combat/index.ts`), the player's chosen figure (`getPlayerPortrait(portraitIdFromFlags(flags))`, `assets/images/portraits/index.ts`; the settled shot's figure is `elf-fighter`).
- **The brass plate** is `components/experience/BrassButton.tsx` (idle, selected and disabled plates).
- **Proof of a win.** `scripts/combat-round-e2e.mjs` can boot a stronger preset (`PRESET=sage|l30`) so a fight can be won, and `MERCY_CHECK=` drives the spare path; the panel tests (`CombatRewardsOverlay.test.tsx`, `CombatSummaryModal.test.tsx`, `CombatEncounterPanel.mercy-check.test.tsx`) mount the overlays from prepared states. No session has yet won a fight by playing, so the path from a won board to the offer has not been seen end to end on screen.

## Design

### The victory screen (settled shot, left and middle)

- **The top band.** The chapter's name at the left and the purse ("Shillings 41") at the right, over the node's arena plate fading into the ground. The fallen foe stands in the band, upright and greyed: its own art, desaturated and dimmed, never rotated, tipped over or animated away (T's note). Where a platform has no image filter, a grey wash over the dimmed art stands in.
- **The headline:** "Victory — the enemy falls", the engine's own headline, in the title face and gold.
- **What the fight paid:** one line, "Shillings +n · XP +n". XP is the experience gained across the settle (experience after minus before), so a quest step paid at the kill counts too. When the fight paid no XP (an elite's relic took its place), the XP half is left off.
- **The level panel:** one bordered panel holding one thing. If the fight raised the player's level: "LEVEL n", the level now reached (the highest, when several were gained at once). If not: "k XP to level n+1", the XP still owed for the next level. Nothing else: no ledger line, no flourish, no stat point prompt. The stat point and ascend choice keep waiting on the Character tab as today.
- **The card offer** stays as built: "Add a card to your deck", three cards in the one card face (D91) with the rarity word under each, the second tap's inspect, TAKE NOTHING and TAKE CARD side by side, and UPGRADE INSTEAD with its note after an elite. Its buttons move to the brass plate and the panel loses its vellum: the offer sits on the screen's dark ground under the level panel.
- **Closing.** TAKE CARD or TAKE NOTHING closes the fight [T to confirm #3]. A win with no card offer (an elite's relic) shows CONTINUE on the brass plate where the offer sits. The relic's own screen follows as today.

### The death return (settled shot, right)

- The player's own figure, large, in the top half over the dark ground.
- YOU FELL, then one line (`[content]`).
- The VITAE bar at 1 of the player's maximum, with "VITAE 1 / max" under it in the damage red.
- One line on what is kept (`[content]`).
- CONTINUE on the brass plate. It goes to the map as today.

### The defeat panel and Game Over

- Both keep today's content and order; only the house look applies: the dark ground of the screens above in place of the vellum panel, and the brass plate for CONTINUE and NEW CHARACTER [T to confirm #1].
- The defeat panel names its cause under "Defeat" [T to confirm #2]: VITAE reached 0, or the turn limit ran out (the fight passed round 60 with the player standing). The cause is read from the final fight state (the player's VITAE at the end), never stored by hand. There is no third cause: no withdrawal exists inside a fight.

### Copy and pictures

- Every sentence beyond button labels, the engine's headline and numbers is a `[content]` placeholder (D88): the death return's two lines, the two cause lines, the "XP to level" and "LEVEL" wording only as far as the settled shot prints them. The lines live in the presenters' `.copy.ts` files, as today, so T writes them in one place. The Narrator voice is T's and is written separately.
- No new image. The foe, the arena plate and the player's figure come from the tables that already key them by id.

### Decisions made upfront (do not ask)

- S-07c with T's note, as the settled shot draws it.
- No rule changes: XP, shillings, levels, the card offer, the elite upgrade, the relic roll, the mercy check and the death rule stay the engine's. The screens only present them.
- A spared foe keeps today's mercy ending (its headline, the spare lines, the mercy line, CONTINUE) and takes only the house look; the victory screen is for a foe that falls.
- Fight length is on hold and is not touched (no change to `MAX_PHASES` or any combat number).
- The stat point and ascend choice stay on the Character tab; this spec only says that a level was gained.

### Out of scope

- A screen for the end of a chapter [T to confirm #4].
- A retreat from inside a fight.
- The Narrator's lines themselves.
- The combat board (S-06 stays as it is) and the fight reveal (S-05, its own plot).

## Acceptance

- **A1** A won fight reaches the card offer and then closes, proven twice: a hermetic test under `axiomancer-mobile/state/e2e/` that plays a live fight state on the board to the foe's fall (a normal foe and an elite) through the engine, sees the offer, takes a card and leaves the fight; and a driven session (`combat-round-e2e.mjs` with a preset that wins) whose victory screenshot is in the PR.
- **A2** The fight's settle reports what it paid: shillings, XP gained (experience after minus before), the level before and after, and the XP still owed for the next level. One presenter builds the victory screen's view model from it, with its words in a `.copy.ts` file. Unit tests cover no level, one level, two levels at once, XP withheld (relic) and the curve's own figures (`experienceForLevel`).
- **A3** The victory screen shows the top band (chapter name, purse, arena plate, the foe upright and greyed, never rotated), the headline, "Shillings +n · XP +n", and the level panel holding only "LEVEL n" after a level-up or "k XP to level n+1" otherwise, then the card offer on the brass plate (TAKE NOTHING, TAKE CARD; UPGRADE INSTEAD after an elite) (S-07c, settled shot).
- **A4** After a win, taking or refusing the card closes the fight; the summary panel no longer opens after a win [T to confirm #3]. A win with no offer shows CONTINUE in its place. A spared foe's ending is unchanged but for the house look.
- **A5** The death return shows the player's chosen figure, YOU FELL, one `[content]` line, the VITAE bar at 1 of the maximum with its figure, one `[content]` line on what is kept, and CONTINUE on the brass plate (settled shot, right).
- **A6** The defeat panel keeps its content, names its cause (VITAE 0 or the turn limit) [T to confirm #2], and wears the house look; Game Over keeps its content and wears the house look [T to confirm #1].
- **A7** Each reworked screen has a `verify:visual` route shot (the victory both ways through a dev-only preview, as `/death-return?preview=1` does today; the death return; the defeat panel; Game Over), compared with the settled shot in the PR, and the baselines are updated.

## Open questions

- [T to confirm #1] The defeat panel and Game Over: today's screens stay, and only the house look applies (dark ground, the brass plate). Or: redraw them in the fallen-foe style (the foe standing over the defeat, the player's figure on Game Over).
- [T to confirm #2] The defeat panel names its cause: "VITAE 0" or "the turn limit", with no withdraw. Or: it names no cause, as today.
- [T to confirm #3] The summary panel after a win goes: the victory screen already carries the shillings and XP, so taking the card closes the fight. Or: keep the damage-by-card rows and best card as a short panel after the card.
- [T to confirm #4] The end of a chapter gets no screen in this spec. Or: plot one here.

## Chunks

Measure: 7 open · 0 closed · next A8

- [ ] **176.1** A won fight reaches the offer, and the settle says what it paid · M · closes A1, A2 · needs — · alias: FE1a
  - `CombatEncounterPanel.tsx`: `applyHazardOutcome` returns what the fight paid (shillings, XP gained, level before and after, XP to next) instead of shillings alone; the panel keeps it in place of `shillingsPaid`.
  - `state/presenters/fight-end.engine.ts` and `fight-end.copy.ts`: the victory view model (paid line, level panel text) from that record and `experience.ts`; tests for each case in A2.
  - `state/e2e/fight-won.FE1a.test.tsx`: the hermetic win, normal and elite, to the offer and out.
  - Run `combat-round-e2e.mjs` with a winning preset; the victory screenshot goes in the PR.
  - Measure: the new tests pass, and the PR shows the driven win's screenshot.
- [ ] **176.2** The victory screen: the fallen foe, the paid line, the level panel and the offer · M · closes A3, A4, A7 · needs 176.1 · alias: FE1b
  - A victory screen component over the board: the top band (chapter name, purse, `arenaBackdropFor`, `getEncounterEnemyArt` greyed and upright), the headline, the paid line and the level panel from FE1a's view model, and `CombatRewardsOverlay`'s offer below it on `BrassButton`, without the vellum.
  - The summary no longer opens after a win (call #3); CONTINUE when there is no offer; the spared ending in the house look.
  - A dev-only preview of the victory, levelled and not, for `verify:visual` (`scripts/critique-drive.mjs` routes), and the baseline.
  - Measure: the route shots beside the settled shot's left and middle screens in the PR.
- [ ] **176.3** The death return: the player's figure and the VITAE bar · S · closes A5 · needs — · alias: FE1c
  - `app/death-return/index.tsx` and its presenter: the chosen figure (`getPlayerPortrait`), the VITAE bar at 1 of the maximum, the kept line in `death-return.copy.ts` as `[content]`, CONTINUE on `BrassButton`.
  - Update `screenshots/baseline/death-return.png`.
  - Measure: the route shot beside the settled shot's right screen in the PR.
- [ ] **176.4** The defeat panel names its cause; the defeat panel and Game Over in the house look · S · closes A6 · needs — · alias: FE1d
  - `buildCombatSummary` (or the mobile presenter) gives a defeat cause from the final state: VITAE 0 or the turn limit; the two cause lines as `[content]`.
  - `CombatSummaryModal` on a defeat and `app/game-over/index.tsx`: the dark ground and `BrassButton`.
  - Update `screenshots/baseline/game-over.png`; a route shot of the defeat panel.
  - Measure: the two route shots in the PR, and a test for each cause.

FE1c and FE1d need nothing and can be built beside FE1a. FE1b builds on FE1a's view model. Each visual chunk's PR places its route shot beside the matching screen of the settled shot.
