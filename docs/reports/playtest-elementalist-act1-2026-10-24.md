# Playtest — the Elementalist through Act 1 (2026-10-24)

> Orchestrated swarm run at HEAD `1fb78ac87`, dev build (expo-web, `localhost:8081`), Elementalist test deck (20 cards, phase EL1c) set from `/dev` → CARDS → SET DECK.
> Measured truth cited from `docs/reports/measured/latest.md` (stamp `4b4ad3bf1`, 2026-10-24, 300 runs, seed 1). The Elementalist column below was produced at `1fb78ac87` with the same `measuredTruthCells` call (300 runs, seed 1, greedy witness, lanes `grey` + `elementalist`, no half-upgrade column). It is a measurement, not a gate (D57) and not a licence to tune (D88).
> Four `playtester` agents, four seeds: 1101 Cartographer (`fresh-start`), 1102 Duelist (`sage-bw-door-gate`), 1103 Forager (`broke-l1-bw-rest`), 1104 Novice (`fresh-start`, plus a same-seed replay).
> Not a work queue. Nothing here was filed; T decides what goes to `/plot` or `/messy`.

## 0. Harness caveat (read first)

All four `playtester` agents shared **one** Playwright MCP browser and its single current-tab pointer. Tab selections raced (PT1: 6 of 6 `browser_tabs select` overridden; PT4: about one call in three landed on another tester's tab; PT3's tab was navigated away and once closed by another agent). Every agent recovered by installing an in-page relay (`BroadcastChannel`, guarded by its own seed) and driving the DOM by `testID`. Consequences for the evidence:

- PT1 played at 1280×720, not 414×896; its off-screen notes are desktop-layout notes.
- Seeds set before the first `goto` were wiped by the full reload. Combat seeds set after boot **were** honoured (`combat/encounter-mounted {seed:1101}`, `rng/seed-set {seed:1104}`); minigame seeds were not verifiable, and PT3's were almost certainly ignored.
- Synthetic drags worked in combat but not on the hazard board (PT3), and left a frozen drag ghost.
- Screenshots landed in `.playwright-mcp/` under the worktree (Playwright refused the scratchpad path); they are ephemeral and not committed.

**Rule for the next swarm:** one browser per playtester, or run them in series. Until then, a finding one agent saw with no log line is marked *unreproduced* below.

## 1. Measured truth: grey vs Elementalist (greedy witness, 300 runs, seed 1, HEAD 1fb78ac87)

Each cell is win rate / lowest-VITAE p10 (mean rounds).

