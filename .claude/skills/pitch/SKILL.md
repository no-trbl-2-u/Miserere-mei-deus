---
name: pitch
description: Think an idea through with the user, in conversation, until it is one clear, attainable goal, then hand it to /plot. Use when the user says "/pitch", "let's pitch", "help me shape this", "I have an idea but", or brings a half-formed or over-specified idea and wants to think it through together rather than get an answer or a build. Not for logging an idea (/jot, /note), clustering a dump (/messy), or planning a known task (/plot).
argument-hint: "[--as game-design|ai-harness|qa|<lens>] [--resume <slug>] <idea, in any state>"
disable-model-invocation: true
---

# /pitch

A conversation that ends in one goal line a stranger could build from. It
thinks **with** the user (called T below), never for them. It never builds,
never commits, never promotes. Its finished output is a pitch file that
`/plot` consumes.

Read before the first turn: the lens file (section 5), the repo config if
present (section 6), and `references.md` (the card, the triage rubric, the
move catalogue in full). This file is the procedure; `references.md` is the
detail.

## 1. Invocation

```
/pitch <idea>                       # lens from the repo config, else "general"
/pitch --as game-design <idea>      # force a lens (lenses/<name>.md)
/pitch --resume <slug>              # continue a saved card
/pitch                              # no idea yet: open with the convergence opener
```

## 2. The pitch card (the thing that keeps T on track)

One scratch file, `<scratch_dir>/pitch-<slug>.card.md`, rewritten every
turn. It is never committed. Shape:

```markdown
# Pitch card: <slug>    lens: <name>   state: converge|diverge|ready   turn: N
GOAL   <one sentence: "we will <change> so that <who> can <what>, proven by <measure>">
FIXED  - <constraint T has ruled; cite the turn>
FREE   - <dimension still open>
PARKED - <idea that did not change GOAL/FIXED/FREE; turn it arrived>
OPEN   - <question only T can answer, with the default if deferred>
EVIDENCE - <what was read or measured, with path or number>
GOAL HISTORY - t1: ... | t4: ... | t7: ...
```

Rules that run every turn, mechanically:

1. **Update, then echo.** After T's message, update the card, then start
   the reply with the GOAL line in your own words. If the echo is wrong, T
   corrects it in one line; that is the comprehension check.
2. **Drift rule.** A message from T that changes nothing in GOAL, FIXED or
   FREE goes to PARKED, and the reply says so in one sentence
   ("Parked: <thing>. It does not move the goal; we can come back.").
   Never silently follow a tangent. Never silently drop one either.
3. **Fork stop.** If GOAL HISTORY shows three rewrites where the new line
   is not a strict narrowing of the old one, stop shaping. Name the fork
   as one `AskUserQuestion` with the two or three goals as options, each
   with what it costs to pick. The answer becomes GOAL and the losers go
   to PARKED.
4. **Turn budget.** At turn 8 without `ready`, say so and ask whether to
   keep going, park the pitch (card kept, `--resume` later), or close with
   what is fixed so far as a `/messy` dump instead.

## 3. Triage: which path we are on

Score T's latest state, not only the opening message. Rubric with examples
in `references.md` section 2. In short:

| Signal | Counts toward |
|---|---|
| adjective without a noun ("more interesting", "better", "feels off") | U |
| no surface named (which screen, system, file, user) | U |
| more than one theme in the message | U |
| nobody named who feels the problem | U |
| a mechanism named, with numbers | O |
| no problem or "why" stated | O |
| one solution, no alternative mentioned | O |
| code paths or types named | O |

- **U >= 2 and O < 2: converge.** Moves: name the itch (what happened
  that made you want this), pick one surface, "if only one thing changed",
  the stranger test, bound the size.
- **O >= 2: diverge first.** Moves: "what would this fix", loosen one
  FIXED item at a time, two alternatives with trade-offs, telltale failure
  mode, prior art. Once a problem statement exists, re-score; it usually
  flips to converge.
- **Both < 2 and the exit criterion (section 7) holds: ready.**

Re-score whenever GOAL changes and every third turn regardless. Record the
state in the card header; mention it in prose only when it changes.

Convergence opener (no idea given, or U >= 3): one batch of at most three
questions from the lens's "first questions: converge" list. Divergence
opener (O >= 2): reflect the mechanism back, then one batch of at most
three from the lens's "first questions: diverge" list.

## 4. The turn loop (conversation, not delivery)

Each turn makes **one move**, then ends with a question or a choice.
Never two moves, never a wall. The moves:

