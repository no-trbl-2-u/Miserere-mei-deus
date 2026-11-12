---
date: 2026-11-12
---
## Edit plan/README.md
~~~ old
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
~~~
~~~ new
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
- **177.?wf** · NV1j: the prose workflow watches the mobile files the Narrator lint now reads (T, `/plot asap`, 2026-11-12)
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
- [ ] **177.4** Map blurbs in the game · S · closes A4, A9 · needs 177.3 · alias: NV1d
~~~
~~~ new
- [ ] **177.4** Map blurbs in the game · S · closes A4, A9 · needs 177.3, 177.?wf · alias: NV1d
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
- [ ] **177.7** Screen copy in the game · S · closes A7 · needs 177.3 · alias: NV1g
~~~
~~~ new
- [ ] **177.7** Screen copy in the game · S · closes A7 · needs 177.3, 177.?wf · alias: NV1g
~~~

## Add plan/177-nv1-narrator-voice.md
~~~ acceptance
- **A?wf** The prose workflow runs when a Narrator file changes. `.github/workflows/verify-prose.yml` lists `axiomancer-mobile/state/exploration-maps/*.layout.ts` and `axiomancer-mobile/components/combat/encounter/*.copy.ts` under both `push` and `pull_request` paths, beside the existing `axiomancer-mobile/state/presenters/*.copy.ts`.
~~~
~~~ chunks
- [ ] **177.?wf** The prose workflow watches the mobile files the Narrator lint now reads · S · closes A?wf · needs — · alias: NV1j
  - `.github/workflows/verify-prose.yml`: add the two globs to the `push` and `pull_request` path lists (four lines). 177.2 puts those files in `scripts/check-prose.mjs`'s content list, so without this a line added there triggers no `verify-prose` run; 177.4 and 177.7 wait on this so their lines are linted in CI.
  - The paths were checked against the tree: `breakwater.layout.ts` sits in `axiomancer-mobile/state/exploration-maps/`, and `combat-summary.copy.ts` and `reveal.copy.ts` in `axiomancer-mobile/components/combat/encounter/`. T approved the paths, 2026-11-12: "Add the paths, plot it".
  - A workflow file edit: T merges it by hand (a change to `.github/workflows/` is a pipeline path); the build does not auto-merge.
  - Measure: the workflow's `paths` lists name both globs under `push` and `pull_request`; `node scripts/check-prose.mjs` and the root `npm test` still pass.
~~~