| fight | level | grey even | grey body-mind | grey body | elem even | elem body-mind | elem body |
|---|---|---|---|---|---|---|---|
| bw-2/float-eye | L1 v L2 | 100% / 0.74 (4.4r) | 100% / 0.74 (4.4r) | 100% / 0.74 (4.4r) | 100% / 0.95 (3.0r) | 100% / 0.95 (3.0r) | 100% / 0.95 (3.0r) |
| bw-6/float-eye | L1 v L2 | 100% / 0.74 (4.4r) | 100% / 0.74 (4.4r) | 100% / 0.74 (4.4r) | 100% / 0.95 (3.0r) | 100% / 0.95 (3.0r) | 100% / 0.95 (3.0r) |
| bw-8/green-jelly | L2 v L3 | 100% / 0.25 (6.0r) | 100% / 0.25 (6.0r) | 100% / 0.25 (6.0r) | 100% / 0.90 (3.8r) | 100% / 0.90 (3.8r) | 100% / 0.90 (3.8r) |
| bw-10/float-eye | L3 v L2 | 100% / 0.76 (4.1r) | 100% / 0.77 (3.8r) | 100% / 0.77 (3.8r) | 100% / 0.95 (3.0r) | 100% / 0.96 (2.9r) | 100% / 0.96 (2.9r) |
| bw-14/float-eye | L4 v L2 | 100% / 0.77 (4.0r) | 100% / 0.78 (3.8r) | 100% / 0.87 (3.2r) | 100% / 0.95 (3.0r) | 100% / 0.96 (2.9r) | 100% / 0.96 (2.8r) |
| bw-17/death-beholder (door) | L4 v L1 | 21% / 0.00 (7.9r) | 27% / 0.00 (7.9r) | 68% / 0.00 (7.5r) | 100% / 0.89 (4.6r) | 100% / 0.89 (4.5r) | 100% / 0.89 (4.4r) |
| cw-5/float-eye | L6 v L2 | 100% / 0.79 (3.7r) | 100% / 0.88 (3.1r) | 100% / 0.90 (2.8r) | 100% / 0.96 (2.9r) | 100% / 0.97 (2.7r) | 100% / 0.97 (2.6r) |
| cw-7/float-eye | L7 v L2 | 100% / 0.79 (3.6r) | 100% / 0.88 (3.1r) | 100% / 0.96 (2.6r) | 100% / 0.96 (2.9r) | 100% / 0.97 (2.7r) | 100% / 0.97 (2.6r) |
| cw-10/float-eye | L7 v L2 | 100% / 0.79 (3.6r) | 100% / 0.88 (3.1r) | 100% / 0.96 (2.6r) | 100% / 0.96 (2.9r) | 100% / 0.97 (2.7r) | 100% / 0.97 (2.6r) |
| cw-12/green-jelly | L7 v L3 | 100% / 0.55 (5.2r) | 100% / 0.73 (4.4r) | 100% / 0.75 (3.7r) | 100% / 0.93 (3.6r) | 100% / 0.93 (3.4r) | 100% / 0.94 (3.3r) |
| cw-16/float-eye | L8 v L3 | 100% / 0.87 (3.4r) | 100% / 0.89 (3.1r) | 100% / 0.89 (2.9r) | 100% / 0.96 (3.0r) | 100% / 0.97 (2.8r) | 100% / 0.97 (2.7r) |
| cw-19/float-eye | L9 v L3 | 100% / 0.89 (3.4r) | 100% / 0.89 (3.0r) | 100% / 0.96 (2.5r) | 100% / 0.96 (3.0r) | 100% / 0.97 (2.8r) | 100% / 0.97 (2.6r) |
| cw-17/death-beholder (door) | L9 v L2 | 50% / 0.00 (7.6r) | 83% / 0.00 (7.1r) | 99% / 0.37 (6.1r) | 100% / 0.90 (4.8r) | 100% / 0.90 (4.5r) | 100% / 0.89 (4.3r) |
| bc-2/float-eye | L12 v L3 | 100% / 0.90 (3.2r) | 100% / 0.97 (2.5r) | 100% / 0.96 (2.2r) | 100% / 0.97 (2.9r) | 100% / 0.98 (2.6r) | 100% / 0.98 (2.5r) |
| bc-8/green-jelly | L12 v L3 | 100% / 0.78 (4.0r) | 100% / 0.89 (3.2r) | 100% / 0.89 (2.9r) | 100% / 0.95 (3.4r) | 100% / 0.96 (3.1r) | 100% / 0.96 (2.9r) |
| bc-10/float-eye | L13 v L3 | 100% / 0.91 (3.1r) | 100% / 0.97 (2.5r) | 100% / 0.96 (2.1r) | 100% / 0.97 (2.9r) | 100% / 0.98 (2.6r) | 100% / 0.98 (2.4r) |
| bc-11/float-eye | L13 v L4 | 100% / 0.89 (3.4r) | 100% / 0.91 (2.8r) | 100% / 0.96 (2.4r) | 100% / 0.96 (3.1r) | 100% / 0.97 (2.8r) | 100% / 0.97 (2.6r) |
| bc-13/float-eye | L13 v L4 | 100% / 0.89 (3.4r) | 100% / 0.91 (2.8r) | 100% / 0.96 (2.4r) | 100% / 0.96 (3.1r) | 100% / 0.97 (2.8r) | 100% / 0.97 (2.6r) |
| bc-15/death-beholder (door) | L14 v L3 | 86% / 0.00 (6.9r) | 95% / 0.23 (6.8r) | 100% / 0.55 (5.3r) | 100% / 0.90 (4.9r) | 100% / 0.91 (4.5r) | 100% / 0.90 (4.2r) |
| ld-3/float-eye | L16 v L3 | 100% / 0.96 (2.6r) | 100% / 0.98 (2.2r) | 100% / 0.98 (1.9r) | 100% / 0.97 (2.8r) | 100% / 0.98 (2.5r) | 100% / 0.98 (2.2r) |
| ld-5/float-eye | L16 v L3 | 100% / 0.96 (2.6r) | 100% / 0.98 (2.2r) | 100% / 0.98 (1.9r) | 100% / 0.97 (2.8r) | 100% / 0.98 (2.5r) | 100% / 0.98 (2.2r) |
| ld-8/green-jelly | L16 v L3 | 100% / 0.91 (3.3r) | 100% / 0.93 (2.9r) | 100% / 0.96 (2.4r) | 100% / 0.96 (3.3r) | 100% / 0.97 (2.9r) | 100% / 0.97 (2.6r) |
| ld-11/float-eye | L17 v L4 | 100% / 0.93 (2.8r) | 100% / 0.98 (2.5r) | 100% / 0.96 (2.0r) | 100% / 0.97 (3.0r) | 100% / 0.98 (2.6r) | 100% / 0.98 (2.4r) |
| ld-12/float-eye | L17 v L4 | 100% / 0.93 (2.8r) | 100% / 0.98 (2.5r) | 100% / 0.96 (2.0r) | 100% / 0.97 (3.0r) | 100% / 0.98 (2.6r) | 100% / 0.98 (2.4r) |
| ld-13/float-eye | L17 v L4 | 100% / 0.93 (2.8r) | 100% / 0.98 (2.5r) | 100% / 0.96 (2.0r) | 100% / 0.97 (3.0r) | 100% / 0.98 (2.6r) | 100% / 0.98 (2.4r) |
| ld-16/death-beholder (door) | L18 v L4 | 82% / 0.00 (7.1r) | 100% / 0.29 (6.5r) | 100% / 0.57 (5.2r) | 100% / 0.89 (5.2r) | 100% / 0.90 (4.6r) | 100% / 0.89 (4.3r) |

