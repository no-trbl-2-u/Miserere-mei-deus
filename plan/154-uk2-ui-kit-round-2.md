# 154 — The UI kit, round 2: the node screens, new game and the endings, and T's notes on each

> Round 2 of the kit mixer covered every screen round 1 did not. T's picks put parchment on the dialogue's spoken line, the travel buttons, the hazard's stakes card, the quest panel, the save slots and the endings, and brass on the dialogue's choices, the labyrinth and the character select. T's notes make five screens say less:
>
> - Dialogue: two choices and nothing else.
> - Cutscene: an omen with no box.
> - Hazard: a stakes card with only place, goal and time.
> - Quest: no rewards shown and no 1-of-1 counter.
> - Cache: two choices that tell you what you do, never what you get.
>
> The rest screen goes black, with T's animated campfire in the middle. The village is left alone until its own rework is pitched.

## Why

### Sources

- T's round-2 picks and notes from the kit mixer (`plan/card-ledger/ui-kit-mixer-2.html`), pasted 2026-11-06, verbatim in the "Round 2" verdicts of `plan/card-ledger/ui-kit.md`. Round 1 is specs 152 (looks) and 153 (layout notes).
- T, same message: "For the ones that say to stop, do those last." The rest screen's note says "When we plot this, pause and ask me to point to where we have an animated fire for this screen", so its chunk is asked last (`[T to confirm #1]`).
- The deadline Item "UI treatment from the new images, for every current screen" (Nov 7, `T`) is what rounds 1 and 2 did. This plot ticks it.

### What exists today (read 2026-11-06, at origin/main after specs 152 and 153 settled)

- **Dialogue** (`app/dialogue/index.tsx`): a spoken-line box, boxed choices and a `LeaveRow` reading "TIP YOUR CAP AND GO". "Take the quest." carries an errand chip ("new errand · Fixture Quest"). `LeaveRow` is also the blacksmith's "LET THE COALS DIE".
- **Cutscene** (`app/cutscene/index.tsx`): the omen sits in a bordered, rounded panel.
- **Travel** (`app/travel/index.tsx`): YES · MOVE and NO · STAY, under the event art and "THE WAY ON" tag.
- **Hazard** (`components/hazard/StakesCard.tsx`): the stakes card lists the goal, "60 seconds on the clock", the falling-short costs and what clearing pays, in thin condensed type.
- **Labyrinth** (`app/labyrinth/`): act rows and a LEAVE button.
- **Quest** (`app/quest/index.tsx`, `components/quest/QuestGiverScene`): the panel shows "THE NEXT WORK", a step counter ("0 of 1", from `quest.copy.ts`) and "THE PAY" (XP, shillings).
- **Cache** (`app/cache/index.tsx`, `state/presenters/cache.copy.ts`):
  - Shows the eyebrow "A FIND, UNCLAIMED", a title and a flavour line, then "The node is spent the moment you stop here. Pick one — there is no walking back out."
  - Then TAKE A CARD, showing the card, and TAKE THE GOODS, listing the goods.
- **New game:** `app/saves` (`SaveSlotRow`, BEGIN) and `app/character-select` (portrait, relic card, HEART / BODY / MIND, CONFIRM, the roster grid).
- **Endings:** `app/death-return` and `app/game-over`, one button each.
- **The aftermath panel** (`components/event/aftermath/CombatDefeatPanel.tsx`, "the page closes" with BEGIN AGAIN):
  - It is rendered only by the dev page `/devaftermath`, and no game flow mounts it.
  - A lost fight goes to the death and game-over screens since DY1.
  - So T has never seen it: "I don't even know when this page shows".
- **Rest** (`app/rest/index.tsx`, `rest.copy.ts`): the eyebrow "A MOMENT TO STOP", a purse and VITAE strip, the same "node is spent" line, and the two choices, over a painted background. The repo has no animated fire.
- **The look table** (152.1) holds round 1's 44 places. This spec adds round 2's.

## Design

