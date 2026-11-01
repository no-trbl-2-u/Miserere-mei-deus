# Vault bridge round trip (OV1d)

Phase OV1d, brief `plan/README.md`. Run 2026-10-21 by
T (phone, Android) and an attended Claude session on T's Windows desktop.
Vault repo: `no-trbl-2-u/miserere-vault` (private). Times are local (UTC-4).

Path under test:

```
phone <-> Obsidian Sync <-> desktop Miserere-mei-deus/vault/
      <-> Obsidian Git 2.42.0 (5-minute commit-and-sync, pull on startup)
      <-> github no-trbl-2-u/miserere-vault <-> Claude sessions
```

## Results

| ID | Check | Result | Evidence |
|---|---|---|---|
| A9 | Phone note reaches `origin/main` within 10 min, no manual step | pass | `Base Game/Test.md`, written on the phone, synced to the desktop; Obsidian Git was enabled at 02:19:52 and pushed it in auto commit `3b33130` at 02:24:54. |
| A10 | Session commit reaches the phone within 10 min, no manual step | pass | `Threads/Bridge test.md` pushed from a separate clone (the cloud-session path) as `9123ee8` at 02:25:16; Obsidian Git pulled it to the desktop at 02:30:12 (watched); Sync carried it to the phone, where T read it and replied. |
| A10 (return) | T's reply on the phone reaches `origin/main` | pass | Reply reached the desktop file at 09:16:11 via Sync; Obsidian Git pushed it as auto commit `2acfeff` at 09:20:17. |
| A11 | Desktop-off conflict surfaces without loss | not run | T was away from the desktop on 2026-10-21; OV1d stays open on this check. |
| A12 | No `.git/` in Sync history; zero Actions runs on the vault repo | pass | T's screenshot of Sync version history, "Setting files": 6 files, all under `.obsidian/` (appearance, graph, app, core-plugins, the Wasp theme's two files); no `.git/` path and no community-plugin files. `gh api repos/no-trbl-2-u/miserere-vault/actions/runs` gives `total_count` 0. |

Measure (A9 and A10 both pass, with timestamps, in one sitting): met.

## Observations

- Obsidian Git arrived disabled: the first Sync merge left
  `.obsidian/community-plugins.json` as `[]` until T enabled the plugin by
  hand. A fresh desktop joining the vault will need the same step.
- The Sync history names two devices, Apollo and Artemis; the community-plugin
  files are absent from it, so the plugin is not reaching the phone through
  Sync, as intended.
- Round-trip latency is bounded by the 5-minute timer on each git leg; Sync
  legs were seconds.

## Open

- A11, the conflict test, when T is next at the desktop: close desktop
  Obsidian, edit a line on the phone, Claude pushes a different edit to the
  same line, reopen desktop Obsidian; expect a visible conflict and both
  edits kept.
