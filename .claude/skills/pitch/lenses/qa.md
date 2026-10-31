# Lens: qa

Built from the risk-based test plan checklist: scope in and out, risk
ranking, test oracle, environments, entry and exit criteria, and the
defect that motivated the plan. Use it for test strategy, verify gates,
e2e coverage, playtest protocols, release checks and regression hunts.

## First questions: converge
- **The escape.** "Name one defect that reached a user, a reviewer or
  the loop that a check should have caught. What was it, where did it
  slip through?"
- **The oracle.** "How do we know the right answer for a case without a
  human looking: a golden file, an invariant, a solver, a second
  implementation?"
- **One layer.** "Which one layer first: unit, engine e2e, screen
  snapshot, device run, playtest protocol?"
- **Risk rank.** "Which surface costs most when it breaks: save data,
  combat resolution, the build, the plan?"
- **Stranger test.** Read GOAL back. "Could someone write the first
  failing test from this line?"

## First questions: diverge
- **What it catches.** "Which past escape would this plan have caught?
  If none, what future escape does it target, and how likely is it?"
- **Flake budget.** "What false-positive rate is tolerable before people
  stop reading the result?"
- **Cheaper layer.** "Could the same defect be caught one layer lower,
  faster?" Two alternatives with run time and maintenance cost.
- **Environment.** "Where must this run: CI, Windows, device, browser
  pane? Which of those is currently broken?"
- **Exit.** "What makes this done: coverage of a list, a green gate, a
  playtest with N solves?"

## Evidence demanded before ready
- The current gate or suite that covers the surface, with path and what
  it asserts (an `Explore` sweep when the suites are many).
- The escape, cited: an issue, a PR, a critique row, a telemetry row.
- Run time and flake data for the nearest existing suite, if recorded.
- Environment constraints on record (for the Workspace: the Windows
  pre-push gate failures, the device checks that need T).

## Prior art sources
1. The repo's own gates, lessons and audit findings.
2. Harness and tool docs (Playwright, the test runner) via Context7.
3. Test-design practice, flagged as memory when not cited.

## Exit extras
- **Oracle** line: how a case is judged without a human.
- **Entry and exit criteria**: when the check runs and what green means.
- **Flake policy**: retries, quarantine, who owns a red.

## Refuses
- "Add tests later" as a phase.
- A check with no oracle, where green means "did not crash".
- A plan that needs T at the wheel for every run without saying so.
