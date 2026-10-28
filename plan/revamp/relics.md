# Revamp — relics and signature skills

> Part plan of [THE REVAMP](README.md). Phases **R4** (placeholders, loop)
> and **B1** (the relic pass, owner). Decision D47. Status: RATIFIED 2026-09-28 (D64).

## Where things stand

Signature skills are an always-available kit outside the deck, paid in
Conviction (◆) and granted only by the 11 signet relics
(`Items/relic.library.ts`, `grantsSignature`; defined in
`Combat/combat.signature.ts`). The card purge (P1) covered player cards
only, so all 11 survived:

| Signature | Relic slot | Cost | Effect today |
|---|---|---|---|
| Read the Entrails | armor | 1 | reveal next stance check |
| Press Fate | charm | 4 | reroll miss faces |
| Second Wind | armor | 4 | draw 2 + heal |
| Cold Counsel | charm | 4 | draw 2 |
| The Unbroken Stride | feet | 4 | surge |
| The Butcher's Bill | weapon | 6 | 2 dmg per stack of every effect on the foe |
| The Endless Labor | hands | 6 | permanent empower |
| **The Open Hand** | ring (Suppliant's Ring) | 6 | QUARTER + 6 flat damage |
| The Stilling | weapon | 8 | petrify; STAGGER vs boss/unique |
| The Oath Kept | amulet | 8 | POISON +3, never fizzles |
| The Mounting Dread | head | 9 | Creeping Doom +3 |

> **D72 (2026-09-30):** phase R7e deletes the ten non-starter relics. For
> the Act 1 checkpoint, the Suppliant's Ring is the only relic. The table
> below is the pre-R7e record that B1 starts from.

## Known issue — The Butcher's Bill is unbounded (fix in B1)

`combat.signature.ts:131,191`: 2 damage per stack of every effect on the
enemy. A Plain Word lands VULNERABLE at intensity 25+ (heart-scaled), and
player-applied statuses skip the intensity cap of 30 (`Effects/index.ts:24,70`).
One Word → the Bill hits ≈50; two → ≈100; no ceiling, at 6◆. T ruled
(2026-09-28): no stopgap; R4 removes it by making the Bill GUARD 5, and B1
must not reintroduce a per-stack reader without a cap or a distinct-effect
count. The cap bypass for player statuses is a separate latent hazard for
any future stack-reader.

## R4 — Signature placeholders (loop)

T, 2026-09-28: "let's set all their effects to GUARD 5. Then we can clean up
more keywords." Then: keep the names, flat cost.

1. **Ten signatures → GUARD 5** at one flat Conviction cost (default 4◆,
   A Plain Ward's PAID parity). Names and relics unchanged; each description
   becomes one line ("Raise GUARD 5."). The `kind` switch collapses to
   `guard` + `mercy`; delete the scout/reroll/sustain/draw/surge/empower/
   control/dot/conclude branches and their constants
   (`HARD_CONTROL_BOSS_STAGGER`, `PRESS_FATE_COST`, …).
2. **The Open Hand stays special — it becomes a real befriend.** The
   Suppliant's Ring was the first-node hand-over (removed in phase SG1, T
   2026-10-25: a run starts with no relic; the ring stays in the library for
   a later lane) and T kept it then: "Leave the starting ring with befriend." Today it applies
   QUARTER + 6 damage and *never* opens mercy; the only door into the mercy
   choice is the `befriend_attempt` card rider (`Cards/card.engine.ts:382`,
   `Combat/combat.engine.ts:2674`), which no card carries. Rewire The Open
   Hand to perform the befriend attempt itself; drop the QUARTER + damage.
   Cost stays at the flat rate unless the phase finds befriend needs its own.
3. **Befriend data on the survivors:** Brine Hag already has
   `friendshipReward`, `befriendabilityConfig`, journal and pact lines.
   Float-Eye and the Doorwarden have none. Decide per foe: befriendable
   (author minimal data — content, so R4 only *reuses* existing Brine Hag
   lines and marks the other two not befriendable) or not.
4. Relic descriptions: rewrite to what the relic now does (the Suppliant's
   Ring says "Soften the foe toward mercy" — make it true).
5. Fix the stale header comment "combat reads no stat" (false since S3).
6. Carrier sweep (D45): QUARTER, WRATH, CHAIN, STAGGER, PLEA, DRAW, HEAL
   (if no consumable keeps it), BOON/PIP (if only Press Fate carried them)
   lose their last carrier → atlas, gloss, glyph and catalog rows go.
7. Mobile: the signature bar, equip-delta sheet and relic detail read the
   new text; drop presenter branches for deleted kinds.
8. Save migration: none needed (relic ids unchanged).

Gates: README §5; an e2e that The Open Hand opens the mercy choice on the
Brine Hag and that every other signature raises GUARD 5.

## B1 — The relic pass (owner)

T will run a guided pass to "create a few relics" and re-author signatures.
Inputs for that session:

- The Butcher's Bill note above.
- Signatures are the player's only non-card actions; they must obey the
  same carrier rule and the same S3 families as cards (body/mind/heart).
- Relics' `statModifiers` now feed S3 scaling — a stat relic is a scaling
  lever, not a flat bonus.
- Relic identity is `grantsSignature !== undefined` (plus the `relic-`
  prefix); a stat-only relic would need that discriminator changed.
- **Relics open lanes (D68, D71).** Every relic B1 authors names the lane
  (or lane family) it opens; its detail view shows that name. Equipped
  relics decide the combat card-reward pool, so B1 and the card sessions
  (B6) are coupled: a lane relic needs its lane's cards.
- **Lane relics stack (D100).** 1-2 relics of one lane give 1 lane card
  in the 3-card combat reward; 3-4 give 2; all 5 relic slots give 3.
  Only three relic slots exist (D105), so the 3-of-3 row is reached, if at
  all, by a set bonus: T's design session SB1
  (`plan/phases/phase_SB1_set_bonuses.md`), not B1.
- **Relic sources (D71), for now:** quests give designated relics;
  elites have a low chance of dropping a random relic. There is no starting relic:
  the first lane opens with the first lane relic (D71).
- **Lane relics plotted as LR1 (T, 2026-10-25).** The Bleeding Signet opens
  Blood Price; every lane relic's detail view shows "Lane: <lane name> (while worn)" (D107);
  five new relics (two Blood Price, three Elementalist), T's content, written
  by T in session (LR1b, done 2026-10-25) and recorded in "The lane relics
  (LR1b)" below; quests are the primary source, elites drop at a lower
  chance, and each lane's third relic comes only from an elite. Crimson
  Covenant is retired. Brief `plan/phases/phase_LR1_lane_relics.md`. B1
  keeps the rest of the pass.
- Relic reward sources: the hazard deck's "Bonus Relic"/"Shrine Cache" lie
  (they pay shillings) and go in R6; B1 can give relics a real source.

## The lane relics (LR1b)

Authored by T in session, 2026-10-25, verbatim. Signature costs (in
Conviction) are T's starting pitch, to revisit after playthroughs. Built by
LR1d (Blood Price) and LR1e (Elementalist). Quests (T, 2026-10-27, D111; LR1f
skipped): the Elementalist's Belt is the reward of Chapter 1's questline
(`plan/phases/phase_QL1_breakwater_questline.md`); the Ruby Signet, the Bleeding
Signet and the Brooch wait for Chapters 2-4's quest lines.

| Relic | Lane | Signature (cost in Conviction) | Stats | Source |
|---|---|---|---|---|
| Elementalist's Signet | elementalist | Clear your INFERNO; trigger the foe's STORM (6) | +5 Heart, +20 max VITAE | elite only |
| Elementalist's Brooch | elementalist | Convert the foe's INFERNO into STORM (4) | +5 Mind | quest |
| Elementalist's Belt | elementalist | Convert all BLIZZARD into STORM (3) | +5 Body | quest |
| Crimson Circlet | blood-price | Your next SACRIFICE heals you instead; it still counts as a SACRIFICE (TETHER, sacrifice-triggered Globals, anything that reads SACRIFICE) (5) | +5 Body, +20 max VITAE | elite only |
| Ruby Signet | blood-price | Your next SACRIFICE adds LEECH equal to the VITAE paid, unscaled, to the foe (3) | +5 Heart | quest |
| Bleeding Signet (existing, reworked) | blood-price | HEAL 5; trigger the foe's LEECH (4) | +5 Mind (the +20 max VITAE is removed) | quest |

**Built (LR1d).** Blood Price's three are in `relicLibrary` with
`laneId: 'blood-price'` and their `relicSource`; Crimson Covenant is gone.
Signature ids, kinds and the builder's placeholder names (`[content]`, T to
rewrite): `sig-crimson-circlet` Crimson Return (`sacrifice-heals`, ◆5),
`sig-ruby-signet` Ruby Tithe (`sacrifice-leech`, ◆3), `sig-bleeding-signet`
Open Vein (`heal-trigger-leech`, ◆4). The Open Hand keeps ◆4. Relic stat lines
now include Heart, Body and Mind, added to the fighter's stats at combat
start. An armed SACRIFICE redirect lasts across turns until a SACRIFICE
resolves, and a WAIVED SACRIFICE spends it while healing or adding nothing.