- **Reflect**: restate GOAL in your own words and ask if it is right.
- **Ask**: an `AskUserQuestion` batch, 1 to 4 questions, each option
  naming its trade-off and its defer default (asking-well rules 1, 3, 4,
  5 in `references.md` section 3). While shaping, **no `(Recommended)`
  tag**: a recommendation anchors a question whose point is to find out
  what T thinks. At the exit question (section 7) the tag returns, because
  that one is a decision.
- **Offer**: two or three alternatives, each with a trade-off and a
  telltale failure mode. Never one. Never recommend until asked.
- **Fetch evidence**: read the repo or run the harness the lens names.
  Fan out an `Explore` subagent only for "what exists" sweeps across many
  files; it reports to you, never to T. Results go to EVIDENCE with paths
  or numbers.
- **Prior art**: two to four cases that solve the same problem shape in
  different ways, with reception where known. Say "no confident read"
  rather than invent reception.

Pick the move the card needs: a FREE item with no evidence wants a fetch;
a FREE item that is T's taste wants an ask; an O-heavy state wants an
offer; a changed GOAL wants a reflect.

## 5. Lenses (specialists as reading glasses, not as agents)

A lens is a file `lenses/<name>.md` that supplies: first questions for
each path, the evidence it demands before `ready`, where it looks for
prior art, extra exit fields, and what it refuses. The lens is loaded
into **this** conversation. It is not a subagent, because a subagent
cannot talk to T; it only returns a report. Subagents serve evidence
fetches and nothing else.

Lens selection: `--as <name>` wins; else the repo config `lens:`; else
`general` (the questions in `references.md` section 3 with no domain
extras). Shipped lenses: `game-design`, `ai-harness`, `qa`. A new lens is
a new file in the same shape (`lenses/README.md`).

## 6. Repo config (portability)

Optional `.claude/pitch.md` at the repo root, YAML front matter only
(schema and example in `config.md`). It names where pitches land, where
the scratch card lives, which harness measures, the default lens, and the
handoff command. Without it: pitches land in `pitches/`, the card in
`.pitch/` (tell T to gitignore it), lens `general`, and the handoff is a
printed `/plot`-shaped block with no command run.

## 7. Exit criterion and handoff to /plot

`ready` is true only when the card has all of:

- **GOAL** that passes the stranger test: a reader who was not in the
  room could start.
- **FIXED and FREE** lists, each non-empty or explicitly "none".
- **EVIDENCE**: what exists today, with paths; and one measured number
  from the harness the lens names, or "not measurable before build" with
  the reason.
- **Prior art**: at least two cases, reception stated or disclaimed.
- **Measure**: one line naming the command, test or observation that
  proves the goal.
- **Acceptance**: two to six checkable statements, A1 to An.
- **OPEN**: empty, or every item carries a default and `[T to confirm]`.
  `/plot` rejects briefs with open questions, so a pitch may not leave
  bare ones.
- Lens extras (each lens file lists its own).

Then, and only then: write the pitch file to `<pitch_dir>/<date>-<slug>.md`
in the format of `references.md` section 4 (surface question, better
question, path taken, evidence, prior art, rulings, directions, **Handoff
to /plot** block). Ask one `AskUserQuestion`, recommended-first: "Run
`/plot asap` with this pitch as its Source (Recommended) / `/plot anytime`
/ `/plot peek` / not now (the pitch file stays; run `/plot` later)". On a
`/plot` answer, run it in this session with the pitch file as the Source
and the GOAL line as the task; T answered, so T fired it. On "not now",
print the exact `/plot` line and stop. Delete the card once the pitch file
exists.

## 8. What /pitch refuses

1. **Never builds.** No code, no tests, no prototypes beyond a scratch run
   of an existing harness.
2. **Never commits or pushes.** The pitch file is left for T or for
   `/plot` to carry.
3. **Never promotes.** No build-plan rows, briefs or candidates; that is
   `/plot` and `/messy`.
4. **Never writes the pitch file before `ready`.** A partial pitch is a
   card, and cards are scratch.
5. **Never fired by a loop, workflow or another skill.** T types it.
6. **Never asks what the card already answers**, and never more than four
   questions in a batch.
7. No emojis, no attribution trailers where the repo forbids them.

## Additional resources

- [references.md](references.md): the card in full, the triage rubric
  with examples, the move catalogue, the pitch file format.
- [config.md](config.md): the repo config schema and the Miserere example.
- [lenses/README.md](lenses/README.md): how to write a lens.
- [replays.md](replays.md): three replays against past sessions.
