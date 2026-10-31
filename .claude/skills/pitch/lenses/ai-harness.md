# Lens: ai-harness

Built from the evaluation design checklist used for agent and model
work: a task definition, a metric with a baseline, a failure taxonomy,
cost per run, contamination and leakage, and a kill criterion. Use it
for the nexus loop, skills, workflows, subagent fan-out, review
pipelines, prompts and MCP tooling.

## First questions: converge
- **The failure.** "Name one run, PR or tick where the harness did the
  wrong thing. What did it produce, what should it have produced?"
- **The metric.** "How would you know this worked without reading the
  transcript: a pass rate, a cost, a latency, a merge without rework?"
- **One seam.** "Which one seam first: a skill file, a hook, a workflow,
  a subagent brief, a review gate, a prompt?"
- **Cost.** "What is this allowed to cost per run, in tokens or minutes,
  and who pays when it fails?"
- **Stranger test.** Read GOAL back. "Could another agent run this from
  the goal line alone?"

## First questions: diverge
- **What it fixes.** "Which observed failure disappears if this ships
  exactly as written? Point at a telemetry row, a PR, a transcript."
- **Baseline.** "What does the current harness score on that failure
  today? If unmeasured, the first phase is the measurement."
- **Cheaper alternative.** "Would a one-line rule in the existing skill
  do it? Would a hook? Would a test?" Two alternatives, each with cost.
- **Leakage.** "Does the proposed check see the answer it is checking?
  Does the reviewer share context with the author?"
- **Kill criterion.** "What result would make you remove this?"

## Evidence demanded before ready
- The seam's current text or code, with path (the skill, hook, workflow
  or prompt that would change).
- A baseline number: from the telemetry view, the PR list, a replay of
  the skill on three past inputs, or a test run. If none exists, the
  pitch's first acceptance statement is the measurement itself.
- Cost estimate per run, stated as a range, and the cap it must sit
  under (the repo's job budget or tick cap where one exists).
- The guard check: which existing tests or rulesets constrain the seam
  (for Miserere: the loop dispatch guard, the PR cap, the verify gate).

## Prior art sources
1. The repo's own history: lessons files, ADRs, decision logs, prior
   skill versions.
2. The harness docs (Claude Code skills, hooks, subagents, workflows)
   via the docs fetch or Context7.
3. Published eval practice, flagged as memory when not cited.

## Exit extras
- **Baseline and target**: the number today and the number that means
  success, on the same measure.
- **Failure taxonomy**: the three ways this can fail and which the
  Measure catches.
- **Kill criterion**: what result removes it.

## Refuses
- A pitch whose Measure is "reads better" or "the agent seemed smarter".
- Adding a subagent where a rule in an existing file would do.
- Changing a permission, a guard test or a ruleset as a side effect; those
  are their own pitch.
