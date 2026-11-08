# 155 — The Deck tab as a reader: one card open over its own painting, the rest in tabbed thumbnails, keywords pressed in the text

> T's pick from the three mocked Deck directions, tuned on a live page and settled by the numbers T sent back.
>
> - The Deck screen is direction C, the Reader: one card open at the top, the deck below it.
> - The open card wears its own painting as a 340 pt banner, cropped from the top so the square art keeps its face.
> - Boxed type tabs (Attacks, Skills, Spells, Globals) sit between the open card and the grid; the grid shows only the tab you are on.
> - No tallies, no screen header, no keyword chip row, no flavour.
> - A keyword in the card's own text is pressed to read it, and held to pin it.

## Why

### Sources

- **T's owner-led Deck session, 2026-11-06** (chunk 134.7, alias B7). T opened `plan/card-ledger/deck-directions.html` (shipped as 153.7, UX1g), picked **C · Reader**, and then tuned it on a controls page T calls the Reader lab, published for the session at `https://ballot-ui-kit.miserere-mei-deus.pages.dev/deck-reader-lab`. The lab is not in this repo; this spec is the record of what it settled.
- **T's brief for the screen**, carried from the kit mixer note D-01 (2026-11-06): "provoke a feeling of minimalist order while still providing images".
- **T's verdict, verbatim** — the settings changed from the lab's own starting point:

  ```
  heroH: 340
  kw: off
  flavor: off
  nmSize: 23
  ocSize: 16.5
  tabStyle: boxed
  tabCounts: off
  header: none
  guide: off
  ```

- **T's one note, verbatim:** "My only note is that the keywords should be able to be tapped and held in order".
- T's reason for the banner height, from the same session: the card paintings are square (about 490 x 490), so the mock's 208 pt banner chopped them. 340 pt of a 390 pt-wide phone keeps all but the bottom of the square once the crop is anchored at the top.

### What exists today (read 2026-11-06, at 72a6c0cf)

- **The screen.** `app/(tabs)/deck/index.tsx`: a header block (`STRIFE` / `THE DECK YOU CARRY` / a source note), a three-stat row (CARDS, DISTINCT, RARE), a RARITY tally, a COLOUR tally, then every card type as a labelled section of full-width rows. Nothing is tabbed and no card art is on the screen.
- **The rows.** `components/deck/DeckCardTile.tsx` is deliberately a text row, not a card face: name, outcome line, rarity mark, copy count. Its own comment says a face is unreadable at list density.
- **The detail.** `components/deck/DeckCardDetailOverlay.tsx` is a full-screen overlay: the keyword ledger first, then the card, then the two play lines, then flavour. It is the only place in the game that shows card flavour (owner findings 6 and 7).
- **The keyword ledger.** `components/card/CardKeywordLedger.tsx` is the one ledger combat, rewards, the deck and the hazard deck all float above a card. It is capped at 112 pt and scrolls.
- **The view-model.** `state/presenters/deck.engine.ts` already gives every card `name`, `count`, `stance` and `stanceColor`, `cardType`, `rank`, `rarity`, `outcomeLine`, `freeText`, `paidText`, `stacksText`, `keywords: {name, def, minor}[]`, `flavor` and an a11y label, grouped by card type in engine `CardType` order with `CARD_TYPE_LABEL` already reading ATTACKS / SKILLS / SPELLS / GLOBALS / CURSES. It carries **no art**.
- **The art.** `assets/images/cards/index.ts` maps card id to painting (`CARD_ART_BY_ID`, `FALLBACK_CARD_ART`) for all four lanes' cards and the three grey starters. Today only `components/combat/encounter/CombatBoard.tsx` reads it.
- **Keywords in text, already built.** `state/combat/keywords.ts` exports `keywordsInText(text)` (which registry keywords a line prints) and `keywordGloss(keyword)` (its terse gloss). Nothing on a card line is pressable yet.
- **Tap tooltips, already built.** `components/tooltip/TooltipProvider.tsx`, `TooltipTarget.tsx` and `TapTooltip.tsx`: one tooltip at a time, anchored and measured, dismissed by tap-outside or a 6 s timeout. `TooltipKind` has `hazard-keyword` but no card-keyword kind, and `TooltipTarget` fires on tap only — it has no long-press.
- **What this screen is not waiting on.** Spec 152 (the UI kit looks) leaves the Deck screen untouched on purpose (A7: "the whole Deck screen are unchanged"), and spec 153 only mocked the directions. So no kit chunk gates this one.

