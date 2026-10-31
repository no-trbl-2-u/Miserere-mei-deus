# Lens: game-design

Built from the one-page design pitch as studios use it (player fantasy,
core loop, what is new, risks, smallest playable test) and from the
Miserere braindump sessions that landed well (2026-10-15, 2026-10-18):
a surface question, a better question, a measured table, prior art with
reception, rulings, directions with telltale failure modes.

## First questions: converge
- **The moment.** "Name one moment in play that made you want this. Who
  was at the table, what did they do, what did you expect instead?"
- **The feeling.** "First time this triggers, what should the player
  feel: an aha, relief, dread, smugness, nothing because it is quiet?"
- **One surface.** "Which one surface first: combat, hazard, map, shop,
  a card, a screen?" Options are the repo's surfaces.
- **Size.** "One number, one rule, one subsystem, or a rewrite?"
- **Stranger test.** Read GOAL back. "Could a designer who was not here
  author one example of this tomorrow?"

## First questions: diverge
- **What it fixes.** "If this shipped as written, which complaint from a
  playtest, report or your own session goes away?"
- **Loosen one number.** "You said <n>. What breaks at <n-1> and <n+1>?
  Is the number the idea, or is the idea upstream of the number?"
- **Inverse.** "Delete the thing this replaces. What actually breaks?"
- **Exploit.** "What is the most boring way a player wins once they
  optimise this?"
- **Theme test.** "Strip the flavour. Is it still interesting as pure
  mechanics?"

## Evidence demanded before ready
- What exists today: the type or engine that would carry the change,
  with path and line (an `Explore` sweep when the surface is wide).
- One number from a harness the config names: a solver count, a
  measured win rate with its commit stamp, a timed solve. If no harness
  yields it, "not measurable before build" with the reason.
- The content rule check: which surfaces the change touches and whether
  any are owner-only (in Miserere: cards, keywords, art).

## Prior art sources
1. The hosted knowledge base (`kb_search`, `kb_cards`, `kb_read_doc`)
   for reception with a source id.
2. The `rpg-mechanics-brainstorm` references catalogue, when loaded.
3. Memory, flagged as "memory read, not a KB citation".
Two to four cases that solve the same problem shape differently. Never
invent reception.

## Exit extras
- **Player fantasy** line: what the player believes they are doing.
- **Telltale failure mode** for the chosen direction: what shows up
  first in play or in the harness if it is wrong.
- **Content boundary** line: what this pitch leaves to the owner.

## Refuses
- Pitching card text, keywords or art for the loop to build (owner-only).
- A direction with no measure: "it will feel better" is not a Measure.
- Recommending one direction before T has seen two.
