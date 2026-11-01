# World Spec W-02 — The Capital, a door onward

> **SCOPE NOTE (THE STORY IS THE ROAD, re-scoped via /oversight 2026-09-23).**
> Phase 84 originally asked this session to decide "what the Capital's
> advisor-selection payoff sets up for the player character." That framing
> predates THE BLANK PAGE (2026-09-18): `content/story/story-overview.md`
> is now the only story canon, built from nothing, and its own "Shipped
> inventory" section names the advisor-selection/ribbon/court narrative at
> the-capital as **legacy, non-canon** — what an earlier draft assumed.
> The new road (X, the dungeon, the child, the addiction) has not decided
> where any of the seven shipped maps — the-capital included — sit
> relative to it (story-overview.md's own "Pivot recommendation" §3).
>
> **This spec does not touch that question.** It is scoped narrowly, per
> T's ruling: the-capital's map structure and node layout, as a *place*,
> independent of any advisor-selection canon. It authors a door onward —
> the structural gap the map has had since Phase W5 — using no story fact
> beyond what's already shipped scenery (the wall, the ledger, the court),
> and it invents no new canon about X, the second guard, or anyone's fate.
>
> **Addendum, 2026-09-23 (same day, later in this session).** T set a new
> `story-overview.md` fact after this spec shipped (now ruling 6 of the
> over-arching story, which replaced the road the same day): the capital is
> commonly believed to be the annexation's last unconquered ground, and
> that belief is wrong — not because it fell, but because it was never a
> refuge; its coldness is its own nature. T confirmed this reads as
> **compatible** with this spec's "relief cut short" door beat, not a
> contradiction — no revision made. Left here as the cross-reference for
> whoever authors the-capital's *arrival* side (`cap-1`/`cap-2`) next,
> since that Standing Fact is the belief that arrival beat should undercut.

## Goal

The-capital is the current end of the northern-continent map chain: six
columns, terminal at `cap-9` (The Factor, the boss/climax), authored
2026-09-10 with its own comment reading "No door onward yet." Every prior
frontier map in this chain (caverns, northern-city, connecting-river) got
exactly one column past its own boss that serves as the cross-map door —
`nc-16`'s pattern, `ncy-26` one column past the Harbormaster, `cr-13` one
column past its own gate. The-capital is missing that column. This spec
authors it, so a future `/forge` tick has a real anchor point (a named
terminal node) to target when the next northern-continent map ships,
instead of the boss fight itself being the dead end.

## Dependencies

- **Unblocks:** whichever map ships next in the northern-continent chain
  (unscoped — no next map is proposed by this spec; it only prepares the
  exit).
- **Depends on:** the existing `the-capital` `MapDefinition`
  (`src/World/Continents/Northern-Continent/maps.ts`), the `cutscene` and
  `hazard` `MapEventKind`s (spec 23), `processWorldEffectTick` /
  `getActiveHazards` for the hazard payload.

## Atmosphere

Every prior door-past-the-boss node in this chain (`nc-26`, `ncy-26`,
`cr-13`) is a single terminal node. This one is two, by deliberate
departure: T ruled the transition should read as "relief cut short" — the
court's coldness lifts, but what's beyond signals immediately that it
isn't safety — and a single node can't carry both halves of that beat.
The cutscene names only what's gone (the wall, the ledger, the tally); it
does not acknowledge anything on the other side, and the hazard that
follows carries no capital-flavored language at all — nameless, immediate,
the harshest of the three structural options T was offered. Voice lock:

> "The wall goes small behind you before it goes gone. Nobody is counting
> what leaves through here."

> (hazard node, no capital reference — authored fresh against whatever
> terrain kind implementation picks, e.g. exposure/weather-class rather
> than anything ledger- or court-themed)

## Region state

| state key | meaning | how it changes |
|---|---|---|
| `the-capital.cap-10.completed` | the departure cutscene has fired | set on first arrival (standard `consumedNodes` semantics — no new key needed if the existing per-node consumption suffices; listed here for parity with other door specs) |
| `the-capital.door-opened` | the-capital's cross-map door node (`cap-11`) has been reached | set on first arrival at `cap-11`; the flag a future next-map spec/quest checks before offering a `target: 'cap-11'`-style arrival, mirroring `get-to-the-capital`'s `target: 'cap-1'` pattern |

(Exact key naming to follow `docs/world.md` conventions at implementation;
this map's region-state surface is otherwise empty today — these two rows
are the only additions.)

## Mechanical hazards

One new hazard payload at `cap-11`, deliberately unthemed (no ledger/
ribbon/court language — see Atmosphere). Effect id chosen from the live
`Effects/` library at implementation; category should be a plain
terrain/exposure-class effect (contact or short DoT), not anything
carrying capital-specific flavor text, so the "nameless" read holds
mechanically as well as narratively.

## Map / node sketch

```
... cap-8 (loot-cache/market, existing)
  -> cap-9 (The Factor, boss — existing, currently connectedNodes: [])
  -> cap-10 (cutscene: the departure beat — NEW)
  -> cap-11 (hazard: nameless terrain — NEW, the map's new terminal;
             connectedNodes: [] until a next map targets it)
```

Column 6 (`cap-10`, `[6, 0]`) and column 7 (`cap-11`, `[7, 0]`), both
singletons, following the existing map's straight-spine layout past the
Factor (no lateral ribs on this stub — a two-node tail doesn't need the
2026-09-21 lane-rib treatment the wider columns carry). `cap-9`'s
`connectedNodes` changes from `[]` to `['cap-10']`.

## Cross-references

- `src/World/Continents/Northern-Continent/maps.ts` — the existing
  `theCapital` `MapDefinition` and its own header comment (currently
  "No door onward yet," to be updated once this ships).
- `plan/steps/01_build_plan.md` Phase 84 — this spec is that phase's
  output, re-scoped away from its original advisor-selection framing.
- `content/story/story-overview.md` — NOT extended by this spec. Its
  pivot question 3 (where the seven shipped maps sit relative to the new
  road) remains open and is out of scope here.

## Open questions

1. **Hazard effect id.** Which live `Effects/` entry reads as
   "nameless/exposure," not narratively capital-specific.
   > At implementation, chosen against the current `Effects/` library.
2. **Whether `cap-11` becomes a real next map's start, or stays a stub.**
   This spec does not propose a next map — it only makes the-capital
   capable of having one, the way `nc-26`/`ncy-26`/`cr-13` did before
   their own next maps existed.
   > Unscoped; a future `/forge` or `/expand` pass decides if/when.

## Proposed approach

1. Add `cap-10` (cutscene) and `cap-11` (hazard) to `theCapital`'s `nodes`
   array; update `cap-9`'s `connectedNodes` to `['cap-10']`.
2. Register the two nodes' `MapEventPool` overrides in
   `src/World/MapEvents/content.ts` (cutscene lines per Atmosphere above;
   hazard payload per Mechanical hazards above).
3. Update the map's own header comment (currently "No door onward yet")
   to reflect the new terminal.
4. Hermetic e2e: extend the existing northern-continent map-traversal
   test coverage to walk `cap-9 -> cap-10 -> cap-11` and assert the
   column-layering invariant still holds (per
   `src/World/e2e/map-traversal.engine.test.ts`'s existing law).

## Acceptance checklist

- [ ] Both open questions answered (or explicitly deferred, per above).
- [ ] Atmosphere prose is written and matches the voice-lock sample (cold,
      unthemed hazard text — no ledger/ribbon/court language).
- [ ] Region state keys wired (or confirmed unnecessary if existing
      `consumedNodes` semantics already cover it).
- [ ] Hazard payload references a real effect ID from `src/Effects/`.
- [ ] `cap-9`'s `connectedNodes` updated; column-layering law
      (`src/World/e2e/map-traversal.engine.test.ts`) still holds.
- [ ] `npm test` and `npm run type-check` clean.

## Out of scope

- Any next northern-continent map. This spec only authors the door, not
  what's past it.
- Anything about the advisor-selection/ribbon narrative, its resolution,
  or any story fact about X, the second guard, or the sweetheart. Those
  belong to `content/story/story-overview.md`'s own attended sessions,
  not this spec.
