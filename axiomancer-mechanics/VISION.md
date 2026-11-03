# Miserere Mei, Deus — Mechanics Vision

This file preserves T's fundamental wants for Miserere Mei, Deus as they affect the mechanics engine. Read it before major mechanics proposals, balance tuning, combat work, skill/status work, or mercy/friendship work. It records what T wants; `docs/game-model.md` records what is built.

## Game identity

Miserere Mei, Deus is a dark fantasy deckbuilding RPG campaign where mechanics make what you owe, and to whom, consequential.

The engine should support strange, legible, consequential systems over safe RPG imitation.

## Combat vision

Combat must make its interacting systems legible and consequential. The
rules as they stand, with their constants, are in
[`docs/game-model.md`](../docs/game-model.md).

**The enemy has ONE bar, VITAE.** Emptying it is the only way to win. There
is no second track.

The intended mastery path is:

1. read the enemy's telegraph;
2. generate and manage resources (dice, Conviction);
3. use skills;
4. commit to a line and make it land;
5. resolve through victory or mercy.

**Every card has a FREE line.** A card must be playable without a die. A
FREE line nobody would ever choose is a design failure — dead cards are bugs
— fixed by making the line better, not by a lint.

**Enemies escalate and telegraph.** An enemy has its own VITAE pool and an
ordered deck that never reshuffles backwards; a boss has stages that change
the fight mid-fight. A telegraph prints a digit, not an adjective.

**Nothing grades combat from above.** There is no win-rate curve, quality
index, rank band or count pin. Balance work keeps bug detectors (printed
number ≠ applied number; a keyword with no popup; a card that can never be
played) and a wide sanity envelope. Balance should still prove aggressive,
defensive, mixed and strategist play styles: a coverage question, not a
target curve.

## Defend vision

The player should use defend only when:

- they fear a large attack is coming;
- they want to generate resource.

Defend should not be an always-correct bunker action.

## Mercy vision

As built: now and then a normal foe falls and the player must spare it or finish
it, not knowing what mercy pays (`docs/game-model.md`, The mercy check). T removed
befriending on 2026-11-03: "Reward feels flat and there's an entire mechanism for
one relic".

Wants from the befriending days, not built, and in need of a fresh ruling from T
before any of them comes back:

- a spared foe changes later world, boss or region state;
- different rewards from foe to foe, or boss-specific rites.

## Worker law

If a mechanics change makes brute attacking, pure turtling, or consequence-free mercy the dominant path, it is suspect. If a local phase conflicts with this file, stop and reconcile before implementation.
