# Replays
<!-- lexicon-ok: stance-check, rps -->

Three role-played runs of the procedure against past Miserere inputs.
T's lines are reconstructed from the recorded braindump files, not
quoted from transcripts, and marked (rec). The card is shown after each
turn in compressed form; GOAL HISTORY is abbreviated to GH. Lens:
game-design via the Miserere config. Config rules are preloaded into
FIXED as `(repo rule)` and omitted from the cards below for length.

---

## Replay 1 (vague): enchant/curse, 2026-07-13

**Opening (rec):** "Should more spells behave like enchantments and
curses? Unpaid three rounds, paid rest of combat. I'm just not currently
seeing the big picture. Either cards are not functioning the way they're
supposed to, I'm not getting it, or it's just boring. Or some mix."

**Triage:** U: adjective without noun ("boring"), three themes (broken,
me, boring), nobody named who feels it. O: one solution with no
alternative, a mechanism named. U=3, O=2. O >= 2, so **diverge** first.

**Turn 1, move: Reflect + Ask (diverge opener).** Echo: "You have a
model in mind, free is a timed seed and paid is the permanent payoff, but
the reason you want it is a feeling that the library is either broken,
opaque or dull. Is that it?" Batch: What would the enchant model fix,
which complaint from a playtest goes away? Name one combat where the
cards did not do what they should.

```
GOAL   unclear: make spells feel like the design on paper
FIXED  -           FREE - which of broken/opaque/dull is true   PARKED -
OPEN   -           EVIDENCE -       state: diverge  GH t1
```

**T (rec):** "I seed with mark, then the round ends, my hand is gone, the
payoff never comes. And every affliction card's free line is the same."

**Turn 2, move: Fetch evidence.** Read spec 32 v4 section 2, the
themed-decks engine tests, and the free-line census. Report: the engine
has green coverage for every clause; the proposed model is already
ratified; the free line is one verb per theme; the round boundary
redraws the whole hand. Re-score: a problem sentence now exists
("arcs are unplannable"), O drops to 0, U=1. **Converge.**

```
GOAL   make seed-to-payoff arcs plannable so the ratified model shows up in play
FIXED  - the enchant model is already spec 32 v4; not a design change (t2)
FREE   - redraw rule vs seed variety vs power density: which first
PARKED -
EVIDENCE - engine tests green (themed-decks.engine.test.ts); census: affliction 4x mark, oracle 5x FORETELL; redraw-all at round end
state: converge   GH t1 | t2 (rewrite: new change, new who)
```

**T (rec):** "Also, I've been thinking the curse cards should maybe have
a different art frame so you can tell them apart at a glance."

