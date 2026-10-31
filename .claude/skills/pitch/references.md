# /pitch references

## 1. The card, worked example

```markdown
# Pitch card: hazard-cost-cards    lens: game-design   state: converge   turn: 4
GOAL   We will add cost-utility cards to hazard puzzles so that a hard puzzle
       has a card that is necessary in some layouts and wrong in others,
       proven by the solver's per-card report.
FIXED  - No RNG in puzzles (A2); reroll means layout-set faces (t3)
       - Negative values are signed, never clamped (t3)
       - Card design stays with T; this pitch is the engine only (t4)
FREE   - Whether a cost card may be gold
       - Amounts for +die and reroll utilities
PARKED - Live three-round hazard keeps the bin until Act 1 rollout (t4)
OPEN   - Gold cost cards: default "no", [T to confirm]
EVIDENCE - hazard.types.ts:72 HazardCardDef; all shipped values >= 0
         - scratch solver run: TOLL staged in 2 of 6 hard wins; GREED in 0 hard wins
GOAL HISTORY - t1: "make puzzles more interesting with cost cards"
             | t2: "a cost card that matters sometimes"
             | t4: current (strict narrowing of t2)
```

The GOAL template is "we will <change> so that <who> can <what>, proven
by <measure>". A GOAL missing any of the four slots is not `ready`.

## 2. Triage rubric with examples

Score the latest state of the conversation. Each matching row adds one.

| Signal | Toward | Example from past sessions |
|---|---|---|
| adjective without a noun | U | "it's just boring, or I'm not getting it" (2026-07-13) |
| no surface named | U | "combat feels wrong" with no screen, system or card named |
| more than one theme | U | cards not functioning, or boring, or me (three themes, 2026-07-13) |
| nobody named who feels it | U | "make the hazard puzzles more interesting" (who, when?) |
| mechanism named, with numbers | O | "4d6, Red/Blue/Purple 1 special 2 mana 3 miss, Gold 1/1/4" (2026-07-17) |
| no problem or why stated | O | the dice proposal gave no itch it was scratching |
| one solution, no alternative | O | "should more spells behave like enchantments" (2026-07-13 opening) |
| code paths or types named | O | "`scoreCard` price, `scratch/price-experiment/`" (2026-07-17 price) |

Decision:

- U >= 2 and O < 2: **converge**.
- O >= 2: **diverge** first, even if U is also high. An over-specified
  idea with no stated problem needs the problem found before narrowing
  can start. Re-score once a problem sentence exists.
- both < 2 and the exit criterion holds: **ready**.
- both < 2 and the exit criterion does not hold: converge on whichever
  exit field is missing.

Re-score when GOAL changes and every third turn. The state is written in
the card header. It moves during the conversation; a session often runs
diverge (turns 1 to 3), converge (turns 4 to 7), ready.

Strict narrowing test (for the fork stop): the new GOAL keeps every noun
of the old GOAL and adds a constraint, a measure or a who. A GOAL that
swaps the change or the who is a rewrite, not a narrowing.

## 3. Move catalogue

### Convergence moves (for a vague state)

- **Name the itch.** "What happened, in a session or a playtest or a
  review, that made you want this? One moment." Turns an adjective into
  an event.
- **Pick one surface.** "If this landed on exactly one screen, system,
  or file first, which one?" Options are the surfaces the repo has.
- **If only one thing changed.** "Suppose we could change only one rule.
  Which one, and what would you expect to see?"
- **Stranger test.** Read the GOAL line aloud. "Could someone who was not
  in this chat start on that tomorrow? What would they ask first?"
- **Bound the size.** "One number, one rule, one subsystem, or one
  rewrite? Which size is this allowed to be?" Options map to the repo's
  size scale when it has one (S, M, L, multi-phase).
- **Who feels it.** "Who notices if this works: the player on turn one,
  the playtester at hour three, the loop, you reading the report?"

### Divergence moves (for an over-specified state)

- **What would this fix.** "If this shipped exactly as written, which
  complaint goes away?" If none can be named, the mechanism has no
  problem yet; keep asking before anything else.
- **Loosen one fixed item.** Take one number or rule T gave and ask what
  breaks if it were different. One at a time.
- **Two alternatives.** Offer two other mechanisms that address the same
  stated problem, each with a trade-off and a telltale failure mode.
- **Telltale failure.** "If this is wrong, what shows up first in play or
  in the harness?"
- **Prior art.** Two to four cases that solve the same problem shape in
  different ways. Name the specific mechanic and the reception, or say
  "no confident read". Draw from the lens's named sources first.
- **Inverse.** "If we deleted the thing you want to change entirely,
  what actually breaks?"

### Shared moves

- **Reflect.** GOAL in your own words, then "is that it?"
- **Fetch evidence.** Read the paths the lens names; run the harness the
  config names on a scratch basis only; write paths and numbers to
  EVIDENCE. Use an `Explore` subagent when the sweep covers many files or
  directories; it returns a report to you.
- **Park.** Name the tangent, put it in PARKED, say so, return to the
  open FREE item.

### Question discipline (asking-well, adapted)

1. One to four questions per batch. Never five.
2. During shaping, no `(Recommended)` tag. The point of a shaping
   question is to learn what T thinks; a recommendation anchors it. At
   the exit question and at a fork stop, the tag returns, recommended
   option first, because those are decisions with a cost.
3. Each option names its trade-off in one or two sentences.
4. Two to four sentences of context before a batch, naming the trade-offs
   across the whole option space.
5. Every question names its defer path: the default used if T says "not
   now" and whether the item resurfaces (it goes to OPEN with that
   default).
6. Answers are policy. File them in FIXED with the turn number; never
   re-ask.

## 4. Pitch file format

Written only when `ready`. Path `<pitch_dir>/<YYYY-MM-DD>-<slug>.md`.
Never overwrite; add `-2` on a clash.

```markdown
# <Title> — <YYYY-MM-DD>

## Surface question
<T's opening, quoted, one to three lines>

## Better question surfaced
<the problem the conversation found, one paragraph>

## Path taken this session
1. <state at open: converge|diverge, and why>
2. <each GOAL rewrite, with the turn and what forced it>
3. <parked items, one line each>

## Raw material read
- <path or doc>: <what it says that matters>

## Measured
| Finding | Data |
|---|---|
| <one row per number from the harness or a scratch run> | |

## Prior art consulted
- **<Work> — <specific mechanic or practice>:** <one sentence>; <reception, or "no confident read">

## Rulings (T, this session)
- <each FIXED item, with the turn>

## Directions considered
### Option A — <name> *(inspired by <source>)*
<sketch> **Trade-off:** ... **Telltale failure mode:** ...
### Option B — ...

## What proves it (not T, not the agent)
<the Measure line and what a pass looks like>

## Handoff to /plot
Task: <GOAL line, in T's terms>
Source: this file
Acceptance:
- A1 <checkable statement>
- A2 ...
Measure: <command, test or observation>
Decisions made upfront: <each FIXED item, one line>
Out of scope: <PARKED items that are real follow-ups>
To confirm: <each OPEN item with its default, marked [T to confirm]; or "nothing">
Suggested slot: asap | anytime, with the reason
```

`/plot` reads the Handoff block as its Step 2 input: Task becomes the
brief's Outcome, Acceptance and Measure carry over, Decisions made
upfront fills "Decisions made upfront — DO NOT ASK", To confirm becomes
the PR's "To confirm" list.
