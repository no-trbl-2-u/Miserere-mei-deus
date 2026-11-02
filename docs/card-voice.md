# Card voice

How every printed card line is worded, so that every card in every lane reads in one voice. These are T's rulings
from the attended `/pitch` of 2026-11-01 (`braindump/2026-11-01-card-face-meaning.md`), tested by five mock rounds
and three blind cold reads. Spec 137 builds them: a lint (`checkFaceGrammar`, `checkTextOrder` in
`axiomancer-mechanics/src/Cards/card-rules.ts`) fails a line that breaks them. Card text is T's content (D37,
D88); this file is how it is written, not what it says.

The rule behind all of it: **shorten the nouns, never the logic.** Keywords become capitals or glyphs. The small
words that carry the logic ("or", "for each", "twice", "after each", "=") are never cut, because every wrong
blind reading came from cutting one.

## 1. A line stands on its own

A line names only:

- **entities:** you (never written, it is the default subject), the foe, your hand;
- **keywords**, in capitals: `DEAL`, `GUARD`, `SACRIFICE`, `INFERNO`, `DISCARD`, `CONVICTION`, …;
- **numbers:** `6`, `75%`, `X`;
- **the logic words** in §3.

It never points at its other line, at another card, or at a state that has no keyword. `instead` always points
somewhere else ("instead of what?"), so it is never printed. `burning` is not a keyword, so it becomes
`the foe has INFERNO`.

## 2. Anatomy

```
[setup or cost.] STEP, STEP, STEP
```

- **Steps resolve left to right.** Text order is resolution order, always; a test compares the printed order with
  the card's program.
- **A comma separates steps.** `then` is never printed: the comma already means "next".
- **A full stop parts a cost or a setup from the payoff:** `DISCARD 1. GUARD 8, DEAL = your GUARD`. Use at most
  one mid-line full stop, and only for that.
- **No full stop at the end of a line.**
- **A step is `KEYWORD N`.** The number follows the keyword, never a verb before it: `CONVICTION 5`, not
  `gain 5 Conviction`.
- **VULNERABLE is `VULNERABLE N% for M turns`**, with no `+`.
- **EXILE stands alone.** It only ever means this card.

## 3. The logic words (a closed list)

