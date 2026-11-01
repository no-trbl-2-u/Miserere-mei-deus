# Card faces you can read at a glance — 2026-11-01

## Surface question
"Pitch ways for us to get more meaning on to the card faces so the player
doesn't have to click into every card to read what it does … BUT also doing
it in such a way where we're consistent across the cards." (T)

## Better question surfaced
The face was never short of space for keywords. It was short of meaning,
because the PAID line is clipped to one `[glyph] KEYWORD value` and the full
line is prose that leans on context the face never shows: the other line
("instead"), undefined states ("burning"), unstated targets ("whose LEECH?")
and shorthand that reads two ways ("2×:", "+2 each"). The fix is a wording
grammar, not a layout trick. It shortens the nouns (keywords become glyphs or
capitals), never the logic words ("or", "for each", "twice", "after each",
"="). Every line stands on its own, so the face can print all of it.

## Path taken this session
1. Opened in converge: no surface or mechanism named, only the itch.
2. t1 GOAL: read FREE and PAID without opening the card, one rule for every
   card. t2 narrowed it to PAID plus a small die cue (FREE stays a pill).
3. Round 1 (five layout patterns on Blood Price cards) was rejected: "DEAL N
   is borderline meaningless". Round 2 (one direction per lane) was also
   rejected; the problem was the wording, not the layout.
4. t5 GOAL rewritten to an MTG-grade wording grammar with keyword glyphs.
   Round 3 tried four ways: glyphs on today's text, glyphs on Reword A, and
   Reword A and B as text only.
5. Blind cold read of round 3 (Sonnet, faces plus legend plus glossary only):
   three confident wrong reads, all caused by shortened logic words.
6. Round 4: a self-contained grammar with a closed list of logic words and
   full FREE lines. The blind read had no wrong reads.
7. Round 5: T's cuts ("then" becomes punctuation, no line-end full stops, no
   "at random", debuffs land on the foe, Globals print GLOBAL). The blind
   read had one wrong read (Callus), and the confidence lost traces to three
   rules the glossary does not teach yet.
8. Parked: FREE lines should be glyph-only (62 of 104 already are, 35 need a
   rewrite). Also the soft rule "FREE is a lighter PAID or a one-keyword
   effect".

## Raw material read
- `plan/2026-09-25-refactor-strategy.decisions.md:986` (D91, D92): one card
  face everywhere. The FREE pill sits top-left, the PAID line is a single
  `[glyph] KEYWORD value`, and the full rules appear only on the large face.
  A card-face change is T's call.
- `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx`:
  - hand card `HAND_CARD_W 120 × HAND_CARD_H 176` (line 2033)
  - name 13 px; PAID keyword and value 12 px, one line, shrunk by
    `paidLedgerFit`
  - FREE pill 26 px tall, one glyph
- `axiomancer-mobile/state/combat/keywords.ts:81`: `KEYWORD_GLOSS`, the
  terse register, one sentence per keyword.
- `axiomancer-mechanics/src/Cards/library/*.cards.ts`: 104 FREE/PAID lines
  plus 16 Globals. Each card has `free: L(text, run)` and `paid: L(text, run)`.
  Globals have `trigger`, `text` and an optional `paidDelta`.
- `axiomancer-mechanics/src/Combat/combat.cards.ts:318`: how a Global's print
  is built (`GLOBAL_TRIGGER_TEXT` plus the duration sentence).

