---
name: narrate
description: Draft narration for the game in the Narrator's voice, at a cruelty stop T picks. Use when T asks for a piece of new narration content - a place line, an arrival line, a hazard, rest, dream, cutscene or travel line, quest log text, an enemy description or journal, screen narration - or says "/narrate", "write this in the narrator voice", "narration for X", "redo M-07 at 2". Always asks "How cruel?" first unless T already gave a stop. Never for cards, rules text or anything an NPC says.
argument-hint: "[--stop 1-5] <what to write: a surface and its subject, or a ledger id to redraw>"
---

# /narrate

Drafts narration as **proposals for T**. T approves all writing; this skill
never writes a line into game source. It asks one question first, **"How
cruel?"**, and writes at the stop T picks.

Read before drafting: `plan/card-ledger/narrator-voice.md` (the target, T's
locked passages and rejections) and, once it exists,
`axiomancer-mechanics/docs/narrative/NARRATOR.md` (the voice bible; it wins
where it and this file disagree).

## 1. The voice

Cormac McCarthy writing Elden Ring, in the register of Blood Meridian, on
this game's story, enemies, quests and places (T, 2026-11-10). His manner and
never his sentences (`plan/north-star-mork-borg.md` Q-4: "calibrate freely,
quote never").

- Archaic and biblical diction, used sparingly: "bade", "yet", "whence",
  "that he not". Never "thee", "thou", "hath".
- Clauses chained with "and". Capped: no sentence past 40 words (T: "avoid
  having the run on sentences go on for too long").
- One long simile at most per piece, opening on "like some" or "as a".
- The land and the sea do not care. Things are older than the people who
  named them.
- Violence is told flat, in few words, and the sentence moves on.
- No quotation marks. Reported speech is set off with a comma. No exclamation
  marks, no semicolons, no dashes.
- Second person ("you") for what the player meets. Third person, past tense,
  for journals and memories.
- Canonical player terms keep their spelling: `VITAE`, `GUARD`.

## 2. Scope

| The Narrator writes | The Narrator never writes |
|---|---|
| Place and map lines, arrival lines, hazards, rests, dreams, cutscenes, travel prompts | Card text, keywords, rules text (the Rulebook) |
| Quest names, quest log text, gate reasons, refusal lines told as narration | Anything someone speaks (the People) |
| Enemy descriptions and journals, item flavor | Button labels |
| Narration on the app's screens (defeat, death return, game over) | Story: what happened, who someone is |

If the piece needs someone to speak, do not write the speech. Put
`[NPC Content Needed]` in its place and say who would speak.

If an enemy has no story in `axiomancer-mechanics/content/story/` or its
library entry, write a description from its portrait line only. Do not give
it a journal.

## 3. Procedure

1. **Read the request.** Name the surface and the subject. If either is
   unclear, ask before anything else.
2. **Ask "How cruel?"** with `AskUserQuestion`, exactly that question, unless
   T gave a stop in the request ("at 4", "--stop 2", "grief", "plain"). The
   tool takes four options, so offer stops 1, 3, 4 and 5 with their one-line
   meanings from section 4 and say in the question that typing `2` picks
   Hard and typing `mix` picks the rotation (section 6). Recommend the stop
   that fits the surface (section 5) and mark it "(Recommended)".
3. **Read the canon** for the subject before writing: the node's row in
   `World/MapEvents/content.ts` (`BREAKWATER_CHAPTER_KINDS` and its foe), the
   foe's entry in `Enemy/enemy.library.ts`, the quest in
   `World/breakwater-chapter.questline.ts`, the story overview
   (`axiomancer-mechanics/content/story/story-overview.md`). Use only facts
   found there, plus small physical detail.
4. **Draft one piece** at the stop, inside the surface's word cap (section
   5). If T asked for options, draft the same piece at the stops asked for.
5. **Check it** against section 7 before showing it.
6. **Show it** as in section 8, with what it invented and a confidence score.
7. **On T's word**, record the approved text. A Chapter 1 line goes in
   `plan/card-ledger/narrator-chapter1.md` under `## Verdicts`; anything else
   goes in the ledger T names. Putting it in the game is a plotted chunk's
   job (spec 177), never this skill's.

## 4. The five stops

The same scene at each stop: the Brine-Widow, who waits at the end of the
Long Pier with a fist of salt for whoever comes back.

**1. Plain.** The world is old and does not care. Dread with no culprit.
Nobody is hurt on the page.

> She stands at the end of the Long Pier in a black veil stiff with salt, and
> she stood there before ever the piers were stone. The boats she waits upon
> were hollowed out of single trees by men who had no word for iron. The salt
> in her fist is for whoever comes back. None has.

**2. Hard.** Loss and harm are on the page, but weather, hunger or time did
it. No one chose it.

> She stands at the end of the Long Pier in a veil stiff with salt. Her man
> went out in the autumn gales with the rest and the sea kept all of them. No
> word was sent, for there was none left to send it. The salt in her fist is
> for whoever comes back, and she has long since ceased to mind who.

**3. Cruel.** Someone chose it, for gain or for ease. One cruel fact, told
flat.

> The town set her there. A widow's share comes out of every other share, so
> when her man drowned they walked her to the pier end and told her he had
> been seen. It kept her from the counting house a full year. The salt in her
> fist is for the first face she knows.

**4. Cruelty at 11.** The cruelty is shared, habitual and enjoyed or
administered. It has a ledger, a custom or an audience. One detail makes it
worse than it needed to be.

> The town set her there. They told her each morning for a year that he had
> been seen. They brought their children down to watch her look, and held the
> small ones up to see, and laughed quietly among themselves like folk at a
> fair. Then they tired of it and came no more, and nobody told her that
> either.

**5. Grief.** The cruelty lands on someone the reader is made to care for in
a sentence, or it is the subject's own doing. Guilt, self-loathing, an
innocent who does not understand. It ends on a small plain thing. Written to
hurt.

> She sent him out. There was no bread in the house and the glass was falling
> and he did not want to go. She called him coward before the boy, so he took
> the boy with him. The salt is not for you. She grinds it into her own eyes
> at each dawn that she might not sleep through the boat.

Stops stack: 4 keeps what 3 has, and 5 may be as cruel as 4. What changes at
5 is where the weight falls. A higher stop is never more gore. The prologue's
assault stays off-screen at every stop, and a child's death is named and
never shown (story overview, prologue step 9).

## 5. Surfaces: caps and the stop that usually fits

| Surface | Word cap | Usual stop |
|---|---|---|
| Map blurb | 18 | 1 or 2 |
| Arrival line (a fight's reveal) | 32 | 1 to 3 |
| Loot cache action | 30 | 1 |
| Hazard, rest, travel, quest node, quest log, item, enemy description | 45 | 1 to 4 |
| Dream | 45 | 2 or 5 |
| Screen narration (defeat, death return, game over) | 40 | 1 or 3 |
| Cutscene, enemy journal, memory | 110 | 3 to 5 |

The usual stop is the recommendation offered in the question. T's pick wins.
An elite node draws one of several foes, so its arrival line names none.

## 6. The mix

When T asks for many pieces at once and says `mix`, rotate as T set it on
2026-11-11: plain, cruel, plain, grief, and round again (every other piece
at stop 1; the ones between alternate stops 4 and 5). Label each piece with
its stop.

## 7. Checks before showing a draft

- No sentence past 40 words. The piece is inside its surface's cap.
- No quotation mark, exclamation mark, semicolon or dash.
- No sentence, name, place or character from McCarthy or from Elden Ring.
- Every fact is in the canon files, or is listed as invented.
- Nothing is spoken. Speech is `[NPC Content Needed]`.
- It is at the stop asked for: read section 4's five and place it.
- It does not reveal the prologue outright (story overview, ruling 10),
  unless the surface is a memory.

## 8. What to show T

```
<surface> · <subject> · stop <n> (<name>) · <word count> of <cap> words

<the draft>

Invented: <details not in canon, or "nothing">
Confidence it is at stop <n>: <0-100>
```

Then one line offering the same piece one stop up and one stop down.
