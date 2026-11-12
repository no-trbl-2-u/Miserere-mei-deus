# The Narrator

The voice bible for the Narrator, one of the game's three player-facing voices
(T, 2026-11-08). It is the exemption D189 grants: on the surfaces listed
below, and only there, the Narrator may calibrate against Cormac McCarthy
(the register of Blood Meridian) and Elden Ring, borrowing manner and never a
sentence. Every other voice keeps [`ANTI_IMITATION.md`](ANTI_IMITATION.md) and
the delivery rules MB-1 to MB-8 in [`DELIVERY_REGISTER.md`](DELIVERY_REGISTER.md)
unchanged. Where this file and the `/narrate` skill disagree, this file wins.

The target (T, 2026-11-10): "I'm looking for blood meridian level prose."
Cormac McCarthy writing Elden Ring, on this game's story, enemies, quests and
places. T approves every line; nothing the Narrator drafts ships unapproved.

## Scope

| The Narrator writes | The Narrator never writes |
|---|---|
| Place and map lines, arrival lines, hazards, rests, dreams, cutscenes, travel prompts | Card text, keywords, rules text (the Rulebook) |
| Quest names, quest log text, gate reasons, refusal lines told as narration | Anything someone speaks (the People) |
| Enemy descriptions and journals, item flavor | Button labels |
| Narration on the app's screens (defeat, death return, game over) | Story: what happened, who someone is |

- A piece that needs someone to speak carries `[NPC Content Needed]` in place
  of the speech, and says who would speak.
- An enemy with no story gets a description from its portrait line only, and
  no journal.
- The story is `content/story/story-overview.md`. A fact it does not carry
  does not exist; a detail a draft invents is listed as invented and ships
  only inside a line T approved.
- Enemy descriptions: T ruled (2026-11-12) that the six `DRAFT (Claude)`
  descriptions are replaced by approved drafts, and that his own description
  of the saint beneath is kept as he wrote it. This binds chunk 177.8.

## The rules

Lintable ones are marked; `scripts/check-prose.mjs` learns them in chunk 177.2.

1. A sentence runs at most 40 words (lint).
2. Each surface has a word cap for the whole line (lint; T kept the caps,
   2026-11-12):

   | Surface | Cap |
   |---|---|
   | Map blurb | 18 |
   | Arrival line (a fight's reveal) | 32 |
   | Loot cache action | 30 |
   | Hazard, rest, dream, travel, quest and description lines | 45 |
   | Screen copy (defeat, death return, game over) | 40 |
   | Journal | 110 |

3. Story screens and cutscenes have no cap on the whole. They tell their part
   of the story: what happens, to whom, and what it costs, as the Act 1 story
   rules it (review). Their sentence ceiling is 40 words where MB-1 says 20
   (lint). They are told in panels, one paragraph a panel. A story panel holds
   at most 80 words and a screen at most six panels (T, 2026-11-12: "80 words,
   6 panels").
4. No quotation marks; reported speech is set off with a comma. No
   exclamation marks and no semicolons (lint).
5. Canonical player terms keep their spelling (`VITAE`, `GUARD`) (review).
6. No sentence of McCarthy's or Elden Ring's is reused, and no name, place or
   character of theirs (review; the lint cannot see this).
7. Violence is told flat and never dwelt on. The prologue's assault stays
   off-screen and the child's death is named, never shown (review; story
   overview, prologue step 9).
8. Diction. Archaic and biblical words are used sparingly ("bade", "yet",
   "whence"); never "thee", "thou", "hath". Clauses may chain with "and",
   inside the 40-word ceiling. One long simile at most per piece. The land and
   the sea do not care. Second person for what the player meets; third person,
   past tense, for journals and memories.

## The five cruelty stops

Every draft is written at a stop T picks ("How cruel?"). The same scene at
each is in `.claude/skills/narrate/SKILL.md`. Stops stack: a higher stop is
never more gore, and the prologue's assault stays off-screen at every stop.

| Stop | Name | What it means |
|---|---|---|
| 1 | Plain | The world is old and does not care. Dread with no culprit. Nobody is hurt on the page. |
| 2 | Hard | Loss and harm on the page, done by weather, hunger or time. No one chose it. |
| 3 | Cruel | Someone chose it, for gain or ease. One cruel fact, told flat. |
| 4 | Cruelty at 11 | Shared, habitual, enjoyed or administered; it has a ledger, a custom or an audience. One detail makes it worse than it needed to be. |
| 5 | Grief | It lands on someone the reader cares for, or is the subject's own doing. It ends on a small plain thing. Written to hurt. |

Stops 2 and 3 were not on any ballot; their samples are Claude's and not yet
T's. When T asks for many pieces and says `mix`, the rotation (T, 2026-11-11)
is plain, cruel, plain, grief, and round again.

## The calibration set

Copied from `plan/ballots/narrator-voice.md` as it stood on 2026-11-12. A later
verdict adds to it. Round 4 and round 5 of the voice ballot are not yet voted.

### Locked (T, 2026-11-08, with T's edits)

Both end on a long sentence, whichever shape they started in.

**The Breakwater** (long):

> The wall comes down out of the hills and goes out into the sea and stops and
> the sea comes over it regardless. Behind it the piers stand black and
> dripping on their legs and the boats lie chained at them and under the
> lighthouse the wreck of some older thing lies canted in the shingle where
> the tides have corroded its ribs for the world to see.

**The Charcoal Wood** (stripped):

> Clearings cut in rings. Clamps smoking under sod. The burners are black to
> the eyes and they do not look up. Caves lie in the south where many have
> entered only to exit as a shadow of who they once were.

### T's reasons and rejections

- T, 2026-11-08, on round 1: "I love this, buuuut I want darker. I want a
  corpse hanging from those gallows. I want the player to be afraid."
- Round 2 drifted into modern horror; T asked for the target directly:
  "Imagine if Cormac McCarthy wrote Elder ring". Withdrawn unvoted.
- Round 3 (eight places, each plain, bloody and immoral) was withdrawn unvoted
  when T set the three takes for round 4.
- T, 2026-11-10, on round 5's first draft (plain short sentences): "I don't
  see anywhere in the PR about the voice being in the style of Cormac
  McCarthy. I'm looking for blood meridian level prose." All 36 samples were
  rewritten.
- T, 2026-11-10: "Try to avoid having the run on sentences go on for too
  long." This is the 40-word ceiling.
- T, 2026-11-09, on keeping the gore purposeful: "write around it instead of
  describing it outright."
