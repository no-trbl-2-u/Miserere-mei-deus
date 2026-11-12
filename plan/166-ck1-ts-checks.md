# 166 — T's checks, in one place

> Eight specs were open only for a check T does on the phone or at the desk, so they all read "1 left". T has confirmed three of them on the APK. This spec closes those three and gathers the other five into one list.

## Why

### Sources

- **T, 2026-11-09:** "Could we bundle them all up into one spec and I'll just pilot that when I have a chance? To be honest, I've checked most of them via the apk", then chose checks only, leaving real work where it is.
- **T, 2026-11-09, marking what is confirmed:** 115.5 (Merciful), 117.6 (Defender) and 118.4 (Elementalist) are done. 113.9, 125.8, 126.4, 128.7 and 130.4 are not.

### What exists today (read 2026-11-09, at 7c7e5ada2)

- The eight chunks are each the last in specs 113, 115, 117, 118, 125, 126, 128 and 130, and each is Held.
- Emptying a spec is what settle refuses today, so this spec's work waits for spec 164 (SR1a), which lets a close retire its spec.
- Attended and owner-led chunks that are real work rather than checks stay where they are: 116.4, 119.3, 122.2, 123.1, 129.2, 129.4, 131.1, 133.9, spec 134 and 146.7 (156.7 was dropped on 2026-11-12).

## Design

- **166.1 tidies up.** It writes the three confirmed closes, and a close for each of the five moved chunks that says where it went. Each carries the `absorb:` spec 164 defines, so the eight old specs retire.
- **The five checks are one spec, one Held chunk each,** so T can take any one in any session. Each names the old spec's acceptance line, which the moved chunk's old spec keeps in git after it retires.
- A check that fails comes back through `/bug` or `/plot`, as any other finding does.

### Decisions made upfront (do not ask)

- T's word in the session is the confirmation for the three: no replay, no screenshot.
- The new chunks take new aliases, because the old aliases close with the old specs.

### Out of scope

- The deadline dates of these checks: only LG1h has one (Dec 23), and it stays.
- Moving any real-work chunk here.

## Acceptance

- **A3** (attended) T plays a run on a preview APK and reads the human-versus-sim comparison (113's A17, at 7c7e5ada2).
- **A4** (attended) T fights once on a preview APK and sees the play log rows (128's A11, at 7c7e5ada2).
- **A5** (attended) T runs `.github/workflows/android-smoke.yml` by hand against a fresh preview APK and watches it through (125's A8, at 7c7e5ada2).
- **A6** (attended) T proves the vault's conflict test: a phone edit and a Claude push, with desktop Obsidian closed (126's A11, at 7c7e5ada2).
- **A7** (attended) T opens the feature map on the phone and on the desktop (130's A10, at 7c7e5ada2).

## Open questions

none

## Chunks

Measure: 5 open · 2 closed · next A8

- [ ] **166.2** T reads the human-versus-sim comparison (attended) · S · closes A3 · needs — · alias: CK1b
- [ ] **166.3** T checks the play log on a preview APK (attended) · S · closes A4 · needs — · alias: CK1c
- [ ] **166.4** T watches the Android smoke test (attended) · S · closes A5 · needs — · alias: CK1d
- [ ] **166.5** T proves the vault's conflict test (attended) · S · closes A6 · needs — · alias: CK1e
- [ ] **166.6** T looks at the feature map (attended) · S · closes A7 · needs — · alias: CK1f
