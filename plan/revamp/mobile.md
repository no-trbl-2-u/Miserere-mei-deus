# Revamp — mobile app

> Part plan of [THE REVAMP](README.md). Phases **R8** (cleanup, loop),
> **R10** (theme colours, loop), **B7** (Deck tab revamp, owner), **B8**
> (card art revamp, owner), **B10** (dev menu revamp, owner). Decisions
> D60, D62. Status: RATIFIED 2026-09-28 (D64). Paths under `axiomancer-mobile/`.

## R8 — Mobile cleanup (loop)

Runs after R7 so the engine exports it consumes are final.

1. **Grey card art** — every grey card falls back to `circe-placeholder.jpg`
   because the 57 rows in `assets/images/cards/index.ts` key purged ids. Map
   Blow → `ice-sword`, Ward → `guard-1`, Word → `god-eye-silver`
   (placeholders; B8 replaces them) and delete the 57 dead rows. Keep the
   painting files as a pool (`provenance.json`).
2. **App label** — `app.json` `expo.name`: `axiomancer-mobile` →
   `"Miserere Mei, Deus"` (launcher label only; slug, scheme and package stay
   frozen per bearings). The painted "AxiomanceR" title wordmark goes to B8.
3. **Dead flows** —
   - Level-up Learn Card: `components/levelup/LearnCardModal.tsx` (+test),
     `app/(tabs)/character/index.tsx:75-116, 228-237`,
     `state/actions.ts:654-680` (D63).
   - Starter bundles: `state/combat/store-actions.ts:71-165`
     (`seedStarterBundleAction`, `runArchetype`, `STARTER_BUNDLES`),
     `chosenStarterBundle` (`state/actions.ts:606`) → `ensureStarterCards`
     seeds `STARTING_CARD_IDS` directly; delete `starter-bundles.test.ts`.
   - Ally grant / goodwill: `state/presenters/cache.engine.ts:15, 49, 107-110`,
     `app/cache/index.tsx:140-141`, `state/cache/store-actions.ts:153-154`
     (goodwill leaves with fishing-village, R3).
   - Alt-win UI (R7 removes the engine side): `PerorationTrack`
     (`CombatBoard.tsx:770-790`), wrath/chain rows (`:1426-1440`), PLEA/CHARGE
     `AltWinMeter` (`CombatCombatantPane.tsx:854-860`), `deckFeedsMechanic`
     gates (`combat-encounter.engine.ts:1513-1613`), and their tests. **Keep**
     the mercy modal and `CombatFriendshipPanel` — befriend stays (D47).
   - Dev tools: **not in R8** (D62). R-phases touch the dev menu only where a
     deletion breaks type-check or a test; everything else is B10.
4. **Glosses** — `state/combat/keywords.ts` and `KEYWORD_FAMILY`
   (`combat-encounter.engine.ts:2826-2834`) keep only atlas words with a live
   carrier after R2–R7 (D45); fix the "30 KEYWORDS" header.
5. **Copy** — HP → VITAE (`inventory.modal.engine.ts:180-197, 332`,
   `equipment-detail.engine.ts:114-115`); currency → shillings; Colour and
   MOMENTUM tutorial copy (`CombatTutorialPrimer.tsx:36, 51`,
   `combat-tutorial-steps.ts:83, 96, 105`, already an AUDIT row).
6. Tests on dead subjects go with them (`AltWinMeter.fe022.test.tsx`,
   the LearnCardModal and starter-bundle tests; `one-economy.engine.test.ts`
   loses its learn-card leg).

**Out of R8:** the hard-coded hex colours (R10), the Deck tab (B7), the dev
menu (B10).

## R10 — Theme colours (loop)

T, 2026-09-28 (D62). After R8 deletes the dead status UI, move every
surviving hard-coded hex literal in `app/`, `components/` and
`state/presenters/` (224 today) into named tokens in `theme/axm.ts`. The
four most repeated — `#a86bdc` (poison-tick purple), `#5bbf6a`, `#e2543b`
(damage-number red, e.g. `CombatCombatantPane.tsx:384`), `#d9b44a` — are
not in the theme at all today. No visual change; `verify:visual` must show
no diff.

## B7 — Deck tab UI revamp (owner)