**Built (LR1e).** The Elementalist's three are in `relicLibrary` with
`laneId: 'elementalist'`: `relic-elementalist-signet` (`'elite'`, +5 Heart, +20
max VITAE; `sig-elementalist-signet` Eye of the Storm, `clear-yours-trigger-storm`,
◆6), `relic-elementalist-brooch` (`'quest'`, +5 Mind; `sig-elementalist-brooch`
Kindle the Gale, `foe-inferno-to-storm`, ◆4: only `infFoe` becomes STORM, the
shared stack stays) and `relic-elementalist-belt` (`'quest'`, +5 Body;
`sig-elementalist-belt` Thaw into Thunder, `blizzard-to-storm`, ◆3). The
signature names are placeholders `[content]` for T. The engine helpers are
`programWeatherSignature` and `programWeatherSignatureLive` in
`combat.card-program.ts`. "Your INFERNO" for the refusal is `yourInferno`, so a
lone shared stack of 1 (you lose 0) does not make the Signet live.

## The quests (LR1f)

**Chapter 1 only (T, 2026-10-27):** "Let's rewrite this PR as to where only
Chapter 1 is focused on. We haven't really discussed what quests look like
yet." So the Breakwater carries the one quest below, as a placeholder until T
and the loop settle what a quest is; Chapters 2-4 carry none, and the
Bleeding Signet, Elementalist's Brooch and Elementalist's Belt have no quest
yet (only the dev menu hands them over).