| deck | cards | min win | min p10 | mean rounds | mean VITAE taken per fight |
|---|---|---|---|---|---|
| grey | 10 | 21% | 0.00 | 3.79 | 41.0 |
| elementalist | 20 | 100% | 0.89 | 3.13 | 5.77 |

**Reading.** The Elementalist test deck never loses an Act 1 ledger fight and never drops below 89% VITAE in its worst decile, including every Death Beholder door where the grey deck dies (bw-17 grey even 21% / 0.00). It also beats every Blood Price column in `latest.md` on every door (Blood Price+half body at bw-17: 100% / 0.65). Live play agreed: PT1 ended the Float-Eye at 170/170 with no hit landed (three threats resolved `overwhelmed`; DoT did 48 of 92), PT4 ended it at 170/170 with the foe dying in its own threat phase, and PT1 reached the bw-17 reveal at 170/170. Where an agent said "easy", the measurement agrees; nobody said "hard". The witness is greedy and the live hands were first-timers', and they land in the same place, so the gap between decks is the deck, not the player.

Two caveats the number does not carry: the deck is 20 cards against grey's 10, and it was built as "the sims' best-played 20" (`elementalist.cards.ts:258`), so it is the lane's ceiling, not a starter.

## 2. Reproduced findings (seen by two or more agents, or anchored to a log line)

Severity is the player's cost. "Known" cites the existing CRITIQUE / report row so nothing is re-raised as new.

