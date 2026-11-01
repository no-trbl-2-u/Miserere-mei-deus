# 134 — The owner-led rebuild sessions (B-track)

> T holds each owner-led rebuild session the revamp part plans name, and the loop builds only what each session plots.

Carried from the v1 build plan's `[blocked: owner-led]` rows at the nexus v2 cut-over (phase NX1d, 2026-11-01). Each session is T's (D88): the loop never starts one; each chunk is a Held line on the roadmap. The part plans under `plan/revamp/` are the design. Each chunk keeps its v1 row id as its `alias:`.

## Why

- B1: The relic pass. `plan/revamp/relics.md`. Requires R4, RC.
- B5: Card-creator workflow. `plan/revamp/cards.md`. Requires B4, RC.
- B6: Card sessions. Plan B, one slice per lane; families of sub-lanes and bridge cards within a family (D73). `plan/revamp/cards.md`. Requires B4, B5, RC.
- B2: Enemy revamp: normal / elite / region boss / act boss. `plan/revamp/enemies.md`. Requires R9, RC.
- B10: Dev menu revamp (the reset leaves the dev menu alone except compile fixes). `plan/revamp/mobile.md`. Requires R8, RC.
- B7: Deck tab UI revamp. `plan/revamp/mobile.md`. Requires R8, RC.
- B8: Card art revamp. `plan/revamp/mobile.md`. Requires R8, RC.
- B9: Labyrinth re-theme. `plan/revamp/labyrinth.md`. Requires B2, RC.

## Design

Each chunk is one attended session on its part plan: `plan/revamp/relics.md` (B1), `plan/revamp/enemies.md` (B2), `plan/revamp/cards.md` (B5, B6), `plan/revamp/mobile.md` (B7, B8, B10), `plan/revamp/labyrinth.md` (B9). A session ends in T's `/plot` of what it decided; nothing is built in it.

## Contracts

None beyond Design.

## Acceptance

- **A1** The relic pass. `plan/revamp/relics.md`.
- **A2** Card-creator workflow. `plan/revamp/cards.md`.
- **A3** Card sessions. Plan B, one slice per lane; families of sub-lanes and bridge cards within a family (D73). `plan/revamp/cards.md`.
- **A4** Enemy revamp: normal / elite / region boss / act boss. `plan/revamp/enemies.md`.
- **A5** Dev menu revamp (the reset leaves the dev menu alone except compile fixes). `plan/revamp/mobile.md`.
- **A6** Deck tab UI revamp. `plan/revamp/mobile.md`.
- **A7** Card art revamp. `plan/revamp/mobile.md`.
- **A8** Labyrinth re-theme. `plan/revamp/labyrinth.md`.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 8 open · 0 closed · next A9

- [ ] **134.2** The relic pass (owner-led) · M · closes A1 · needs — · alias: B1
- [ ] **134.3** Card-creator workflow (owner-led) · M · closes A2 · needs — · alias: B5
- [ ] **134.4** Card sessions (owner-led) · M · closes A3 · needs 134.3 · alias: B6
- [ ] **134.5** Enemy revamp (owner-led) · M · closes A4 · needs — · alias: B2
- [ ] **134.6** Dev menu revamp (owner-led) · M · closes A5 · needs — · alias: B10
- [ ] **134.7** Deck tab UI revamp (owner-led) · M · closes A6 · needs — · alias: B7
- [ ] **134.8** Card art revamp (owner-led) · M · closes A7 · needs — · alias: B8
- [ ] **134.9** Labyrinth re-theme (owner-led) · M · closes A8 · needs 134.5 · alias: B9
