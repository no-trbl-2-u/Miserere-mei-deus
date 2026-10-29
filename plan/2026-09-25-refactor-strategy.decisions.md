# THE REFACTOR STRATEGY — record of decisions

> Attended session, 2026-09-25. T raised four concerns (map shape, the
> post-story revamp, card adjustments + stat scaling, trimming dead
> systems) and asked whether to restart the project, purge its content,
> or work the concerns one at a time. Evidence was read from the tree
> before answering; the answers below were given through
> `AskUserQuestion` and are policy. Do not re-ask.

## Evidence the verdict rests on

| Fact | Value (2026-09-25 tree) |
|---|---|
| Engine source / engine tests / mobile source | ~66k / ~49k / ~113k lines |
| Content T wants changed | 129 cards, 29 authored map nodes, narration strings |
| Map authoring shape | hand-placed `location: [x, y]`, x = column 0..7, y = lane -2..1 |
| Traversal | frontier roaming already shipped (W-01 amended by D1, 2026-09-21) |
| Derived-stat consumers outside `src/Character/` | 5–13 non-test files per stat; none provably dead without an audit |

Reading: the parts T dislikes are the thin content layer. The expensive
parts (deterministic engine, reducers, RNG, CI gates, tests, loop
harness) are not in question.

## Decisions

**D1 — No restart. No purge. Sequenced rework, trim first.**
*Rejected:* restart (discards ~230k lines with no evidence the engine
architecture is wrong); purge (tests and the narrative-reachability
guard couple to content, so a mass delete leaves CI red with nothing to
validate against and loses the pricing baselines that make card changes
measurable). *Order:*

1. **Trim the fat** — audit first, because its keep/cut list bounds every
   later item.
2. **Map spread** — engine-only; independent of story.
3. **Card damage scaling by level/stats** — engine-only formula hook;
   independent of which cards exist.
4. **Story-dependent revamp** — map progression, enemy themes, narration,
   card content. Ships after the story adjustments land, as one keyed-off-
   the-outline change.

**D2 — Map spread is hand-authored wide graphs, not a generator.**
Re-author node locations as a 2-D web per region (order of 5x5 to 6x6)
with a guaranteed path that lets the player reach every node at least
once under frontier roaming. Keeps the mobile layout-parity test model;
each map stays a deliberate design. The "linear" read is the
column-and-lane authoring shape, not the traversal rules. A procedural
generator was rejected as a new engine subsystem plus new mobile layout
work for a problem authoring can solve.

**D3 — The trim audit covers everything: engine systems and stats,
mobile screens and components, forward-looking docs, and `plan/`
memory.** Output is a keep/cut list with consumer counts per item. The
`plan/` portion overlaps `/consolidate`; run the audit's `plan/` pass
through that skill rather than a second curator.

**D4 — Stat model: real combat hooks per stat.** body/mind/heart each
drive a distinct combat quantity; the damage-scaling hook (D1 step 3)
plugs into this model. Rejected: merging into one VITAE point;
deferring to the card rework.

**D5 — Labyrinth / Aporia: wire an entry.** Not parked, not cut. A map
event or door reaches it from normal play. Scope lands with the map
re-authoring (D2). Its engine, CLI, mobile route, art and
`plan/labyrinth/acts` are excluded from every trim count.

**D6 — Deletion policy exception to hard rule 4.** Images, raw sim
output, vendored third-party scans and committed e2e output may be
deleted outright. Markdown still archives into `plan/archive/`. A delete
does not shrink git history; history is never rewritten.

**D7 — Collapse the Upgradeable-Dice flag.** The OFF path (stance
draft, hidden read, STAKE, momentum wheel) and its mobile UI are
deleted; tests and sims pinned to OFF are rewritten to the shipped
model.

**D8 — GLYPHS: cut. Card upgrades: defer.** The GLYPHS pilot (~250
engine LOC + 4 mobile files, zero library cards) is deleted in T5.
`card-upgrades.ts` stays until the card rework (D1 step 4) decides its
grant path.

**D9 — Resolved rows leave `## Pending`.** In AUDIT / CRITIQUE /
PHASE_CANDIDATES, rows already resolved move to Done or `plan/archive/`
in T4. This is the `/oversight` ruling `/consolidate` deferred on
2026-09-02.

**D10 — Retire all eight zero-invocation tuning/playtest commands.**
deck-tuning, hazard-tuning, world-tuning, combat-ux-tuning, critic-loop,
deep-playtest, hermes-playtest, dep-upgrades: commands and skill docs
are deleted in T5; the playtest matrix stays as npm scripts. A `/jot`
note records the intent to rebuild them once the game mechanics have a
firmer footing.

**D11 — Icon pool stays in-repo.** T1 deleted `Potential Assets/icons-BBR`
(a black-on-white duplicate). The usable pool is
`Potential Assets/icons-TBR` (game-icons.net, 4,181 icons, CC BY 3.0 /
CC0, licence in `icons-TBR/license.txt`). When a new icon is needed, pick
it there and run `node axiomancer-mobile/scripts/extract-game-icons.mjs`,
which reads that path. Never trim `icons-TBR` as "unreferenced": it is a
source pool, not a shipped asset. *Rejected:* a separate repo (extractor
rework, one more clone) and a sibling directory outside the repo (cloud
sessions clone only this repo and could not reach it).

**D12 — Tier-2 buffs lose their hidden d20.** The 5 % fizzle / 5 % double
roll in `Combat/resist.ts` is removed; buffs apply as printed (trim spec
Tier 0 item 5). *Rejected:* surfacing the roll in the UI.

**D13 — T2 ships as two PRs.** T2a: engine dead code + Tier 0 items 1-5.
T2b: the Upgradeable-Dice flag collapse (D7). T2b starts after T2a
merges.

**D14 — Cut the base-stat lines on relics and effects too.** The trim
spec's "relic stat lines" and "effect statModifiers" are read literally:
the +2 body/mind/heart lines on 8 signet relics and the body/mind/heart/
luck modifiers on `buff_all_stats_up`, `buff_phoenix_vigor` and
`debuff_curse` are deleted in T2a. Relics keep their granted signature
(and the two armor relics their +5 max VITAE). Step 3 (D4 stat hooks)
re-authors any stat bonus it wants. *Rejected:* keeping them as data for
the future hooks; keeping them but hiding them in the UI.

**D15 — Map backdrops: atmosphere now, the map itself later.** (T,
2026-09-25.) For the D2 re-authoring, the node graph is authored first and
the backdrop is made to fit it as atmosphere. The target state is the
reverse: nodes placed ON the backdrop's landmarks, with the art panning
and zooming under the same gestures as the nodes. *Deferred, not
rejected.* Most of the plumbing already exists: `MapCanvas` draws the
plate inside the same fixed 360×400 × `SPREAD` canvas that pans and
zooms with the nodes (so `cover` crops identically on every device), and
node positions are hand-placed `x, y` in that viewBox in the per-map
mobile layout, not derived from the engine's column/lane. What the later
phase adds: a per-map canvas size/aspect (today every map shares one
portrait canvas), a stronger plate (opacity 0.2 today), and authoring
the layout `x, y` against the image.

