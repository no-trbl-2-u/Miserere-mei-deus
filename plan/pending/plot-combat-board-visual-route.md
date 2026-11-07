---
date: 2026-11-07
---

## Edit plan/README.md

~~~ old
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
~~~
~~~ new
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 158 | The combat board gets a CI visual route, so the fight's brass and layout have a pixel net | [158-vr1-combat-board-visual-route.md](158-vr1-combat-board-visual-route.md) | planned | 2 left |
~~~

## Decisions
- **D?combat-board-route** · 2026-11-07 · The fight board's visual net is a `combat-board` route inside `smoke-screens`, not a separate job, with its own diff ratio and a wait on each brass place's testID before it shoots. *Why:* it shares the web export, the one summary the re-stamp job reads and the `SMOKE_RUNS=2` determinism check; a board with a piece missing must fail to load, never become the baseline.
