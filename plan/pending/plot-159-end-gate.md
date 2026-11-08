---
date: 2026-11-08
---

## Add plan/159-tu1-phone-touch-ups.md
~~~ acceptance
- **A?onelinename** Every card name draws on one line in a band sized for one line, on the hand card, the Spoils tile and the large face: a name too long for the line steps its font down to fit (floor about 10 pt) rather than wrapping or truncating, and art height is the same on every card of a size.
- **A?nopluspill** The free cost pill never prints a leading "+" ("+2" reads "2", "+35%" reads "35%"); a "-" stays. This holds everywhere a card face draws the pill: hand, Spoils tiles, the large inspect face, and the Deck.
- **A?blackpanel** The card face's name band and text panel are one black (`HUE.black`, via an AXM token), and the art meets them with no visible line: a short fade from the art into the black at each edge, so a painting whose edge is not pure black blends rather than cuts.
- **A?deckcaps** The Deck's open card prints keywords in capitals (VULNERABLE), matching the card faces and combat, in both play lines, and they stay pressable.
~~~
~~~ section Sources
- **T's end-gate answers (2026-11-08, after `/pilot 158.1 159`),** shown a 3x crop of the hand with the two-line name band: "Always one line, shrink text" (names on one line, long names shrink); on the Deck reader's title-cased keywords: "Keywords should remain caps". Then: "I don't want the "+" in the free cost. "-" can stay." and "I want the card text background to be the same color as the art's background so there's [no] cutoff line between sections", answered as: no visible line (blend), "One black for them all", "+" removed everywhere a card shows the pill.
~~~
~~~ chunks
- [ ] **159.?tidy** Card names on one line that shrink to fit; no "+" on the free pill; one black text panel the art fades into; Deck keywords in capitals · M · closes A?onelinename, A?nopluspill, A?blackpanel, A?deckcaps · needs — · alias: TU1e
  - `components/combat/encounter/CombatBoard.tsx`: `nameBandHeight` reserves one line (`PLATE_NAME.*.lineHeight` plus pill room when the face shows one) for normal, narrow and large faces; the name `Text` is `numberOfLines={1}` with a computed font size per face width (largest step that fits the longest word line, floor about 10 pt), not `adjustsFontSizeToFit` alone, so web and native agree. Find the longest names from the card data (today "Stir the Thundersnow", "Call Lightning Twice", "Call Back a Kindness"); say the size each gets on the 95 pt hand column and the 71 pt narrow column.
  - Update the name-band tests (`CombatCardFace.name-band.test.tsx`, `CombatCardFace.glyph-mode.test.tsx`) so a two-line band or a wrapped name fails them.
  - `state/presenters/deck.engine.ts` / `components/deck/DeckOpenCard.tsx`: the keyword run draws its word in capitals (`run.word`, already "VULNERABLE"), not the registry's title case; the a11y label stays. Test: the open card of A Plain Word shows "VULNERABLE" in both play lines and the keyword is still pressable.
  - `CombatBoard.tsx` `compactFree`: drop the leading "+" it adds (`+${im[1]}`, `+${nm[1]}${nm[2]}`); keep a "-" when the value is negative. Check every other place the pill value is built (presenters such as `card-program.engine.ts` that format `+N%`) and strip the "+" only where it feeds the pill, not floating combat numbers. Test: the pill for a +2 card reads "2", a +35% card reads "35%", a negative value keeps "-".
  - `faceOuter`, `faceCard`, `plateBand`, `plateLedger` backgrounds: one black (add an AXM token for `HUE.black` if none exists; no hex literals). Add an edgeless gradient (about 12 pt, clear to black) at the art's top and bottom inside `plateArtFrame`, `pointerEvents="none"`, so no seam shows. Test: the band and ledger share the face's black, and the fade views render on normal, narrow and large faces.
  - Measure: `npm run verify -w axiomancer-mobile`; CI re-stamps `combat-board`, `village` and `deck` where they change.
~~~

## Edit plan/README.md
~~~ old
- **99.10** · automate footgun `windows-tar-tree-lint` (seen 2×), spec 99's ladder chunk.
~~~
~~~ new
- **99.10** · automate footgun `windows-tar-tree-lint` (seen 2×), spec 99's ladder chunk.

- **159.?tidy** · TU1e: card names on one line that shrink to fit; no "+" on the free pill; one black text panel; Deck keywords in capitals (T's end gate, `/plot`, 2026-11-08)
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