### The smallest version on what exists

Most of this screen is a re-arrangement of parts already built: the view-model has every line and every keyword with its gloss, the art registry has every painting, and the tooltip provider already shows an anchored gloss. What is genuinely new is three things: art on the view-model, a tab filter, and a long-press that pins a tooltip instead of timing it out. Nothing here needs an engine change, a new asset or a new word.

## Design

### The screen, top to bottom

1. **No header.** The `STRIFE` kicker, the `THE DECK YOU CARRY` title and the source note go (`header: none`). The screen opens on the card.
2. **The open card.** One card is open at a time; the first card of the first tab is open when the screen mounts.
   - **Its painting as a banner:** the card's own art from `CARD_ART_BY_ID`, full width, **340 pt tall**, covering, the crop **anchored at the top** so a square painting loses its bottom and keeps its face and weapon.
   - **Its name** over the art, at **23 pt**.
   - **Its text** under the art at **16.5 pt**: the outcome line, then the two play lines in their kept shorthand (`◇ NO DIE` and `◆ +DIE`) and the stacks footnote.
   - **No keyword chip row** above it (`kw: off`) and **no flavour** (`flavor: off`).
3. **The type tabs.** Between the open card and the grid: **boxed** tabs, one per card type the deck actually holds, reading ATTACKS / SKILLS / SPELLS / GLOBALS (and CURSES when the run carries one), **with no counts** (`tabCounts: off`). The tabs never move down the screen when a different card opens: the open card's block is a fixed height, so the tab row sits at the same place all the way through.
4. **The grid.** Below the tabs, the cards of the active tab only, as art thumbnails, **4 to a row and square**. Each thumbnail shows the painting, the card's name, its copies badge when the run carries more than one, and its colour mark — all three on. Tapping one opens it above; the cards that are not open are dimmed. The gap is the lab's default. *Confirmed by T (2026-11-06).*
5. **The tab bar** at the bottom is the app's own. This spec does not touch it: its kit treatment is 152.2 (UK1b, the tab bar wearing the look) and 153.3 (UX1c, bigger icons and no words), which T confirmed stands — "the bottom tab navigation will have the treatment". Neither gates a chunk here, because the bar is outside this screen.
6. **No guide line.** The lab's dashed tab-start marker was a lab tool (`guide: off`); nothing of it ships.

### Keywords you press

T's note is the one behaviour change. Keywords leave the ledger and move into the card's own text:

- The presenter splits each of the open card's lines (the outcome line and the two play lines) into **runs**: plain runs and keyword runs. A keyword run is a span `keywordsInText` found, carrying the keyword's name and its gloss — the card's own `keywords[]` entry when it has one (so a `minor` rider still says so), else `keywordGloss`. This is presenter work, so the component assembles no card text: it renders the runs it is handed, in order.
- A keyword run is drawn inside the line in the keyword's ink, so a player can see which words answer.
- **Tap** a keyword run: the existing tooltip provider shows its gloss, anchored to the word, dismissed by tap-outside or its own timeout. This needs one new `TooltipKind`, `card-keyword`, resolved from the registry the same way `hazard-keyword` is.
- **Hold** a keyword run: the same gloss, **pinned** — it does not time out, and it stays until it is tapped away or another keyword is pressed. This is the "and held" half of T's note, and it needs `TooltipTarget` to take a long-press and the provider to take a `pinned` flag that skips its 6 s timer.
- A keyword run keeps the word as its accessibility label and its gloss as its accessibility hint, so a screen reader reads what a press would show.
- The ledger component itself is untouched: combat, the rewards preview and the hazard deck keep it. Only the Deck screen stops drawing one. [D173]

