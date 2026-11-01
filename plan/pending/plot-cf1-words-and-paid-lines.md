---
date: 2026-11-01
---
## Add plan/137-cf1-card-face-grammar.md
~~~ section Design
### The pending words and the long PAID lines (T, 2026-11-01, after 137.2 and 137.3)

- **The 49 pending words are approved.** 137.2 (PR #1315) made every card pass the grammar lint by accepting 49
  words outside the closed lists, listed under "Pending T" in `docs/card-voice.md` §3 and as
  `FACE_PENDING_LOGIC_WORDS` (17, `+` among them) and `FACE_PENDING_CONTENT_WORDS` (32) in
  `axiomancer-mechanics/src/Cards/card-rules.ts`; PR #1315's description carries the word-level table T asked for.
  Confirmed by T (2026-11-01): "For now, approve them all". So every one joins the closed lists, in the voice
  guide and in the lint, and the "Pending T" heading goes. A word added after this is T's call again, as §3 says.
- **A PAID line fits the small face at 10 px in three rows.** 137.3 prints the PAID line at `PAID_LINE_SIZE` (10 px)
  in at most `PAID_LINE_ROWS` (3) rows and shrinks toward `PAID_LINE_FLOOR` (8 px), cutting the third row with an
  ellipsis (`axiomancer-mobile/state/presenters/paid-line.engine.ts`, `paidLineFit`). Measured with the face's own
  estimator (`paidLineRows`) on `main` at `bf5efda9e`, three library lines take more than three rows at 10 px:
  Boil to Steam (`Spend all your INFERNO, BLIZZARD 2 for each INFERNO spent, INFERNO 2 for each INFERNO spent (foe
  only). EXILE`, 5 rows at 10 px and still 4 at 8 px, the only clipped card, and `(foe only)` is outside the
  voice), Not Yet (`Damage cannot take you below 1 VITAE this turn, HEAL N at the start of your next turn. EXILE`,
  4 rows) and Feeding Mark (`VULNERABLE N% for 2 turns, HEAL N each time the foe loses VITAE for 2 turns. EXILE`,
  4 rows). (137.3's close note counted 31 lines over 44 characters; that was a character estimate, and the
  estimator shows these 3.) Confirmed by T (2026-11-01): "/plot both", so the three are reworded in the voice to
  fit, and a test keeps every future PAID line inside three rows at 10 px. Card text is owner content (D37, D88):
  the rewording lands as a `review:rules-change` PR that T merges, and no `run` body or number changes. A line that
  cannot fit without changing its effect is parked for T, never fitted by changing the effect.

**CF1e, the pending words approved.** Move every word in `FACE_PENDING_LOGIC_WORDS` into `FACE_LOGIC_WORDS` and every
word in `FACE_PENDING_CONTENT_WORDS` into `FACE_CONTENT_WORDS`, delete the two pending sets and their check in
`faceLineIssues`, and update `checkFaceGrammar`'s header to name the closed lists without a pending clause. In
`docs/card-voice.md` §3, the logic words join the table (one row per word or a grouped row, each with its meaning
and an example line from the library, `+` between two values as in `DEAL 2 + your INFERNO`), the content words
join a closed content list beside `spent`, and the "Pending T" heading and its paragraph go. No card text changes;
the lint stays green over the whole library with the exemptions fixture empty for the face-grammar rule; a unit
test pins one formerly pending logic word and one content word passing, and a word outside every list still
failing. It builds on 137.4 (PR #1318) so the voice guide and `card-rules.ts` are edited once over the glyph mode.

**CF1f, the three long PAID lines reworded.** Rewrite the PAID text of Boil to Steam
(`axiomancer-mechanics/src/Cards/library/elementalist.cards.ts`), Not Yet and Feeding Mark
(`axiomancer-mechanics/src/Cards/library/blood-price.cards.ts`) in the voice (`docs/card-voice.md`) so each fits
`PAID_LINE_ROWS` at `PAID_LINE_SIZE` on the 120-wide hand card, leaving every `run` body and number byte-for-byte as
it is; Boil to Steam loses `(foe only)` (§4: an effect lands where its keyword says, so the line says it with a
keyword or an entity, never a qualifier). Add a test in the mobile presenters that every library card's PAID face
line (`paidFaceLine`, at base and upgraded level) gives `paidLineRows(line, PAID_LINE_SIZE,
paidLineRoom(HAND_CARD_W)) <= PAID_LINE_ROWS`, naming each card that does not, so a future long line fails loudly
in `npm test`; it measures with the glyph widths 137.4 sets in `paid-line.engine.ts`, in both text modes. The PR
carries `review:rules-change` and an old/new table of the three lines with their row counts, and T merges it. A
line that cannot fit without changing its effect is parked for T (`/oversight` queue) with the candidate wordings,
and the chunk ships the others.
~~~
~~~ acceptance
- **A?words** Every word `docs/card-voice.md` §3 listed under "Pending T" sits in the closed logic or content
  list, in the voice guide and in `card-rules.ts`; no pending set or heading remains, no card's text changed, and the
  face-grammar lint passes the whole library with no exemption.
- **A?paidfit** Every library card's PAID face line, at base and upgraded level and in both text modes, fits
  `PAID_LINE_ROWS` rows at `PAID_LINE_SIZE` on the 120-wide hand card by the face's own estimator, pinned by a test
  that names any card over; Boil to Steam, Not Yet and Feeding Mark are reworded in the voice to fit, with no `run`
  body or number changed.
~~~
~~~ chunks
- [ ] **137.?words** The 49 pending words approved into the closed lists · S · closes A?words · needs 137.4 · alias: CF1e
- [ ] **137.?paidfit** The three long PAID lines reworded to fit, and a test that keeps them fitting · S · closes A?paidfit · needs 137.4 · alias: CF1f
~~~
