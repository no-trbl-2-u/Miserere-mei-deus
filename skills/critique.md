# Skill: critique

> **External observer.** Play the local expo-web build as a
> first-time player, take notes, self-assess, append durable findings to
> `plan/CRITIQUE.md`. `/iterate` reads CRITIQUE.md as a finding
> source — that's the **address loop** half.
>
> **Rate-limited** by `/march` (the gate lives in `skills/march.md`
> "Gates (the one home)"). Cap of 6 filed findings per pass.

## 1. Purpose

The autonomous loop is good at shipping what it was told to
ship. It's bad at noticing when the shipped result doesn't
play well as a real first-time player would experience it.

`/critique` is the corrective lens.

## 2. Invocation

```
/critique                    # full pass
/critique <url>              # focused pass on one screen / route
/critique mobile             # 375×800 only
/critique desktop            # 1280×800 only
```

The game has no login (`plan/bearings.md`: `Auth: none`), so
every pass is a single pass with no session handshake.

When invoked from `/march`, conditions are pre-checked.

## 3. The screen set (default full pass)

Pick **representative**, not exhaustive. The e2e suite
already covers every screen; critique is for *quality*.

### Screen set (always)

| Screen | Why critique it |
|---|---|
| Title / landing screen | First impression. The fold matters. |
| New-game / onboarding flow | Where a first-time player forms their model of the game. |
| A canonical combat encounter | The game's core loop as actually played. |
| Town / exploration hub | Navigation, voice, and orientation. |
| An empty or early-progression state | Often where the experience breaks down. |

### Fixture-booted screens (state-gated routes, 2026-09-08)

Several screens are pushed by the app's gates off game state and
bounce when there is none — they cannot be reached by URL alone. The
**state-fixture** mechanism (`docs/state-fixtures.md`) boots the app
at a known state instead; each registry id below is shared with the
CLI (`--fixture <id>`) and the Jest suites:

| Screen | Fixture id | Lands on |
|---|---|---|
| NPC dialogue | `apprentice-staged-dialogue` | `/dialogue` |
| Settlement + shop | `wanderer-staged-village` | `/village` |
| Forest omen (cutscene) | `wanderer-staged-cutscene` | `/cutscene` |
| Night-watch rest | `apprentice-bw-rest` | `/rest` |
| Hazard minigame (late kit) | `l30-bw-hazard-arrive` | `/hazard` |
| Mid-campaign exploration hub | `sage-bw-door-gate` | `/exploration` |

- **Unattended transport** (`critique:drive`, §3.5) already carries
  these as `SCREENS` entries with a `fixture` key — nothing to do.
- **Attended pass** (`playtester`, §4): hand the sub-agent URLs of the
  form `http://localhost:8081/exploration?fixture=<id>`. The dev
  server has dev tools on, so the query is honoured; a fixture with
  `arrive` opens the gated screen on its own. Tell the playtester the
  state is a *starting point*, not a save it earned — first-time-player
  confusion about how it got there is not a finding.
- Need a state nobody has authored? File an AUDIT row asking for a
  registry entry (kebab-case id, `seed`, `description`) rather than
  scripting a click path; critique never modifies code (hard rule 1).

Skip screens that don't exist yet. Note in pass log.

## 3.5 Unattended ticks — use the non-MCP transport (Phase 34)

The `playtester` sub-agent's Playwright **MCP** tool grants do not
propagate into Agent-tool sub-agent contexts on unattended runs (8 of
11 passes filed zero findings — `plan/CRITIQUE.md` Done section,
"Playwright MCP tools unavailable to sub-agents"). The fix (Phase 34,
shipped 2026-07-16) is **not** to drop Playwright — it is to drop the
MCP + sub-agent hop.

**When there is no interactive user (loop / `/march` / cron):** do NOT
spawn `playtester`. Instead:

1. Run the transport as a plain subprocess:

   ```bash
   npm run critique:drive                    # mobile viewport (default)
   CRITIQUE_VIEWPORT=both npm run critique:drive   # mobile + desktop
   ```

   It imports the Playwright *library* (no MCP), serves the shared web
   export `axiomancer-mobile/.smoke-dist` hermetically (re-exported only
   when its stamp no longer matches the tree; `AXM_FORCE_EXPORT=1`
   forces it), drives the §3 screen set, and writes
   screenshots + DOM innerText + console/page errors per screen to
   `axiomancer-mobile/.critique-artifacts/<viewport>/`, plus a
   top-level `manifest.json`. Exit 0 = captured (even if some screens
   errored — that's data); exit 3 = boot failure (export/server/browser
   — if it complains the browser is missing, run
   `npx playwright install chromium` once).