## Measured
| Finding | Data |
|---|---|
| PAID lines with more than one clause (today) | 96 / 104, average 59 characters |
| FREE lines with more than one clause (today) | 69 / 104, average 43 characters |
| PAID lines whose number depends on board state | 43 / 104 |
| FREE lines that are already glyphs only (1–3 keywords, none over 3) | 62 / 104 |
| FREE lines needing words: notation only / real rewrite | 7 / 35 (Merciful 16 of 26) |
| Globals whose FREE effect differs from PAID | 1 / 16 (Callus) |
| Blind read, round 3 (four wordings, 48 readings) | 3 confident wrong; mean confidence 2.9–3.5 |
| Blind read, round 4 (grammar, words / glyphs) | 0 wrong; PAID confidence 4.0 / 3.4, FREE 4.1 / 3.6 |
| Blind read, round 5 (T's cuts) | 1 wrong (Callus FREE); PAID 3.2, FREE 3.6 |
| Mock vs real card size | mock 122 × 184 with 12.5 px wrapping text; real 120 × 176 with one 12 px line |

Mock artifact (rounds 1–5, real art and real cards):
https://claude.ai/artifact/NQXLdEFAAarvPRyJGms5mx

## Prior art consulted
- **Magic: The Gathering, templating:** keywords are compressed, while the
  logic words ("instead", "for each", "equal to", "if") and the "Cost:
  effect" order stay fixed. It is widely praised as the gold standard for
  rules clarity, at the cost of length.
- **Slay the Spire, card text:** terse lines with keywords in bold. Numbers
  on the face update live with buffs, and a hover explains each keyword. It
  was well received, and players rarely need the wiki for card text.
- **Marvel Snap, ability text:** one or two short clauses behind a fixed
  trigger word ("On Reveal:", "Ongoing:"). Players praise how readable it is.
  No confident read on whether the brevity hides edge cases.
- **Dawncaster, keyword glossary:** the repo's own register for one-sentence
  glosses (`keywords.ts`). No confident read on its reception.

## Rulings (T, this session)
- One rule for every card; no hand-authored layout per card (t1).
- The glance shows the die the card wants (small), then the PAID effect (t2).
- Every line is self-contained: it names only entities, keywords, values and
  logic words, never its other line, another card or an undefined state (t8).
- Never "instead"; "doubled" becomes "2×"; "burning" becomes "the foe has
  INFERNO" (t5, t8).
- Keywords keep possessives: "the foe's", "your" (t6).
- Steps are separated by commas and full stops, with no "then"; lines have no
  line-end full stop (t10).
- DISCARD implies random, so "at random" is never printed (t10).
- Debuffs land on the foe unless the keyword says otherwise. An effect on you
  is a new keyword, not a qualifier (t10).
- VULNERABLE prints as `[VULNERABLE] n% for m turns` (t10).
- Globals print GLOBAL in the pill slot, with no FREE line and no duration on
  the face. The large face carries "3 turns FREE, the whole combat PAID"
  (t10).
- "equal to the foe's X" becomes "= foe's X"; "equal to your X" becomes
  "= your X" (t11).
- EXILE stands alone, never "EXILE this card" (t11).
- Build both a words face and a glyph face, chosen by a Settings toggle (t11).
- Specific lines: Cornered is `DEAL 6 or 14 at half your VITAE`; Burn
  Together's PAID line is `DEAL 9, INFERNO 4` (t8).

## Directions considered
### Option A — Live-number faces *(inspired by Slay the Spire)*
Print the resolved number for the current board ("DEAL 14") instead of the
formula. **Trade-off:** perfect for the turn, but it hides how the card
scales. **Telltale failure mode:** players are surprised when a number
changes. Parked as a later layer on top of the grammar.
### Option B — A wording grammar plus glyph substitution *(inspired by MTG templating)* — chosen
One closed grammar for every line. Keywords become glyphs (or capitals in
words mode), and the logic words stay in English. **Trade-off:** the PAID
band needs two or three lines, so the art shrinks. **Telltale failure mode:**
a blind reader turns a terse line into the wrong number, as round 3's
Cornered became "20".
### Option C — Layout tricks only (icon chains, cost chips, headline effect)
Round 1. **Trade-off:** no text change, but meaning still lives off the
face. Rejected (t4).

## What proves it (not T, not the agent)
Two checks:
- **Lint (deterministic, in `npm test`).** Every printed PAID line and Global
  line uses only keywords, numbers, entities and the closed list of logic
  words, and contains none of the retired words.
- **Blind cold read (Sonnet, faces plus legend plus glossary only, in both
  words and glyph modes).** It passes at 0 confident wrong readings on a
  sample of at least 12 cards, at least 3 per lane, with mean confidence of
  at least 3.5.

## Player fantasy
"I read my hand like a spellbook and plan the whole turn without opening a
card."

## Telltale failure mode
Players still long-press cards to check a line, or misplay a cost or a
threshold (a 6-or-14 read as 20). The first sign in the harness is a
confident wrong read on a line that uses "or", "=" or a Global trigger.

## Content boundary
Card numbers, keywords and effects do not change. The loop applies T's
grammar mechanically to every printed line and lands the result for T to
review, since card text is owner-only (D37, D88). The FREE line redesign is
excluded, apart from applying the same cuts. Callus's FREE versus PAID
mismatch is a content call for T.

## Handoff to /plot
Task: Every card face prints its whole PAID line in one self-contained
wording grammar, as glyphs or words chosen in Settings, so the player reads a
card without opening it.
Source: this file
Acceptance:
- A1 Every PAID line and Global line in `axiomancer-mechanics/src/Cards/library/*.cards.ts` follows the grammar, and a lint in the root `npm test` fails on any retired form:
  - instead, doubled, burning, then, at random, on the foe
  - rest of combat on the face, equal to (use =), EXILE this card
  - SAC, CONV, a line-end full stop
- A2 The hand card face in `CombatCardFace` (120 × 176) prints the whole PAID line, wrapping to at most 3 lines with nothing clipped. This is proven by a visual check on the phone viewport for the 12 sample cards of the mock.
- A3 A Settings toggle, "Card text: Words / Glyphs", switches every face between capitalised keyword words and glyphs. Logic words, numbers and possessives are identical in both modes, and the choice persists.
- A4 A Global's face shows GLOBAL in the pill slot, with no FREE line and no duration. The large face states "3 turns played FREE, the whole combat PAID".
- A5 `KEYWORD_GLOSS` gains three rules: steps resolve left to right; debuffs land on the foe; VULNERABLE n% means n% more damage. DISCARD says random, and "at half your VITAE" means half or less.
- A6 Text order matches resolution order on every rewritten line. A test compares each card's printed step order with its program's call order, where both can be read.

Measure: `npm test` (the grammar lint, A1 and A6). The blind cold read over the 12 sample cards in both modes passes at 0 confident wrong readings and mean confidence of at least 3.5.
Decisions made upfront: every ruling under "Rulings (T, this session)" above; the grammar and the logic-word list as in round 5 of the mock, with "=" and a bare EXILE.
Out of scope:
- FREE lines rewritten to glyphs only (35 need a rewrite; T comes back to it)
- the soft rule "FREE is a lighter PAID or a one-keyword effect"
- live resolved numbers on the face (Option A)
- new keywords for effects on you
To confirm:
- The default text mode is Words, because it read higher blind (4.0 against 3.4) [T to confirm].
- The PAID band grows to up to 3 lines at 11–12 px and the art shrinks to make room, keeping the 120 × 176 card [T to confirm].
- The loop drafts all of the rewritten lines, and T reviews them in one sitting as a T act before merge [T to confirm].
- The mock's glyph set is a placeholder. The build redraws VULNERABLE so it no longer twins with GUARD, and VITAE's heart so it no longer collides with the heart die [T to confirm].
- Callus keeps FREE GUARD X and PAID DEAL X, so GLOBAL describes its FREE play inexactly until T rules [T to confirm].
Suggested slot: anytime. This is not on the W1/W2 deadline path, and those items are overdue.