| id | screen | sev | finding | seen by | evidence | known? |
|---|---|---|---|---|---|---|
| R1 | combat hand | high | Nothing on screen says a card must be **dragged** to stage; tapping only opens the reading sheet, which has no PLAY. The one hint ("drag a die onto your card · APPLY to commit") appears after a card is already staged. | PT4, PT1 | `combat.md` §4 step 2; PT4 `pt4-combat-after-tap-c1` | partly (`combat.md:56` names the cost; no row asks for an on-board cue) |
| R2 | deck tab | high | The DECK list prints only the paid (+DIE) line; the free NO-DIE line exists only in the detail sheet. With two of four dice dead on turn 1, every card PT4 could play did something other than the list said (E-07 "DRAW 2, then STORM…" → DRAW 2; P-02 "DEAL 9; INFERNO 4" → DEAL 3; M-06 "GUARD 9" → GUARD 4). | PT4, PT2 (F01: P-02 reads DEAL 9 / 19 / "◇ 6 ◆ 19" on three surfaces), PT1 (F06), PT3 (F04) | PT4 card table, log seq 31–84; `deck-card-*`; PT2 deck dump vs hand aria-labels | RC2 items 4–6 (CRITIQUE:912); **new evidence: the list omits the free line entirely** |
| R3 | combat board | high | M-04 and the INFERNO attacks set **your own** INFERNO; the self-burn ticks 2–3 VITAE a turn with no on-board cause. The only gloss ("you and the foe both burn… yours can kill you") lives in the SPOILS card preview. | PT1 (F02), PT2 (F02: threat says −16, lost 20), PT4 (F07) | PT1 seq 43 `weather-changed your-inferno 0→2`, seq 62 `dot-tick inferno self 2`; PT2 `dot-tick inferno target self 4` every round; PT4 seq 70–74, 99 | no |
| R4 | everywhere | high | The deck's identity is never stated. Cards are code names ("Elementalist P-02"); the only concept text is the developer flavour "Elementalist trial card, Engine sub-lane." Each agent inferred "weather engine" from the HUD ticking (PT1 turn 2; PT4 log 87–88; PT3 from P-04/P-09 text). | PT1, PT2, PT3, PT4 (all four) | `deck-card-detail-flavor`; `elementalist.cards.ts:9` ("placeholders until T names them") | by design until EL1d / lane-creator step 7; the **flavour line reaching players** is new |
| R5 | hazard board | high | Drag-only with no tap fallback; the guide says "tap to stage" (`hazard.md:26,45`) and the board says "drag cards up from your hand" (`HazardBoard.tsx:6-10`). Route-select jargon (CONVERT ✕→◆, RE-CAST, FORCE/ESCAPE, NO RETREAT) is unglossed. | PT3 (F01, F12), PT4 (F08) | `HazardBoard.tsx:6-10`; PT3 `pt3-10/11`; PT4 skip of bw-3 | guide bug new; jargon partly B3 |
| R6 | hazard rounds | med | "ROUND n — TAP TO CONTINUE" blocks the board after every round; `hazard.md:53` says it auto-clears. Costs a tap and a beat after the decision; caused one skip (PT4) and 15 wasted taps (PT1). | PT1 (F04), PT4 (skip) | flash text "ROUND II — FAILED · … · TAP TO CONTINUE"; PT1 taps 89→104 | guide bug new |
| R7 | combat aftermath | med | No victory seal: `combat-summary-close` drops straight onto the map; `combat-victory-panel-carry-on` never mounts on the live route; XP 0→40 appears on SELF with no notice, and a level-up (PT2: L15→16, `483 character:levelup`) has no screen. `CombatVictoryPanel.tsx` exists but nothing outside its sibling panels references it. | PT1 (F08), PT2 (F06), PT4 (F11) | grep: no mount site; PT1 "NO EL combat-victory-panel-carry-on" | **RC2 item 1** (CRITIQUE:912); `combat.md:48,61` is stale |
| R8 | cache | med | TAKE A CARD is blind (no name or text before taking; "+ WHAT IS OWED" / "+ FEEDING MARK" after), and the card is **off-lane**: SET DECK leaves the reward pool at "whole library", so an Elementalist deck is handed Blood Price LEECH cards. | PT1 (F05), PT3 (F03, F11) | PT1 seq 58 `hand-drawn bp-p-06d`; PT3 seq 67 | RC2 item 11 (no preview); the **lane-unaware pool** is a dev-tools note (`DebugRewardPool` exists; SET DECK does not set it) |
| R9 | combat board | med | Unglossed vocabulary for a sighted player: Conviction ◆, momentum chain, SURGE, GHOST die, BANKED / Reserve / ripened, BOON / MANA / MISS faces, rail "▮16 ▯0", "overwhelmed", ⟳ GLOBAL, ⏳3/∞, the "+N" free corner, "X" on a face (read as unplayable; means variable). Most exist only as aria-labels. Intent flavour and label disagree ("(12 damage). Deals 8") with no "after BLIZZARD" cue. | PT1 (F07), PT2 (F04, F05), PT4 (F03, F05) | PT1 seq 49 `die-banked`, 57 `die-ripened`, 54 `blizzard-softened`; PT4 `combat-card-face-value` | RC2 item 15 (Momentum / payload); the X-face and the aria-only glossary are new |
| R10 | rest / cache / anvil / spoils | med | Interstitials after a one-option decision: a one-way choice tap, then an outcome card ("SETTLED · MOVE ON", "+5 VITAE · MOVE ON") that is pure acknowledgement. Taking one combat reward card is four taps (SPOILS → preview → CHOOSE THIS → TAKE CARD → CONTINUE). Two anvil exits ("TAKE THEM AND GO" / "LET THE COALS DIE") are identical when nothing was forged. In SPOILS, tapping a card only reads it and TAKE CARD stays "choose a card first" until CHOOSE THIS inside the panel; PT2 walked away empty twice. | PT1 (taps table), PT2 (F09), PT3 (nodes table, F06) | PT1 per-node taps; PT3 seq 76–78 | no |
| R11 | hazard reckoning | med | VITAE max drifts without an event: header "165 out of 165" after the hazard, "165/170" at the next rest; the reckoning printed "+2 VITAE reserve" and "−4 route penalty" but net was −5. | PT1 (F03) | `hazard-consequence-maxhp`, `hazard-reward-vitae`; marks `bw-3-done` / `bw-9-rest-screen` | RC2 item 9 (no net VITAE); the **max-VITAE drift** is new |
| R12 | map / economy | low | The purse is visible only inside rest and anvil. At 0 shillings two of three rest doors and the whole anvil are dead, and nothing on the map says so before the player spends two nodes on them. Three healing potions sat in the SATCHEL while PT3 stood at 1 VITAE with no hint anywhere. | PT1 (F10), PT3 (F10) | rest "you can't cover the 5 it costs"; PT3 satchel dump | partly (CRITIQUE:967 potion size); the **no-hint-at-1-VITAE** is new |
| R13 | map | low | Node flavour and event flavour disagree ("The Sea Cave — the tide comes in faster than you leave" opens THE CREEPING ROT; "The Clifftop Chapel" opens a purse in the netting). Node-kind icons are tiny gold rings at default zoom; the legend explains TRODDEN/OPEN/SEALED only. | PT3 (F02), PT4 (F12) | `pt3-09`, `pt3-12`; `pt4-map-fresh` | no |
| R14 | field guides | low | `hazard.md` (tap vs drag; auto-clear), `combat.md` (victory panel), `minigames.md` (no `card-upgrade-row-*` / `card-upgrade-confirm`), `dev-section-*-toggle` undocumented, `/item-reward` only in passing. A wrong guide is the README's own definition of a finding. | PT1 (F12), PT3 (F12), PT4 (F08) | `scripts/playtest-guides.test.mjs` guards shape, not truth | no |

