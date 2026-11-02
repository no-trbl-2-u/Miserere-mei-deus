# 143 — The X amount on a staged card always shows its number

> The "SACRIFICE any amount" stepper on a staged card shows its amount at two digits, and gives up part of its label before it gives up the number.

## Why

### Sources

- Bug report from T with a screenshot, 2026-11-02, attended: "These 'set X' areas are truncated above 9".
  The screenshot shows a staged Heart card whose stepper row reads "− SACRIFICE _ +": the amount is cut off. The card's
  line reads "X (max 21)".

### What is wrong today (read 2026-11-02, at 4ec05e65d)

`CombatBoard.tsx:770-780` draws the stepper as one row: a `−` button, one `Text` holding the whole string
`SACRIFICE <x>` with `numberOfLines={1}`, and a `+` button. The row is `flexDirection: 'row'` with
`justifyContent: 'space-between'`, `paddingHorizontal: 8`, and a width of the staged card (`styles.xRow`, `:2346`).
The text has no `flexShrink` and no fixed width, so when label plus number is wider than the space left between the two
buttons, the end of the string is the part that is cut, and the end is the number. The text is monospace at 10 px, so
one more digit is one more cell of width: every amount of 10 or more can cut, and the card lines that allow them
reach 12 to 21 (`SACRIFICE X (max 12)` up to `max 21` in `blood-price.engine.test.ts`).

Not reproduced by playing: a Blood for Blood needs a matching Body die, and the test fight did not deal that pair in
the turns tried. The cause is read from the code and matches T's screenshot, which is the reproduction.

## Design

This is a layout fix in `axiomancer-mobile`. The amount, its range and the buttons stay as they are.

The row keeps its three parts. The middle becomes a row of two `Text`s: the label (`SACRIFICE`), which may shrink and
cut itself short (`flexShrink: 1`, `numberOfLines={1}`), and the amount, which never shrinks (`flexShrink: 0`). The row
is centred between the buttons as today. A narrow card loses the end of the label, never a digit.

| Card width | What shows |
|---|---|
| Room for label and amount | `SACRIFICE 12`, as today |
| Room for the amount and part of the label | `SACR… 12` |
| Room for the amount only | `12` |

### Decisions made upfront (do not ask)

- The number outranks the label (T, 2026-11-02: "truncated above 9").
- No change to the amount's range, the step buttons, the font or the card width.
- No card text, keyword or art change (D37, D88).

### Out of scope

- Other truncated text on the staged card or the hand (the screenshot shows only this row).
- Resizing the staged card.

## Acceptance

- **A1** The stepper's amount is drawn by its own `Text` that cannot shrink, so a two-digit amount is never cut.
- **A2** The label is drawn by its own `Text` that may shrink and cut, and is always to the left of the amount.
- **A3** The amount's text is the amount alone, and the stepper's buttons and range work as they did.

## Open questions

None.

## Chunks

Measure: 3 open · 0 closed · next A4

- [ ] **143.1** The X amount always shows its number · S · closes A1, A2, A3 · needs — · alias: XR1a

### 143.1 (XR1a) — The X amount always shows its number · S · closes A1-A3 · requires —

- `components/combat/encounter/CombatBoard.tsx`: split the stepper's middle `Text` per Design and add the styles beside
  `xValue` (`:2346-2351`). Keep the existing testID on the amount and add one for the label.
- `components/combat/encounter/__tests__/CombatBoard.program-cards.test.tsx` (`:84,87`): the two reads of
  `combat-x-value-<uid>` now expect the amount alone, and a new case pins A1 and A2 on the styles at 12, the largest
  base amount, and at 21.
- Measure: `npx jest components/combat` in `axiomancer-mobile`, then `npm run verify -w axiomancer-mobile`. Run it where
  no dev server has generated `axiomancer-mobile/expo-env.d.ts`: that file turns `tsc` red on `useDockDrag.tsx`.
- T looks at a staged Blood for Blood or a Heart X card on the preview build and sees the number at two digits.
