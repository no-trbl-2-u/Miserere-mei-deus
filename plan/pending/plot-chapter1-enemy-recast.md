---
date: 2026-11-06
---
## Edit plan/README.md
~~~ old
|---|---|---|---|---|
| 155 | The Deck tab as a reader: one card open over its own painting, the rest in tabbed thumbnails, keywords pressed in the text | [155-dr1-deck-reader.md](155-dr1-deck-reader.md) | planned (**Asap**: each chunk) | 4 left |
~~~
~~~ new
|---|---|---|---|---|
| 157 | Chapter 1's enemy roster recast: six new faces onto six cut foes' nodes, four more benched, the wandering pool on the survivors | [157-en3-chapter1-enemy-recast.md](157-en3-chapter1-enemy-recast.md) | planned (**Asap**: each chunk) | 3 left |
| 155 | The Deck tab as a reader: one card open over its own painting, the rest in tabbed thumbnails, keywords pressed in the text | [155-dr1-deck-reader.md](155-dr1-deck-reader.md) | planned (**Asap**: each chunk) | 4 left |
~~~

## Edit plan/README.md
~~~ old
needs are done):

- **135.3** · SM2c: the four personas (T, `/plot asap`, 2026-11-01)
~~~
~~~ new
needs are done):

- **157.1** · EN3a: the six new library entries, each on its cut foe's numbers (T's enemy recast, `/plot asap`, 2026-11-06; `main`'s verify-mobile is red until EN3c)
- **157.3** · EN3c: the six portraits drawn — art registry, provenance, frame sets, backings (T's enemy recast, `/plot asap`, 2026-11-06; this is the chunk that takes `main` green)
- **157.2** · EN3b: Chapter 1's nodes repointed, the benched foes' nodes refilled, the wandering pool on the survivors (T's enemy recast, `/plot asap`, 2026-11-06)

- **135.3** · SM2c: the four personas (T, `/plot asap`, 2026-11-01)
~~~

## Edit plan/AUDIT.md
~~~ old
this row is the record of why a code-only fix-ci pass could not close it.
~~~
~~~ new
this row is the record of why a code-only fix-ci pass could not close it. **Answered by spec 157 (plot, 2026-11-06):** T's enemy recast makes the six portraits six real library foes, which is route (a) with the sets already authored in PR #1409. Chunk **157.3 (EN3c)** closes this row — it wires the art registry, the provenance records, the six frame sets and the baked backings, and takes `asset-provenance.test.mjs`, `enemy-backings.test.mjs` and the one-enemy-per-installed-set guard green together. It requires 157.1 (EN3a), which creates the entries. Routes (b) and (c) are dropped: no set is retired by this recast, so `FRAME_SET_EXEMPTIONS` stays empty and nothing is pulled back out.
~~~
