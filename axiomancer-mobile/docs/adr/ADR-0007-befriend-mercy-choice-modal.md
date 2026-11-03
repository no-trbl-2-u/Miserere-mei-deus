# ADR-0007 — Befriend mercy choice is a modal consumer of engine truth

- Status: Superseded by spec 144 (`plan/144-mr1-mercy-check.md`), 2026-11-03: befriending, the mercy choice and Exploit left the game. The mercy check keeps the modal's shape. Kept as the record.
- Date: 2026-06-02
- Related: `~/Workspace/decisions/CDR-0005-axiomancer-befriend-skill-and-mercy-choice.md`

## Context

Axiomancer Mechanics has moved Befriend toward a first-class heart-based skill that can open a mercy-choice state. Mobile must not invent this state. It must consume engine truth and make the choice legible.

## Decision

When the mechanics engine emits a Befriend/mercy choice state, Mobile presents a modal with two choices:

1. Spare / befriend / preserve the encounter.
   - Text may later vary by the player's philosophical alignment.
   - The modal should make clear that this can alter alignment and future content.
2. Exploit the moment.
   - Grants a free guaranteed critical attack according to engine rules.
   - Must be presented as a consequential act, not a neutral attack button.

## Anti-exploit consequences mobile must represent

When mechanics exposes them, mobile should make these consequences legible:

- exploiting an elite/miniboss Befriend opening prevents the region boss from gathering friendship counters;
- sparing that elite/miniboss causes the region boss to start with `open-minded`;
- `open-minded` may be a status effect whose only purpose is qualifying a future Befriend path;
- befriending a boss can trade faction reputation, losing standing with one faction and gaining with another.

## Mobile obligations

- Do not decide Befriend eligibility locally.
- Do not calculate the free critical locally except through mechanics-provided action/report surfaces.
- Present the two choices clearly and with weight.
- Surface consequence language when mechanics exposes it: alignment shift, boss content, lost/altered reward, future flag, or narrative burden.
- Preserve accessibility: modal labels must explain both actions and the consequence category.

## The mercy check shares the modal (spec 144, 2026-11-03)

The mercy check (`rollMercyCheck`) uses this modal too, with Spare and Finish.
It deliberately breaks "surface consequence language" above: T's ruling is that
the player does not see the reward before choosing, so the prompt names no
reward, no consequence category and no hint of one. The result shows only on the
end screen.

## Open questions

- What exact mechanics state/action names will represent the choice?
- Does the modal appear during combat or as a combat-resolution aftermath modal?
- What alignment-specific copy variants are needed first?