**Looks** (T's picks; every place not listed stays Normal):

| Look | Places |
|---|---|
| Vellum & Ink | E-02 dialogue's spoken-line box; T-02 YES · MOVE / NO · STAY; H-01 hazard stakes card; Q-01 quest panel; N-01 save slot rows; N-02 BEGIN; N-05 HEART / BODY / MIND (character select); N-06 CONFIRM; G-01 CONTINUE / NEW CHARACTER (death, game over) |
| Brass Gothic | E-03 dialogue choice rows; X-01 labyrinth act rows; X-02 LEAVE (labyrinth); N-04 portrait and relic cards (character select) |
| Normal (unchanged) | V-01 to V-06 (the whole village, T: "until we know what all these screens look like, let's not swap anything out"); E-01; E-04 (removed below); C-01 and C-02; T-01; H-02; R-01, R-02 (reworked, see Rest); A-01, A-02 (reworked); Q-02; N-03; N-07 |

G-02 and G-03 (the aftermath panel) are not skinned: the panel is gone (T, 2026-11-06, #2).

**T's notes:**

- **Dialogue: two choices only.** "TIP YOUR CAP AND GO" goes from the dialogue (T: "There should only be two options. Remove this"). The blacksmith keeps its own `LeaveRow`. "Take the quest." carries no errand chip, because the spoken line says everything the player needs (T).
- **Cutscene: raw text on the background.** The omen loses its border and panel (T: "This shouldn't even have a border. Just raw text on the background"). It keeps a legible weight over the art.
- **Hazard stakes card: three things.**
  - Only the place's name, the goal and the time, for example "River meadow", "Goal: Force 18 | Escape 10" and "Time: 60 secs". "No other information outside of that" (T).
  - The falling-short costs and the clearing pay leave the card. The rules that apply them do not change.
  - The type is a legible weight and size, not the thin condensed face (T: "make sure the text is legible and not so thin and hard to read").
- **Quest: no rewards, no lone counter.** The quest panel shows no pay. A quest whose step count is 1 shows no counter (T: "for all quests that are "0/1" just don't track the number for it"). This is the same single-step rule as 153.2's quest tracker, so both read one helper in `quest.copy.ts`.
- **Cache: what you do, not what you get.** The screen shows the title, its flavour line, and two choices: Take a Card and Take the Goods.
  - Each choice has its own flavour line saying what you do on the adventure to earn it, never the reward. T's example: "Read the runes inside the cave" and "Plunder the corpses left by the previous patrons".
  - The eyebrow, the "node is spent" line, the card image and the goods list all go.
  - The rewards themselves are unchanged and still paid after the choice.
  - "That'll be the pattern for all caches" (T). Each cache carries its two action lines as data, and a cache with no lines yet shows a `[content]` placeholder (`[T to confirm #3]`).
- **The aftermath panel:** removed with its dev page, since nothing in the game shows it (T, 2026-11-06, #2).
- **Rest** (asked last; T pointed to the fire, 2026-11-06):
  - The background is black (T). The fire's frames are drawn on black, so they sit on it with no seam.
  - The eyebrow "A MOMENT TO STOP" and the "node is spent" line go.
  - The purse and VITAE strip shows the VITAE bar.
  - Everything but the two choices moves up, and T's animated campfire plays in the middle: `campfire-05`, 24 frames of 320×320 at 80 ms, looping (`assets/images/screens/animated-fixtures/campfire-05/`, added by PR #1404).
  - Reduced motion holds one frame.
- **Village:** nothing changes here. T's direction for its rework (a hub of options, each its own screen with an NPC image) goes to the village Item in `plan/deadlines.md`, where it will be pitched and plotted, each screen on its own (T).
- **Travel art:** T finds two images, Chapter 1 to Chapter 2 travel and the Chapter 1 cave shortcut. That is a new `T` Item, not a chunk.

### Decisions made upfront (do not ask)

- The looks are T's round-2 picks (2026-11-06). Every Normal place keeps today's code path.
- The cache, quest and hazard changes hide information on screen, and no rule changes: every reward, cost and clock behaves as today.
- No kit piece goes on a card (T, 2026-11-05). The village's shop cards stay plain.

### Out of scope

- The village rework and its NPC screens: pitched and plotted from the village Item (Nov 7).
- The art, transitions and animation of the travel, cache and cutscene event kinds: their own pitch Items (Nov 8 and 9). This spec makes only T's round-2 changes, which those pitches start from.
- The blacksmith and item-reward screens: empty states only in the mixer, with nothing judged.

## Acceptance

- **A2** The save slots, BEGIN, the character select's HEART / BODY / MIND and CONFIRM, and the death and game-over buttons are on vellum. The character select's portrait and relic cards wear brass.
- **A6** The quest panel shows no pay, and a single-step quest shows no counter, through the same helper as the quest tracker.
- **A7** A cache shows its title, its flavour line and two choices, each with an action line and no reward shown. The eyebrow, the "node is spent" line, the card image and the goods list are gone, and the rewards paid are unchanged.

## Open questions

1. Which animated fire does the rest screen use? Confirmed by T (2026-11-06): `campfire-05`, copied from T's checkout into `assets/images/screens/animated-fixtures/campfire-05/` (PR #1404).
2. Should the aftermath panel ("the page closes", BEGIN AGAIN) be deleted, since no game flow shows it? Confirmed by T (2026-11-06): "Delete it. Delete `CombatDefeatPanel`, `/devaftermath`, its `_layout.tsx` registration and the `DebugRunControls` link, plus the aftermath presenter's defeat half if nothing else reads it. A lost fight already goes to death-return and game-over since DY1." Done in 154.8.
3. What do the caches without T's action lines show? Default: `[content]` placeholders until T writes them, with T's two lines on the cave cache. Or: the loop drafts every cache's lines in T's pattern for T to edit in the PR. [T to confirm #3]

## Chunks

Measure: 3 open · 6 closed · next A10

- [ ] **154.2** Round 2's looks: new game and the endings · M · closes A2 · needs — · alias: UK2b
- [ ] **154.6** The quest shows no pay and no lone counter · S · closes A6 · needs — · alias: UK2f
- [ ] **154.7** The cache says what you do, not what you get · M · closes A7 · needs — · alias: UK2g

### 154.1 (UK2a) — Round 2's looks: dialogue, travel, hazard, quest, labyrinth · M · closes A1 · requires 152.1

- Add round 2's places to `looks.ts`.
- Wire the dialogue's spoken-line box (vellum) and choice rows (brass), the travel buttons (vellum), `StakesCard` (vellum), the quest panel (vellum), and the labyrinth's act rows and LEAVE (brass). Convert any piece not yet bundled.
- Measure: the look-table test, then `npm run verify -w axiomancer-mobile`. The PR carries 390×844 screenshots of each screen.

### 154.2 (UK2b) — Round 2's looks: new game and the endings · M · closes A2 · requires 152.1

- `SaveSlotRow` and BEGIN go to vellum.
- On the character select, the portrait and relic cards go to brass, and HEART / BODY / MIND and CONFIRM go to vellum. The roster grid and the close buttons stay unchanged.
- The death-return and game-over buttons go to vellum.
- Measure: `npm run verify -w axiomancer-mobile`. The PR carries screenshots of saves, character select, death and game over.

### 154.3 (UK2c) — The dialogue offers two choices · S · closes A3 · requires 154.1

- Remove the dialogue's `LeaveRow` and its copy, and the errand chip on the take-the-quest choice.
- Check that every dialogue still has a way out among its choices. A dialogue left with none fails a test over the dialogue data.
- Measure: that test, then `npm run verify -w axiomancer-mobile`.

### 154.4 (UK2d) — The cutscene's omen, unboxed · S · closes A4 · requires —

- Drop the omen's panel styles. Keep its text legible over the art (a soft text shadow if needed, never a box).
- Measure: `npm run verify -w axiomancer-mobile`. The PR carries a cutscene screenshot.

### 154.5 (UK2e) — The stakes card says three things · S · closes A5 · requires 154.1

- `StakesCard` renders the place's name, "Goal: Force N | Escape M" and "Time: S secs". The cost and pay sections leave the card, and the type moves to a legible weight.
- The hazard presenter keeps computing costs and pay for the rules.
- Measure: a `StakesCard` test, then `npm run verify -w axiomancer-mobile`.

### 154.6 (UK2f) — The quest shows no pay and no lone counter · S · closes A6 · requires 154.1, 153.2

- The quest panel drops "THE PAY".
- The counter goes through 153.2's single-step helper in `quest.copy.ts`.
- Measure: a presenter test, then `npm run verify -w axiomancer-mobile`.

### 154.7 (UK2g) — The cache says what you do, not what you get · M · closes A7 · requires —

- Cache data gains two action lines, one per choice. T's lines go on the cave cache, and the others get placeholders per #3.
- The screen drops the eyebrow, the "node is spent" line, the card art and the goods list. Each choice shows its action line.
- A test over every cache node fails if one has no action lines and no placeholder.
- Measure: that test, then `npm run verify -w axiomancer-mobile`. The PR carries a cache screenshot.

### 154.8 (UK2h) — The unused aftermath panel goes · S · closes A8 · requires —

- Per #2, delete `CombatDefeatPanel` and `/devaftermath` (with their `_layout.tsx` registration and the `DebugRunControls` link), plus the aftermath presenter's defeat half if nothing else reads it.
- Measure: `git grep -i "devaftermath\|CombatDefeatPanel"` finds nothing, then `npm run verify -w axiomancer-mobile`.

### 154.9 (UK2i) — The rest screen: black, the campfire in the middle, the words cut · M · closes A9 · requires —

- Needs the campfire frames on main (PR #1404). Merge that first; if they are missing, stop and say so.
- `app/rest/index.tsx` drops its painted background for black.
- `rest.copy.ts` loses the eyebrow and the "node is spent" line.
- The purse and VITAE strip gains a VITAE bar (the same `StatBar` as elsewhere).
- The header and strip move up. A frame player (`CAMPFIRE_05_FRAMES`, `CAMPFIRE_05_FRAME_MS`) loops the fire centred between them and the two choices.
- Reduced motion shows frame 00.
- The night-passing sequence (ET1c) still plays after a choice.
- Measure: a screen test (no eyebrow, no spent line, the bar present, the frame player mounted, a still frame under reduced motion), then `npm run verify -w axiomancer-mobile`. The PR carries a rest screenshot.
