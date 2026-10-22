# CLAUDE.md

Canonical agent guidance lives in **`AGENTS.md`** and **`VISION.md`** (game
doctrine). This file exists so the load-bearing doctrine is always in context.

## The story is the overview

**The story is `content/story/story-overview.md` and nothing else.** It holds
numbered rulings, T's prologue, a per-map place-and-theme table and ordered
open questions, and it grows only in attended sessions with T.

- **Read the overview before writing anything narrative.** Its numbered
  rulings are canon. Its open questions are not decided. A story fact it
  does not carry **does not exist yet**.
- **The player is X** — no name. `X` is scaffolding, never shipped text,
  never a stand-in for a name to be picked later. T's prologue gives X a
  sex, a past, a station and a habit; take those from the overview and add
  nothing.
- **Shipped narrative is not canon.** The `boy-*` flags and any shipped
  line are evidence of an old draft, not of what the story is.
- **Do not invent canon.** Need a story fact the overview does not carry?
  Say it does not exist and stop.
- `docs/narrative/` (style, voice, lexicon, the delivery register) is
  *craft* law and binds.

Full ruling: `plan/bearings.md` → Story canon.

## Load-bearing doctrine

The game as built is [`../docs/game-model.md`](../docs/game-model.md): three
grey cards, four dice, three foes, Act 1, befriend and mercy. Read it before
any mechanics work.

- **Content per surface (D88, D99).** Cards, keywords, art, enemies,
  relics, maps, NPCs and events are authored only inside a phase whose
  brief T wrote or approved. Engine
  constants move only inside a briefed phase.
- **Every card has a FREE line** (`Card.free`, `playTopAction`). A card
  must be playable without a die.
- **One tray roll per threat phase.** `turnTakenThisPhase` closes the
  endTurn→startTurn Conviction farm; it keeps its test
  (`src/Combat/e2e/turn-law.engine.test.ts`).
- **VITAE is the one bar.** Hazard-Pattern Combat is the only combat engine
  (witness: `simulateHazardPatternCombat`); `isDefeated(enemy)` is the main
  win; befriend → mercy is the only other ending.
- **Nothing grades the game from above.** No win-rate curve, quality index,
  rank band or count pin. Sims keep bug detectors (a printed number that
  isn't the applied number, a keyword with no popup, a card that can never
  be played). A test that fails when the game is *wrong* is a guard; a test
  that fails when the game is *different* is a repealed law.
- **No measured baseline** (D57). `/combat-playtest` is rebuilt in Phase
  R12; the stage matrix stays (`npm run combat-playtest`).

Wants beyond what is built: `VISION.md`.

## Pointers

- Package guide: `AGENTS.md`
- Game vision & doctrine: `VISION.md`
- Commands: `package.json` (`npm run verify` is the gate)
- Skills / commands / subagents: repo root `.claude/`
