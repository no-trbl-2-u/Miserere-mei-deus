---
date: 2026-11-06
---

## Edit plan/README.md

~~~ old
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 154 | The UI kit, round 2: the node screens, new game and the endings, and T's notes on each | [154-uk2-ui-kit-round-2.md](154-uk2-ui-kit-round-2.md) | planned | 9 left |
~~~
~~~ new
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 155 | The Deck tab as a reader: one card open over its own painting, the rest in tabbed thumbnails, keywords pressed in the text | [155-dr1-deck-reader.md](155-dr1-deck-reader.md) | planned (**Asap**: each chunk) | 4 left |
| 154 | The UI kit, round 2: the node screens, new game and the endings, and T's notes on each | [154-uk2-ui-kit-round-2.md](154-uk2-ui-kit-round-2.md) | planned | 9 left |
~~~

## Edit plan/README.md

~~~ old

**Held** (waits on a person's word; never picked until the
~~~
~~~ new

- **155.1** · DR1a: the open card, its painting as a banner, its lines under it (T's Deck session, `/plot`, 2026-11-06; B7's output)
- **155.2** · DR1b: the deck below it, art thumbnails, dimmed when not open (T's Deck session, `/plot`, 2026-11-06)
- **155.3** · DR1c: boxed type tabs between the two, one type at a time (T's Deck session, `/plot`, 2026-11-06)
- **155.4** · DR1d: keywords tapped and held in the card's own text (T's note on the Reader lab, `/plot`, 2026-11-06)

**Held** (waits on a person's word; never picked until the
~~~

## Decisions

- **D?deck-keywords-in-text** · 2026-11-06 · On the Deck screen a card's keywords are learned by pressing the keyword in the card's own text — a tap for the gloss, a hold to pin it — and no keyword ledger is drawn above the card. Every other card surface (combat, the rewards preview, the hazard deck) keeps `CardKeywordLedger`. *Why:* T's own note on the Reader lab ("the keywords should be able to be tapped and held in order") with the chip row off; the ledger's reason for existing — definitions before the line that uses them — is met better by the definition being on the word itself, and only on a screen the player reads at leisure, never mid-fight.
