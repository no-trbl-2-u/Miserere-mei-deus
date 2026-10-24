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

