---
date: 2026-11-08
---

## Add plan/159-tu1-phone-touch-ups.md
~~~ acceptance
- **A?onelinename** Every card name draws on one line in a band sized for one line, on the hand card, the Spoils tile and the large face: a name too long for the line steps its font down to fit (floor about 10 pt) rather than wrapping or truncating, and art height is the same on every card of a size.
- **A?deckcaps** The Deck's open card prints keywords in capitals (VULNERABLE), matching the card faces and combat, in both play lines, and they stay pressable.
~~~
~~~ section Sources
- **T's end-gate answers (2026-11-08, after `/pilot 158.1 159`),** shown a 3x crop of the hand with the two-line name band: "Always one line, shrink text" (names on one line, long names shrink); on the Deck reader's title-cased keywords: "Keywords should remain caps".
~~~
~~~ chunks
- [ ] **159.?tidy** Card names on one line that shrink to fit; Deck keywords in capitals · M · closes A?onelinename, A?deckcaps · needs — · alias: TU1e
  - `components/combat/encounter/CombatBoard.tsx`: `nameBandHeight` reserves one line (`PLATE_NAME.*.lineHeight` plus pill room when the face shows one) for normal, narrow and large faces; the name `Text` is `numberOfLines={1}` with a computed font size per face width (largest step that fits the longest word line, floor about 10 pt), not `adjustsFontSizeToFit` alone, so web and native agree. Find the longest names from the card data (today "Stir the Thundersnow", "Call Lightning Twice", "Call Back a Kindness"); say the size each gets on the 95 pt hand column and the 71 pt narrow column.
  - Update the name-band tests (`CombatCardFace.name-band.test.tsx`, `CombatCardFace.glyph-mode.test.tsx`) so a two-line band or a wrapped name fails them.
  - `state/presenters/deck.engine.ts` / `components/deck/DeckOpenCard.tsx`: the keyword run draws its word in capitals (`run.word`, already "VULNERABLE"), not the registry's title case; the a11y label stays. Test: the open card of A Plain Word shows "VULNERABLE" in both play lines and the keyword is still pressable.
  - Measure: `npm run verify -w axiomancer-mobile`; CI re-stamps `combat-board`, `village` and `deck` where they change.
~~~

## Edit plan/README.md
~~~ old
- **99.10** · automate footgun `windows-tar-tree-lint` (seen 2×), spec 99's ladder chunk.
~~~
~~~ new
- **99.10** · automate footgun `windows-tar-tree-lint` (seen 2×), spec 99's ladder chunk.

- **159.?tidy** · TU1e: card names on one line that shrink to fit; Deck keywords in capitals (T's end gate, `/plot`, 2026-11-08)
- **160.1** · MG1a: the merge decision re-runs when the verify gate finishes (T's end gate, `/plot`, 2026-11-08)
~~~

## Edit plan/README.md
~~~ old
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
~~~
~~~ new
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 160 | A passed review still merges when the verify gate finishes after it | [160-mg1-merge-after-late-gate.md](160-mg1-merge-after-late-gate.md) | planned (**Asap**: 160.1) | 1 left |
~~~
