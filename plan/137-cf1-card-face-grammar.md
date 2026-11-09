# 137 — Card faces you read without opening: one wording grammar, as words or glyphs

> Every hand card prints its whole PAID line in one self-contained wording grammar (keywords in capitals or as glyphs, chosen in Settings), every Global says GLOBAL, and a blind reader gets every line right from the face alone.

## Why

### Sources

- `/pitch` with T, 2026-11-01 (attended, eleven turns, five mock rounds, three blind cold reads), written up as
  `braindump/2026-11-01-card-face-meaning.md`; T closed it with "Okay, I think that'll do! Plot it!". The pitch file
  carries every ruling with its turn, the measured numbers and the mock artifact
  (https://claude.ai/artifact/NQXLdEFAAarvPRyJGms5mx, rounds 1-5 on twelve real cards with real art).
- T, verbatim (the opening): "pitch ways for us to get more meaning on to the card faces so the player doesn't have
  to click into every card to read what it does … BUT also doing it in such a way where we're consistent across
  the cards."
- Decisions it rests on: D91 (one card face everywhere: FREE pill top-left, name, seamless art, the die cube plus a
  one-line PAID ledger; a face change is T's call, and T made it here), D92 (the combat board and its full-width
  hand fan), D37 and D88 (card text is owner-only; T wrote the grammar and approves the rewrite, see Design), D99
  (the card hold is lifted).

### What exists (verified 2026-11-01 on `origin/main` `aac276768`)

- **The small face prints one keyword and one number.** `CombatCardFace` in
  `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx` sizes the hand card at `HAND_CARD_W 120` by
  `HAND_CARD_H 176` (line 2033). Its PAID ledger is `familyGlyph + KEYWORD` and a value (`keywordText`, `paidValueFor`,
  about line 1878), one line, shrunk to fit by `paidLedgerFit` (line 1776). The name is 13 px, the keyword and value
  12 px; the FREE pill is 26 px tall and holds one glyph (`freeGlyph`, `FREE_KW_GLYPH`, from
  `state/presenters/combat-encounter.engine.ts` `freeGlyphMeta`). The face VM's `keyword` and `heroText` come from
  `MechHeadline` (`combat-encounter.engine.ts:1538`), not from the printed line.
- **The printed lines.** Each card in `axiomancer-mechanics/src/Cards/library/*.cards.ts` carries
  `free: L(text, run)` and `paid: L(text, run)`; a Global carries `global: { trigger, text, paidDelta?, free, paid }`
  or `turnGlobal(text, run)`. `cardLinesText(card)` (`Cards/card-rules.ts:96`) returns the two printed lines, and the
  Global print adds `GLOBAL_TRIGGER_TEXT` and a duration sentence (`Combat/combat.cards.ts:318`).
- **Rules over printed text already exist.** `Cards/card-rules.ts` holds `checkComplexityBudget`, `checkDiscardCost`,
  `checkGlobalTemplate` (no printed duration in a Global's body), `checkCarrierRule`, run over the library by
  `Cards/card-rules.test.ts` and `Cards/e2e/card-rules.engine.test.ts`. `recordVerbs(run, query)` records a line's
  verbs in call order under the probe queries, which is what an order check needs.
- **The glossary.** `KEYWORD_GLOSS` in `axiomancer-mobile/state/combat/keywords.ts:81`, one terse sentence per keyword
  (the Dawncaster register), plus the systems glossary (`CONVICTION ◆`, `GLOBAL`).
- **Settings.** `axiomancer-mobile/state/settings.ts` holds one persisted `settingsStore` (`PlayerSettings`: reduced
  motion, haptics, text scale, music, volumes), shown by `state/presenters/settings.engine.ts`. A new preference is
  one field there.
- **Measured** (the pitch's numbers): 96 of 104 PAID lines have more than one clause, averaging 59 characters; 43 of
  104 PAID numbers depend on the board; 1 of 16 Globals (Callus) does something different FREE and PAID. Blind
  cold reads (Sonnet, the face plus a legend plus the glossary only): round 3's shortened wording made 3 confident
  wrong reads; round 4's grammar made none (PAID confidence 4.0 in words, 3.4 in glyphs); round 5, with T's cuts,
  made one (Callus FREE) at 3.2, the drop all traced to rules the glossary does not teach yet.

### Outcome

A player reads every card in hand without opening it. The PAID line is printed whole on the small face, in one
grammar every card shares; Settings switches the keywords between capitalised words and glyphs; a Global's face
says GLOBAL and nothing about its duration, which the opened card's NO DIE / +DIE rows state (T, 2026-11-01); and the
glossary holds the three rules the short lines lean on, with no opened card printing them.

Measure: `npm test` passes the grammar lint and the order test over the whole library with no allow-list, and a
blind cold read of the twelve sample cards (Sonnet, face plus legend plus glossary only) in both modes makes 0
confident wrong readings at a mean confidence of 3.5 or more.

## Design

### The grammar (T's rulings, 2026-11-01)

The whole voice, with the retired forms, the patterns the blind reads found and the examples, is
[`docs/card-voice.md`](../docs/card-voice.md), written in this plot; it is what 137.2 writes every line from and what
137.1's lint enforces. The summary:

A printed line names only entities (you, the foe, your hand), keywords, numbers and the closed list of logic words
below. It never points at its other line, another card or an undefined state.

| Logic word | Meaning |
|---|---|
| `,` and `.` | the next step; steps resolve left to right; a full stop parts a cost or setup from the payoff |
| `or N at …` / `or N if …` | the number N replaces the first when the condition holds (`DEAL 6 or 14 at half your VITAE`) |
| `+N for each …` | adds per unit |
| `=` | copies a value when the step resolves (`DEAL = foe's MERCY`, `GUARD = your THORNS`) |
| `2×` | multiplies a value, never a repeat |
| `twice` · `after each` | repeats the action; `after each` hangs a rider on every repeat |
| `When you … :` | a Global's trigger |
| `for N turns` | how long a status lasts |

Retired, and failed by the lint: `instead`, `doubled`, `burning`, `then`, `at random`, `on the foe`,
`equal to`, `this card` after EXILE, `rest of combat` or any duration on a Global's face line, `gain N` before a
keyword (`CONVICTION 5`, not `gain 5 Conviction`), `+` before a VULNERABLE percent, the abbreviations `SAC` and
`CONV`, a keyword printed in anything but capitals, and a full stop at the end of a line.

The twelve sample cards, as they print after this spec (base level; FREE · PAID):

| Card | FREE | PAID |
|---|---|---|
| Burn Together | `DEAL 3` | `DEAL 9, INFERNO 4` |
| Encase in Ice | `BLIZZARD 3` | `BLIZZARD 5, GUARD = foe's BLIZZARD` |
| Strike the Burning | `DEAL 3` | `DEAL 4 or 8 if the foe has INFERNO` |
| Shatter the Frost | `DEAL 2, BLIZZARD 2` | `Spend all the foe's BLIZZARD, DEAL 3 +2 for each spent` |
| Weight of Grace | `DEAL = foe's MERCY` | `DEAL 2× foe's MERCY` |
| Shield Bash | `GUARD 4` | `DISCARD 1. GUARD 8, DEAL = your GUARD` |
| Cracking Swing | `VULNERABLE 25% for 1 turn, DEAL 2` | `DISCARD 2. VULNERABLE 75% for 2 turns, DEAL 8` |
| Open Vein | `TETHER 2, SACRIFICE 2` | `TETHER 3, SACRIFICE 4, LEECH 2` |
| Double-Edged | `DEAL 6, SACRIFICE 2` | `DEAL 9, twice; SACRIFICE 2 after each` |
| Bloodletting | `SACRIFICE 3, CONVICTION 2` | `SACRIFICE 6, CONVICTION 5. EXILE` |
| Cornered | `DEAL 3 or 6 at half your VITAE` | `DEAL 6 or 14 at half your VITAE` |
| Callus | (GLOBAL) | `When you SACRIFICE X: DEAL X` |

### Decisions made upfront — DO NOT ASK

- One grammar for every printed line, FREE and PAID and Global, in every lane and the grey cards; no per-card face
  layout (T, t1).
- The glance is the die the card wants (the cube, small) and then the PAID line (T, t2).
- Every line is self-contained; never `instead`; `doubled` becomes `2×`; `burning` becomes `the foe has INFERNO`
  (T, t5 and t8).
- `then` becomes punctuation; no line-end full stop; DISCARD is always random, so `at random` is never printed
  (T, t10).
- Debuffs land on the foe unless the keyword says otherwise; an effect on you is a new keyword, never a qualifier
  (T, t10). So `on the foe` is never printed.
- VULNERABLE prints `VULNERABLE n% for m turns` (T, t10).
- A Global prints GLOBAL in the FREE pill's place, no FREE line and no duration on any face, small or large; the
  duration lives in the opened card's NO DIE / +DIE rows ("In play 3 turns", "In play for the rest of combat"), and
  the large face's line "3 turns played FREE, the whole combat PAID" is gone (T, 2026-11-01, superseding t10).
- `equal to the foe's X` prints `= foe's X`; `equal to your X` prints `= your X` (T, t11). EXILE stands alone (T, t11).
- Two faces, words and glyphs, chosen by a Settings toggle (T, t11). Logic words, numbers and possessives are the same
  in both modes; only the keyword changes form.
- Cornered prints `DEAL 6 or 14 at half your VITAE`; Burn Together prints `DEAL 9, INFERNO 4` (T, t8).
- **Numbers and effects do not change**, with one exception (Callus, below). Only the printed text, the face that
  prints it and the glossary change; every other card's program body (`run`) stays byte-for-byte as it is.
- **The rewrite follows the voice guide.** 137.2 writes every printed line from `docs/card-voice.md`, T's rules
  from the pitch, and lands as a `review:rules-change` PR that T merges (D37, D88); the loop invents no wording
  beyond the guide. Confirmed by T (2026-11-01): the rules are settled, so write them down and write every card in
  that voice.
- FREE lines get the same cuts and nothing more; making every FREE line glyph-only (35 of 104 need a real rewrite)
  is T's later session, under Follow-ups.
- The small face keeps the 120 by 176 hand card. The PAID band grows to as many as three lines at 10 px and the art
  shrinks to make room; the name and the FREE pill keep their place. Confirmed by T (2026-11-01): 10 px. T runs a
  card-size test after this plot; its result may change the card's size, not this grammar.
- The default text mode is Words: words read higher blind (PAID 4.0 against 3.4). Confirmed by T (2026-11-01).
- The glyph set is new and sits beside the family glyphs: one glyph per printed keyword, drawn as inline icons at
  text size and coloured by what the keyword is (damage, defence, blood, hex, resource, weather). The mock's set is
  used as drawn (MERCY a laurel, never the hourglass). Confirmed by T (2026-11-01): use these for now; T may bring
  generated images later, and DEAL and VULNERABLE are keepers.
- **A Global has one effect.** Played FREE it lasts 3 turns, PAID the whole combat, and nothing else differs; no
  Global carries a FREE body or a PAID change. Callus's FREE GUARD X goes, so Callus deals X either way (the one
  effect change in this spec). Confirmed by T (2026-11-01): drop the FREE section entirely from all Globals.
- The foe's possessive drops `the` only after `=` (`= foe's MERCY`); everywhere else it keeps it (`Spend all the
  foe's BLIZZARD`, `if the foe has INFERNO`). Confirmed by T (2026-11-01).

### Chunk notes

**137.1, the lint and the order test (contract first).** `checkFaceGrammar(cards)` in `Cards/card-rules.ts`, beside
the other checks and exported the same way: it tokenises each printed line (`cardLinesText`, plus a Global's
`text` and `paidDelta`), with the `{deal:N}`-style tokens read as numbers, and fails a line on any retired form or on
a word that is neither a keyword (the atlas set the carrier rule reads), a number, an entity or a closed logic word.
A word list that is honestly content (a card's own noun, such as `BLIZZARD spent`) is part of the closed list, named
in the function's header. `checkTextOrder(cards)` compares each line's printed keyword order with `recordVerbs`'s
call order under the probe queries, where both can be read, and fails a mismatch. Both run over the library in
`card-rules.engine.test.ts` as two more rules beside the others, reading the existing exemptions fixture
(`Cards/e2e/card-rules.exemptions.json`, seeded with today's offenders, so `main` stays green; a listed offender that
now passes fails as stale). Unit tests in `card-rules.test.ts` pin one failing line per retired form.
`docs/card-spec.md` gains a §6 pointer to `docs/card-voice.md` and two §17 rows. No card text changes in this chunk.

**137.2, every line rewritten.** Apply the grammar to every FREE, PAID and Global line in the six library files,
from `docs/card-voice.md`, keeping each `run` untouched, and empty 137.1's exemptions for the two rules. Globals
collapse to one effect: the Global program keeps a single body (`free`, `paid` and `paidDelta` become one `run`,
`turnGlobal` already has that shape), `checkGlobalTemplate` drops its PAID-change clause, and Callus loses its FREE
GUARD. Add to `KEYWORD_GLOSS` and the systems glossary:
steps resolve left to right; debuffs land on the foe; `VULNERABLE n%` means n% more damage from every hit; DISCARD
is random; `at half your VITAE` means half or less; GLOBAL lasts 3 turns played FREE and the whole combat PAID.
The PR carries `review:rules-change` and a table of every changed line (old, new), so T reads it in one pass.
Tests and fixtures that pin a printed string move with it.

**137.3, the face prints the line.** The face VM gains the printed PAID line (from `cardLinesText`, with live
numbers resolved as the ledger does today), and `CombatCardFace` renders it wrapping to at most three lines at the
small size, the art shrinking to make room; the large face prints the same line bigger. The one-line `paidLedgerFit`
ledger goes from the small face. A Global's small face shows a GLOBAL plate where the FREE pill sits and its PAID
line with no duration; its large face states the duration. Every surface that shows the small face (the hand,
rewards, the deck tab, the reward overlay) follows, since D91 is one face everywhere.

**137.4, the glyph mode and the toggle.** `PlayerSettings.cardText: 'words' | 'glyphs'` (default `words`), shown in
Settings with the text-size row. In glyph mode the face replaces each printed keyword with its glyph and nothing
else; the open card prints the same line as the hand, in the chosen mode, never both. The glyph set per the
decision above, one component per glyph, with an accessibility label of the keyword word. The verify gate runs the
blind cold read (the Measure) over the twelve sample cards in both modes and records the table in the PR.

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

### The open card prints the hand's line (T, 2026-11-01, on the preview APK at `dab4c03b0`)

T's ruling: "It was all keywords would be REPLACED by glyphs, not both." The pitch's round 5 mock prints a face's
whole line in one of two runs, all words or all glyphs. "The large face shows the glyph beside the word in both
modes, so a glyph is learnt once" was never T's: it was added while writing 137.4, and it is struck.

The bug, seen in Words mode. Draw the Fever opened printed `<die>: <DEAL glyph> Deal 2`, with `Deal 2` in grey mono
title case and LEECH 2 gone, while the same card in hand printed `DEAL 2, LEECH 2`; Siphon opened printed a glyph, the
stat-family heart and `LEECH 4` together. The cause: `CombatCardFace`'s large branch still rendered the one-keyword
headline from before 137.3 (`f.keyword` and `f.heroText`, not `f.paidLine`). A plain DEAL has no headline keyword, so
the whole `Deal 2` became the value, in `FONTS.mono`, tinted `AXM.ash` when a stat lowered the number, and every later
step of the line was dropped.

**CF1g, the open card prints the hand's line.** Both faces print `f.paidLine` through one component, from
`paidLineRuns` and `paidLineWords`, in the parchment ink rule, with the die and colon leading the line's first row.
The large face prints at `largePaidLineSize(width)` and wraps with no row cap. The stat-family icon goes from the
line, since the die already says it. An armed card's glyph-mode words and glyphs follow the same ink rule on the small
face (the grey the words lost in Words mode), and so does the colon. The FREE pill, the name, the art and the rows
below the card are not this chunk's.

### The opened card carries no extras (T, 2026-11-01, after 137.3)

T looked at an opened Global (Rose Wrap) on the preview APK and scribbled out three things, then said: "get rid of
this stuff. In all places for all cards." They are gone from every opened card (the combat detail, the reward preview
the deck detail and the deck list tile):

- **The duration line inside the large face** ("3 turns played FREE, the whole combat PAID", under the PAID line of a
  Global). Where the older text above says the large face states the duration (the Global decision, 137.3's notes,
  A7), the duration is now stated only by the opened card's NO DIE / +DIE rows.
- **The grey meta strip under the card** (`HEART · ASH · COMMON · GLOBAL`, with the rarity pip row after it). The
  large face still prints the rarity word, and the deck detail keeps its rarity mark.
- **The system notes under the NO DIE / +DIE rows** (GLOBAL, READING A LINE, CONVICTION and the other terms the
  card's text triggered). Where A5 and 137.2's notes say the glossary teaches the reading rules, the rules stay in
  `SYSTEM_GLOSSARY` (the board glossary and the keyword atlas read it), but no opened card prints them. A player now
  learns "steps resolve left to right", "debuffs land on the foe" and the rest nowhere on a card; whether they
  return, and where, is T's call (the Measure's blind read leaned on them).

Only the rendering goes: card text, `run` bodies and the keyword panel above the card do not change.

### The rules get a home in Settings (T, 2026-11-02)

T, verbatim: "Yeah have a Rules Glossary button in settings". PR #1328 (alias CF1h) takes the system notes off every
opened card, so the rules a short line leans on would print nowhere; that PR asked where they
should go, and this is T's answer. Settings gains the button, and it opens a list of those rules.

**CF1i, the Rules Glossary in Settings.** Built on what exists, with no new flow and no new words:

- **The data is already there.** Every rule `docs/card-voice.md` §8 lists has its words in
  `axiomancer-mobile/state/combat/keywords.ts`: left to right and debuffs in `SYSTEM_GLOSSARY`'s READING A LINE, half
  or less in its HALF YOUR VITAE, the Global durations in its GLOBAL, and VULNERABLE and DISCARD in `KEYWORD_GLOSS`,
  which `keywordGloss` reads. So the list is one entry per `SYSTEM_GLOSSARY` term, in its own order, then VULNERABLE
  and DISCARD from `keywordGloss('Vulnerable')` and `keywordGloss('Discard')`. A word the list prints is read from
  there, never retyped; a rule's words change only in that file, and only as owner content (D37, D88).
- **The presenter.** `selectRulesGlossary()` in `state/presenters/settings.engine.ts` returns the `{ term, def }`
  list, and `SETTINGS_COPY` gains the button's label `RULES GLOSSARY`, its hint and a `rules` section heading (screen
  chrome, not card text). The file's header row list gains the row.
- **The sheet.** `components/settings/RulesGlossarySheet.tsx`, a modal on `components/menu/FeedbackSheet.tsx`'s
  pattern (`visible`, `onClose`, the backdrop and the back gesture close it), with a `ScrollView`, since eleven entries
  pass a phone's height. A modal serves both hosts of `SettingsBody` (the `/settings` route and the SETTINGS tab)
  without a new route. Each entry reads like the notes it replaces: the term in the palette's accent, the def under it.
- **The button.** A `MenuButton` in `SettingsBody` under its own section, above FEEDBACK, `testID`
  `settings-rules-glossary`, shown in and out of a run.
- **The docs follow.** `docs/card-voice.md` §8 and the comment over `SYSTEM_GLOSSARY` name the Rules Glossary as where
  the rules show, replacing whatever they say at build time (#1328 writes "show on no card until T places them").
  Regenerate the feature map (`feature-map.mjs`).

It waits on PR #1328 in the plain sense: the button is why the notes can go. It carries `needs —` because a chunk in an
open PR has no number yet, and it is safe either order, since it reads only `SYSTEM_GLOSSARY` and `keywordGloss`, both
of which #1328 keeps. Built first, the rules show in both places until #1328 lands.

## Contracts

- `checkFaceGrammar(cards: readonly Card[]): CardRuleViolation[]` and `checkTextOrder(cards: readonly Card[]):
  CardRuleViolation[]`, in `Cards/card-rules.ts`, exported from the package index like their siblings.
- `PlayerSettings.cardText: 'words' | 'glyphs'`, default `'words'`. Older saved settings without the field read as
  `'words'`; no save or schema version changes.

## Open questions

- The pitch's six calls: T answered all of them on 2026-11-01.
- [T to confirm #1] Does the Rules Glossary also list every keyword's gloss (DEAL, GUARD, LEECH and the rest)? Default:
  no, rules only, since an opened card's keyword panel already explains the keywords it prints, and only VULNERABLE and
  DISCARD join because `docs/card-voice.md` §8 names them. Or: add every keyword below the rules, as a second section.

## Chunks

Measure: 0 open · 15 closed · next A16


## Follow-ups (not in this spec)

- Every FREE line as glyphs only (62 of 104 are; 35 need a rewrite, 16 of them Merciful), with T's soft rule that
  FREE is a lighter PAID or a one-keyword effect: T's session.
- Live resolved numbers on the face (`DEAL 14` for the board as it stands): parked in the pitch as a later layer.
- New keywords for effects on you, when a card needs one.

<!-- Not chunked yet: hand absorb in progress -->