| Words | Meaning | Example |
|---|---|---|
| `,` | the next step | `DEAL 9, INFERNO 4` |
| `.` (mid-line) | parts a cost or setup from the payoff | `DISCARD 2. VULNERABLE 75% for 2 turns, DEAL 8` |
| `or N at …` | N replaces the first number when a threshold holds | `DEAL 6 or 14 at half your VITAE` |
| `or N if …` | N replaces the first number when something is present | `DEAL 4 or 8 if the foe has INFERNO` |
| `+N for each …` | adds N per unit | `DEAL 3 +2 for each spent` |
| `=` | copies a value when the step resolves | `DEAL = foe's MERCY`, `GUARD = your THORNS` |
| `2×` | multiplies a value; never a repeat | `DEAL 2× foe's MERCY` |
| `twice` · `after each` | repeats the action; `after each` hangs a rider on every repeat | `DEAL 9, twice; SACRIFICE 2 after each` |
| `Spend all …` | uses up a stack before the step that counts it | `Spend all the foe's BLIZZARD, DEAL 3 +2 for each spent` |
| `Spend all …. For each:` | `For each:` after a spent stack hangs a list of steps that each scale by the amount spent (T, 2026-11-01) | `Spend all your INFERNO. For each: BLIZZARD 2, INFERNO 2` |
| `When you … :` / `Start of your turn:` | a Global's trigger (the closed trigger set) | `When you SACRIFICE X: DEAL X` |
| `for N turns` | how long a status lasts | `VULNERABLE 25% for 1 turn` |
| `+` between two values | adds the second value to the first | `DEAL 2 + half your THORNS` |
| `this` · `next` · `last` | which turn or card: now, the one after, the one before | `2× your next SACRIFICE this turn`, `Return the last MERCY card you played to your hand` |
| `is` · `not` · `while` | a state, its negation, and a state that must still hold | `If the foe is at max VITAE, DEAL 4; if not, MERCY 2`, `your THORNS hit 2× while GUARD HOLDS` |
| `to` · `from` · `in` · `with` | a target, a source, a place, an attachment | `Move half your INFERNO to the foe`, `Return 1 random card from EXILE to your deck`, `STORM = cards in your hand`, `Each HEAL this turn is RADIANCE with 2× DEAL` |
| `only` | limits a step to one case; no library line uses it now (Boil to Steam's `(foe only)` was dropped, §4) | none |
| `more` · `less` | a count or amount above or below another | `DEAL 3 if the foe has 2 or more elements`, `the foe's next attack is 2 less` |
| `over` · `below` · `max` | a limit on a bar | `GUARD = HEAL over max VITAE`, `VITAE cannot go below 1 this turn`, `+4 max VITAE this combat` |
| `go` | a floor on a bar (T, 2026-11-01) | `VITAE cannot go below 1 this turn` |
| `its` · `deals` | the foe's own attack, and what it does (T, 2026-11-01) | `If the foe has MERCY, its next attack deals 5 less; if not, MERCY 5` |

A word outside this list, the content list below, the keywords and the entities is a lint failure. A new logic word
is T's call and is added here first.

### The content list (a closed list)

Words that name a thing or an action no keyword covers (a plain VITAE loss, a cut to the foe's next attack, a card
returned from EXILE). T approved them on 2026-11-01 ("For now, approve them all"); they are `FACE_CONTENT_WORDS` in
`card-rules.ts`, with `spent` (`+2 for each BLIZZARD spent`).

| Words | Used for | Example |
|---|---|---|
| `spent` | the units a `Spend all` used up | `DEAL 3 +2 for each spent` |
| `combat`, `time` | how long, how often | `DEAL half the VITAE you lost this combat`, `HEAL 2 each time the foe loses VITAE` |
| `damage`, `dealt`, `took`, `lost`, `healed`, `missing` | an amount the board already counted | `THORNS = the damage you dealt this turn`, `DEAL = all you healed this turn`, `GUARD = your missing VITAE` |
| `lose`, `loses` | a plain VITAE loss | `SACRIFICE 4, the foe loses 6 VITAE` |
| `played`, `discarded` | a card's past action | `Return the last MERCY card you played to your hand`, `If discarded, THORNS 2` |
| `card`, `cards`, `deck`, `return` | cards and where they go | `Return 1 random card from EXILE to your deck`, `STORM = cards in your hand` |
| `random` | a random pick (DISCARD is random without saying so) | `Return 1 random card from EXILE to your deck` |
| `debuffs`, `remove` | clearing statuses | `Remove all your debuffs, RADIANCE 5`, `Remove your INFERNO` |
| `element`, `elements`, `swap` | the foe's elemental stacks | `DRAW 1, CONVICTION 2 for each element the foe has`, `Swap 2 of the foe's elements, DRAW 2` |
| `attack`, `attacks`, `hit` | the foe's attack and what hits | `REFLECT 50% if the foe attacks`, `your THORNS hit 2× while GUARD HOLDS` |
| `move`, `keep` | relocating or retaining a stack | `Move half your INFERNO to the foe`, `keep your GUARD after the foe's turn` |
| `bursts`, `sooner`, `grows` | a MERCY or STORM timer | `The foe's MERCY bursts 1 turn sooner`, `the foe's STORM grows +1 more` |
| `take`, `cannot` | a floor on damage | `VITAE cannot go below 1 this turn` (`cannot`; no line prints `take` now) |

A word outside every list here is still a lint failure, and a new word is T's call: it is added to this file first.

## 4. Who it lands on

- **DEAL hits the foe. GUARD, SACRIFICE and CONVICTION are yours.** The keyword says so, so the line never does.
- **Debuffs land on the foe** (VULNERABLE, LEECH, TETHER's damage, BLIZZARD's cut). `on the foe` is never printed.
- **An effect on you is a new keyword**, never a qualifier like `on you` or `on self`.
- **INFERNO burns both sides by its own rule.** Never print `you and the foe` or `both sides`: the blind reader took
  the extra words to mean you burn for the full number.

## 5. Possessives

- `your GUARD`, `your VITAE`, `your hand`.
- After `=`, the foe's possessive drops its `the`: `= foe's MERCY`.
- Everywhere else it keeps it: `if the foe has INFERNO`, `Spend all the foe's BLIZZARD`.

## 6. Globals

- The face says **GLOBAL** where the FREE pill sits.
- A Global has **one effect**. Played FREE it lasts 3 turns, played PAID the whole combat; that is the only
  difference, for every Global. A Global never has a FREE line of its own.
- The face line is the trigger and the effect, with no duration: `When you SACRIFICE X: DEAL X`. The large face says
  "3 turns played FREE, the whole combat PAID".

## 7. FREE lines

The same rules. The goal is a FREE line made of glyphs alone, one to three keywords; 62 of 104 already are, and the
rest wait for T's FREE session (spec 137, Follow-ups).

## 8. What the glossary carries

A short line leans on a few rules the glossary states once, so the line never has to:

- steps resolve left to right;
- debuffs land on the foe;
- `VULNERABLE N%` means N% more damage from every hit;
- DISCARD is always random;
- `at half your VITAE` means half or less;
- GLOBAL lasts 3 turns played FREE and the whole combat PAID.

## 9. Retired forms

| Never print | Print instead |
|---|---|
| `instead` | a self-contained line (`DEAL 6 or 14 at …`) |
| `doubled`, `twice <value>` | `2×` for a value; `twice` only for a repeat |
| `burning` | `the foe has INFERNO` |
| `then` | `,` |
| `at random` | nothing (DISCARD is random) |
| `on the foe`, `you and the foe`, `both sides` | nothing (§4) |
| `equal to` | `=` |
| `EXILE this card` | `EXILE` |
| `gain N Conviction` | `CONVICTION N` |
| `+75%` on VULNERABLE | `75%` |
| `rest of combat`, `In play 3 turns` on a Global's face | nothing (§6) |
| `SAC`, `CONV`, any abbreviation | the keyword |
| `Discard`, `Conviction` (title case) | `DISCARD`, `CONVICTION` |
| a line-end `.` | nothing |

## 10. What the blind reads found

Each pattern below made a reader who had only the face, the glyph legend and the glossary get a line wrong or
doubt it.

- **A condition as its own sentence reads as a second effect.** `DEAL 6. At ≤½ VITAE: DEAL 14.` was read as 20
  damage. `DEAL 6 or 14 at half your VITAE` was read right every time.
- **`instead` sends the reader off the face.** Callus's `DEAL n instead` was read as "the SACRIFICE is free"; it meant
  "instead of the FREE line's GUARD", which the face never showed.
- **Extra words that restate a keyword contradict it.** `INFERNO 4 on you and the foe` was read as you burning for 4.
  The keyword already says you burn for half.
- **Shorthand that can be read two ways will be.** `2×:` split between "repeat" and "double", and `+2 each` between
  "per point" and "per stack". `twice; … after each` and `+2 for each BLIZZARD spent` were never misread.
- **Abbreviations and title case read as ordinary words.** `SAC 2`, `CONV 2`, `Discard`, `Conviction`.
- **An unstated target gets guessed.** `LEECH 2` with no rule in the glossary drew "on me or on the foe?" in every
  round. With the glossary's "debuffs land on the foe" the line can stay short.
- **Cutting `then` costs nothing if the glossary says "left to right"**; without that rule a reader wondered whether
  `GUARD = foe's BLIZZARD` read the BLIZZARD before or after the 5 landed.
- **A glyph must not look like another glyph or mean two things.** VULNERABLE's cracked shield was sometimes taken
  for GUARD; the heart for VITAE was taken for the heart die; the hourglass for MERCY was read as a timer (it is now
  a laurel).
- Words read a little higher than glyphs (PAID confidence 4.0 against 3.4 in round 4), so Words is the default face
  and Glyphs a setting.

## 11. Examples (base level)

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
| Callus | GLOBAL | `When you SACRIFICE X: DEAL X` |

## 12. Checking a new line

1. Run the lint (`npm test` in `axiomancer-mechanics`): it names the word or the order that breaks the rules.
2. For a new keyword or a new logic word, run a blind cold read: give a fresh reader (a Sonnet subagent, no tools)
   only the faces, the glyph legend and the glossary, and ask for each line's reading, a confidence from 1 to 5 and
   its doubt. A pass is no confident wrong reading and a mean confidence of 3.5 or more.
