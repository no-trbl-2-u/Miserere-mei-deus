---
date: 2026-11-06
---
## Edit plan/README.md
~~~ old
**Held** (waits on a person's word; never picked until the
~~~
~~~ new
- **152.1** · UK1a: the look table, the kit primitives and the pieces it names (T's mixer picks, `/plot`, 2026-11-06; before the MVP demo)
- **152.2** · UK1b: the Wilds on vellum, and the tab bar (T's mixer picks, `/plot`, 2026-11-06)
- **152.3** · UK1c: the fight in brass where T kept it, layout held (T's mixer picks, `/plot`, 2026-11-06)
- **152.4** · UK1d: the Spoils on vellum, inked to read (T's mixer picks, `/plot`, 2026-11-06)
- **152.5** · UK1e: Self in brass; the Ledger and Satchel pieces (T's mixer picks, `/plot`, 2026-11-06)
- **152.6** · UK1f: the main menu and Settings in brass (T's mixer picks, `/plot`, 2026-11-06)

**Held** (waits on a person's word; never picked until the
~~~

## Edit plan/README.md
~~~ old
| 146 | Arena plates: twelve engravings behind the foe, a default per region, a plate per node | [146-ap1-arena-plates.md](146-ap1-arena-plates.md) | planned | 1 left |
~~~
~~~ new
| 146 | Arena plates: twelve engravings behind the foe, a default per region, a plate per node | [146-ap1-arena-plates.md](146-ap1-arena-plates.md) | planned | 1 left |
| 152 | The UI kit, place by place: Brass Gothic, Vellum & Ink or as it is, per T's picks | [152-uk1-ui-kit-looks.md](152-uk1-ui-kit-looks.md) | planned | 6 left |
~~~

## Decisions
- **D?ui-kit-looks** · 2026-11-06 · The experience kit is drawn place by place from one look table (Brass Gothic, Vellum & Ink or Normal for each of 44 places), never as a wholesale skin. A place marked Normal keeps today's code path. No kit piece goes on a combat card, and the title screen's EMBARK is never re-skinned. Text on vellum is inked (dark brown, oxblood accents) at 4.5:1 or better. *Why:* T closed the wholesale Brass Gothic PR (#1398, 2026-11-05: "I like some of this, I love a few, but I hate the rest"), then picked each place in the kit mixer (2026-11-06); spec 152 (UK1).