Act 1 had no `interaction` or `narration` node, so the giver is an existing
node turned into a `narration` whose first reply starts the quest. Lines are
the builder's, `[content]` for T to rewrite (`World/MapEvents/content.ts`
`QUEST_GIVERS`).

| Quest | Region | Giver node (was) | Objective | Relic |
|---|---|---|---|---|
| The Watchtower Lamp | Breakwater | `bw-12` the sea cave (hazard) | kill The Death Beholder (the watchtower door, `bw-17`) | Ruby Signet |

No quest pays an elite-only relic (`World/quest.library.test.ts`). The elites
carry no drop list of their own (`eliteRelicDrops` absent), so the Green Jelly
draws the whole elite-only pool: the Crimson Circlet and the Elementalist's
Signet. A quest turned down at its giver is gone for the run (the node is
consumed).

**Built (DF1e).** The Defender's three are in `relicLibrary` with `laneId:
'defender'`: `relic-thornback-signet` (`'elite'`, +5 Heart, +20 max VITAE;
`sig-defender-signet` Thorn Mantle, `guard-to-thorns`, ◆5: THORNS equal to your
GUARD, unscaled, refused at 0 GUARD), `relic-mirror-brooch` (`'quest'`, +5 Mind;
`sig-defender-brooch` Mirror Ward, `reflect-half`, ◆3: REFLECT 50%, adds and
refreshes, never refused) and `relic-carapace-belt` (`'quest'`, +5 Body;
`sig-defender-belt` Hold the Line, `hold-guard`, ◆4: sets the same
`guardHoldRound` M-04 PAID sets, refused once held this round). Names are
placeholders `[content]` for T; no icons picked (fallback glyph). No quest hands
out the Brooch or Belt yet. Helpers: `programSpikeSignature` and
`programSpikeSignatureLive`. The sim witness's `ALL_SIGNATURE_KINDS` is left
without the three kinds so the witness stays as measured.