T, 2026-09-28: leave the tab as-is now; revamp it as its own phase. Inputs:
RARE is always 0 (all cards rank 1; `rankToRarity` maps 1–2 → common); the
rarity tally is one COMMON chip, the colour tally one ANY chip, one SPELLS
group; the eyebrow wrongly says "STRIFE" (`app/(tabs)/deck/index.tsx:62`,
the combat tab's title); dead oath/hex copy (`deck.engine.ts:177-203`);
every reward offer shows "COMMON" (`CombatRewardsOverlay.tsx:80-111`); card
types are now Attack/Skill/Spell; the hazard deck is also called "deck" on
SELF (`character/index.tsx:243-254`).

## B8 — Card art revamp (owner)

T, 2026-09-28: a card art revamp phase. Replaces R8's placeholder mapping,
decides art per card type, and repaints the title key-art wordmark
("AxiomanceR", `TitleScreen.tsx:7, 42`) as "Miserere Mei, Deus".

## B10 — Dev menu revamp (owner)

T, 2026-09-28 (D62): the reset leaves the dev menu alone (beyond compile
fixes); this phase redesigns it. D19 ("keep all Debug* tools") stands until
T revisits it here. Input — the 2026-09-28 dev-menu audit:

- **CI actually drives** DevToolsLink (`self-dev-tools-link`),
  DebugTriggerEncounter, DebugPresetPicker (`debug-preset-sage`),
  DebugXpGrant, DebugHazardButton, and the `/combat-encounter` route.
  D19's count of nine does not reproduce. Non-CI scripts use DebugRestButton,
  DebugRewardTriggers and DebugDialogueJump (`audit-capture.mjs`, whose
  `debug-dialogue-fishing-village-captain-blackwater` id dies with R3) and
  the skip-event bridge (playtester).
- **Nothing left to act on after the reset:** DebugEffectApply (afflictions
  the player can't receive), DebugPopulateAllItems (potions + relics),
  DebugPlayerTierPresets (L30/L50 "all cards / full relic loadout"),
  DebugRestButton (duplicates TriggerEncounter REST).
- **Carrying dead content:** WorldTravel (Aporia acts, parked maps),
  EnemyPicker (79 foes → 3), SkipEvent (labyrinth, alt-win branches),
  TriggerEncounter (GATHER, VILLAGE), RewardTriggers (CARDS /
  `learnAllCards`), HazardDeckRandomize (enchantment presets), Flags
  (starter-bundle, Hexed), StateInspector (labyrinth ledger), RunControls
  (`/devart/rooms`), `/devart` SAMPLES (retired foes).
- **Keep as-is:** the `/dev` shell, DevControls, XpGrant, CurrencyControl,
  ItemPicker, CombatSandbox, HazardButton, BlacksmithButton, DialogueJump,
  QuestState, LogViewer, `/devaftermath` (DEFEAT + PARLEY/mercy).
- A proposed seven-section baseline: STATE · PLAYER · ITEMS & HAZARD DECK ·
  WORLD · ENCOUNTERS · MINIGAMES & REWARDS · STORY / RUN (~1k LOC removed).

## The FROZEN overlay on the foe (T, 2026-10-24, `/messy`)

T: "A 'frozen' overlay for enemies to signify they're frozen."

- **What exists.** EL1a/EL1b (the Elementalist trial set) put FROZEN in the
  engine and on the board as a weather line in the combat log and the weather
  reading (`state/presenters/combat-encounter.engine.ts`, `WEATHER_WORD.frozen`,
  `HUE.hzBlueLite`), with its popup in `state/combat/keywords.ts`. The foe's
  sprite does not change while it is FROZEN.
- **T's calls (AskUserQuestion, 2026-10-24):** FROZEN only, not every weather;
  a code-drawn ice tint now, and T's own ice art swapped in later.
- **Shape.** While the foe is FROZEN: a translucent icy-blue tint and a frost
  edge over the enemy sprite, drawn in code, fading in when FROZEN starts and
  out when the doubled DEAL consumes it. It never hides the animation beneath
  it: AN2a removed an overlay that covered the enemy animation, and this one
  must stay translucent and must not intercept touches. The tint reads from
  the presenter's FROZEN state, never a second copy of the rule.
- **Later, T's art (D88).** The overlay takes an optional image the
  code-drawn tint gives way to; the art phase is owner-led and waits on the
  asset.
- **Open questions:** none.


## The board says what it does (T, 2026-10-24, `/messy`)

From the Elementalist swarm (`docs/reports/playtest-elementalist-act1-2026-10-24.md`, four `playtester` agents, HEAD 1fb78ac87). Reproduced findings only; each names the number a fix would move.

- **What exists.** The combat board (`components/combat/encounter/CombatBoard.tsx`, `CombatEncounterPanel.tsx`, `CombatFooterDock.tsx`, `IntentIcon.tsx`, presenter `state/presenters/combat-encounter.engine.ts`) carries the Conviction chip, dice states and signatures as aria-labels (`CombatBoard.tsx:278,306`); the DECK list (`app/(tabs)/deck/index.tsx`, `state/presenters/deck.engine.ts`) prints a card's paid line only; the free NO-DIE line and the keyword glosses live in the detail overlay (`components/deck/DeckCardDetailOverlay.tsx`) and the spoils preview. `CombatVictoryPanel.tsx` (`components/event/aftermath/`, presenter `aftermath.engine.ts`) is imported by nothing but its test: the live `/combat-encounter` route mounts `CombatSummaryModal` and `CombatRewardsOverlay` (`CombatEncounterPanel.tsx:1173,1182`) and its summary's close is the exit. The mercy modal's buttons are the bare words SPARE and EXPLOIT (`CombatEncounterPanel.tsx:825-826`). The purse is printed only inside rest, the anvil and the village (`app/rest`, `app/blacksmith`, `app/village`).
- **Already filed, extended with this evidence (no new row):** `PHASE_CANDIDATES` "Printed equals applied" (DECK vs hand vs preview: P-02 reads DEAL 9 / 19 / "NO DIE 6, +DIE 19"; the DECK list omits the free line entirely) and "Victory and mercy panels do not say what the player gained" (a level-up, L15→16, applied with no screen; the panel that would say so is unmounted). CRITIQUE RC2 items 1, 2, 4, 5, 7, 9, 11, 15 are the same defects seen again on the Elementalist.
- **New, not filed anywhere before:**
  1. Nothing on the board says a hand card must be *dragged* to stage; a tap opens the reading sheet, which has no PLAY. The one hint ("drag a die onto your card · APPLY to commit") appears only after a card is staged. Two agents; `combat.md` names the tap-vs-drag cost, no row asks for the cue.
  2. The player's own INFERNO. M-04, E-02 and the INFERNO attacks set it; it ticks 2–4 VITAE a round with no on-board cause (`weather-changed your-inferno 0→2`, `dot-tick inferno target self 4`); the only gloss is in the spoils preview. Three agents. On the door fight every VITAE lost after round 3 was self-burn.
  3. The intent drops after BLIZZARD with no cue ("−16 → −11"; `blizzard-softened` in the log, nothing on screen), and the intent's flavour number disagrees with its label ("(12 damage). Deals 8"). Two agents.
  4. `combat-end-consequence` is absent when every live die is MISS and cards remain in hand (six of eight door-fight rounds, `consequence:null`); it shows only when a live die has no matching card.
  5. A sighted player's glossary: Conviction ◆, momentum, SURGE, the GHOST die, BANKED / Reserve / ripened, BOON / MANA / MISS, the rail counts, GLOBAL, the turn chip, and the "X" face (read as unplayable; it means variable) exist only as aria-labels.
  6. Interstitials: rest and cache end on an acknowledgement card ("+5 VITAE · MOVE ON"); taking one spoil is four taps and a tap only reads the card (one agent walked away empty twice); the anvil has two identical exits when nothing was forged. Taps per node, measured: rest 4, cache 4, spoil 4, map move 2.
  7. The purse is invisible where the decision is made: a broke player spent two nodes on dead doors; three potions sat in the satchel at 1 VITAE with no hint.
- **Constraints.** D91 (one card face; any face change is T's call), D92 (board layout: footer dock, intent and Conviction top-left, no corner medallions, LOG not on the board). Cues, labels and the consequence line are new UI strings, not card text; the intent flavour is enemy copy (D88).
- **Proposed split.** (a) *Board cues*: items 1–4, mobile only, reading the presenter's state; measured by the swarm's own numbers (seconds to first stage, VITAE deltas with no on-screen line, `blizzard-softened` events paired with text, `consequence:null` on all-MISS rounds). (b) *Glossary*: item 5, tap-to-read on each chip and "X" rendered as "varies". (c) *Interstitials and the purse*: items 6–7; the outcome card merges into the choice or auto-advances, SPOILS tap selects and TAKE CARD confirms, one anvil exit when idle, shillings on the node sheet and a low-VITAE potion nudge.
- **T's calls (2026-10-24):** the drag-to-stage is "obvious enough"; item 1 is withdrawn, no hint and no PLAY on the sheet.
- **Open question (T), answered 2026-10-25:** does a potion nudge belong on the map, or only inside rest? T: "nowhere yet"; the nudge is dropped and items 6-7 are plotted without it as TQ1 (`plan/phases/phase_TQ1_fewer_taps.md`).
- **T's cut (2026-10-25):** "I only like spoils after a fight and map node panel. Remove the others." TQ1 keeps the SPOILS tap-selects pick and the shillings on the node sheet; the outcome card merging into the choice (rest and cache), its toast and the one anvil exit when idle are cut by T, not plotted.
