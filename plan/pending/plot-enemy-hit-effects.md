---
date: 2026-11-02
---
## Edit plan/README.md
~~~ old
**Held** (waits on a person's word; never picked until the
~~~
~~~ new
- **141.1** · AN6b: a landed enemy hit shows it landed (T, `/plot`, 2026-11-02)

**Held** (waits on a person's word; never picked until the
~~~

## Edit plan/README.md
~~~ old
| [139-eq4-equipment-follow-ups.md](139-eq4-equipment-follow-ups.md) | planned | 2 left |
~~~
~~~ new
| [139-eq4-equipment-follow-ups.md](139-eq4-equipment-follow-ups.md) | planned | 2 left |
| 141 | A landed enemy hit shows it landed | [141-an6-enemy-hit-effects.md](141-an6-enemy-hit-effects.md) | planned | 1 left |
~~~

## Decisions
- **D?enemy-hit-event** · 2026-11-02 · The engine reports each enemy hit that lands as `damage-dealt` target `self`, with what was blocked, and the pane reads that rather than diffing health. *Why:* a health diff cannot tell a hit from a sacrifice or a tick, and every hit effect already waits on this event.