**D16 — D2 map parameters.** (T, 2026-09-25.) Four regions, ~20 nodes
per map. A map must not read as a climb: the layout spreads in every
direction from the entry, so reaching the whole map needs panning up,
down, left and right. The engine's forward skeleton (column order) still
governs progression; only the mobile layout's `x, y` is freed from the
bottom-to-top ladder. The per-map canvas must be larger than the viewport
on both axes (D15's per-map canvas size lands with or before this).

**D17 — A chronicle continued mid-fight restarts that fight.** (T,
2026-09-25.) The fight's dice, hand and HP live in the combat panel and do
not survive an app restart; only the engine's `currentEncounter` does.
Continue lands on the map, which reopens the saved foe as a fresh fight
(bosses keep WITHDRAW sealed). *Rejected:* reopening the prelude (FIGHT /
WITHDRAW) and resolving the save as a flee. Accepted cost: quitting a
losing fight resets it to pre-fight HP. Shipped in T3 (#374).

**D18 — The "Codex" aesthetic: cut.** (T, 2026-09-25, T5 ballot.) The
dev-toggle-only cold-codex mode (`aesthetic-mode`, `AestheticDevToggle`,
`ExplorationCodexHeader`, `exploration.codex.engine`) changed one header and
nothing else. *Rejected:* finishing it as a player-facing mode. Shipped in
T5 (#380).

**D19 — The Debug\* tools: keep all.** (T, 2026-09-25, T5 ballot.) The
manual-only Debug\* components stay beside the CI-driven ones: dev-only,
outside the player path, and T's daily local-play shortcuts. *Rejected:*
cutting everything no CI testID drives. Do not re-propose the cut in trim
or audit passes.

**D20 — Die growth and banked souls: keep; wire with the card rework.**
(T, 2026-09-25, T5 ballot.) `bonusTurnDice` / `dieUpgradeLevel` stay (the
engine reads them; only the stage-profile sim sets them today) and get a
real grant path in the card rework (D1 step 4), alongside card upgrades
(D8). `bankedSouls` stays: combat writes it and the memoir's soul line
reads it, so it was never dead. *Rejected:* cutting the die fields (it
would change the sim's late-stage numbers).

**D21 — Act 1 is four brand-new maps built from the plates.** (T,
2026-09-25, map-revamp kickoff ballot.) One map per plate: coast,
forest, mountain fastness, underworld. The seven shipped maps are not
re-authored onto the plates; they are re-slotted into a later act, and
stay playable until then. The art is four separate square plates, not
one engraving to crop (T generated one image per region). *Consequence:*
the story overview names none of the four places, so each new map's name
and description is a ruling T makes before its M3 PR. Nothing is
invented. *Rejected:* three shipped maps (fishing-village, northern-forest,
caverns) plus one new mountain map; four shipped maps with northern-city
re-themed as the mountains.

**D22 — Plates are ingested by plain resize, no AI upscaler.** (T,
2026-09-25.) Each plate is scaled 2× with a standard resampling filter.
No invented linework; softer when zoomed in. Reversible: an upscaled file
can replace a plate later, with a provenance edit and no code change.
*Rejected:* Upscayl run by T; Real-ESRGAN downloaded and run by the agent.

**D23 — Act 1 order: coast → forest → mountains → underworld.** (T,
2026-09-25; amended by D106: each region is a chapter.) The underworld is last. The plates' drawn seams (the forest's
cave mouths drop into the underworld, and the underworld's tunnel leads
into the mountains) are imagery and do not bind the travel doors.
*Rejected:* coast → forest → underworld → mountains, which followed the
seams.

**D24 — The Labyrinth door is the underworld's sealed vault door, open on
arrival.** (T, 2026-09-25.) One node on the underworld map, placed on the
plate's vault-door landmark, enters the Aporia through
`enterLabyrinthAction`'s snapshot and return path as soon as the player
reaches it. No gate. *Rejected:* a gate condition (it would need new
content); another host map.

**D25 — Every landmark on a plate gets a node.** (T, 2026-09-25: "place
the nodes at at least the landmarks.") An Act 1 map's M3 layout puts a
node on each landmark in `axiomancer-mobile/assets/images/maps/act1-landmarks.json`
(read off the shipped plates in M1: 17–20 per plate). A map may add nodes
between landmarks, but never leaves a landmark without one. This is the
floor under D16's "~20 nodes": a plate with 20 landmarks has at least 20
nodes.

**D26 — The Act 1 places are named by agent draft, T's pick.** (T,
2026-09-25, M3 ballot.) Before each map's M3 PR, the agent drafts three
name + description candidates in the house voice (spec 34 §2.5: terse,
cold, priced scenery). T picks or edits one. Nothing enters canon without
T's choice, and the pick is recorded in the story overview's map table in
the same PR. *Rejected:* T naming all four up front; placeholder names.
*Picks:* coast **The Breakwater** (2026-09-25); forest **The Charcoal
Wood**, mountains **The Beacon Crags**, underworld **The Lantern Deep**
(2026-09-26, all three at once so the loop could build them unattended).
The descriptions are in `plan/2026-09-25-map-revamp-m3.prompt.md` §1.

**D27 — A new game starts on the coast as soon as it ships.** (T,
2026-09-25; amended by D106: the coast is Act 1, Chapter 1.) `createStartingWorld()` moves from fishing-village to the
Act 1 coast map in M3a. Act 1 runs coast → forest → mountains → underworld
(D23). The underworld's exit door leads into the shipped chain at
fishing-village until the later re-slot. While a later Act 1 map is still
unbuilt, the last built one's exit door leads to fishing-village instead.
*Accepted cost:* M3a reworks what assumes a fishing-village start (the
opening narration's placement, new-game and save handling, the first-map
e2e tests). *Rejected:* reaching Act 1 through a door from the shipped
chain until all four ship.

**D28 — The Act 1 maps live in the existing continents.** (T, 2026-09-25;
amended by D106: each map is one chapter of Act 1.)
Coast and forest go under `coastal-continent`; mountains and underworld
under `northern-continent`. Each map still takes its own node-id prefix in
`nodeIdToMapName()`, distinct from every shipped prefix. *Rejected:* a new
continent key.

**D29 — Act 1 borrows the nearest shipped enemy and event pools.** (T,
2026-09-25.) Coast from fishing-village, forest from northern-forest,
mountains and underworld from caverns. No new enemies, NPCs or events in
the map PRs. A need the pools can't meet is filed to `adjust-enemies` /
`adjust-npcs`. New content waits for the story-dependent revamp (D1 step
4). *Rejected:* authoring new content per map; empty maps first.

The next six were T's answers on 2026-09-26 to the agent calls M3a and M3b
filed in `plan/AUDIT.md`. They shipped with M3c in #394.

**D30 — Act 1 has no bosses; each region has one elite fight, its last
before the door.** (T, 2026-09-26: "Not a boss, but an elite battle for each
region"; placement "last fight before door".) The elite is an `elite`-tier
foe from the map's borrowed roster, pinned to an Act 1 level like every other
fight (brief §3b). Where the map narrows to one node before the door it goes
there (the Breakwater's watchtower, `bw-17`, brine-hag); where the last fight
column is a ring it goes on the ring's centre lane (the Charcoal Wood's
wayside cross, `cw-17`, cursed-paladin; the Beacon Crags' stone gate,
`bc-15`, mabadi). Every other fight is `normal`/`simple` tier, so the Crags'
bone-totem and unpaid-delver were swapped out. Pinned by
`World/e2e/act1-elites.engine.test.ts`. *Rejected:* promoting a normal fight
to boss; an optional side-node elite; an elite on the door node.

**D31 — A new game opens on an arrival scene at the windmill.** (T,
2026-09-26.) `bw-1` is a cutscene, like every other Act 1 map's arrival,
not a camp rest. *Rejected:* keeping the rest start; an empty start.

**D32 — Combat shows a plain black scene for now.** (T, 2026-09-26: "an
all black background for all combat plates for now", every map.)
`ARENA_PLATES_SHOWN = false` in `axiomancer-mobile/assets/images/combat/
index.ts`; the pane paints the palette's darkest ink (`deepBg`) instead of
a plate. The plates, their descriptions and their tests stay, so turning the
art back on is one line. *Rejected:* reusing fishing-village's plate for
Act 1; commissioning Act 1 plates now; black only for unplated maps.

**D33 — The King of Revenge rises from the harbour wall, not "the
breakwater".** (T, 2026-09-26.) Keeps the Act 1 map's name, The Breakwater,
and rewords fishing-village's two lines (`fv-6`'s boss description and the
King's brutal-defeat line) so they don't point at the Act 1 map.
*Rejected:* renaming the map; leaving both.

**D34 — The Breakwater gets people of its own, authored in a story-spec
session.** (T, 2026-09-26.) Not a staging-only move of fishing-village's
NPCs. Names and characters need T's sign-off (hard rule 3; the story
overview's "What happens here" for the Breakwater is still open), so this is
an attended session, not a loop phase. Filed in `plan/AUDIT.md`.
*Rejected:* staging Old Marrow on the Breakwater; waiting for D1 step 4.

**D35 — Fishing-village is retuned after M3d, from measurement.** (T,
2026-09-26.) Once the Lantern Deep ships and all of Act 1 can be played,
`/combat-playtest` measures the run and fishing-village's pins
(`FV_BOSS_LEVEL`, its fights) are raised to follow Act 1. Until then, map
PRs don't touch fishing-village's difficulty. *Rejected:* raising it now;
keeping the dip as a breather.

The next three came from the same session. T asked what was left of the
strategy and said: *"I want to pause at the card phase."* Then, near-
verbatim: *"Once all the other parts of the revamp are over, I want to purge
all the cards and all the combat related keywords except for the grey strike
and grey guard cards and keyword. Then work can continue, but no card
generation unless it's a guided session with me."* The scope was settled by
ballot the same day.

**D36 — Purge every player card but the two grey starters, after step 3.**
(T, 2026-09-26.) Amends D1's "no purge". Keeps `grey-strike` (A Plain Blow)
and `grey-ward` (A Plain Ward) and their keywords, DEAL and GUARD. Purges
every other player card: the six archetype libraries, the apocrypha set, the
relic-granted cards and the 5 curses. Purges every other player-card keyword.
Enemy keywords, decks and the statuses enemies apply stay. Every run deals
the 10-card grey deck; the 10 presets and the 5/5/5 thirds go; card rewards
and cache card offers are gated off. It ships after S3 (step 3), as build-plan
row P1, brief `plan/2026-09-26-card-purge.prompt.md`. *Rejected:* purging
right after M5 (before the scaling hook); stripping enemy keywords too;
keeping presets rebuilt from grey cards.

**D37 — No card generation outside a guided session with T.** (T,
2026-09-26.) From now on, no steward, `/forge`, `/expand` or phase creates a
player card or a player keyword. `adjust-cards` and `adjust-keywords` are
paused (`skills/march.md` §3b skips them) until T re-arms them. Everything
else in the loop continues. *Rejected:* letting the stewards keep making
small passes until the purge.
*Superseded by D99 (T, attended, 2026-10-22): cards, keywords and art are
ordinary content under D88.*

**D38 — The loop pauses at the card phase: step 3 is attended.** (T,
2026-09-26.) After M5 the loop does not start D1 step 3 (the D4 per-stat
hooks and card damage scaling). It's build-plan row S3, marked blocked for
an attended session with T, because the stat-to-quantity mapping is still
T's call. P1 (the purge) requires S3. *Rejected:* stopping the whole loop
after M5.

The next four came from the stats conversation (T, attended, 2026-09-26/27).
T asked for prior art on stat-scaling deckbuilders, then for high-number RPG
formulas; each call below was a ballot with worked late-game numbers.
Research sources and the full model: `plan/2026-09-27-stat-scaling.prompt.md`.

**D39 — Remove alignment, philosophy and GRACE; keep card colour.** (T,
2026-09-27: "remove everything that has to do with alignment and philosophy.
That includes grace.") Removes the philosophical-alignment grid
(`Ledger/alignment.*`, `GameState.philosophicalAlignment`, the dialogue
gates and read-backs that use it) and the GRACE morale meter (the HUD, the
withdraw penalty). The card colour survives: `philosophicalAspect` is
renamed to a neutral name (e.g. `color`) with no behaviour change, because
the dice and the colour-match bonus read it. A loop phase, build-plan row
T6, before S3. *Rejected:* removing card colour too; doing it attended;
folding it into the purge.

**D40 — Stats scale keyword families, decided by where the effect lands.**
(T, 2026-09-27.) Body: immediate damage to the foe. Mind: anything on you
(GUARD, THORNS, self-buffs). Heart: anything on the foe (VULNERABLE, BURN,
BLEED, STUN). Grey: the rest, unscaled. Keyword text is coloured in its
family's dice colour, with a stat glyph; combat shows final numbers; a
card's colour is its main keyword's family. Gordian Quest is the model T
named. *Rejected:* card colour picks the stat (a grey deck would make
all-body strictly best); heart scales statuses only; per-keyword mapping
without families (T: confusing once there are dozens of keywords).

**D41 — The formula: `base × stat ÷ 5`, nothing capped.** (T, 2026-09-27.)
One-shot amounts and percentages scale `base × stat ÷ 5`, so 5 is neutral
and each point is +20% of the base. Repeating amounts (DoTs, THORNS, regen)
scale at half rate. On/off effects and every duration never scale. No
caps: `VULNERABLE_MAX_MULT` goes. VITAE is `50 + 12·body + 6·mind +
6·heart` (170 at 5/5/5, as today). Enemy VITAE stays linear,
`(30 + 18·level) × difficulty`. *Rejected:* `÷ 3` (steeper), `+10%` per
point (gentler, under the late ladder), geometric enemy health.

**D42 — A third grey card: VULNERABLE.** (T, 2026-09-27.) The grey office
gains a heart card that applies VULNERABLE (working draft: PAID
VULNERABLE +25%, a FREE line to be set in the guided session that builds
it, D37). After the purge the player's keywords are DEAL, GUARD and
VULNERABLE. *Rejected:* BLEED, WEAKEN.

**D43 — A Plain Word: VULNERABLE rebuilt.** (T, guided S3 session,
2026-09-27; ballot.) VULNERABLE was not a live player keyword (no card
applied it; `debuff_vulnerable` sat on the deprecated list; only the
`damageTakenMult` path survived), so S3 rebuilds it on that path. The
effect's intensity is percentage points (+25 = the foe takes +25% damage),
heart scales the percentage when it is applied, and it **lasts 2 turns**.
Re-applying it **adds up and refreshes** the duration (+25% and +25% =
+50%), uncapped. The card is **A Plain Word** (`grey-word`, heart, grey
office): PAID VULNERABLE +25% for 2 turns, **FREE VULNERABLE +10% for 1
turn** (also heart-scaled). *Rejected:* 1 turn and until-your-next-hit
durations; keep-the-higher stacking; FREE Deal 2 or GUARD 2; the names A
Plain Mark (collides with `debuff_mark`) and A Plain Flaw.

**D44 — After the purge, the grey cards ARE the reward pool.** (T,
2026-09-27, ballot; amends D36.) D36 gated card rewards and the cache's
card offer off, because the grey office was never offered. T instead keeps
the reward loop live: a won fight offers Blow, Ward and Word, and taking one
adds a copy. The machinery stays whole for the cards later guided sessions
add. *Rejected:* rewards off until new cards exist; a small non-grey pool.

**S3 residue (2026-09-27, PR #404).** Re-stamping the baseline after S3
moved mid 91% → 100%, late 77% → 100%, impossible 13% → 100% (early is
unchanged at 5/5/5). The cause is a double count: rank-scaled printed
numbers (a mid DEAL 25) times the stat multiplier (body 39 → ×7.8). The
brief's "hits-to-kill holds steady" holds for grey bases (5), so the purge
(P1) should largely undo it. Re-read the matrix after P1 before any tuning;
D41 ("no caps") stands. A separate card agent owns card, keyword, upgrade
and transformation design from here (T, 2026-09-27); S3 touched only the
files listed in #404.

**P1 and keyword-audit residue (2026-09-27, PRs #406 and #407).** The
purge undid most of S3's double count. The re-stamped baseline reads
early 60%, mid 83%, late 99% and impossible 67% (stamp `c6fd758c`). The
keyword audit (#407) removed every card-only keyword, gloss, glyph, editor
word and effect the purge left unused, plus the per-card engine hooks keyed
on purged ids. Enemy keywords were left alone. A live-mode playtest (the
real map encounter, sage preset, seeds 16 and 8) won four fights. Every
reward draft offered exactly Blow, Ward and Word, and TAKE CARD grew the
deck from 10 to 11. What the purge left behind is filed in `plan/AUDIT.md`
Pending under the "post-purge" rows. A Plain Word's staged face wraps
"+25%" (its "×10" FREE value was fixed in the residue PR). The King of Revenge is 0/40. WOUNDING has no payload. The colour
systems are dormant and the Momentum tutorial still teaches them. Card-side
fixes wait for the card agent (D37).

**D45 — Purge the remaining unused keywords.** (T, 2026-09-28: "purge the
remaining unused keywords from the atlas and glossary".) A keyword keeps its
atlas row and glossary entry only while something live carries it: a player
card, an enemy deck or ability, a signature skill, an item, or the dice and
blacksmith systems. Mentioning a word inside another keyword's reminder text,
or borrowing it as a label for an unrelated effect, is not a carrier. Under
that rule PIERCE, RIPOSTE and FORETELL went: their atlas rows, their mobile
glosses and glyphs, the DevLog catalog's bold list, the editor's display
vocabulary, the dead theme families' mentions, and the HIDE / FLURRY reminder
clauses that named them. `buff_accuracy_up` now shows its own effect name.
The engine mechanics behind them stay (the P1 brief's rule); a returning word
re-earns its row in a guided session (D37). The 19 player rows that remain
each have a live carrier. *Rejected:* keeping words that only enemy reminder
text named (the 2026-09-27 audit's reading).

The next fifteen came from the 2026-09-28 attended audit session. T asked
what else was unused, underused or inconsistent ("clean house before I
start building back up"). Seven read-only audits ran (engine, mobile,
content, tooling, core loop, content stewards, design skills), and T
answered the findings one ballot question at a time. The plan is
`plan/revamp/` (README = main build plan); every ruling below was PROPOSED
there until T ratified it (D64).

**D46 — THE REVAMP: reset to a small core, then rebuild in owner-led
sessions.** (T, 2026-09-28: "a map of how to reset back to 0 while
maintaining the core mechanics"; "each major part of the revamp should have
its own plan file and then one main revamp build plan file".) The plan
lives in `plan/revamp/`: `README.md` orders R-phases (reset, loop-shippable
once ratified) and B-phases (rebuild, T's sessions). `/march` and `night`
were disabled on GitHub the same day and stay off until ratification and
R0. *Rejected:* flat dated files at `plan/` root; one big file.

**D47 — Relics keep signatures; every signature is GUARD 5 at a flat cost,
except The Open Hand, which becomes a real befriend.** (T: "Relics should
still have SigSkills, 100%. I just need to do a pass to create a few
relics"; "let's set all their effects to GUARD 5. Then we can clean up more
keywords"; "Leave the starting ring with befriend".) Names and relics stay;
cost is flat (≈4◆). The Suppliant's Ring's The Open Hand is rewired to open
the mercy choice, which it never did. The Butcher's Bill's unbounded
per-stack damage (2 × every stack; VULNERABLE 25+ bypasses the cap of 30)
is recorded for the relic pass (B1), with no stopgap. *Rejected:* purging
signatures; a minimal utility core; keeping current costs; one generic
signature.

**D48 — The enemy roster resets to one normal, one elite and one boss, all
keywords and afflictions stripped.** (T: "retire all enemies except for 3
or so"; then "1 normal enemy, 1 Elite, and 1 Boss. All with their keywords
stripped"; "Strip afflictions from the survivors".) Float-Eye (normal, L1),
Brine Hag (elite, L7), The Doorwarden (boss, L8). The other 76 retire,
including the King of Revenge (D53). WOUNDING's missing card, UNSHAKEN and
ELUSIVE's lost counter, HIDE 8 against a Blow of 5, the 22 PLEA/premise
riders and the curse-injection code all go with them. *Rejected:* retuning
HIDE in place; remapping riders; keeping the roster; Larva/Skull/King; a
keyword-bearing boss.

**D49 — Consumables reset to healing potions.** (T, ballot.) The 11 no-op
consumables, Antidote, Clarity Serum and the stat buffs retire behind a save
migration. *Rejected:* one potion; cutting only the dead ones.

**D50 — Delete carrier-less engine mechanics; git history is the archive.**
(T: "Delete; git history is the archive.") The 47 card mechanic kinds with
no carrier, their handlers, state fields, synergy, pricing, oath/hex zones,
empty registries and retired-verb fixtures are deleted. This supersedes the
P1 brief's "engine mechanics stay" and the same clause in D45. Card rewards
stay (D44), but the keyword-, theme- and rarity-focused selection logic is
gutted, with a research note to find how rewards best steer players toward
focused deckbuilding. *Rejected:* a `_dormant/` quarantine; keeping them
live.

**D51 — Card types are Attack, Skill and Spell.** (T: "I want to purge
card-types as well. For now, Attack (ie. DEAL card), Skill (ie. WARD card),
and Spell (ie. the vulnerable card) are the only 3 card types with a plan
for more.") Replaces `spell | oath | hex`.

**D52 — Hazards reset to a minimal set.** (T: "Reset hazards too. I plan on
changing some of the fundamental mechanics of hazard.") The four rewards
that lie (Paradox Token, Hexed, Bonus Relic, Shrine Cache) go with the
reset; T redesigns the mechanics in B3. *Rejected:* cutting/renaming only
those four; wiring them.

**D53 — The world is Act 1 only; fishing-village and the King are purged.**
(T: "Reset the world to Act 1 only"; then, told the King lives in
fishing-village after Act 1: "Act 1 only, purge the king, purge the fishing
village".) Act 1 = Breakwater, Charcoal Wood, Beacon Crags, Lantern Deep.
Fishing-village (map, NPCs, quests, events, village goodwill) is deleted;
northern-forest and the northern continent are parked. *Rejected:* keeping
fishing-village as the finale; moving the King into Act 1.

**D54 — The Labyrinth door is sealed and the module parked.** (T, ballot.)
`ld-15` never opens; the code stays; a later re-theme (B9) drops the
fallacies and the Borrowed Premise debt. *Rejected:* cutting it; keeping it
live on the survivors.

**D55 — XP and levels are retuned after the resets.** (T, ballot.) R9 sizes
the curve so Act 1 on the three survivors yields about 3–4 level-ups,
checked against the S3 curve. *Rejected:* a placeholder flattening now;
leaving it.

**D56 — The card editor is deleted; a card-creator workflow is built later;
card work starts with a full rules inventory.** (T: "Delete the package. Add
a Create Card-editor/Card-creator workflow phase to the card-creation
build-plan"; "before we start work on cards, determine 100% what
fixtures/rules exist around cards (ie. card types, keyword families,
pricing, rarity, etc)".) The inventory is Phase B4 and gates every card
session. *Rejected:* freezing or updating the editor in place.

**D57 — The deck-matrix baseline is retired until the retune; the DevLog
shows only live content.** (T: "Retire it until the retune phase"; tuning-lab
pages archived, catalog shrunk.) The baseline measured preset/policy axes
that no longer exist; `baseline:check`, its hook, docs and the nightly
re-measure go. *Rejected:* reshaping it now to survivors × stage.

**D58 — During the revamp the loop ships only ratified revamp phases and
creates no content.** (T, ballot.) `/march` runs R-phases plus fix-ci and
critique. The six content stewards, `card-expert`, `mechanics-expert`,
`reader`, `content-curator`, `brainstorm-mechanics`, the three spec skills
and the kb-query skill are archived; every core verb is kept and its
doctrine fixed; only `ci-autofix` changes among the workflows. Scout and
playtester stay. *Rejected:* staying paused for the whole revamp; the full
loop with stewards; a slimmed verb set; a single dispatcher workflow.

**D59 — The enemy revamp adds an Act Boss type and four placement tiers.**
(T: "Normal enemies scattered; Elite enemies scattered, but fewer than
normal; Region Bosses (block region completion); Act Bosses (block act
completion)".) Phase B2. Overturns D30 ("Act 1 has no bosses").

**D60 — Mobile: the Deck tab and card art get their own revamp phases; the
app label is the product name.** (T: "Leave as-is for now knowing that I
want to do a Revamp Deck Tab UI phase"; "Map the existing paintings, drop
dead rows, AND … a card art revamp phase"; the launcher label becomes
"Miserere Mei, Deus".) B7, B8; R8 maps placeholder art and sets `expo.name`.

The last three came from the same session: T walked the plan's open calls
(`plan/revamp/README.md` §6) one at a time.

**D61 — Act 1's shape during the reset: the Doorwarden guards every
region's door, the deep stair is sealed, and each region gets an Anvil.**
(T: "Doorwarden ends every region"; "Sealed, like the vault door"; the Anvil
"Re-home to exist once per region (at least for right now, and near the
region exit)".) Float-Eye takes the normal fights and the Brine Hag is a
rarer mid-region fight. The Doorwarden on `bw-17`, `cw-17`, `bc-15` and
the Lantern Deep's column-5 node previews D59's region bosses and overturns
D30 everywhere. The Lantern Deep's deep stair, which led to the purged
fishing-village, is sealed; there is no end-of-run state. The Anvil's only
placement was a fishing-village node (Phase 60); the existing event is
re-homed near each region's exit. *Rejected:* the Doorwarden ending only
Act 1; keeping D30 with the boss unplaced; a terminal end scene; looping
back to the Breakwater; parking or cutting the Anvil.

**D62 — The reset leaves the dev menu alone; a Dev Menu revamp (B10) and a
theme-colour phase (R10) are added.** (T: "Let's go over the Dev Menu as
well …"; after the audit: "Leave it all for the Dev Menu revamp"; the
colours: "Yes, a small phase after the reset".) R-phases touch dev tools
only where a deletion breaks the build; D19 stands until B10. The dev-menu
audit (CI drives six surfaces, not D19's nine; four tools have nothing left
to act on; ten carry dead content) is B10's input. R10 moves the surviving
hard-coded hex colours into `theme/axm.ts` tokens with no visual change.
*Rejected:* a content-driven dev-menu cut in R8 (amending D19); trimming
without cutting; folding colours into B7/B8; skipping them.

**D63 — The plan's other defaults are ruled as drafted.** (T, ballot.) All
11 enemy-keyword systems are deleted, with an optional empty
`Enemy.keywords` kept for B2. Level-up Learn Card is deleted; level-ups give
stat points only. RELENT (PLEA/capitulation) and CONDEMN
(premises/peroration) are both cut; befriend → mercy is the only non-lethal
ending. The hazard reset keeps a minimal playable core. *Rejected:* keeping
the keyword mechanics or a simple subset; keeping or repurposing Learn Card;
keeping RELENT or both dormant; removing only the hazard lies; parking
hazards.

**D64 — THE REVAMP is ratified, in the recommended order; the card process
plan stays unpicked.** (T, 2026-09-28: "ratify the plan … make sure the
card revamp part of this plan acknowledges that we still haven't committed
to a plan, there's 3 potential plans for it, and make sure future agents
know to recommend looking at the html file".) `plan/revamp/` is RATIFIED.
Reset order: R0 (attended) → R1 → R2 → R3 → R4 → R5 → R6 → R7 → B4 → R8 →
R9 → R10. Rebuild order when T is ready: pick the card plan → B1 → B5 → B6
→ B2 (before B6 if Plan C) → B3 → B10 → B7 → B8 → B9. `/march` and
`night` are re-enabled after R0 merges. Until T picks Plan A, B or C,
agents discussing card work recommend T open
`plan/2026-09-27-keyword-card-revamp.summary.html`.

**D65 — The rock/paper/scissors stance layer is removed; card colour, dice
colour, the Color Law and colour match stay.** (T, 2026-09-29: "I want the
rock/paper/scissors aspect of the game gone"; "100% keep dice color and
they are used to power the same color card. This is like the main fun
mechanic"; "I only want the RPS gone"; the stance keywords "should either
be removed or slotted for removal".) Spec 33 retired only the hidden read;
the open stance check (player stance from the last paid card, punish ×1.5 /
yield ×0.5), enemy phase stances and every stance-keyed mechanic, status and
keyword survived. New Phase **R7d** (after R7c, before B4 and R8) deletes
them. The momentum chain's fate is asked at the R7d brief. Colour is a
payment constraint, not a faction: no deck may assume one colour, because
the tray's colours are rolled, not built. *Rejected:* removing the Color Law
with the stance; removing the stance check only and leaving enemy stance
mechanics dormant.

**D66 — `plan/archive/` leaves the tree.** (T, ballot, 2026-09-29.) The
archive teaches the pre-revamp game and nothing stops an agent reading it.
R10b tags the pre-removal commit `archive-pre-revamp`, deletes
`plan/archive/` from main and fixes every live pointer; history is read
through the tag only when T asks. *Rejected:* keeping it behind a read-ban
rule; keeping it as is.

**D67 — Two reset phases own doctrine and truth, and gate RC.** (T,
ballot, 2026-09-29: "I thought we already did a cleanup of code comments
and doc inconsistencies … we'll need a follow-up phase".) The 2026-09-23
pass (#363, #364) skipped mobile comments and bannered six docs instead of
rewriting them, and no revamp phase rewrote doctrine. **R10b** rewrites
spec.md and bearings, adds `docs/game-model.md`, retires specs 33/34, sweeps
the plan queues, removes the archive (D66) and extends `check-lexicon`.
**R10c** (two ticks) rewrites the bannered docs, strips history from code
comments, puts every rule of play in a live doc, and adds a comment guard.
Both run after R10 and are required by RC. Part plan:
`plan/revamp/doctrine.md`. *Rejected:* running R10b now; folding the work
into each R-phase.

**D68 — Relics open lanes.** (T, 2026-09-29: "relics open lanes.
Whichever relics a player has equipped will dictate the reward pool for
combat rewards. Card rewards outside of combat are not effected by
relics.") The equipped relics decide which lanes feed the combat card
reward pool; non-combat card rewards ignore relics. How a relic names its
lanes, the run-start lane and the reward slot mix are still open
(`plan/revamp/cards.md` → Deck model). *Rejected:* stat thresholds
opening lanes (a stat choice could lock a player out of a pool).

**D69 — Five card types; EXILE is a keyword.** (T, ballot, 2026-09-29.)
A type is a lifecycle rule. Types: Attack, Skill, Spell (play, then
discard), **Global** (stays in play, affects the whole combat) and
**Curse** (a dead card with negative effects that stays in hand;
discarding it costs the player, playing it PAID exiles it but hurts the
player). **EXILE** is a shared keyword on a line meaning the card leaves
combat instead of going to discard. Amends D51 (Attack/Skill/Spell
only). Details in `plan/revamp/cards.md` → Card types. *Rejected:* one
base type (Deed); separate on-you / on-foe lasting types (Vow/Anathema,
Oath/Hex); "Wound", "Burden" as the dead-card name; EXILE as a type.

**D70 — Global and Curse rules; the hand carries over.** (T, ballot,
2026-09-29.) A Global's FREE line puts it in play for a few turns and its
PAID line for the rest of combat; any number may be in play but each must
be unique (an experiment); only a card effect removes one. A Curse is a
dead card for now; "While in your hand:" effects may come later. Cards
neither played nor discarded stay in hand for the next round (the
engine's current refill-to-5 rule, kept). *Rejected:* a Global cap of 3 or
1; Curses that tick each turn; never-removable Globals.

**D71 — Lane relics, reward slots, the first Curse, Global duration.**
(T, 2026-09-29.) A relic's detail view shows the lane (or lane family) it
opens. Relics come, for now, from quests (designated rewards) and elites
(a low chance of a random relic). The combat card reward is 2 random
cards and 1 guaranteed lane card; with no lane relic equipped, all 3 are
random. There is no starting relic: the first lane opens with the first
lane relic, replacing the earlier "at run start" answer. A FREE Global lasts 3 turns. Curses carry no extra discard cost
or in-hand effect for now; the first Curse is a grey dead card, FREE:
SACRIFICE 5, PAID: SACRIFICE 10, EXILE. Curses cannot be scrapped. SACRIFICE is a cost paid in VITAE and never
takes the player below 1: a line the player cannot afford cannot be
played. Further Curses come from card
sessions. Detail and open points in `plan/revamp/cards.md` and
`plan/revamp/relics.md`.

**D72 — The checkpoint is scaffolding; R7e strips the parked content.**
(T, attended ballot, 2026-09-30: RC is "engine and UI scaffolding. No
cards or relics yet (other than the starters), no real story implemented,
no content. Just a good starting point in case another revamp is due.")

- The parked world's content is deleted: northern-forest and the northern
  continent, meaning their maps, map events, 13 NPC trees, 9 quests and 7
  shops. The dialogue, shop, quest and equipment plumbing stays, each
  witnessed by one neutral test fixture.
- Relics shrink to the Suppliant's Ring (The Open Hand, D47). The other ten
  are deleted. This is the checkpoint floor only: D71's lane relics (no
  starting lane relic) still govern B1.
- The Labyrinth stays parked and untouched (unchanged from D54).
- Act 1 keeps all four regions and its prose, as the scaffold's test bed.

New loop phase **R7e** (after R7d, before B4 and R8; RC requires it). Part
plan: `plan/revamp/content-strip.md`.

*Rejected:* keeping the parked world parked; deleting the dialogue, shop
and quest plumbing with the content; deleting the Labyrinth module;
keeping the ten placeholder relics or one per slot; blanking Act 1 prose;
cutting Act 1 to one region.

**D73 — Card process: Plan B, one slice per lane, families of sub-lanes.**
(T, attended ballot, 2026-09-30.)

- **Plan B (Slice first) is ratified** as the card process.
- **One slice = one lane**, built in one build session plus one kill
  session. This replaces Plan B's colour-ordered slices (body, then mind,
  then heart); lanes are colour-free (D65).
- **Lanes group into families.** A relic names a family (D71 allowed this).
  The guaranteed reward card is drawn from any lane in an equipped relic's
  family.
- **The first pool is 3 families × 1 lane** (≈36 cards + grey). More lanes
  join a family later without changing any relic text.
- **Bridge cards join sub-lanes within a family.** They are built at the
  cross-slice session once a family has two or more lanes. The first pool
  therefore has no bridges.
- **Not ratified (reviewed later):** the plans file's §1 session rules
  (verdict words, ballot limits, the sandbox-set rung, the clock, the batch
  sheet, per-slice ledgers).
- **Still open:** the Plan C threat matrix (C1) as briefing material; the
  §7 calls on D8/D20 and progression prototypes; B5's tool shape.
- **A paper rehearsal was requested next:** session 0 and one lane's pitch
  and ballot, recorded as a rehearsal ledger, with nothing wired. THE CARD
  HOLD (D37) and RC's no-content rule both still hold.
- Resolves open calls D71 left: lane granularity (families) and multi-lane
  cards (bridges within a family).

*Rejected:* Plan A (vision first), Plan C (threat first), a slice per
family, keeping colour slices, tight lanes with no families, loose lanes,
one lane per card, free multi-lane tags, bridges across families.

**D74 — Blood Price is the first family: three sub-lanes, 30 cards.**
(T, attended paper rehearsal, 2026-09-30.) Amends D73's first pool.

- The first family is **Blood Price** ("I pay in my own blood for power").
- It has **three sub-lanes of about 10 cards each**: Payoff (benefits for
  sacrificing), Engine (helps trigger SACRIFICE) and Misc (related utility).
  Misc replaced an earlier Heal sub-lane in the same session.
- The first pool target is **30 cards** (3 × 10) plus grey. This replaces
  D73's "3 families × 1 lane" (≈36).
- Bridge cards (within a family, D73) are possible from the start.
- All three sub-lanes are balloted together on one checkbox sheet (T's
  format): 3 tabs × 10 slots × 3 candidates = 90 candidates, with about 30
  surviving.
- Everything stays on paper until B4, B5 and RC.
- Ledger: `plan/card-ledger/rehearsal-blood-price.md`.

*Rejected:* 36 exactly (12 per lane); three separate families for the
first pool; a Heal sub-lane (folded into Misc). The other fantasies (The Vigil, Rot and Omen, Loaded Dice)
stay open, not rejected.

**D75 — RC proves Act 1 works; Blood Price follows as a removable trial set.**
(T, attended, 2026-10-02.)

- RC's walk checks that Act 1 works, not that the grey deck can win it.
  Fights the grey deck cannot win are settled with the dev menu, and the
  report names them. The version is cut there (`plan/revamp/checkpoint.md`).
- After RC, the Blood Price rehearsal's ballot survivors are wired in as a
  **trial set** to test the reward mechanism (D71), the Curse and Global
  types, SACRIFICE, EXILE and a real Act 1 clear. Blood Price may become
  the first lane family; that is judged after play.
- The trial cards must be easy to remove when real lanes arrive: one
  library file, one registration point, no other code naming their ids,
  saves dropping removed ids on load, and a test that the game runs without
  them (`plan/revamp/cards.md` → "The trial set").

*Rejected:* gating RC on a winnable clear with the grey deck.

**D76 — The Act 1 checkpoint is cut.** (T, attended, 2026-10-02.)

- `v0.1.0-checkpoint` is an annotated tag on `9ddba0f8`, published as a
  GitHub release with an EAS preview APK (Android) linked from it.
- The gate passed: local legs and every `verify-*` workflow green, and the
  four-region walk passed with its fixes shipped (`plan/revamp/checkpoint.md`).
  Phase R10d (every tutorial window removed) was added and shipped before the
  tag at T's request.
- Accepted for the tag: the Chronicle empties on reload, the victory and mercy
  panels omit XP and loot, and the grey-deck Momentum chip never activates.
- Reset recipe: `git switch -c <branch> v0.1.0-checkpoint`.
- Next: BT (the Blood Price trial set), R11, and the owner-led B-rows.

**D77 — A weekly performance audit.** (T, attended, 2026-10-10.)

- "Performance" means three things, measured weekly on CI: **web load and
  bundle** (the Expo web export's JS bytes, raw and gzip; time to the
  first screen; LCP and total blocking time in headless Chromium),
  **runtime smoothness** (frame times and long tasks while a scripted
  combat round plays on the web build) and **engine speed** (ms per
  seeded combat in `axiomancer-mechanics`). Game balance is not in it:
  R12 owns that, and there is no balance baseline (D57).
- A breach files a `[perf]` row in `plan/AUDIT.md` (and its issue) for
  `/iterate`. It never fails a check or blocks a merge.
- "Worse" is a budget breach or week-over-week drift. First budgets are
  measured at ship: the median of three runs plus 20% (bytes plus 10%).
  Drift: bundle bytes over 5%, engine speed over 15%, load and runtime
  over 25%, each metric the median of three runs.
- Phase PF1 (`plan/revamp/tooling.md`), ready now; tooling only, no
  content, so revamp mode (D58) lets the loop ship it.

**D78 — v0.2.0 follows the first performance audit.** (T, attended, 2026-10-10.)

- Phase RC2 cuts `v0.2.0` the way RC cut `v0.1.0-checkpoint` (D76): T tags
  it in an attended session, publishes a GitHub release and builds an EAS
  preview APK.
- Gate: PF1 shipped and its first audit landed on main (budgets seeded,
  one history line); open `[perf]` rows do not block. Plus RC's full gate:
  every check green and the Act 1 walk.
- `plan/revamp/checkpoint.md` → "RC2".

**D79 — The colour-match bonus is removed; a die powers its colour, nothing
more.** (T, attended, 2026-10-10: "Scrap everything that mentions a
colour-match bonus. A die MUST match the card colour unless the card colour
is grey, period. This is old game mechanics bleeding through and was
supposed to be removed during the revamp.")

- Overrides D65's "colour match stay[s]" (and the R7d row's "the
  colour-match bonus ... STAY"). A die of the card's own colour no longer adds 25% (minimum +2) to
  PAID numbers or +1 turn to statuses: PAID numbers land as printed, scaled
  by stats, and statuses keep their printed turns, whatever legal die pays.
- The Color Law is unchanged: a die powers a card when the card is grey
  (`any`), the die is gold, or the colours match; a mismatch cannot be used.
  The gold (wild) die stays wild (T confirmed).
- The engine's `colorMatchBonus`, `COLOR_MATCH_BONUS_*` and
  `COLOR_MATCH_STATUS_DURATION_BONUS` are deleted, with every preview and
  card line that printed the bonus. The lexicon registry retires the term
  (`colour-match-bonus`) so live docs cannot bring it back.

**D80 — Blood Price is the live trial set: 30 cards, six keywords, printed
numbers.** (T, attended, 2026-10-10 and 2026-10-11; Phase BT.)

- **The cards (T, 2026-10-11).** Kept from the rehearsal ballot: P-01a
  P-02a P-03a P-04c P-05b P-06d P-07b P-08d P-09b P-10c · E-01a E-02d E-03d
  E-04c E-05c E-06b E-07b E-08b E-09c E-10d · M-01d M-02b M-03d M-04c M-05b
  M-06c M-07a M-08d M-09a M-10a (11 red, 9 blue, 10 purple), plus the grey
  Curse the E-01 cards add. All eight purple "d" drafts added on 2026-10-10
  are among them; every other proposal is cut. Colour is the
  card's aspect: body red, mind blue, heart purple.
- **The test deck (T, 2026-10-11):** E-09c P-03a M-04c M-02b E-06b P-02a
  E-04c E-05c M-09a M-06c P-05b M-07a E-03d M-01d M-08d E-08b M-05b E-07b
  M-10a P-10c. It is the Blood Price lane's `testDeck`; the lane's cards
  are the 30.
- **The keywords:** SACRIFICE, WAIVE, EXILE, HEAL, TETHER and LEECH, with
  the Global and Curse card types (D69–D71), all live with carriers (D45).
- **Rulings (T, 2026-10-10).** "The foe loses n" is a plain, unscaled VITAE
  loss, not a DEAL (VULNERABLE does not apply). HEAL is a card keyword,
  mind-scaled and capped at max VITAE; "heal the damage dealt" heals the
  amount actually dealt, unscaled. A SACRIFICE that fires n times counts as
  n. WAIVE: your next SACRIFICE this turn costs no VITAE but still counts.
  "Play a Curse at no VITAE cost" is a WAIVED SACRIFICE. E-08c's PAID line
  played the Curse's PAID line (EXILED), waived; the kept E-05c PAID line
  plays a Curse the same way. TETHER n: for n turns, each SACRIFICE x makes
  the foe take DEAL x (x unscaled; VULNERABLE multiplies). LEECH n: at the
  start of the foe's turn the foe loses n VITAE, you HEAL the amount lost,
  then n drops by 1; n is heart-scaled when applied and a second LEECH
  adds. The Color Law stands with no colour-match bonus (D79).
- **Numbers:** the ballot's printed (pass-0) numbers. No tuning.
- **Removable (D75):** one library file (`Cards/library/blood-price.cards.ts`),
  one `TRIAL_SETS` line in `cards.library.ts`, no other code naming a
  trial id (a test greps for it), saves drop removed ids on load, and a test
  runs the game with the set emptied. The engine pieces (card programs:
  Global, Curse, SACRIFICE, WAIVE, EXILE, HEAL, TETHER, LEECH) are general
  systems that stay.

*Not in BT:* the lane relic naming the family and the 2-random + 1-lane
combat reward (D71). The post-fight draft still draws uniformly from the
whole library (Curses excluded), narrowed only by the dev REWARD POOL.

**D81 — Blood Price revision 2: the Curse cards out, five SACRIFICE cards
in, LEECH stacks, the Bleeding Signet.** (T, attended, 2026-10-11; Phase
BT1. T approved every card and relic change; THE CARD HOLD, D37, is
satisfied for exactly these.)

- **Cards.** Cut: E-01a, E-05c, E-08b, M-04c, E-09c (every card that needed
  a Curse). Added in their slots, placeholder names: Bloodletting (E-01n),
  Open Vein (E-05n), Blood for Blood (E-08n), Crimson Pact (E-09n, a 🩸
  Global: your next DEAL this turn deals +n) and Transfusion (M-04n). Buffs:
  P-01a, P-02a, P-09b, E-06b, P-05b (numbers only, costs unchanged). M-08d
  becomes 🩸 LEECH 1; E-03d's LEECH drops to 1. The lane is 30 cards (11
  red, 8 blue, 11 purple). The grey Curse stays defined for foes to add
  later and sits in no lane, deck or reward pool. The full list, the new
  test deck and each card's role are in
  `plan/card-ledger/rehearsal-blood-price.md` → "Revision 2".
- **LEECH is a stacking debuff (replaces D80's decaying LEECH).** Each LEECH
  n adds 3 turns and adds n (heart-scaled when applied) to its potency, the
  first included. Each foe turn the foe loses the potency (plain loss, not
  a DEAL), you heal what it lost, and a turn ticks off; the potency never
  decays and resets when the turns run out.
- **Crimson Pact's +n** is unscaled, stacks across SACRIFICES, goes to the
  next DEAL (TETHER's hit is a DEAL, D80, so it takes it) and expires at the
  end of the turn.
- **The Bleeding Signet** (placeholder): +20 max VITAE while worn, through
  the relic `maxHp` line; it grants **Crimson Covenant** (4 Conviction:
  TETHER 3, and your next SACRIFICE this turn counts twice: paid once, each
  instance firing TETHER and the 🩸 Globals). No shop, loot or reward
  carries it yet.
- **A second signet.** Relics are accessories and a character already
  wears three (`SLOT_CAPACITY.accessory`), so the Ring and the Signet are
  worn together and the signature bar lists both. No new slot or save
  migration was needed; existing saves keep two empty trinket positions.
- **Dev menu:** GET ALL RELICS adds every relic the player does not own.
- **Fight-length target (T):** Float-Eye about 3 player turns, Brine Hag
  about 5, the Doorwarden about 7.
- **Pacing finding.** The sim fought the authored foe VITAE while the app
  doubles every live foe (`ENCOUNTER_ENEMY_HP_MULTIPLIER`), which is why it
  said 3-4 turns for Float-Eye against T's 8-9: at live VITAE the old test
  deck takes 5.9 turns in the sim. The rest is play rate: the witness
  plays about 4.75 cards a turn, and T's pace matches a player who plays
  about two. The knob now lives in the engine
  (`LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER`), the app reads it, and the pacing
  sim (`npm run lane-pacing`) applies it. The new test deck at live VITAE
  (200 runs a cell): Float-Eye 2.8-3.3 turns, Brine Hag 4.8-5.7 (most wins
  are mercy; 5.1-6.0 as kills), the Doorwarden 4.4-5.3 with 66-94% wins.
- **Proposed, not applied (T approves later).** Float-Eye and Brine Hag
  are on target. The Doorwarden fight ends on turn 5-6 either way, because
  the boss's escalation clock kills the player by then; trimming the
  SACRIFICE ramp (Open Vein PAID LEECH 2→1 and TETHER 3→2, E-02d PAID
  TETHER 2→1 with two SACRIFICES, P-08d PAID TETHER 3→2, E-10d and Blood
  for Blood max X 8) with more sustain (Transfusion HEAL 10/20, M-09a HEAL
  6/18, P-02a GUARD 10/22) moved it only to 5.0-5.7 turns. A 7-turn
  Doorwarden needs a ruling on the foe side (its escalation or VITAE), not
  card numbers.

**D82 — The Doorwarden's slower ramp: a ~7-turn boss fight.** (T, attended, 2026-10-11.)

- Fight-length targets at T's pace (4+ cards a turn): Float-Eye about 3
  turns, Brine Hag about 5, the Doorwarden about 7. Card numbers could not
  reach 7 against the Doorwarden: its ramp (the boss escalation clock at x2
  from round 4, tier 3 from round 6) ended fights by turn 5-6.
- T chose to slow its ramp and raise its VITAE to match. Applied (only the
  Doorwarden changes): `vitae` 220 -> 320; its deck's `tier2AtRound` 4 and
  `tier3AtRound` 7; damage weights Litany of Thresholds 1.3 -> 1.1, The
  Door You Kept Open 1.35 -> 0.95, The Bronze Frame 1.45 -> 0.9, The
  Margin Note 1.15 -> 0.8, What Shuts 1.6 -> 1.05, The Proof 1.6 -> 1.15,
  The Question 1.4 -> 0.95. Tier 3 still out-hits tier 1.
- Measured with the Blood Price test deck at live VITAE (200 runs, bot and
  human-like drivers, player L1/3/5 vs door 1/3/4): 6.5 / 7.5 / 7.6 turns,
  wins 66-89%. The grey starter deck still never beats it.
- The lane pacing CLI now builds every foe the way live play does (map
  pin via `scaleEnemyToLevel`, then the live x2), and a test pins it to
  `resolveEncounter`. At live pins Float-Eye runs about 3.6 turns and Brine
  Hag about 4-4.5 (mostly spared); neither was retuned.

**D83 — v0.2.0 is cut.** (T, attended, 2026-10-11.)

- `v0.2.0` is an annotated tag on `eb75f451`, published as a GitHub release.
  T skipped the EAS build from the tag ("I got one already from this
  morning").
- The gate passed: the root tests, both workspace verify gates, the content
  lints and the verify-* workflows were green on that commit, and the
  four-region walk (Blood Price test deck, honest fights, a dev quick-win only
  when stuck) found no crash or dead end (`plan/revamp/checkpoint.md` → "RC2").
- T accepted four rules/interaction bugs for the tag and filed them (P-07b's
  cap, a die lost on an unplayable staged card, Scarred never clearing,
  SACRIFICE "any amount" not prompting).

**D84 — Loop PRs: scope.** (T, attended, 2026-10-12, R11 ballot a.)

- A loop tick whose diff touches anything outside `plan/`, `telemetry/`, `docs/reports/` and `devlog/entries/` (the `/digest` entry; T, same session) lands through a PR onto `main`.
- Plan-only and telemetry commits keep pushing `main` directly, so plan queues never conflict across PRs.

**D85 — Loop PRs: at most 3 open.** (T, attended, 2026-10-12, R11 ballot b.)

- At 3 open `loop:pr` PRs, `/march` runs triage and critique's audit pass only and reports "waiting on T: PRs #a, #b, #c".
- **Amended via /oversight 2026-10-17 (T):** the cap is 5, not 3. R11 watch: ~20 of 71 march ticks since 2026-10-11 picked nothing, mostly at the cap with PRs waiting on T.
- An open `loop:pr` PR is the claim on its row or queue item.

**D86 — T merges loop PRs by hand.** (T, attended, 2026-10-12, R11 ballot c.)

- No auto-merge. A PR open 7 days is flagged in the tick's report, never closed by the loop.

**D87 — A Haiku fixer keeps loop PRs green.** (T, attended, 2026-10-12, R11 ballot d.)

- `pr-autofix` runs `/fix-ci --branch` on Haiku per red `verify-*` run, at most two runs per PR; then label `loop:pr-stuck`, reported each tick.
- `pr-resolve` merges `main` into conflicting `loop:pr` PRs on every push to `main`; append-only files settle by union, the rest by a Haiku Read/Edit run.

**D88 — Content per surface.** (T, attended, 2026-10-12, R11 ballot e; supersedes the content side of D58.)

- ~~Cards, keywords and art stay owner-only (D37, B8).~~ *Superseded by D99 (T, 2026-10-22): they build from a T-approved brief like the line below.*
- Enemies, relics, maps, NPCs and events: the loop may propose them (`/expand` candidates) and may build them only from a build-plan row whose brief T wrote or approved (`/plot`, attended `/plan-a-phase`, or `/oversight` promotion). A proposal is never built until promoted.

**D89 — `/expand` stays bold.** (T, attended, 2026-10-12, R11 ballot f; overrides the brief's "strict" default.)

- `/expand` keeps proposing from every signal source, design surfaces included. Its rows are candidates; only `/oversight` or `/plot` promote them, and D88 governs what may be built.

**D90 — `/iterate` fixes in-tick defects.** (T, attended, 2026-10-12, R11 ballot g.)

- `/iterate` still picks AUDIT/CRITIQUE rows by score. A defect found while shipping is fixed in the same tick in its own commit, never parked.

**D91 — One card face, everywhere.** (T, attended, 2026-10-13, from the BT2 prototypes.)

- Every card face, small and large (hand, staged, drag ghost, reward offer, card detail, reward preview), wears the same design; reference `axiomancer-mobile/screenshots/bt2-prototype/1-board.jpg`.
- Top-left corner: a pill on the card's corner with the FREE glyph in the card's colour and the FREE value in white; no pill when the card has no FREE line.
- Name: one line, never wrapped; in the fan it runs on under the next card.
- Art: seamless, edge to edge; no mat, no frame, no rules above or below it.
- Bottom: one line, the die cube then the PAID effect (`[family glyph] KEYWORD value`); no FREE cell, never stacked, so every card's PAID line sits at the same height.
- No rarity pip track on any face. A large face still prints the rarity word and the full rules text, since it has the room.
- Implemented by Phase BT2a (`plan/phases/phase_BT2a_card_face.md`). A later card-face change needs T's say-so, like a card change (D37).

**D92 — The combat board layout.** (T, attended, 2026-10-13, layout B from the BT2 prototypes.)

- Bottom: a footer dock, left to right: a small round player avatar (tap opens the pilgrim modal); the VITAE column (value / max with the deck and discard piles beside it, a fill bar that turns blood below 25%, the phase ledger under it); a wide END button in thumb reach.
- No corner medallions: the hand fans across the full board width.
- Top: the foe's name and VITAE bar; its intent and its status chips sit top-left under the name; the conviction and signature column starts under the intent, with room for 5 signatures above the dice.
- LOG is not on the board; it opens from the pilgrim modal and returns with BACK.
- Reference: `axiomancer-mobile/screenshots/bt2-prototype/` (`1-board.jpg`, `2-pilgrim-modal.jpg`, `3-log-view.jpg`). Implemented by Phase BT2b (`plan/phases/phase_BT2b_board_layout.md`). A later layout change needs T's say-so.

**D93 — `/plot` splits a task into phases and lands it by PR.** (T, attended, 2026-10-14; amends D84 for `/plot` only.)

- `/plot` writes one spec brief per task and itself decides how many phases it takes: each phase must ship as one `/march` tick, so anything bigger is split into vertical slices (`<N>a`, `<N>b`, …), each with its own build-plan row pointing at `§ <id>` of the shared brief, its own acceptance IDs and `Requires` order. Modelled on the `hunt` repo's spec-and-chunks `/plot`.
- `/plot` opens a PR labelled `plot` (never `loop:pr`: outside the D85 cap, not a claim) instead of pushing `main`, so T reads the recommendation first; the rows become pickable when T merges it. `pr-resolve` keeps `plot` PRs mergeable (D87).

**D94 — T's moves are never lessons.** (T, attended, 2026-10-14; amends R11's retro, made during the R11 watch at T's word.)

- The retro first asks whose move the fix is. One only T can make (rotate or renew a token or secret, finish an OAuth, a console click, a tool on T's machine) goes to `plan/NEEDS_T.md`, not `plan/lessons.md`: it never climbs the 2× ladder, never becomes a `PHASE_CANDIDATES` automation row, and the loop ships no code to work around it. Ticks bump its `seen` and use its workaround; every `/march` tick lists the open rows; `/oversight` asks about them first; T clears a row by deleting it.
- `scripts/check-lessons.mjs` lints the new file and refuses a lesson whose rule hands the fix to T ("T to …") or a slug in both files.
- First move: `env-token-stale` (the `.env` `GH_TOKEN` returning 401) leaves `lessons.md`; its 401-retry candidate is dropped and the keyring-loader candidate narrowed to the worktree case (`worktree-no-env`), which is the loop's.

**D95 — Every PR but a plan merges on a green adversarial review.** (T, attended, 2026-10-20; amends D86. Ratified in session, ahead of the Part 4 shadow table the RV1 brief had made the trigger: T's call.)

- Every same-repo PR is reviewed (`pr-review.yml` job `review`, `skills/review.md`), not only `loop:pr` and `plot`. The review is a fan-out of Sonnet sub-agents from a manifest `scripts/pr-partition.mjs` derives from the diff: one reader per module of changed source, owning its files and their importers and told what not to report, capped by tier (2 / 3 / 6), each read by two readers with different questions (logic: the module's ledger defect class; seams: consumers, contracts, trust and environment), plus the Tests lens and, on medium and high, a control adversary that reads the whole diff. A PR gets at most two automated passes: the first merges or holds; on a `not-pass` the `fix` job (a run that is not the reviewer, `skills/review-fix.md`, once per PR) fixes the HIGH rows on the branch and pushes, which is the second pass; a second `not-pass` labels the PR `review:exhausted` and it waits for T. A PR that changes the review pipeline itself (`PIPELINE_PATHS` in `scripts/pr-merge.mjs`) is never merged or fixed by the jobs: T merges it. The verdict names its reader count and overlap (`<!-- pr-review:readers <n> overlap <k> -->`), so `docs/reports/eval/partition-replay.md` can tell whether the partition finds more than one reader does.
- A PR merges when its review is complete and green: the `merge` job (a plain runner, no model, `scripts/pr-merge.mjs decide`) merges once this run's verdict for the exact head is `pass`, GitHub reports the PR `CLEAN`, and no hold applies. The job's own gate is the head's `verify-gate` check run, read from the commit's check runs (never a comment: the #529 lesson); then it runs `gh pr merge --auto --merge --match-head-commit` and posts an audit comment (`<!-- pr-merge:auto -->`). The ruleset (a required `verify-gate`, active) binds every actor but T, who stays on its bypass list because the loop's plan-only, telemetry and `fix-ci` pushes go straight to `main` on T's token and have no PR to earn the check on.
- **A plan PR is never merged by the job:** label `plot` or `review:plan-only`, or a title that starts `plot:` or `plan:`. T merges plans by hand, as D93 intends. Also held for T: `review:needs-T`, `loop:pr-stuck`, `eval:seed`, `no-auto-merge`, drafts, forks, and a `not-pass`. There is no daily limit: a cap of 12 auto-merges in 24 hours arrived in code with D95 but was never ruled, held PR #725, and was removed in phase RV4 (T, 2026-10-21); the job's 24-hour count stays in its pass reason, and D85's open-PR cap bounds what is in flight. The kill switch is the repository variable `PR_AUTO_MERGE=off`.
- The reviewer itself still cannot merge, close, push or commit; the only writer of a verdict marker is `skills/review.md`, run from `main`'s copy. A PR open 7 days is still flagged, never closed (D86's second line stands). `scripts/loop-pr.test.mjs` pins all of it.

**D99 — The card hold is lifted: cards, keywords and art are ordinary content.** (T, attended, 2026-10-22; supersedes D37 and the owner-only bullet of D88. T: "Remove that rule. I never explicitly wanted that rule.")

- Cards, keywords and art join enemies, relics, maps, NPCs and events under D88: the loop may build them only from a build-plan row whose brief T wrote or approved (`/plot`, attended `/plan-a-phase`, or `/oversight` promotion).
- The loop still never invents card, keyword or art content unprompted: `/expand` may only propose candidates, as for other content, and a proposal is never built until promoted.
- Unchanged: `Potential Assets/` is a store, never a source (D96); a sprite sheet for an already-used enemy stays enhancement (D97). First use: a `/plot` phase renaming the Blood Price cards.

**D107 — The reward pool is the starting lanes plus the worn relics' lanes; grey is never a reward lane.** (T, 2026-10-26, in session, from the character-selection `/pitch` still in progress; recorded by the RW1a/LR1a plot amend, run unattended. Amends D104. D106 is taken by the open chapters plot.)

- The reward pool is the character's two starting lanes plus the lane of every worn relic. Worn relics also weight the offer toward their lane (D100's slots, RW1a A3). Unequipping a relic removes its lane from the pool.
- A carried, unworn relic does nothing for the pool. This replaces D104's "a lane unlocks the moment one of its relics is in the inventory, equipped or not".
- The grey starter cards are not a lane and are never offered as card rewards.
- Stopgap until character selection exists (it waits on T plotting a third lane): the pool is the worn relics' lanes only. When it is empty (no lane relic worn), the reward falls back to grey cards (confirmed by T, 2026-10-26). The starting lanes join the pool when character selection lands, and the fallback is then deleted: every run starts at character select, so the pool is never empty.
- Built by Phase RW1a (`plan/phases/phase_RW1_reward_rule.md`); the relic detail line reads "Lane: <lane> (while worn)" (Phase LR1a).

**D108 — Each run opens as a character; the reward pool is its two starting lanes plus the worn relics' lanes.** (T, 2026-10-26, the character-selection `/pitch`; recorded by the CH1 plot, run unattended. Overrides D104's carry-to-unlock rule; builds on D107, PR #944, open at the time. D106 and D107 are taken by the open chapters and RW1a/LR1a plots.)

- The player picks a character at run start. Each character has a unique portrait, a starting relic that starts equipped, a starting stat allocation, two starting lanes different from its relic's lane, and a one-line playstyle.
- The reward pool is the character's two starting lanes plus the lane of every worn relic. Worn relics weight the offer toward their lane (D100's slots); starting lanes widen the pool and add no guaranteed slot. Unequipping a relic removes its lane, the starting relic included. A carried, unworn relic does nothing.
- Grey starter cards are not a lane and are never offered as rewards. Once the first character goes live, every run starts at character select, so the pool is never empty and D107's grey fallback is deleted; a save made before characters cannot be continued and is offered for deletion (T, 2026-10-26).
- A character starts with Blow 3 / Ward 2 / Word 2 plus one card from each of its three lanes (no Spell or Global), and its stats total 15 (T, 2026-10-26).
- The select screen is a fighting-game character select: a two-row carousel of squares at the bottom, locked squares a question-mark icon; the portrait and the starting relic are its two focal elements, then stats and the playstyle; the starting lanes are never named.
- Portraits, relics, stat spreads and playstyle lines are T's content (D88). The first character is due 2026-10-26 (T); three for December. Character content waits on at least one new lane, because a character needs three distinct lanes; T plans two new lanes before a character goes live.
- Built by Phase CH1 (`plan/phases/phase_CH1_character_select.md`).

**D113 — The player walks the roads; completed nodes can be revisited.** (T, 2026-10-28, attended `/plot`. Amends the gauntlet frontier rule documented on `MapDefinition.traversal`.)

- On a gauntlet map the player moves only to nodes joined by an open road to the node they stand on, new or completed alike; roads read both ways. Frontier jumping ends.
- A completed node re-entered does nothing (fights, hazards, rest, loot caches, cutscenes); a village, a travel node and a quest node act on every entry; an elite a rest revived (ER1) fights again.
- Held roads and quest locks still gate routing; the boss is forced by routing, not by an exhausted frontier.
- Built by Phase WR1 (`plan/phases/phase_WR1_walk_the_roads.md`).

**D112 — The overworld has eight node kinds.** (T, 2026-10-28, in an attended session; recorded by the NK1 plot. Amends D111's "ninth kind": the count is now eight.)

- The kinds are encounter, hazard, rest, loot cache, cutscene, quest (D111), village and travel, plus the empty waypoint (a node with no event) and the labyrinth door, kept but placed on no overworld map until the labyrinth returns (T: "I think the Labyrinth will eventually be act 2").
- Gathering, interaction and narration are removed (T: "I doubt we'll need that many").
- The village is one node with three counters: a paid rest, a shop that sells cards and removes a card for a fee, and the Anvil (T: "'shop' and 'anvil' don't exist. Together, they make up the 'village' event node"). There is no standalone Anvil node.
- Travel is a choice, "move to X?", with flavor text and art, leading to another map or to a node on the same map; a same-map pair is a secret path the player can take both ways, and nothing on the map shows where it leads (T: "Leave it up to the player to learn and remember").
- Each kind's full treatment (art, transitions, copy, animation) is pitched and plotted one kind at a time: encounter, hazard, rest and quest before the Nov 16 MVP, travel, village, loot cache and cutscene by v0.3 (T, 2026-10-28; `plan/deadlines.md`).
- Built by Phase NK1 (`plan/phases/phase_NK1_node_kind_cleanup.md`).

**D111 — Chapter 1 has one questline, on a ninth node kind.** (T, 2026-10-27, in an attended session; recorded by the QL1 plot, run unattended on T's word; amended 2026-10-28 with T's answers to the plot's open items. Supersedes LR1f's scope: four quests, one per Act 1 region, given by existing map events.)

- Chapter 1 (the Breakwater, D106) carries one questline of four steps. The other quest relics (the Ruby Signet, the Bleeding Signet, the Elementalist's Brooch, and the Defender's Carapace Belt) stay quest rewards for Chapters 2-4's quest lines.
- A quest is given by its own node kind, `quest`, with its own map icon and screen: the Breakwater's ninth kind (its eight of 2026-10-26 plus `quest`), and part of the event-node UI/UX pitch.
- Four steps on four quest nodes, done in order (T, 2026-10-27, restructured the same day): the first node offers step 1, each later node turns in the step before it and offers the next, and the fourth step is beating the Chapter 1 boss, paid on that victory. Requirements are kills of any foe, kills of elites, hazards crossed and the boss, counted only from when the player accepts the step. The questline cannot be left unfinished: the map's routing puts every quest node and the boss before the river bridge, and a test proves it. A step asking for more than the map holds is an authoring failure caught by a test, never a runtime fallback.
- Each step pays XP plus exactly one extra: shillings, a card reward or a consumable; the fourth also pays the Elementalist's Belt (`relicSource: 'quest'`).
- Routing keeps the questline whole (T, 2026-10-28). The next quest node is locked until the current step's requirement is met ("Lock the subsequent quest node until the quest is met"). Any node may move so that each step's foes and hazards lie in a pocket reachable only through that step's own node, which a test checks strictly ("We can move around all the nodes whenever we need to"). Each pocket also holds one spare beyond its step's goal, re-pointing existing nodes only (T, 2026-10-28), so a modest count change needs no map edit. The bridge is held by routing, not by sealed roads ("Sealed roads but ONLY if we can't figure it out through new map routing"): a fight that is fled or lost does not complete its node ("if they flee a fight, doesn't complete the node"), and a map may list nodes that open their roads only once spent. Blocked roads remain only as the quest-node locks.
- A lost or fled boss fight leaves the boss's node incomplete and step 4 open, and the player can fight again in the same run (T, 2026-10-28). T's death rule, plot DY1 (merged), not built by QL1 (T, 2026-10-28): "If a player dies in a fight, they come back with 1 HP and a 'dying' status. If they die again, it's game over. Resting removes the status." After the first death the player returns to the spot before they triggered the fight (or hazard), and that node stays incomplete so it can be retried. QL1's boss retry (phase QL1g) requires DY1b. A save made before QL1 is abandoned for a new run, not migrated (T, 2026-10-28).
- The quest line and the giver's copy are T's (D88), written on Nov 10 and in the game for the Nov 16 MVP.
- Built by Phase QL1 (`plan/phases/phase_QL1_breakwater_questline.md`).

**D110 — A card's colour is only which die pays for it; THORNS scales with Heart.** (T, attended, 2026-10-26; amends D40's last clause and T's 2026-10-13 card-spec ruling. T: "A card's colour is ONLY what die pays for them and is not categorized otherwise. This means for lane-creator, don't have it pitch a color for the cards. Instead, I pick the cards, then afterwards, it can split the colors up evenly." And: "We can move THORNS to heart.")

- A card's colour says which die pays for it (the Color Law, D65) and nothing else. It is not read from the card's text, its keyword or its job.
- Stat scaling stays on the keyword (D40): each keyword scales with its family's stat whatever the card's colour. A GUARD on a red card scales with Mind.
- A family's colours are a budget, split evenly across its kept lane cards after T picks them (lane-creator step 7), so a specialist deck still spans the three colours a rolled tray needs. Ballots pitch no colour (phase CL1).
- THORNS (the Defender, not yet built) scales with Heart: it sits on you, but what it does lands on the foe. A repeating amount, so at half rate (D41).
- *Rejected:* colour by job (BV3's `JOB_COLORS`, which clusters a specialist lane into one or two colours); sub-kinds of utility; lane cards colourless (it removes the tray's choice and reopens D65).

**D109 — No caps on cards.** (T, attended, 2026-10-26. T: "remove the "(max +n)" from every card. If there should be a max, I'll call it out.")

- No card line prints or applies a cap ("max n", "max +n", "capped"): an amount that grows with something grows without limit, as D41 already has the stat formula. A cap exists only where T calls one out.
- Not a cap: the SACRIFICE floor (a payment always leaves 1 VITAE) and "max VITAE" (a stat).
- The SACRIFICE X caps stay: Blood for Blood (12, +3 per upgrade) and Name Your Price (21) (T, 2026-10-26: "Sacrifice caps stay").
- Paper landed in PR #958 (the Defender ballot, `/lane-creator` pitches none); the live library is phase NC1.

**D106 — Each region is a chapter: Act 1 is four chapters, Breakwater first.** (T, 2026-10-26, in the Claude Duet channel; amends D23, D27 and D28. T: "All 4 regions combined is Act 1 and the deadline is the end of the year. Act 1 Chapter 1 completed is the mid November deadline. Each region is: Act x Chapter y (With the caveat that later acts may revisit certain regions if the story requires it)". T confirmed the order and the Nov 16 scope the same day: "Yes that's all correct".)

- A region is named "Act X, Chapter Y". Act 1 is the four D23 regions in D23's order: Chapter 1 the Breakwater, Chapter 2 the Charcoal Wood, Chapter 3 the Beacon Crags, Chapter 4 the Lantern Deep.
- A later act may revisit a region when the story needs it; a region is not owned by one act.
- Deadlines (`plan/deadlines.md`): Act 1 Chapter 1 complete by the Nov 16 MVP (its real enemies, the lane relics, item icons and the event-node UI/UX for the Breakwater's kinds); all of Act 1 by v0.3 on Dec 28, including the enemies and enemy art of Chapters 2-4.
- Unchanged: D23's order, D27's start on the coast (Chapter 1's first node), D28's continents and node-id prefixes.
- The Breakwater's watchtower fight (`bw-17`) is Chapter 1's boss, B2's "region boss" tier (T, 2026-10-26: "Chapter 1 boss").
- Act 1's Act Boss sits at the end of the Lantern Deep, Chapter 4 (T, 2026-10-26: "Yes, end of Ch4").

**D105 — Three kinds of slot: one Weapon, one Armor, three Relic slots.** (T, 2026-10-25, in session; recorded by the EQ2 plot, run unattended. T: "There are only 3 types of slots: Weapon (top), Armor (2nd from top), 3x relics. Relics can be named anything, but ultimately they all take up the same 3 relic slots.")

- A character wears one weapon, one armor and up to three relics. Every screen lists them in that order: Weapon first, Armor second, then the three relic slots.
- Any relic fits any relic slot, whatever it is called (a ring, a brooch, a belt, a circlet). The accessory kinds (head, hands, feet, amulet, ring, charm) carry no rule and are retired; the engine's `accessory` slot becomes `relic`.
- At most three relics are worn, so D100's "all 5 relics of a lane" row is out of reach unless weapon and armor can be lane pieces (the EQ2 plot's call 2 and 3, defaults: they cannot, and D100 is left as written).
- T, 2026-10-26, on call 3: weapons and armor still grant no lane, "but they could still help by completing a set, which could help the player with set bonuses including but not limited to increasing the 2 lane-specific rewards to 3 lane-specific rewards". How the top row becomes reachable is Phase SB1's (set bonuses, T's attended design session, `plan/phases/phase_SB1_set_bonuses.md`), not B1's.
- Built by Phase EQ2 (`plan/phases/phase_EQ2_equipment_slots.md`).

**D104 — Every card reward follows the relic lanes; a carried lane relic unlocks its lane.** (T, 2026-10-24, the Elementalist swarm `/messy`; recorded by the RW1 plot, 2026-10-25. Amends D68 and D71; D100's table stands.)

- "Random" means drawn from every lane the player has unlocked. The grey office is always unlocked; a lane unlocks the moment one of its relics is in the inventory, equipped or not (D71 said the first lane opens with the first lane relic equipped).
- The lane slots are counted from equipped relics, as D100 says: one equipped gives 2 random + 1 lane card; three of one lane give 1 random + 2 lane cards.
- The rule applies to every card reward, the cache included (T answered the cache question with the rule itself). This supersedes D68's "card rewards outside of combat are not affected by relics".
- Duplicates are allowed: "no owned card re-offered" was withdrawn the same day.
- Built by Phase RW1 (`plan/phases/phase_RW1_reward_rule.md`).
- **Amended by D107 (T, 2026-10-26):** the carry rule above is replaced; only worn relics put their lane in the pool, and grey is offered only when the pool is empty.

**D103 — A Spell's PAID line exiles, and is stronger for it.** (T, attended, 2026-10-24; amends D69's Spell lifecycle. T: "It should be every spell, all lanes. That's what makes a spell a spell. However, they should be stronger than regular skills so make sure their numbers are higher than their skill counterparts. And set into law that: Spells always end their paid line with EXILE and are always stronger than their skill counterpart (since the exiling of the card is such a downside, we want to make sure it's worth it to pay for it and lose it). For now, their free line does not exile.")

- Every Spell, in every lane (the grey starter's A Plain Word included), ends its PAID line with EXILE. Its FREE line plays and discards, for now.
- A Spell's PAID line is stronger than its skill counterpart: at least one upgrade step (+40%, at least +2; +1 for INTENSITY payoffs) over what the same line would be on a plain discard card. A card-rules guard holds both halves.
- Built by Phase SP1 (`plan/phases/phase_SP1_spell_law.md`).

**D102 — The lane-creator v1 flow is official.** (T, attended, 2026-10-23. T: "I LOVE this process so far so should we make it official? This can be our lane-Creator v1 flow. V2 we can hold off on until we do this process a few more times and see how we can make it better and see if there's more room for automation.")

- The process Blood Price went through and the Elementalist is going through is the lane-creator v1 flow, written down in `docs/lane-creator.md`: Session 0, slot pitches, a 90-candidate ballot on the phone (`axiomancer-ballots.pages.dev`), the verdicts read from D1, sims, revisions, and the trial set by `/plot`.
- T ratified it mid-way through the Elementalist run, before that run's verdicts, instead of waiting for the run to succeed as said on 2026-10-22.
- v2 waits until v1 has run a few more times. Its first candidate (T, 2026-10-23): after a `final` verdict lands, a session records it, runs the sims and opens the trial-set `plot` PR, with T's merge as the gate. B5's skill shape (`plan/revamp/cards.md` §B5) is v2 too.
- Why: T, after the Elementalist Session 0 and ballot: "I LOVE this process so far."

**D101 — Only a `plot` PR waits for T.** (T, attended, 2026-10-23; amends D95's plan-PR bullet. T: "I keep seeing critique PRs getting stuck in review. Can you fix that for me? I really only want plot PRs to need review.")

- A plan PR is now only a PR labelled `plot` or titled `plot:` (`PLAN_LABELS`, `PLAN_TITLE` in `scripts/pr-policy.mjs`). It is still never reviewed on `pull_request` and never merged by the job; T merges it (D93).
- A `review:plan-only` PR (a critique pass, a lesson, a decision record) and a `plan:` title are ordinary PRs: the adversarial review runs and the `merge` job merges on a `pass`, under every D95 hold (kill switch, hold labels, pipeline paths, a green `verify-gate`, a trusted verdict on the exact head). `review:plan-only` stays a reading label only.
- Why: critique passes (#681, #702) waited hours for T's hand with nothing for T to decide.

**D100 — Lane relics stack: 3 of one lane give 2 lane cards, 5 give all 3.** (T, attended, 2026-10-22; amends D71's reward slot mix. T: "If a player equips 3 relics from the same lane, they are offered 2 cards from the reward pool during rewards and if they have all 5 relics of a lane equipped, then all the cards rewards are from that lane.")

- The combat card reward still offers 3 cards. How many are lane cards depends on the most relics the player has equipped from any one lane (a lane is what a relic names: its family, D73):

  | Relics of one lane equipped | Lane cards | Random cards |
  |---|---|---|
  | 0 | 0 | 3 |
  | 1-2 | 1 | 2 |
  | 3-4 | 2 | 1 |
  | 5 (every relic slot: weapon, armor, 3 accessories) | 3 | 0 |

- The extra lane cards come from that lane's pool. The single lane card at 1-2 relics is drawn as D71/D73 say (any lane an equipped relic opens).
- Unchanged: non-combat card rewards ignore relics (D68); there is no starting relic (D71).
- Ratified, not built: the 2 random + 1 lane reward (D71) is itself not yet wired, so this ships with it.
- Note (2026-10-26): with three relic slots (D105) the 5 row is reached, if at all, through a set bonus; T moved that question from B1 to Phase SB1 (`plan/phases/phase_SB1_set_bonuses.md`).

## Open follow-ups

**D1 status at a glance (2026-09-28, after #408).** Card and keyword
creation are excluded here: a separate card agent owns them (D37).

1. **Trim the fat — DONE.** T1–T6 merged (T6 = alignment, philosophy and
   GRACE, `67fd0106`). Left: four `plan/AUDIT.md` debt rows, all
   loop-drainable. They are the T2a finish list, the T2b dice-flag
   content, the T5 Tier 2 docs rewrite, and the trim spec naming
   `mechanics-expert` as a delete candidate.
2. **Map spread — DONE.** M0–M5 merged, and the per-map canvas (M2) took
   the backdrop-anchored renderer (D15) with it. Left: the Act 1
   follow-through in `plan/PHASE_CANDIDATES.md` (score 7.0). It covers the
   Act 1 shop, the kudan XP spike, fishing-village's breakwater lines and a
   default-start reachability test. Old Marrow's unreachable `thanks` also
   belongs here. The Act 1 people sessions are attended
   (`[needs-user-call]`).
3. **Damage scaling — DONE.** S3 (#404), then the purge P1 (#406), the
   keyword audit (#407) and the residue (#408). Left: the post-purge
   `plan/AUDIT.md` rows (the "+2/5%" wrap, the King of Revenge at 0/40,
   WOUNDING with no payload, the Momentum tutorial on dormant colour).
4. **Story-dependent revamp — NOT STARTED, blocked on the story.**
   `content/story/story-overview.md` is still "drafting". The prologue
   is ruled, but the journey after it and the open questions are
   T's, in attended sessions. The non-card parts waiting on it are: map
   progression past Act 1, enemy themes and rosters per map, narration
   and dialogue, and the rows `plan/AUDIT.md` already holds for it (the
   Drowned Parish opening, the legacy `boy-*` threads, the story systems the
   rulings require, and the Act 1 people). The unblocking step is an
   attended story session with T; nothing here is loop-shippable first.

- Audit tick (D1 step 1, D3 scope) — DONE 2026-09-25; keep/cut list and
  sequencing in `plan/2026-09-25-trim-the-fat.spec.md`. **T1–T4 merged
  2026-09-25** (T1 #369, T2a #370 + fix `e073bb6e`, T2a baselines #371,
  T2a residue #372, T2b #373, T3 #374, T4 #375). **T5 merged 2026-09-25**:
  GLYPHS cut #376 (D8), eight commands retired #378 (D10; rebuild `/jot`
  row on main `1fc33003`), Tier 2 docs archive #377, platform icons #379,
  Codex cut #380 (D18). D19/D20 keep the Debug\* tools and die growth.
  **TRIM THE FAT is complete.** Leftover: the `.claude`-cited docs row at
  the top of `plan/AUDIT.md` Pending (profane-canon, specs 10/35).
- Map re-authoring brief (D2) — parameters set by D16 (4 regions, ~20
  nodes/map, spread in all directions). Graph first, backdrop second (D15).
  **Kickoff prompt:** `plan/2026-09-25-map-revamp-kickoff.prompt.md` (phases
  M0–M5; opens with a four-question owner ballot). **Ballot answered
  2026-09-25 as D21–D24.** M0's CI gap was already closed on 2026-08-22
  (`plan/AUDIT.md` contract row, RESOLVED): all of `src/World/**` runs the
  mobile gate. M0 only adds a pin for the mobile-owned side. M0 #382, M1
  #383 and M2 #384 opened 2026-09-25 (stacked in that order). The M3
  ballot was answered the same day as D26–D29. M0–M2 merged 2026-09-26
  (#382–#384), and M3a (the Breakwater, the new start, start on any map)
  merged 2026-09-26 (#385). All four D26 names are picked. M3b merged
  2026-09-26 (#389), M3c the same day (#392). The agent calls M3a and M3b
  filed were answered as D30–D35 (#394). **Next:** M3b–M5 are rows
  in `plan/steps/01_build_plan.md` (brief
  `plan/2026-09-25-map-revamp-m3.prompt.md`).
- Backdrop-anchored map renderer (D15) — nodes in image coordinates,
  art pans/zooms with the node layer. Its own phase, after D2 — or folded
  into D2, since D16's per-map canvas is the same change.
- Act 1 map art (2026-09-25) — T generated a square four-quadrant Doré-style
  engraving (coast/harbour, great-tree forest, mountain fastness, candlelit
  underworld) from the prompt in this session; judged a fit (no frame or
  text, web-shaped roads, ~20 landmarks per quadrant, crossings at the
  seams). Before use: upscale to ≥5000px (check the upscaler keeps the
  hatching), crop along the natural seams with overlap rather than the
  exact centre lines, plate/halo nodes in the dark underworld quadrant, and
  add a `provenance.json` entry (tool, model, prompt, seed). Suggested Act 1
  order (not decided): coast → forest → mountains → underworld.
  **Superseded 2026-09-25:** T regenerated the art as four separate plates
  (one per region, about 1125–1254px each, generated from per-region
  prompts with the mountains plate as the style reference). No crop is
  needed. Resize per D22, order per D23.
- Scaling formula (D1 step 3) — D4 settles the direction (per-stat
  hooks); the exact stat-to-quantity mapping is designed with the hook.
  **2026-09-26:** attended with T (D38), build-plan row S3; the card purge
  (D36, row P1) follows it. **2026-09-27:** the model is decided (D40–D42),
  brief `plan/2026-09-27-stat-scaling.prompt.md`; T6 (D39) ships first.
- Trim spec §5.3 / §5.6 / §5.7 answered 2026-09-25 as D8 / D9 / D10.
  Nothing in §5 remains open.
