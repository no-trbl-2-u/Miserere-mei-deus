# Narrative Evaluation Rubric

Evaluate the smallest playable unit: one encounter, dialogue node, item, codex
entry, or screen. Score each dimension 0–3.

| Dimension | 0 — fail | 1 — weak | 2 — ship with polish | 3 — strong |
|---|---|---|---|---|
| Mechanical clarity | target/cost/timing/result missing or obscured | inferable after reread | correct and adjacent to choice | instantly scannable; unknowns clearly marked |
| Canon terminology | contradicts canonical terms | mixed or invented synonym | VITAE and statuses correct | correct, economical, localization-ready |
| Material consequence | abstractions only | object is decoration | object carries one consequence | object links choice, history, and persistent result |
| Landscape agency | mood wallpaper | generic obstacle | terrain physically routes action | local ecology/construction creates distinct options |
| Moral event design | narrator declares verdict | false binary or hidden bias | beneficiary/cost visible | outcomes complicate the initial claim without authorial verdict |
| Voice/register fit | wrong surface or uniform voice | inconsistent | register and speaker card followed | distinctive voice increases information and tension |
| Restraint | exposition or melodrama | several removable flourishes | mostly necessary | every image/action earns decision, place, or consequence |
| Originality | recognizable imitation/pastiche | generic prestige-dark language | Axiomancer imagery and syntax | unmistakably setting-specific without mannerism |
| Accessibility | flavor embedded in controls; ambiguous references | dense or specialist-dependent | short labels and separated layers | clear aloud, localizable, and readable under pressure |
| Residue/continuity | event vanishes | cosmetic aftermath only | result named | state, route, inventory, relation, or record visibly changes |

Maximum: 30.

## Gates

A unit is **blocked** regardless of total if:

- Mechanical clarity, Canon terminology, Originality, or Accessibility scores
  below 2.
- It contains a recognizable phrase, author imitation, generic biblical
  weather, faux archaism, or a copied sentence skeleton.
- A dialogue scene cannot distinguish recurring speakers with names removed.
- A consequence preview promises a rule the engine does not implement.

Suggested thresholds after gates: **24–30 ship**, **19–23 revise**, **0–18
rewrite**. A high literary score never compensates for unclear play.

## Evaluation procedure

1. **Canon pass:** verify setting, state, implemented mechanics, VITAE, STANCE,
   status names, amounts, and timing against current source.
2. **Cold clarity test:** give only the playable screen to a reader. They state
   each available action, cost, known risk, and expected result. Any mismatch is
   a clarity defect.
3. **Voice-blind test:** remove speaker names from three lines per recurring
   character. A reviewer identifies speakers and cites verbal evidence.
4. **Object audit:** underline concrete nouns; circle those that alter action,
   provenance, or consequence. Cut decorative clusters.
5. **Ambiguity audit:** separate what occurred, what a witness says, and what a
   character infers. Label unknown mechanical outcomes explicitly.
6. **Anti-imitation gate:** run the overlap workflow and independent human
   review in [Anti-Imitation](./ANTI_IMITATION.md).
7. **Read-aloud/localization pass:** shorten nested clauses, replace unclear
   pronouns, and keep UI strings independent of word order in flavor text.
8. **Persistence check:** name the engine state or authored continuity that
   preserves residue. If none exists, do not promise persistence.

## Review record template

```text
Unit / version:
Reviewer (not drafter):
Scores (10 dimensions):
Blocking gate findings:
Cold clarity result:
Overlap scan result + flag dispositions:
Voice-blind result:
Canon/state evidence checked:
Decision: ship / revise / rewrite
```

## Pilot calibration

The [encounter pilot](./pilots/ENCOUNTER_PILOT.md) is intentionally annotated.
Score only the player-facing block first; then use annotations to discuss missed
rules. Annotations are development evidence and never ship in the game.
