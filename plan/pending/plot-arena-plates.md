---
date: 2026-11-04
---
## Edit plan/README.md
~~~ old
**Held** (waits on a person's word; never picked until the
~~~
~~~ new
- **121.2** · TP1b: the title plate is Doré's *Inferno* Plate 3, the lion (T's pick, `/plot asap`, 2026-11-04)
- **146.1** · AP1a: pull in the twelve arena plates (T's picks, `/plot asap`, 2026-11-04)
- **146.4** · AP1d: a backing shaped to each foe (T, `/plot asap`, 2026-11-04)
- **146.2** · AP1b: one plate library, a default per region (T's picks, `/plot asap`, 2026-11-04)
- **146.5** · AP1e: combat plates back on (T, `/plot asap`, 2026-11-04)
- **146.6** · AP1f: every foe on its region's three plates, measured (T, `/plot asap`, 2026-11-04)
- **146.3** · AP1c: a node may name its plate (T, `/plot asap`, 2026-11-04)

**Held** (waits on a person's word; never picked until the
~~~

## Edit plan/README.md
~~~ old
- **121.2** · owner-led: art is owner-only (D88) (TP1b) · since: 2026-11-01 · until: 2026-11-07 · max_age: 14d
~~~
~~~ new
~~~

## Edit plan/README.md
~~~ old
- **123.1** · attended: T does this one (PF2) · since: 2026-11-01 · until: T's word · max_age: 30d
~~~
~~~ new
- **123.1** · attended: T does this one (PF2) · since: 2026-11-01 · until: T's word · max_age: 30d
- **146.7** · owner-led: art is owner-only (D88) (AP1g) · since: 2026-11-04 · until: T's word · max_age: 30d
~~~

## Edit plan/README.md
~~~ old

## How the loop reads this folder
~~~
~~~ new
| 146 | Arena plates: twelve engravings behind the foe, a default per region, a plate per node | [146-ap1-arena-plates.md](146-ap1-arena-plates.md) | planned | 7 left |

## How the loop reads this folder
~~~

## Edit plan/121-tp1-title-plate-legibility.md
~~~ old
- [ ] **121.2** The title plate itself (owner-led) · M · closes A8 · needs — · alias: TP1b
~~~
~~~ new
- [ ] **121.2** The title plate: Doré's *Inferno* Plate 3, the lion (T's pick) · M · closes A8 · needs — · alias: TP1b

### 121.2 (TP1b) — The title plate: Doré's *Inferno* Plate 3, the lion · M · closes A8 · requires —

- T's pick (2026-11-03): "I pick the title plate with the lion. It's got a huge area at the top we could put The title
  in". Source `File:Gustave_Doré_-_Dante_Alighieri_-_Inferno_-_Plate_3_(The_lion).jpg`, licence proven by
  `acquire-art.mjs`.
- A new `category: title` key in `scripts/art-sources.json` for the lion; the title screen points to it. Trim the scan's
  grey border in the recipe. The wordmark sits in the dark upper band; the psalm stays clear of the pale sky slit under it.
- `shore-at-dawn` stays as the launcher icon's source (the icon is not in this chunk).
- Measure: `npm run art:legibility -w axiomancer-mobile -- --write` passes (wordmark 3:1, psalm 4.5:1 after scrims at
  1280x800); scrims may be tuned, the plate may not be swapped. Then `npm run verify -w axiomancer-mobile`.
~~~

## Edit plan/121-tp1-title-plate-legibility.md
~~~ old
- **TP1b — the plate itself** (owner-led, D88). Candidates already tried and rejected in T's 2026-10-18 pass, all
~~~
~~~ new
- **TP1b — the plate itself** (T picked Doré's lion, 2026-11-03; now chunk 121.2). Candidates already tried and rejected in T's 2026-10-18 pass, all
~~~

## Decisions
- **D?combat-plates-on** · 2026-11-04 · Combat shows an engraved plate behind every foe again, each Act 1 region on T's default and any node on a plate T names, once every transparent foe has a backing shaped to its silhouette. Supersedes D32 (T 2026-09-26, "an all black background for all combat plates for now"). *Why:* T, "put black just behind the enemies (slight aura around is okay so you don't have to make it fit perfectly)" and "let's have all of them and change them based on where they are within the region of the map they're on with defaults based on my picks".