2. **You** (the main critique agent, which has vision and no grant
   problem) read `manifest.json`, then each screenshot + `.txt`, and
   file findings per §6 — same self-assessment, same cap of 6, same
   filing format. `navError`/`pageErrors`/`consoleErrors` on a manifest
   entry are themselves candidate findings. This replaces the
   `playtester` delegation for unattended passes only.

**When a user IS present (interactive `/critique`):** keep delegating
to `playtester` with the Playwright MCP tools (§4) — grants work live,
and the fresh sub-agent context is the better first-time lens. The
transport above is the unattended fallback, not a replacement.

Do not re-diagnose the MCP-grant mechanism — that path is closed.

## 4. Attended passes: delegate to `playtester`

The `playtester` sub-agent at `.claude/agents/playtester.md` is
the fresh-eyes observer. **When a user is present, always
delegate the playthrough to it.** (Unattended passes never spawn
it — they use the §3.5 transport.) Reasons:

- It has Playwright tools (`mcp__playwright__*`) to actually
  drive the local expo-web build.
- Fresh sub-agent context = genuine first-time-player perspective.
- Output is structured JSON; easy to filter and file.

Pass it:
- The screen list.
- Voice cue from `plan/bearings.md`.
- Current `plan/CRITIQUE.md` Done section (so it doesn't
  re-surface addressed findings).
- Focus areas from invocation argument.

It returns a JSON array of findings; self-assess and file them
per §5 Steps 3–4.

## 5. The procedure

### Step 0 — Pre-flight

```bash
git pull --ff-only
npm run deploy:check
```

If no green deploy: defer. Write a one-line entry to CRITIQUE.md
"deferred at <date>: no green deploy" and exit 0. **Don't commit
on no-ops.**

Attended: ensure the local expo-web build is running (serves at
`http://localhost:8081`); start it if needed before spawning
the playtester. Unattended: skip Step 2 and run the §3.5
transport instead (it exports and serves its own build).

### Step 1 — Build the screen set

Default §3. Adjust based on argument, phase progress (skip
non-existent screens), recent shipping focus.

### Step 2 — Spawn `playtester` (attended only)

```
Agent({
  subagent_type: "playtester",
  prompt: "Play the local expo-web build at http://localhost:8081
           as a first-time player. Cover these screens: [list —
           state-gated ones as /exploration?fixture=<id> URLs, §3].
           Voice cue from plan/bearings.md: <quote>.
           Already-addressed (skip): <Done section>.
           Focus: <from arg or 'general'>.
           Return ≤ 8 findings as JSON per your output spec."
})
```

Wait for return.

### Step 3 — Self-assess

The playtester returns observations; you decide which deserve to land.
For each:

1. **Valid?** Can evidence be re-verified? Drop session-specific
   artifacts.
2. **Actionable?** Can a future `/iterate` tick fix with
   resources at hand, without creating content (D88)? If not,
   drop it and say why in the pass log.
3. **Duplicate?** If CRITIQUE.md has an open row for this exact
   issue, drop new + bump older's severity.
4. **Severity match impact?** Re-rate if needed.
5. **Suggested fix sane?** If contradicts bearings or contracts,
   replace with compatible fix.

After assessment, **3–6 findings**, not 8.

### Step 4 — Append to `plan/CRITIQUE.md`

```markdown
# Critique log

> Last pass: <ISO date> at commit <sha>
> Pass count: <N>

## Pending

### [HIGH] /<url> — <one-line>
- pass: <N> (commit <sha>)
- viewport: desktop | mobile
- category: <visual | comprehension | navigation | voice | mobile | performance | a11y>
- observation: <what was seen>
- evidence: <screenshot region | quoted text | console msg>
- suggested fix: <one-line concrete change>
- source: playtester

## Done

### [x] [MED] <url> — ... (pass <N>; addressed at <sha>)
```

Update metadata header.