**Turn 3, move: Park (drift rule fires).** Reply: "Parked: curse art
frames. It does not move the goal, and art is owner-only; we can come
back." Then the open FREE item: Ask, one question, three options with
trade-offs: keep-hand refill (smallest change, invalidates the "boring"
verdict until replayed), vary the free lines (content work, owner-only
per D37), raise power density (changes every preset's balance).

```
GOAL   unchanged
FREE   - which lever first
PARKED - curse art frames (t3, owner-only)
state: converge   GH t1 | t2
```

**T (rec):** "Keep-hand. Hand of five, refill instead of redraw. Then I
replay before I call it boring."

**Turn 4, move: Reflect + exit check.** Echo GOAL: "We will replace the
round-end redraw with a hand of five that refills, so that a seed played
this round can be paid off next round, proven by a replay of three
affliction combats where the payoff is reachable in at least two." Exit
check: Measure present, Acceptance derivable (A1 hand size 5, A2 refill
not redraw, A3 engine tests green, A4 replay record), prior art needed.

**Turn 5, move: Prior art.** Slay the Spire Powers (minority of deck,
each changes next turns; reception consistent that they are fun when
they create decisions); MTG curses (set-and-forget, memory read);
Dawncaster Lasting keyword (KB receipt 2026-07-10). **Ready.**

```
GOAL   as t4
FIXED  - model is spec 32 v4 (t2) - keep-hand 5, refill (t3) - re-judge "boring" only after replay (t3)
FREE   - none
PARKED - curse art frames (t3)
OPEN   - density of enchant cards per preset: default unchanged [T to confirm]
EVIDENCE - as t2, plus prior art x3
state: ready   GH t1 | t2 | t4 (narrowing of t2)
```

**Exit question** (recommended-first): run `/plot asap` / anytime / peek /
not now. The recorded session shipped keep-hand the same day by hand;
here it would have left as one S-sized phase with four acceptance IDs and
a replay as Measure.

**Compared to the record:** the record reached the same finding (redraw
was fighting the arc) but reached it inside a long analysis the agent
wrote alone. The replay reaches it at turn 2 by a fetch, keeps the art
tangent from eating a turn, and leaves with a Measure the record lacked
("re-evaluate the boring verdict" had no protocol).

---

## Replay 2 (over-specified): upgradeable dice, 2026-07-17

**Opening (rec):** "Instead of dice where each side is a colour, roll
four d6 where each die is one colour. Red, Blue, Purple: one special, two
mana, three miss. Gold: one special, one mana, four miss. A mana face
powers a card, a miss is dead, a special powers a card and grants two
tokens. Dice can be swapped and upgraded."

**Triage:** U=0. O: mechanism with numbers, no problem stated, one
solution, no alternative. O=3. **Diverge.**

**Turn 1, move: Reflect + Ask (diverge opener).** Echo the mechanism
back in one sentence, then: What does this fix, which moment in play
goes away? What breaks if Gold were 2/2/2 instead of 1/1/4? Is the
upgrade path the idea, or the face table?

```
GOAL   unclear: per-die colours with miss faces and upgrades
FIXED  - FREE - what problem this serves   PARKED -
EVIDENCE -   state: diverge   GH t1
```

**T (rec):** "The upgrade path. I want the player to watch misses get
deleted over a run. And honestly I don't think we need the rock paper
scissors read any more; there's way more to pay attention to now."

**Turn 2, move: Fetch evidence.** Read the die laws (single drafted die
plus earned refreshes), the stance read and everything that hangs off it
(OMEN, STAKE, read-win, momentum wheel, Resonance). Report: "every mana
die powers a card" moves paid plays from about 1 to about 1.83 per round
and silently deletes the single-die law and the stance read. Re-score: a
problem sentence exists ("misses visibly deleted over a run"), but a
second, hidden change surfaced (stance retired). O=1, U=1. Not
narrowing yet; GOAL rewritten.

```
GOAL   give the player persistent, upgradeable dice whose misses visibly shrink over a run, without silently deleting the stance layer
FIXED  - RPS read retired (t2, T)   - upgrade path is the idea; face numbers are free (t2)
FREE   - where stance lives now   - action economy (paid plays per round)   - whiff valve
PARKED -
EVIDENCE - die laws; ~1.83 paid plays/round under the proposal vs ~1 today
state: converge   GH t1 | t2 (rewrite)
```

**Turn 3, move: Offer.** Three directions for where stance lives:
stance-from-committed-die (vestigial with open info), stance-as-build
(stops being a per-round verb), stance-from-cards with the momentum
wheel merged (Slay the Spire Watcher; steering stays live). Each with a
telltale failure mode. No recommendation.

**T (rec):** "Stance from cards. Gold is wild mana. Tokens are
Conviction."

**Turn 4, move: Ask.** One batch of three on the FREE items: whiff valve
(free lines plus a once-per-round reroll of all misses for one token /
miss faces feed a currency / no valve, upgrades only); action economy
(cap paid plays per round / let it float and reprice sinks); momentum
(cycle / chain-next-colour only). Options carry trade-offs; no tag.

**T (rec):** Press Fate once per round, sinks repriced to ~1.33 income,
chain-next-colour only, surge at three resets.

```
GOAL   as t2, narrowed: "...stance comes from the last paid card, enemies telegraph stance checks openly, and a once-per-round Press Fate rerolls misses"
FIXED  - stance = Option C (t3) - gold wild (t3) - tokens = Conviction (t3) - Press Fate 1 token, once/round (t4) - momentum chain-next only (t4) - die subsystems reinterpret, never cut (t4)
FREE   - upgrade granularity (per face vs per die)
PARKED -
OPEN   - upgrade granularity: default per die [T to confirm]
EVIDENCE - as t2
state: converge   GH t1 | t2 | t4 (narrowing of t2)
```

**Turn 5, move: Prior art + exit check.** Quacks of Quedlinburg
(failure-as-spectacle with a catch-up valve, KB src-005), Oathsworn
(dice-vs-cards praised, transparent risk, KB src-005), Slice and Dice
(misses tolerated because of the reroll ritual and visible upgrades,
memory read), Elder Sign (uncompensated misses, the cautionary tale,
memory read). Measure: harness run on the Act 1 ledger with per-colour
access and paid plays per round within stated bands, cited against the
measured report's stamp. **Ready.**

**Exit question**, recommended-first. The record decided seven points
in one session and then wrote a spec; the replay leaves with the same
seven as FIXED plus a Measure the record did not state (access and
paid-plays bands) and one deferred item with a default instead of an
open list.

**Compared to the record:** same landing, fewer hidden deletions. The
record found the stance deletion too; the replay finds it at turn 2 by
fetch rather than by the agent's long essay, and the action-economy
number is in EVIDENCE before any option is offered.

---

## Replay 3 (landed well): hazard as a fixed puzzle, 2026-10-15

**Opening (rec):** "The hazard minigame plays too much like combat,
cards plus colour dice. How do we make it distinct?"

**Triage:** U: adjective without noun ("too much like"), nobody named.
O: 0. U=2. **Converge.**

**Turn 1, move: Ask (converge opener).** The moment: which hazard, which
round, what did you do that felt like combat? One surface: keep the
pieces and change the rules, or change the pieces? Size: one rule, one
subsystem, or a rewrite of the minigame?

**T (rec):** "Keep the pieces. Remove the luck. It should feel like a
puzzle with a difficulty I can measure, under a clock."

```
GOAL   make a hazard a hand-authored, deterministic puzzle with measurable difficulty under a clock, using today's pieces
FIXED  - keep cards, colour dice, two meters, two routes (t1) - no luck (t1)
FREE   - what "measurable difficulty" is   - what the clock does
PARKED -
EVIDENCE -   state: converge   GH t1
```

**Turn 2, move: Offer.** Three directions: push-your-luck with a known
pool (keeps a draw; failure: "tap, tap again"), timed abstract puzzles
(pipes, rune lock; failure: the pieces become set dressing), fixed
layout solved by a solver (failure: counts without a band mean nothing).
No recommendation.

**T (rec):** "Not push-your-luck, that is tap tap again. The abstract
puzzles are fun but they throw the pieces away. The fixed layout."

Note: this is where the recorded session spent its middle on five timed
puzzle pitches before T changed direction. In the replay the three
directions are on the table in one turn and the discard happens in T's
reply. No fork stop fires: GH shows one GOAL, now narrowed.

```
GOAL   t1 narrowed: "...one authored layout (hand, dice, goal), one round, solved by a solver whose count sets the band"
FIXED  - as t1 - one round, no deck, no roll (t2) - DRAW draws predetermined cards (t2)
FREE   - band thresholds   - failure scaling   - stat unlocks   - rewards
PARKED - timed abstract puzzles (t2, could be a separate minigame later)
state: converge   GH t1 | t2 (narrowing)
```

**Turn 3, move: Fetch evidence.** Scratch run of the solver over the live
engine on two layouts: safe route goal 14 to 32 gives 222 down to 0
distinct winning outcomes; risk route 6/6 to 15/15 gives 840 down to 0;
DRAW 2 inflates a count to 31,465. Written to EVIDENCE with the
takeaway that goal alone sets difficulty.

**Turn 4, move: Ask.** One batch of four on the FREE items, each with a
defer default: bands (30+/5-29/1-4 as a starting point / wider / set
after timing), failure scaling (proportional to value reached / flat),
rewards (always paid with a completion bonus / only on success), stat
unlocks (optional help, every puzzle solvable without / required for
hard). No tag.

**T (rec):** Bands as listed; failure scales; rewards always with a
bonus; unlocks optional and every puzzle solvable without.

**Turn 5, move: Reflect + exit check.** Echo the narrowed GOAL. Measure:
every authored puzzle is solvable and its count sits in its declared
band, checked by the solver in the test suite. Acceptance: A1 layout
type replaces the deck, A2 solver count in band for every shipped
puzzle, A3 cut list removed with a save migration, A4 timer method
recorded, no numbers yet. Prior art: Into the Breach perfect information
(backs determinism), Mage Knight puzzle assembly (the feel T named
before). OPEN: failure curve numbers, default "6 safe / 12 risk, scar if
p < 0.5" [T to confirm]; stat threshold values, default "none in Act 1"
[T to confirm]. **Ready at turn 5.**

**Exit question.** The record went to `/plot` the same session and added
three decisions "at /plot time". In the replay those three are the two
OPEN defaults and one FIXED item, so `/plot` receives no bare question.

**Compared to the record:** same landing, two turns shorter, and the
five-pitch detour becomes one offered option that T declines in a
sentence. The drift rule never fires: every message from T moved GOAL,
FIXED or FREE.

---

## Rule checks across the three

| Check | Replay 1 (vague) | Replay 2 (over-spec) | Replay 3 (good) |
|---|---|---|---|
| Opening state | diverge (O=2 beat U=3) | diverge | converge |
| Drift rule fired | yes, turn 3 (art frames) | no | no |
| Fork stop fired | no (one rewrite, then narrowing) | no (one rewrite, then narrowing) | no |
| Turns to ready | 5 | 5 | 5 |
| Bare open questions at handoff | 0 (1 deferred with default) | 0 (1 deferred) | 0 (2 deferred) |
| Measure present | yes | yes | yes |
| Landing vs record | same finding, adds a Measure | same seven rulings, adds a Measure | same, two turns shorter |

Caveat: the replays are role-played against written records, so T's
replies are the ones the record shows T eventually gave. A live T will
answer differently, and the turn counts are a floor, not a forecast.

---

## Lens diff: first batch for the same input

Input: "Make the hazard puzzles more interesting: some cards subtract
from the outcome in exchange for a utility benefit like drawing cards"
(2026-10-18). Triage: U=2 (adjective, nobody named), O=1. Converge
opener, three questions, no tags.

| Lens | Q1 | Q2 | Q3 |
|---|---|---|---|
| game-design | Which puzzle, which solve, felt dull: name the moment | What should paying a cost feel like: a gamble, a tax, a key | Size: one new card field, a new utility family, or an engine rule change |
| ai-harness | Which solver run or report showed the puzzles are too easy: cite it | How would we know without playing: a count band, a per-card necessity rate | Which seam first: the solver, the band test, the authoring lint |
| qa | Which shipped demo escaped out of band, and which gate let it | What is the oracle for "interesting": a count, a necessity rate, a timed solve | Which layer first: solver unit test, band test in CI, playtester protocol |

The three batches share one shape (moment, measure, surface) and no
question text. The lens changes what the conversation asks first, not
how it runs.
