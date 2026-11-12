---
date: 2026-11-12
---
## Edit plan/README.md
~~~ old
- **177.2** · NV1b: the prose lint learns the Narrator's fields (T, `/plot`, 2026-11-11)
~~~
~~~ new
- **177.2** · NV1b: the prose lint learns the Narrator's fields (T, `/plot`, 2026-11-11)
- **178.1** · SS1a: the scene slot in the engine, a node's scene then its event (T, `/plot`, 2026-11-12)
- **178.2** · SS1b: the phone plays a node's scene, then the node's own screen (T, `/plot`, 2026-11-12; needs 178.1)
- **178.3** · SS1c: the Breakwater's cutscene nodes become a fight and two caches, their scenes in slots (T, `/plot`, 2026-11-12; needs 178.1, 178.2)
~~~

## Edit plan/README.md
~~~ old
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
~~~
~~~ new
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 178 | A scene before any node, and no more cutscene nodes | [178-ss1-scene-slots.md](178-ss1-scene-slots.md) | planned (**Asap**: 178.1-178.3) | 4 left |
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
- **A10** Story screens and cutscenes. Each Chapter 1 cutscene tells its part of the Act 1 story as T ruled it, in panels, with no sentence past 40 words; none is a one-line hint. The cutscene screen shows a six-panel scene unclipped.
~~~
~~~ new
- **A10** Story screens and cutscenes. Each Chapter 1 scene tells its part of the Act 1 story as T ruled it, in panels, with no sentence past 40 words; none is a one-line hint. Every scene plays from a node's scene slot (spec 178), on the node the story places it on; no node is a cutscene by kind. The cutscene screen shows a six-panel scene unclipped.
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
and the two action lines of each of the three caches.
~~~
~~~ new
and the two action lines of each of the five caches (spec 178's 178.3 makes the old watchtower and the high pass caches).
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
- [ ] **177.9** Story screens and cutscenes tell the Act 1 story · M · closes A10 · needs 177.2 · alias: NV1i
~~~
~~~ new
- [ ] **177.9** Story screens and cutscenes tell the Act 1 story · M · closes A10 · needs 177.2, 178.3 · alias: NV1i
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
The three cutscene drafts in the ledger (`bw-l2`, `bw-d5`, `bw-p3`) and the windmill's opening were written before the story and are redrawn from it, then approved by T.
~~~
~~~ new
The three cutscene drafts in the ledger (`bw-l2`, `bw-d5`, `bw-p3`) and the windmill's opening were written before the story and are redrawn from it, then approved by T. Since spec 178 (T, 2026-11-12) there are no cutscene nodes: each scene sits in a node's scene slot and plays before that node's own event, so the story may place a scene on any node, and the three drafts' nodes are now a fight and two loot caches that keep their old scene until this chunk rewrites or moves it.
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
  - `axiomancer-mechanics/src/World/MapEvents/content.ts`: the windmill's opening and the three cutscenes, each as panels (`lines`); the cutscene screen's fit at six panels.
~~~
~~~ new
  - `axiomancer-mechanics/src/World/MapEvents/content.ts`: each scene the story places, as panels (`lines`), in the Breakwater's slot table (`BW_NODE_SCENES`, spec 178), keyed by the node it plays before; the windmill's opening keeps its `giveQuestStep` effect; a slot the story leaves empty is removed. The cutscene screen's fit at six panels.
~~~

## Decisions
- **D?scene-slot** · 2026-11-12 · (proposed) Story is placed as a scene in a map node's scene slot, played before that node's own event, once a run; no chapter map node is a cutscene by kind (the Lantern Deep's two sealed doors stay until Chapters 2 to 4's maps are designed). A scene after a node's event would share the slot; scenes fired by game state are deferred. *Why:* T, 2026-11-12: "every node has the potential to trigger a cutscene or story node prior to their normal screen start", agreed as the scene slot's option A, B to share it, C deferred.
