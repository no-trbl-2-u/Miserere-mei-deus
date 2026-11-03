# Axiomancer Mobile Vision

This file preserves T's fundamental wants for Axiomancer as they affect the mobile client. Mobile does not invent mechanics; it makes engine truth legible, weighty, and playable.

Read this before major UX proposals, combat-screen work, the mercy check, alignment surfaces, or `/march` phase execution.

## Game identity

Axiomancer is a dark fantasy deckbuilding RPG campaign where mechanics make what you owe, and to whom, consequential.

Mobile should make strange mechanics understandable without sanding off their danger.

## Combat UX vision

Combat must make direct damage, statuses, Conviction, Surge, and Dice legible
without visually forcing status dominance. T's 2026-08-08 unshackling restored
ordinary direct damage while permanently retaining Conviction, Surge, and the
Dice mechanics system.

The UI should help the player understand:

1. what the enemy is doing;
2. what resources they are generating;
3. what skills are available;
4. what status effects exist and matter;
5. how victory, mercy, or consequence can happen.

The player may resolve combat through direct damage, statuses, mercy, or another
authored consequence. Mobile should reveal why the chosen path worked without
presenting brute attack, status stacking, or passive defense as the universal
always-correct answer.

## Defend vision

The player should use defend only when:

- they fear a large attack is coming;
- they want to generate resource.

The UI should make those reasons clear where engine truth permits.

## Mercy vision

VITAE is the one bar and emptying it is the only way to win. Now and then a normal
foe falls and the player must spare it or finish it, not knowing what mercy pays
(T, 2026-11-03; `docs/game-model.md`, The mercy check).

Mobile obligation:

- present the prompt as the foe falls, with no reward and no hint of one;
- reveal what Spare paid on the end screen, and nowhere before it;
- spare and finish language is morally charged, never neutral.

## Worker law

If a UI proposal makes the mechanics feel generic, hides status effects, treats mercy as a free reward, or presents exploit as morally neutral, it is suspect. Stop and reconcile with this file before implementation.