### The detail overlay, and where flavour goes

In the Reader the open card **is** the detail, so `DeckCardDetailOverlay` has nothing left to open — and it is the only screen in the game that shows card flavour. T's `flavor: off` therefore takes flavour off the last surface that had it.

**Confirmed by T (2026-11-06): delete it.** `DeckCardDetailOverlay` and its test go, and no screen in the game shows card flavour. `flavor` stays on the view-model and `description` stays on the card data — the prose is not deleted from the game's content, only from every surface that drew it — so a later screen can pick it up without a data change.

### Decisions made upfront (do not ask)

- Every number above is T's, to the half point. They are not rounded, retuned or "improved" by the build.
- The crop is anchored at the top, not centred: that is what keeps a square painting's face.
- Nothing on this screen edits the deck. The Deck tab reads; the deck is changed by playing.
- No new art, no new card text, no new keyword and no new gloss (D88, D99). Every painting and every gloss already exists.
- The screen reads the full run deck, never a draw pile (`DECK_SOURCE_NOTE`'s reasoning stands).

### Out of scope

- The Deck screen wearing a kit look (brass or vellum). *Confirmed by T (2026-11-06): no — "keep everything as we saw it".* The screen keeps today's ground and the boxed tabs are drawn from palette tokens, which is also what spec 152 left it as. The bottom tab bar is the exception T named, and it is 152.2's and 153.3's work, not this spec's.
- Deck editing (thin, swap).
- The keyword ledger anywhere else.
- Committing the Reader lab page into this repo.

## Contracts

- `DeckCardVM` gains `art: number` (the required painting, the fallback when the id is unmapped) and `lines`, each line carrying an optional label and an ordered list of runs; a run is either plain text or a keyword run with its word, its gloss and its `minor` flag. Both are derived in `deck.engine.ts`; the components render them.
- `TooltipKind` gains `card-keyword`, resolved from the keyword registry.
- The tooltip `show()` call gains an optional `pinned` flag; pinned shows skip the auto-dismiss timer.

## Acceptance

- **A4** A keyword inside the open card's text is drawn as part of the line and is pressable: a tap shows its gloss anchored to the word, a hold pins the gloss until it is dismissed, and each keyword carries its word and gloss to a screen reader. No keyword ledger is drawn on this screen; combat, rewards and the hazard deck still draw theirs.

## Open questions

None left open. All three were answered by T on 2026-11-06, in the same session that settled the numbers:

1. The lab settings T did not change are the lab's own defaults. **Confirmed by T (2026-11-06): all as listed** — the name sits **on** the art; the card text is the **effect plus the die lines**; **4** cards per row, **square**, at the lab's default gap; card **names, copies badges and colour marks all on**; the cards that are not open **dimmed**; the **first background shade**; the app's **tab bar on**.
2. Card flavour has no home once the open card replaces the detail overlay. **Confirmed by T (2026-11-06): delete it** — the overlay goes and no screen shows card flavour; the prose stays in the card data, unused.
3. Does the Deck screen wear a kit look? **Confirmed by T (2026-11-06): no** — "the bottom tab navigation will have the treatment, but no, keep everything as we saw it". The screen keeps today's ground; the tab bar's treatment is 152.2's and 153.3's, outside this spec.

## Chunks

Measure: 1 open · 3 closed · next A5

- [ ] **155.4** Keywords tapped and held in the card's own text · M · closes A4 · needs — · alias: DR1d

### 155.1 (DR1a) — The open card: its painting as a banner, its lines under it · M · closes A1 · requires —

- `deck.engine.ts` adds `art` to `DeckCardVM` from `CARD_ART_BY_ID` and `FALLBACK_CARD_ART`, through a small accessor exported from `assets/images/cards/index.ts` (`cardArtFor(cardId)`) so `CombatBoard` and this screen read the map one way.
- `app/(tabs)/deck/index.tsx` drops the header block, the stat row and both tallies, and holds the open card's id in state. A `DeckOpenCard` component draws the banner (340 pt tall, covering, top-anchored crop), the name over the art at 23 pt, and the lines under it at 16.5 pt.
- The open card's block is a fixed height so what sits under it never moves (A3's pin).
- Measure: a screen test (no `deck-stats`, no `deck-rarity-*`, no `deck-stance-*`; the first card's name and both play lines are on screen), a presenter test that every card in a real lane deck resolves a painting, then `npm run verify -w axiomancer-mobile`. The PR carries a Deck screenshot at phone width.

### 155.2 (DR1b) — The deck below it: art thumbnails, dimmed when not open · M · closes A2 · requires 155.1

- `DeckCardTile` becomes a thumbnail: the painting, the name, the copies badge, the colour mark, and a dimmed state when the card is not the open one. Its comment about a face at list density is rewritten — the thumbnail is a painting, not a face, which is what makes it readable.
- The grid lays out **4 to a row, square**, at the lab's default gap, and keeps each card's existing a11y label.
- `DeckCardDetailOverlay`, its test and the screen's detail state all go. `flavor` stays on the view-model and `description` on the card data, unused by any screen; a comment on `flavor` says so, so the next reader does not take it for dead weight.
- Measure: tile and screen tests (a thumbnail carries its painting, badge and mark; tapping it opens that card above; the others are dimmed), `git grep DeckCardDetailOverlay` finds nothing, then `npm run verify -w axiomancer-mobile`. The PR carries a screenshot per tab.

### 155.3 (DR1c) — Boxed type tabs between the two, one type at a time · S · closes A3 · requires 155.2

- A `DeckTypeTabs` row between the open card and the grid: boxed tabs from the view-model's `groups`, no counts, the active one selected, each with its own a11y label and selected state.
- The screen holds the active type and renders only that group's cards. Opening a card from a tab leaves the tab where it is.
- A layout test pins the tab row's vertical offset across two different open cards, so the row does not drift.
- Measure: a screen test (four tabs for a four-type deck, only the active type's cards present, switching tabs swaps them), the layout pin, then `npm run verify -w axiomancer-mobile` and `npm run verify:visual` for the deck route.

### 155.4 (DR1d) — Keywords tapped and held in the card's own text · M · closes A4 · requires 155.1

- `deck.engine.ts` adds the lines' runs, splitting each line with `keywordsInText` and resolving each keyword's gloss from the card's own `keywords[]` first (keeping `minor`), then `keywordGloss`. A line with no keyword is one text run.
- `tooltip.engine.ts` adds the `card-keyword` kind, resolved from the registry beside `hazard-keyword`.
- `TooltipTarget` takes a long-press and the provider an optional `pinned` flag that skips the 6 s timer; a pinned tooltip is dismissed by tap-outside, by `hide()`, or by the next keyword press.
- `DeckOpenCard` renders keyword runs as pressable spans inside the line, in the keyword's ink, each carrying the word as its a11y label and the gloss as its a11y hint.
- The Deck screen draws no `CardKeywordLedger`; the component and its other callers are untouched.
- Measure: presenter tests (a line's runs for a card with two keywords, and for one with none, with the card's own def preferred over the registry's), a component test (tap shows the gloss; long-press shows it pinned and it survives the timer; the next press replaces it), a test that the Deck screen renders no `card-keyword-ledger`, then `npm run verify -w axiomancer-mobile`. The PR carries a screenshot of a pinned gloss.
