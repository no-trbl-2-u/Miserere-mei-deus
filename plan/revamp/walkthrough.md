# THE REVAMP — tick-by-tick walkthrough

> Written via `/oversight` 2026-09-28 for T, before `march` and `night` were
> re-enabled. It restates the build plan (`plan/steps/01_build_plan.md`,
> THE REVAMP block) and the part plans in this folder in the order the loop
> will run them. The part plans stay the source of truth; if this file and a
> part plan disagree, the part plan wins and this file is stale.

## How the loop moves

**One tick = one `/march` run.** GitHub runs `march` every 2 hours
(`'23 */2 * * *'`). Each tick does exactly one thing, the first that
applies:

1. `/triage`: any unlabeled or `loop:do` issue.
2. `/critique`: when due (12 commits or 24 hours since the last pass,
   green deploy, no HIGH row pending). The playtester drives the web build
   and files what it sees to `plan/CRITIQUE.md`.
3. `/ship-a-phase`: the first `[ ]` revamp row that is not attended and
   whose `Requires` are all `[x]`.
4. `/expand`: only when no phase is pickable.
5. `/iterate`: otherwise. One fix from `plan/AUDIT.md` or
   `plan/CRITIQUE.md`, under the revamp-support bias (tests, debt, docs
   first; content rows skipped).