## 3. Unreproduced or harness-suspect (one agent, no corroborating log line)

| id | screen | finding | why held back |
|---|---|---|---|
| U1 | SELF | "Explain HEART stat" tap gave no visible panel (PT4 F04). | The row is a `TooltipTarget` (`character/index.tsx:133-139`); PT4 drove it by DOM click through a relay, which may not fire the tooltip's gesture. Re-test by hand. |
| U2 | anvil | WILD die TEMPER reason is a cap, not a price; "WILD" / "gold die" / "yellow wild sun" are three names for one die (PT3 F07). | One agent; plausible; no log line. |
| U3 | rest | "paid for in advance" vs "on the house" (PT3 F08). | Copy nit, one agent. |
| U4 | map | Fixture standing node walkable again after leaving (PT3 F09). | Fixture artefact (no `arrive`); not a player path. |
| U5 | combat | Invisible drag ghost left in the DOM at opacity 0 (PT4 F13). | No visible impact; one agent. |

## 4. Where the agents' difficulty claims met the measurement

Nobody called the Elementalist hard. PT1 and PT4 called the Float-Eye harmless; the sim's bw-2 cell is 100% / 0.95 in 3.0 rounds. PT1 reached the bw-17 reveal at 170/170; the sim's bw-17 cell is 100% / 0.89. The one disagreement is about *legibility*, not difficulty: both PT1 (F11) and the measurement say the threat is never real, and PT1 adds that the player cannot tell why (BLIZZARD softening has no label). The Duelist's door fight is in §5.