Then append the pass record (phase LG1e): one JSON line to
`docs/reports/critique/passes.jsonl`, the same commit, never editing
an earlier line. It is what gives `/critique` a miss rate in
`docs/reports/eval/latest.md` (`scripts/eval/miss-rates-lib.mjs`
counts an escape merged inside a pass's `base..head` range as a miss,
or a catch when its fix cites that pass's finding).

```json
{"pass":<N>,"date":"<ISO>","base":"<previous Last pass sha, full>","head":"<sha played, full>","screens":["title","onboarding","..."],"viewports":["375x812","1280x800"],"findings":[{"id":"pass <N> <two-to-four-word name>","severity":"HIGH"}]}
```

- `base` is the `Last pass` commit from the header before this pass
  updated it; `head` is the commit this pass played.
- `screens` are the §3 screens actually captured; `viewports` the
  sizes played.
- `findings` lists each row filed this pass, `id` being the words a
  fix commit cites as `CRITIQUE <id>` (`[CRITIQUE pass 85 footer
  dock]`), `severity` one of `HIGH`, `MED`, `LOW`. A pass that only
  raised or folded an existing row lists none.
- Check it parses: `node --test scripts/eval/miss-rates.test.mjs`.

### Step 5 — Commit + push

A critique pass writes only `plan/CRITIQUE.md` and its pass record
under `docs/reports/`, so it is plan-only and pushes `main` directly
(D84; `skills/march.md` §3 "Landing a change"). It never opens a PR.

```bash
git add plan/CRITIQUE.md docs/reports/critique/passes.jsonl
git commit -m "$(cat <<'EOF'
critique: pass <N> — <K> findings (<H> high, <M> medium, <L> low)

Played: <list of screens>.
Findings filed to plan/CRITIQUE.md Pending.
Address loop: /iterate will pick the highest-scoring finding.
EOF
)"
git push origin main
```

If **zero** findings (rare): still update metadata, commit
`critique: pass <N> — no findings`. Pass counter is the signal
`/march` reads.

### Step 6 — Confirm deploy

```bash
npm run deploy:check
```

### Step 6.5 — Retro

Run `skills/march.md` §3 "Retro" (a transport hiccup, a flaky
fixture, a finding the self-assess had to drop twice are all
lessons).

### Step 7 — Done

Return 3-line summary.

## 6. Hard rules

1. **Never modify code, content, or data.** Findings and the pass
   record only.
2. **Attended: delegate the playthrough to `playtester`.** Don't
   play from main agent context. **Unattended: never spawn
   `playtester`;** use the §3.5 transport.
3. **Self-assess after the playtester returns.** Don't file raw
   observations.
4. **Cap at 6 filed findings per pass.** 8 is the playtester's
   input cap; 6 is your output cap.
5. **Never duplicate Pending or Done entries.**
6. **One commit per pass.**
7. **No emojis. No attribution trailers** (AGENTS.md rule 2).

## 7. Failure modes

1. **No green deploy.** Defer.
2. **`playtester` returns malformed output.** Re-spawn once with
   stricter format. If fails again, write single finding "playtester
   sub-agent malfunction at pass <N>", commit, exit 1.
3. **No screens in the set** (very early phases). Defer.
4. **`git pull` divergence.**

## 8. Address loop contract (how `/iterate` consumes findings)

`plan/CRITIQUE.md` `## Pending` is `/iterate`'s queue:
- Each finding has severity + ease (from suggested-fix
  complexity).
- `/iterate` §4 maps to category `external-critique`:
  HIGH→8–10, MED→5–7, LOW→2–4 impact.
- When `/iterate` ships a fix, moves row Pending → Done with
  `[x]` + commit hash.

Critique findings **compete fairly** with other audit sources.

## 9. When `/march` invokes `/critique`

The dispatch conditions live in `skills/march.md` "Gates (the one
home)". They read the `Last pass` / `Pass count` metadata header
this skill writes in §5 Step 4, so keep that header current.

## 10. Quick reference

```bash
# State files
plan/CRITIQUE.md                     # findings queue + last-pass metadata
docs/reports/critique/passes.jsonl   # one record per pass (Step 4)
plan/bearings.md                     # voice, URL contract

# Sub-agent
.claude/agents/playtester.md         # the fresh-eyes observer persona

# Known-state entry (state-gated screens)
docs/state-fixtures.md               # the fixture contract
npm run game -w axiomancer-mechanics -- --fixture list   # registry ids
http://localhost:8081/exploration?fixture=<id>           # attended URL form

# Commands
git pull --ff-only                   # Step 0
npm run deploy:check                    # green-deploy precondition
git commit && git push               # single critique: <summary> commit (CRITIQUE.md + passes.jsonl)
```