`night` runs `/digest` every other day (the day's briefing).

**A phase tick** (`skills/ship-a-phase.md`):

1. Sync main; pick the row; check that no other tick has claimed it.
2. If the phase has no brief in `plan/phases/`, write one from the part plan
   and commit it on its own (`phases: brief for phase R1`).
3. Open (or reuse) a `loop:phase` GitHub issue as the phase mirror.
4. Read the part plan, the decisions it cites and the nearest shipped
   sibling phase.
5. Do the work, update or delete the tests that go with it, and run the
   reset-rule pass: delete rather than park, a save migration for anything
   removed from a save, the carrier sweep last, nothing new authored.
6. Run the gates: mechanics `verify`, mobile `verify`, root `npm test`,
   `lint:content`, `check-lexicon`. Up to 3 fix attempts on the same cause,
   then stop and report.
7. Commit and push to main (`Closes #<issue>`), then a second commit that
   ticks the row `[x]` with the hash. CI follows; `ci-autofix` owns a red
   main.

So a phase normally costs **one tick and 2–3 commits** (brief, work, tick).
Critique and triage ticks interleave, so expect about 16 loop phases over
roughly 2–4 days if nothing stalls. There are no PRs: the loop pushes to
main, and every commit is its own checkpoint in git history.

## The reset (loop)

### R1 — Tooling reset
- **Tick:** deletes `axiomancer-card-editor/` and every reference to it
  (workspace entry, `verify-card-editor.yml`, the root verify step, "three
  package" lines); retires the deck-matrix baseline (npm scripts, regen and
  freshness scripts, the CI warning, the truth-source paragraphs, the
  digest's re-measure) and archives the 538 KB baseline file; unpublishes
  the three DevLog tuning-lab pages; deletes orphan scripts and the
  naming-law check; fixes the stale docs and the red root test
  (`build-devlog-public.test.mjs:117`); adds `KB_MCP_TOKEN` to
  `.env.example`.
- **Leaves:** the `.claude/**` items (the guard.mjs baseline block, the
  launch.json card-editor entry, the settings naming-law allowances). The
  loop cannot edit `.claude/**` unattended; they are attended residue.
- **Accomplishes:** two packages instead of three, no stale baseline stamp,
  a green root `npm test`. Every later phase has less to carry.

### R2 — Enemy reset
- **Tick:** deletes 76 of 79 foes with their decks, cards, stance maps,
  portraits and art rows; strips the survivors of afflictions and keywords;
  deletes the resolution code for all 11 enemy keywords (keeping an empty
  optional `Enemy.keywords`); deletes the PLEA/premise riders and the curse
  code; points every Act 1 pool at Float-Eye, with the Brine Hag rarer, and
  pins the Doorwarden on every region's door fight; re-points retired-foe
  references in engine and tests; the carrier sweep removes 15 words from
  the atlas, mobile glosses and the catalog.
- **Accomplishes:** three foes that deal plain damage, and nothing on
  screen the player cannot answer.

### R3 — World reset
- **Tick:** purges fishing-village (map, NPCs, dialogue, quests, events,
  the goodwill system, its tests); seals the Lantern Deep's deep stair and
  the Labyrinth vault door (code kept, parked); parks northern-forest and
  the northern continent; re-homes the Anvil once per region near its exit;
  deletes unstartable quests and unread dialogue flags; makes "shillings"
  the only currency; migrates saves on purged or parked maps to the deep
  stair and saves inside the Labyrinth to `ld-15`; re-pins narrative
  reachability and the e2e map walk to Act 1.
- **Accomplishes:** the world is Act 1, and every door either works or says
  it is sealed.

### R4 — Relic placeholders
- **Tick:** ten signatures become "Raise GUARD 5" at a flat 4◆ (names and
  relics unchanged); the signature `kind` switch collapses to guard and
  mercy; **The Open Hand performs a real befriend attempt** (the starting
  ring); the Brine Hag keeps its befriend data, and the other two are marked
  not befriendable; relic text is rewritten to what each relic now does; the
  carrier sweep removes QUARTER, WRATH, CHAIN, STAGGER, PLEA and the rest;
  an e2e proves The Open Hand opens the mercy choice on the Brine Hag.
- **Accomplishes:** removes the unbounded Butcher's Bill exploit, and
  befriend → mercy becomes reachable in play.

### R5 — Items reset
- **Tick:** keeps the minor, normal and greater healing potions (supreme is
  the phase's call) and retires the other 19; adds a save migration that
  strips retired ids; re-points Act 1 shops, loot caches, hazard rewards and
  dialogue grants; deletes the buffs only those items used; changes "HP" to
  "VITAE"; the carrier sweep removes CLEANSE.
- **Accomplishes:** every item does what it says.

### R6 — Hazard reset
- **Tick:** keeps the hazard engine loop and board; cuts the hazard card
  library to a minimal core per route meter; deletes the rewards that lie
  (Paradox Token, Hexed, Bonus Relic, Shrine Cache); shrinks the hazard
  glossary to live words; shrinks tuning and sim; adds a migration for
  hazard decks holding deleted cards.
- **Accomplishes:** a small, honest hazard deck for B3 to redesign from.

### R7a / R7b / R7c — Engine purge (three ticks)
- **R7a:** deletes the 47 carrier-less mechanic kinds and their handlers,
  the dead card fields, the dead encounter-state fields and the
  retired-verb test fixtures (31 test files move to grey cards or go).
- **R7b:** deletes pricing, synergy, themes, the deck draft and preset
  file, and reward steering (the reward itself stays); card types become
  **Attack / Skill / Spell**, with a migration if persisted.
- **R7c:** deletes the alt-win systems (keeping befriend → mercy), effects
  with no carrier, dead `executeCard` branches and test-only modules; the
  closing carrier sweep leaves the atlas at DEAL, GUARD, VULNERABLE, the
  befriend word and the live dice/blacksmith words.
- **Accomplishes:** roughly 5k+ LOC of engine for systems nothing uses is
  gone, and the engine is final for everything after it. Split into three
  so no single tick is too big to verify.

### R7d — Stance removal
- **Tick:** deletes the rock/paper/scissors layer spec 33 left behind: the
  player's stance, the phase-end punish/yield check, enemy phase stances,
  and every stance-keyed mechanic, status, keyword and UI piece (D65). Card
  colour, dice colour and the Color Law stay (the colour-match bonus R7d
  kept was removed later, D79). The brief asks
  you whether the momentum chain goes with it.
- **Accomplishes:** colour means one thing: which dice can pay for a card.

### B4 — Card-rules inventory (the one loop B-row)
- **Tick:** writes `plan/revamp/card-rules-inventory.md`: every card rule or
  fixture, where it lives, what enforces it, and whether it is live, dormant
  or dead. Creates nothing.
- **Accomplishes:** the map T's card sessions (B5, B6) start from.

### R8 — Mobile cleanup
- **Tick:** maps the grey cards to placeholder paintings and drops 57 dead
  art rows; sets the launcher label to "Miserere Mei, Deus"; deletes the
  Learn Card flow, starter bundles, the ally/goodwill cache paths and the
  alt-win UI (keeping the mercy modal); trims glosses to live words; fixes
  HP/currency/tutorial copy; deletes the dead-subject tests. The dev menu is
  touched only if a deletion breaks it.
- **Accomplishes:** the app shows only what the engine can do.

### R9 — Progression retune
- **Tick:** sizes the XP curve so a full Act 1 clear gives about 3–4
  level-ups, and checks the stat totals against S3 (the Doorwarden
  winnable, not free). It may build a small measurement script for itself.
  It touches XP constants, payouts and survivor level-scaling only.
- **Accomplishes:** growth that fits the world that exists.

### R9a — Save checkpoint in fights
- **Tick:** documents mobile as the single save owner; a node is consumed
  when its encounter settles, not when it starts, so a reload mid-fight
  re-offers the fight; engine and mobile tests prove it on a normal fight
  and a door fight.
- **Accomplishes:** a reload can never skip a Doorwarden. That matters
  before a release anyone replays.

### R10 — Theme colours
- **Tick:** moves the surviving hard-coded hex colours in `app/`,
  `components/` and `state/presenters/` into named `theme/axm.ts` tokens.
  `verify:visual` must show no diff.
- **Accomplishes:** one palette file for every later UI session.

### R10b — Doctrine rewrite
- **Tick:** writes `docs/game-model.md`, rewrites `spec.md` and bearings to
  the post-revamp game, retires specs 33/34, sweeps the plan queues, tags
  and removes `plan/archive/`, and makes `check-lexicon` fail retired terms
  (D66, D67).
- **Accomplishes:** no agent can learn the old game from a live file.

### R10c — Comments and docs truth pass (two ticks)
- **Tick:** mechanics, then mobile: bannered docs rewritten or deleted,
  history stripped from comments, every rule of play in a live doc, and a
  guard for retired terms in comments (D67).
- **Accomplishes:** comments and docs describe the code that exists.

## The stop: RC (attended)

The loop cannot pick RC. Once R10c is ticked, `/march` has no pickable phase
and runs `/iterate`, `/expand` and `/critique` under the revamp rules until
you open the RC session. Nothing past this line starts before RC.

### RC — Act 1 checkpoint release
- **Session:** confirm every reset row is `[x]` and all gates and CI are
  green; the playtester walks a new game through all four regions (the
  Doorwarden at each door, the Brine Hag, befriend via The Open Hand, an
  Anvil per region, potions, sealed doors, 3–4 level-ups, a mid-fight
  reload, no console errors, no orphan keywords); small findings are fixed
  there and larger ones block the tag.
- **Cut:** you tag `v0.1.0-checkpoint`, publish the GitHub release, build
  the EAS preview APK from the tag, and the reset recipe
  (`git switch -c <branch> v0.1.0-checkpoint`) is recorded in bearings.
- **Accomplishes:** the reset point. If you pump the brakes later, this is
  the version you return to. Detail: [checkpoint.md](checkpoint.md).

## After RC

- **R11 — Loop content phases (attended):** decide what the loop may create
  again and how (as planned phases), review the R0 archive and the
  zero-invocation verbs, and remove the revamp banner. Ends revamp mode.
- **R12 — New combat-playtest (attended):** write the new
  `/combat-playtest` against the rebuilt game.
- **Your sessions (B-rows, all after RC):** B1 relic pass, B5 card-creator
  workflow, B6 card sessions (pick plan A/B/C first), B2 enemy revamp, B3
  hazard redesign, B10 dev menu, B7 Deck tab, B8 card art, B9 Labyrinth
  re-theme.

## Where you can pump the brakes before RC

- Disable `march` (`gh workflow disable march`). Every phase is its own
  commit on main, so any `[x]` row's hash is a clean stopping point.
- Or run `/oversight` to mark a row `[skipped]`, re-scope it, or reorder.