## 5. The Duelist (PT2, seed 1102, `sage-bw-door-gate`, desktop 1280×720)

**Door fight, bw-17 The Death Beholder** (258 HP, 7 phases 11/12/13/13/19/23/21; Sage L15, 290 VITAE; the reveal had no WITHDRAW): **win in 8 rounds at 227/290 (0.78)**. Summary: "STORM 157 dmg · INFERNO 64 · P-02 33 · Total DoT 221 · Direct 76 · Best card: STORM" (`248 game/combat:ended {outcome:"victory"}`). From round 4 the foe dealt 0 once BLIZZARD exceeded its attack (`blizzard-softened 12`; P-03 GUARD 48 = 2×❄24); every point lost after round 3 was the player's own INFERNO (`dot-tick inferno target self 4` each round). So: safer than the measurement in danger terms, costlier in VITAE terms, and for the same reason R3 names. The measurement's bw-17 cell at L4 is 100% / 0.89; PT2 at L15 ended at 0.78 because the witness does not set itself on fire and a first-timer does.

Round 5 logged `enemy-healed source STAGE 39`, cancelling 13 + 26 of ticks, with only a "✻ 1" glyph on the HUD. That is RC2 item 2 (Doorwarden stage heal has no toast), now seen on the live board with the number.

**Charcoal Wood, fights 2–3 (Float-Eye 92)**: four rounds each, VITAE 227→196→165, XP +40 each, and **level 16 arrived silently** (`483 character:levelup level 16`; header flipped, no screen). Under seed 1102 both fights rolled the identical trays and hands as the door fight, so "two fights of the next region" were one fight twice. **Fight 4 (dev trigger)**: WITHDRAW → toast "you fled the encounter. the path bends away.", `501 combat:ended {outcome:"flee"}`, no visible cost.

Color Law was tested once per fight and rejected loudly and clearly: "✕ only a HEART or WILD die can power Elementalist E-09". END PHASE with cards in hand and an all-MISS tray happened in six of eight rounds; `combat-end-consequence` was absent in all six (`consequence:null`) and appeared only when a live die had no matching card.

Duelist-only findings folded into §2: F01 three numbers per card (DECK "DEAL 9" / hand "DEAL 19" / preview "◇ 6 / ◆ 19") → R2; F02 self-burn → R3; F04 intent label vs flavour number ("(12 damage). Deals 8") → R9; F06 silent XP / level-up → R7; F09 SPOILS: tapping a card only reads it, TAKE CARD stays "choose a card first" until CHOOSE THIS inside the panel, walked away empty twice → R10.

