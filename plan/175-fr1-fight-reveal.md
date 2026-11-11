# 175 — The fight reveal, and the boss's title card

> Walking to a fight shows the foe whole: the place small, its name large, its LEVEL and VITAE, a FIGHT or ELITE chip, its figure cut out on a ground that fades into the dark, your own VITAE, then ENTER COMBAT and WITHDRAW with what withdrawing costs. A boss gets a held title card instead: two gold rules, CHAPTER 1 BOSS, its name huge in gold, the place, its figure rising from below, "tap to face it". No ground stops on a hard line.

## Why

### Sources

- **T's ballot verdict, 2026-11-10** (`plan/card-ledger/screens.md`, "Verdict", verbatim): "S-05 Fight reveal and boss title card: KEEP S-05f (Held boss plate) | note: F for bosses, G for everything else. Do what you can do that there's not such a clear cutoff at the bottom."
- **The settled shot:** `plan/card-ledger/screens/S-05-settled.webp` (left: look G for normal and elite foes; right: look F for the boss). The winning looks are `S-05g.webp` and `S-05f.webp`; today's screen is `S-05a.webp`. All land with PR #1584 (the screens ballot), not merged when this spec was written.
- **The ledger's reading** ("Open for the plot", S-05): DANGER is the count of the foe's hidden phase-opening moves (`revealDangers`). WITHDRAW is `fleeEncounter`: no reward, the node stays unspent, you may come back. Bosses have no WITHDRAW. Look f prints the boss's name where today's card prints the place. The VITAE figures in the shots are samples, and WITHDRAW's second line is an invented placeholder ("Invented lines", S-05).
- **T, 2026-11-10:** plot each screen separately; the art needs no new images (the foes' own paintings carry S-05).

### What exists today (read 2026-11-10, at origin/main 2a77e8c8a)

- `axiomancer-mobile/app/combat-encounter/index.tsx` mounts `CombatEncounterPanel` for the staged fight and passes `onWithdraw` only when `fight.fleeAllowed` (`state/presenters/navigation.engine.ts` `selectResumableFight`: `fleeAllowed: !isBoss`). WITHDRAW runs `fleeEncounter` then `endCombat('flee')`; `fleeEncounterAction` (`state/actions.ts`) pays nothing and leaves the node unspent (`answerUnsettledArrival`).
- The reveal is the `live.phase === 'reveal'` branch of `components/combat/encounter/CombatEncounterPanel.tsx`: the ink curtain (`InkCurtain.tsx`, phase ET1a with CX1b's map ink), then, for a boss, a held title card (a full-screen `Pressable`, `combat-reveal-boss-card`: the place, "Chapter 1 boss", "tap to face it"); tapping it uncovers the same reveal column every foe gets. That column is a `ScrollView`: the foe's painting at 120x140 inside a bordered dark box (`revealPortrait`, a blood border, a thicker `kindElite` border for an elite), the name, an elite's held-road line, the node's arrival line (`[content] <place>.`), `♥ hp / maxHp`, `YOURS ♥ hp / maxHp`, then DANGER (`revealDangers`; an unseen move prints `UNSEEN_DANGER_LINE`, `[ ? ? ? ]`) for a `phases` foe or a THREAT SEQUENCE accordion for any other, then ENTER COMBAT on the brass `action-button-selected` plate and WITHDRAW on `action-button-idle` with "forfeit the path" under it (both plates only while `lookOf('S-01') === 'brass'`). The column is short, so the lower half of the screen is empty.
- `state/presenters/encounter-reveal.engine.ts` `buildRevealFrame(nodeId)` gives the tier (`breakwaterEncounterTier`, from the chapter's node kinds), the arrival line, the elite's held line and the boss card's place and subtitle. Its words are `components/combat/encounter/reveal.copy.ts` (`BOSS_CARD_SUBTITLE`, `BOSS_CARD_HINT`, `heldRoadLine`). Off the chapter (the dev triggers, the labyrinth) there is no node, so the reveal is a plain fight with no curtain.
- The foes' paintings are already alpha-matted (`assets/images/enemies/index.ts`, `getEncounterEnemyArt`; every Chapter 1 file is a webp with alpha). The black box round the foe today is the frame's own `backgroundColor`, not the art.
- The foe's level is `Enemy.level` (`axiomancer-mechanics/src/Enemy/types.ts`); the reveal does not show it, and `CombatEnemyPaneVM` does not carry it.
- TU1a (159.1, shipped) put `SeamFog.tsx` over the combat plate's foot: an `AXM.bg` SVG gradient, clear at the top and opaque at the foot, that takes no touches. It is the board's, after ENTER COMBAT; this spec does not touch it, and reuses its way of fading a ground.
- `verify:visual` (`axiomancer-mobile/scripts/smoke-screens.mjs`) shoots the reveal as the `combat-encounter` route through `/dev`'s encounter trigger (`scripts/live-fight-entry.mjs`), which carries no node, so today's baseline (`screenshots/baseline/combat-encounter.png`) is a plain fight with no tier. No route shoots an elite or a boss reveal.

### What this spec builds on and supersedes

- It builds on ET1a (253.1, shipped): the ink curtain, `buildRevealFrame`'s tier and the held boss card stay, redrawn.
- It supersedes ET1a's dress for the reveal column: the bordered portrait box and its oxblood elite border, the held-road and arrival lines on the reveal (#2), and the boss card's layout (the place as the title).
- It supersedes the reveal's DANGER and THREAT SEQUENCE block (#1). The board still names each move when it lands, as today.
- It keeps TU1a's seam fog on the board as it is.

## Design

**G, for a normal foe and an elite** (the settled shot's left half), top to bottom, on one screen with no scroll:

- The place, small, as an eyebrow at the top left (`breakwaterPlaceAt`); none off the chapter.
- The foe's name, large, centred.
- `LEVEL <n>` and `<hp> VITAE` on one line, the numbers large and the words small.
- A tier chip: FIGHT in a grey frame, ELITE in oxblood (`AXM.kindElite`).
- The foe's painting, cut out (no box, no border), as large as the space between the chip and `YOURS` allows, standing on a coloured ground. The ground fades out at its top into the screen's black and fades out again at its foot, so no hard line shows anywhere; the buttons sit on the black below it.
- `YOURS <hp> VITAE`, with YOURS in gold.
- ENTER COMBAT on the pressed brass plate (`action-button-selected`), full width.
- WITHDRAW on the plain brass plate (`action-button-idle`), full width, with its cost on a second line inside the plate: `[content] No reward. You may try again.` (the ledger's stand-in, kept as a placeholder for T's voice; D88).

**F, for the boss** (the settled shot's right half): the held title card is the whole reveal.

- Two gold rules across the top and two across the foot.
- `CHAPTER 1 BOSS` in spaced gold capitals, then the boss's name huge in gold, wrapped to fit, then the place in spaced bone capitals.
- The boss's painting, cut out, rising from the bottom edge on a warm ground that fades out at its top and at its foot, under the lower rules.
- `tap to face it` over the figure's foot, above the lower rules.
- No WITHDRAW, as today. A tap anywhere starts the fight (#3).

**Shared:**

- The ink curtain plays first, as today, for both looks.
- One ground component draws both grounds (a vertical SVG gradient, transparent at both ends, like `SeamFog`), with its colour from one table keyed by tier (fight, elite, boss) in the theme, so T retunes a ground in one place. The fight and elite grounds start as the settled shot's cold sea-green; the boss's as its warm brown.
- The figure keeps the art registry (`getEncounterEnemyArt`), so T's portrait swap changes both looks with no edit here.
- Every number comes from the presenter: the foe's level and VITAE, the player's VITAE, the tier, the place.

### Decisions made upfront (do not ask)

- F for the boss, G for every other foe, as T voted. The settled shot is the reference picture for both.
- The rules do not change: the boss still has no WITHDRAW; WITHDRAW still pays nothing and leaves the node unspent; the fight is the same fight.
- The foe's VITAE and the player's are the current figure only (`108 VITAE`, `YOURS 170 VITAE`), as in the shot; the board shows the maximum once the fight starts.
- The reveal loses its scroll: G fits one 390x844 screen, and a smaller window shrinks the figure first, never the words or the buttons.
- No new images: the foes' own paintings carry both looks.
- The words that are not the game's (the WITHDRAW cost line) are `[content]` placeholders in `reveal.copy.ts`; T is writing the voice separately.

### Out of scope

- The combat board (S-06 stays as it is) and the ends of a fight (S-07, its own plot).
- The foes' art (T's, D88).
- A retreat from inside a fight (none exists; the ledger's "Withdraw, S-05 against S-07" note).
- Chapters 2 to 4's bosses: the eyebrow reads `CHAPTER 1 BOSS` from `BOSS_CARD_SUBTITLE` as today; a later chapter's boss gets its own word when that chapter is plotted.

## Acceptance

- **A1** A normal or elite fight's reveal shows, on one screen without scrolling, the place as an eyebrow, the foe's name, `LEVEL <n>` and `<hp> VITAE`, a FIGHT (grey) or ELITE (oxblood) chip, the foe's painting with no box or border round it, `YOURS <hp> VITAE`, ENTER COMBAT on the pressed brass plate and WITHDRAW on the plain plate. The level, VITAE, tier and place come from one reveal view-model built by `state/presenters/encounter-reveal.engine.ts`, unit-tested for a fight, an elite, a boss and a node off the chapter.
- **A2** WITHDRAW carries its cost on a second line inside its plate, from `reveal.copy.ts` (`[content]`); pressing it still runs `fleeEncounter` and `endCombat('flee')`, and the node stays unspent (today's e2e for a withdrawal passes unchanged).
- **A3** The ground behind the figure fades out at its top and its foot on both looks: a pixel probe of the reveal's shot finds no row where the ground's colour steps by more than a small threshold from one row to the next (the hard cutoff T named is gone). The ground's colour is read from one tier-keyed table in the theme.
- **A4** The reveal shows no DANGER line and no THREAT SEQUENCE for any foe (#1), and no held-road or arrival line (#2). `revealDangers` and the board's own naming of a landed move are unchanged.
- **A5** A boss's reveal is the held title card: two gold rules at the top and two at the foot, `CHAPTER 1 BOSS`, the boss's name huge in gold (wrapped, never cut), the place, the boss's painting rising from the bottom edge on a warm ground that fades out, and `tap to face it`. There is no WITHDRAW. One tap anywhere on the card starts the fight (#3), and a screen reader reaches it as one button whose label names the boss, the place and the hint.
- **A6** `verify:visual` holds three reveal shots, each compared by eye with the settled shot before its baseline is stamped: the normal fight (today's `combat-encounter` route), an elite and the boss, the last two entered at a Breakwater elite and boss node (a state fixture, or a node id on the dev trigger: the builder's choice).

## Open questions

- **[T to confirm #1]** DANGER leaves the reveal, as settled. Default: dropped; the board names each hidden move when it first lands, as today. Or: keep one line under the tier chip ("2 hidden moves"); or keep today's DANGER block under `YOURS`.
- **[T to confirm #2]** The elite's "Holds the road to <place>" line and the node's arrival line (still a `[content]` placeholder) leave the reveal, as settled. Default: dropped from the reveal; the engine keeps both. Or: keep the held-road line under the ELITE chip.
- **[T to confirm #3]** Tapping the boss's title card starts the fight. Default: yes, straight onto the board (with no WITHDRAW, a second screen would only repeat ENTER COMBAT). Or: the tap opens G's panel for the boss with ENTER COMBAT and no WITHDRAW.

## Chunks

Measure: 6 open · 0 closed · next A7

- [ ] **175.1** The fight reveal for normal and elite foes (look G) · M · closes A1, A2, A3, A4 · needs — · alias: FR1a
  - Extend `buildRevealFrame` into the reveal view-model (place, level, VITAE, player VITAE, tier, boss card fields) and add the foe's level to what the panel reads; the ground component and its tier-keyed colour table; redraw the reveal column; WITHDRAW's second line in `reveal.copy.ts`; drop the DANGER and THREAT SEQUENCE block and the held and arrival lines from the reveal (their presenters stay); re-stamp `combat-encounter` and add the elite route (A6).
- [ ] **175.2** The boss's held title card (look F) · M · closes A5, A6 · needs 175.1 · alias: FR1b
  - Redraw the held card as F on the shared ground; a tap starts the fight (#3); add the boss route to `verify:visual` and an e2e that the boss card offers no WITHDRAW and its tap reaches the board.
