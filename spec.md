# Miserere Mei, Deus — product spec

> The "what and why". The rules of play, with their constants, are in
> [`docs/game-model.md`](docs/game-model.md); standing decisions and stack
> pins are in `plan/bearings.md`; the plan that got the game here is
> [`plan/revamp/README.md`](plan/revamp/README.md).

## Product

Miserere Mei, Deus is a turn-based, single-player dark fantasy
deckbuilding RPG for mobile (Expo / React Native), backed by a
deterministic TypeScript rules engine. **What you owe, and to whom, is a
mechanical input, not flavour:** mercy is a real ending with a real cost,
not a dialogue skin.

The game is a small, honest core, cut down on purpose so it can be rebuilt
one owner-led session at a time. The core loop: walk a region node by node
→ fight, rest, gamble a hazard, grow a die at the Anvil → break the
region's door → the next region.

## Audience

The design corpus is authored for and around **T** (the designer/owner).
The implied player likes legible, tactical card-and-dice combat and
morally weighted choices: Slay the Spire, Mörk Borg, Into the Breach,
Undertale.

## Pillars

- **Dice power cards.** Every card has a FREE line and a PAID line; the
  PAID line costs one die, and the die's colour matters (the Color Law:
  it must be the card's colour unless the card is grey or the die is gold).
- **VITAE is the one bar.** Emptying the foe's VITAE wins. There is no
  second track and no objective function grading a fight from above.
- **Mercy is earned.** Befriending a foe through The Open Hand opens the
  mercy choice: spare it, or exploit the opening. It is the only
  non-lethal ending.
- **The enemy telegraphs.** The foe's next card is shown before the player
  acts; enemy damage escalates the longer a fight runs.
- **Legibility without safety.** The app makes every number on a card face
  the number the engine applies, without sanding off the danger.

## Scope

### Shipped — the Act 1 core

- **Cards:** the grey office (three cards, the ten-card starting deck) and
  three 30-card trial sets, each its own reward lane: Blood Price, the
  Elementalist and the Defender. A won fight offers cards from the lanes the
  character starts with and the lane of each worn relic.
- **Combat:** four dice rolled once per threat phase, Conviction, and ten
  signatures, one per relic (The Open Hand and three per lane); a character
  wears up to three relics. Three foes (Float-Eye, Green Jelly, the Death
  Beholder).
- **World:** Act 1, four regions (Breakwater, Charcoal Wood, Beacon
  Crags, the Lantern Deep), each closed by a Death Beholder's door. Rest,
  villages with the Anvil, hazards, caches, cutscenes and the Breakwater
  questline. Shillings are the one currency; healing potions the one item
  kind.
- **Progression:** levels and body/mind/heart stats; stats scale each
  card's family; dice grow only at the Anvil.
- **The app** (`axiomancer-mobile`): an expo-router shell with a tabbed
  home (character, exploration, inventory, memoir, deck), per-encounter
  routes, menu routes and dev routes. Dark-only theme; colours are named
  tokens.

The details are in [`docs/game-model.md`](docs/game-model.md), including
what the game deliberately does not have.

### Next — the checkpoint and the rebuild

1. **RC, the Act 1 checkpoint release:** T tags the reset point once the
   reset phases are done.
2. **The rebuild track (owner-led, B1-B10):** relics, card sessions (Plan
   B: lanes and families, D73), the enemy revamp (normal, elite, region
   boss, act boss), hazards, the Deck tab, card art, the Labyrinth
   re-theme, the dev menu. The loop does not start these (D58, D88).
3. **R11** decides how the loop creates content again.

### Non-goals

- **No databases, servers or containers** in mechanics. It is a pure,
  deterministic library and CLI.
- **No npm publishing.** Mobile reads mechanics as local source through
  the `@mechanics` alias.
- **No auto-deploy of the app.** It ships through manual EAS builds. The
  only hosted surface is the public DevLog.
- **No second win track.** Do not reintroduce Pressure Tracks or a
  governing objective function. <!-- lexicon-ok: pressure-tracks -->
- **No new continents** until Act 1 is rebuilt (`axiomancer-mechanics/docs/adr/ADR-0005`).

## Contracts (must not break)

See `plan/bearings.md` § "URL / API / CLI contract": the mechanics CLI
subcommands, the `@mechanics` export barrel (`src/index.ts`), the mobile
routes, the VITAE copy canon, and the seeded-RNG invariants.