| id | screen | sev | finding | evidence | known? |
|---|---|---|---|---|---|
| R15 | combat footer | med | END PHASE is the only legal move with cards in hand and an all-MISS tray, and no consequence line says so. | PT2 rounds 1–3, 5–7 `consequence:null` | no |
| R16 | reveal / map sheet | med | A door fight's reveal has no WITHDRAW and nothing says the fight is mandatory; a normal WITHDRAW ("forfeit the path") shows no cost at all. | PT2 fight 1 reveal; fight 4 toast, log 501; PT4 F09 | no (PT4 corroborates) |
| R17 | combat HUD | low | Boss stage heal lands as "✻ 1" with the number only in the log. | `enemy-healed source STAGE 39` | **RC2 item 2** |
| R18 | dice tray | low | 15 of 32 dice in the door fight were MISS; rounds 3, 5 and 6 had three dead of four. BOON vs MANA faces differ ("gain 2 Conviction" vs "power its paid line") with no board explanation. | PT2 turn-start trays | partly R9 |

## 6. What went well (keep these)

- The card **inspect sheet** (deck tab and `combat-card-detail`): keyword glosses, NO DIE / +DIE lines, "TAKE NOTHING — a lean deck draws its best more often". Every agent named it the best onboarding surface. INFERNO, BLIZZARD, STORM, GUARD, DRAW, HEAL and EXILE were all understood inside ten seconds through it.
- The **reveal** screens: named threats, damage per phase, and the intent number falling live as BLIZZARD and GUARD land ("−8 → −3 → 0").
- The **DAMAGE BY CARD** summary ("STORM 29 · P-05 20 · INFERNO 19 · best card STORM") is where the deck's identity landed for PT1 and PT4. It teaches after the fact what the board never said.
- Dead-tray guidance: "no die matches your hand — FREE plays still work · END rolls fresh dice".
- Hazard route cards: thresholds per round, fail cost per round, reward line. The best-explained decision in the run.
- Disabled offers that say why ("you can't cover the 5 it costs"); the potion confirm's exact before/after ("VITAE 52 → 67 (+15)"); the anvil's NOW / AFTER upgrade preview, printed equal to applied (P-02 "DEAL 9; INFERNO 4" → P-02+ "DEAL 13; INFERNO 5").
- Weather killing the foe during its own threat phase (PT4 log 133–136) "felt earned".

## 7. Elementalist outside combat

None of hazard, rest, cache or anvil reacts to the deck. The hazard deals from its own hazard deck; the cache draws from the whole library; the anvil upgrade is generic "numbers up". The only lane-specific surface was the upgrade sheet listing 21 Elementalist codes.

## 8. Second-run intentions the game never surfaced

- Bank a HEART die for P-08's double; chain three colours for a GHOST die (PT4). The game never says dice can be banked or that a chain spawns a wild.
- Drink a potion before moving; take THE GOODS at the cache for shillings to spend two nodes later (PT3). Neither the potion's existence nor the goods-to-shillings link is shown.
- Skip the rest's paid doors and the anvil at 0 shillings (PT1). The purse is not on the map.
- Read every card's SPOILS preview before the first fight, because that is where the self-burn gloss lives (PT1).

## 9. Numbers: taps and seconds (PT1, desktop, DOM clicks, `Date.now()` deltas)

| stretch | taps | seconds |
|---|---|---|
| bw-1 → bw-17 reveal (7 nodes) | 167 | 694 |
| Float-Eye fight (5 turns) | 45 | 214 |
| hazard, 3 rounds, safe route | 85 | 225 |
| map decision | 2 | — |
| rest / cache / anvil choice + interstitial | 3–4 | 2–34 |
| take one combat reward card | 4 | — |

## 10. Replay determinism (PT4)

Same fixture, same seed 1104, same deck: foe, THREAT SEQUENCE (6 / 8 / 13), turn-1 tray (BODY BOON, MIND MISS, HEART MANA, WILD MISS) and opening hand (E-07, P-05, P-08, M-10, P-10) repeated exactly (`turn-dice-rolled` seq 28 vs 29). A control replay with the grey deck and the same seed rolled MIND BOON instead of MISS: the shuffle consumes RNG before the dice, so "same seed" replays only with the same deck. Worth knowing before anyone compares decks on one seed.
