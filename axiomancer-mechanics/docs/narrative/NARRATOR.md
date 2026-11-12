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
| Quest names, quest log text, gate reasons, refusal lines told as narration | Button labels |
| Enemy descriptions and journals, item flavor | Story the overview does not carry: what happened, who someone is |
| Narration on the app's screens (defeat, death return, game over) | |
| Speech by a person on the story overview's cast sheet, inside the telling | |

- The Narrator is the Keeper (story overview, ruling 5), and a person on the
  overview's cast sheet speaks inside his telling (ruling 11). The speech is
  written, in the voice the cast sheet gives that person. `[NPC Content Needed]`
  stays only for a speaker with no cast entry, and the piece says who would
  speak.
- An enemy with no story gets a description from its portrait line only, and
  no journal.
- The story is `content/story/story-overview.md` as it stands. A fact it does not carry
  does not exist; a detail a draft invents is listed as invented and ships
  only inside a line T approved.
- Enemy descriptions: T ruled (2026-11-12) that the six `DRAFT (Claude)`
  descriptions are replaced by approved drafts.

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
   | Journal | 200 (T, 2026-11-12: "Raise the journal cap") |

3. Story screens and cutscenes have no cap on the whole. They tell their part
   of the story: what happens, to whom, and what it costs, as the Act 1 story
   rules it (review). Their sentence ceiling is 40 words where MB-1 says 20
   (lint). They are told in panels, one paragraph a panel. A story panel holds
   at most 80 words and a screen at most six panels (T, 2026-11-12: "80 words,
   6 panels").
4. No quotation marks; speech, reported or a cast member's own, is set off
   with a comma, as "Ann Greave says, ..." (lint). No exclamation marks and no
   semicolons (lint).
5. Canonical player terms keep their spelling (`VITAE`, `GUARD`) (review).
6. No sentence of McCarthy's or Elden Ring's is reused, and no name, place or
   character of theirs (review; the lint cannot see this).
7. Violence is told flat and never dwelt on. A child's death is named, never
   shown (review; story overview, ruling 12).
8. Diction. Archaic and biblical words are used sparingly ("bade", "yet",
   "whence"); never "thee", "thou", "hath". Clauses may chain with "and",
   inside the 40-word ceiling. One long simile at most per piece. The land and
   the sea do not care. The Narrator is the Keeper and may say "I". He
   addresses the player as "you", in the present tense, for what the player
   meets; journals and memories are third person, past tense.

## The five cruelty stops

Every draft is written at a stop T picks ("How cruel?"). The same scene at
each is in `.claude/skills/narrate/SKILL.md`. Stops stack: a higher stop is
never more gore, and a child's death is named, never shown, at every stop.

| Stop | Name | What it means |
|---|---|---|
| 1 | Plain | The world is old and does not care. Dread with no culprit. Nobody is hurt on the page. |
| 2 | Hard | Loss and harm on the page, done by weather, hunger or time. No one chose it. |
| 3 | Cruel | Someone chose it, for gain or ease. One cruel fact, told flat. |
| 4 | Cruelty at 11 | Shared, habitual, enjoyed or administered; it has a ledger, a custom or an audience. One detail makes it worse than it needed to be. |
| 5 | Grief | It lands on someone the reader cares for, or is the subject's own doing. It ends on a small plain thing. Written to hurt. |

Stops 2 and 3 were not on any ballot. T approved them as written, with their
samples in `.claude/skills/narrate/SKILL.md` (T, 2026-11-12: "approve stops 2
and 3 as written"). When T asks for many pieces at once, the rotation (story overview, ruling 12)
is stops 1, 2, 1, 3, 1, 4, 1, 5, and round again.

## The calibration set

Copied from `plan/ballots/narrator-voice.md` as it stood on 2026-11-12. A later
verdict adds to it. Rounds 4 and 5 of the voice ballot closed on 2026-11-12 with no per-slot picks; T: "Leave on the most recent narrator voice", so round 5 (plain, cruel, grief) is the voice.

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
