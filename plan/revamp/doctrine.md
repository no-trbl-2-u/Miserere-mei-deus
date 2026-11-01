# Revamp — doctrine and truth

> Part plan of [THE REVAMP](README.md). Phases **R10b** (doctrine rewrite)
> and **R10c** (comments and docs truth pass), both loop. Decisions D66,
> D67. Added 2026-09-29 at T's request.

## Why

After the reset deletes the old game, the repo still teaches it. Agents,
Claude and GPT alike, learn the pre-revamp model (presets, a "primary
colour + borrows" deck, the stance read, pricing, keyword laws) from four
places the reset does not touch:

1. **Live docs marked current:** `axiomancer-mechanics/specs/33` (IMPLEMENTED)
   and `specs/34` (RATIFIED) teach presets, the colour law as a preset
   constraint, win curves and "HP falls only to status". `spec.md` has no
   revamp framing and still promises enemy keywords. `plan/bearings.md`
   keeps each retired law in full above a one-line SUPERSEDED note.
2. **The archive:** `plan/archive/` (9.5 MB, ~550 files) has no rule against
   reading it, and live skills point into it (`skills/oversight.md:68`,
   `skills/digest.md:86`, `bearings.md:29, 37`, `specs/README.md:83`).
3. **The live plan queues:** "preset" appears ~50 times across
   `CANDIDATES.md`, `CRITIQUE.md` and `AUDIT.md`.
4. **Code comments:** the 2026-09-23 comments/docs pass (#363, #364) fixed
   single facts in mechanics comments only. It skipped mobile comments,
   bannered six whole docs as Superseded instead of rewriting them
   (`plan/AUDIT.md:457-515`), and left rules of play documented only in
   comments, some contradicting the docs (the Color Law comment at
   `combat.engine.ts:1584` vs `docs/combat.md:453-460`). Comments carry
   ~1,300 "Phase N" and ~725 "spec NN" history references.

R11 only removes the revamp banners. These two phases own the rest. They run
last in the reset, after every deletion, so each document is written once
against the final tree.

## R10b — Doctrine rewrite (loop)

> Split 2026-10-02 (brief `plan/README.md`):
> **R10b** ships items 1-4, **R10b2** items 5-7. R10c requires R10b2.

1. **The game model.** Write `docs/game-model.md`: one page, the
   post-revamp game as it is (README §2's core table, rewritten as current
   fact: the grey cards, the Color Law, the tray, FREE/PAID,
   VITAE, Conviction, S3 scaling, the three foes, Act 1, befriend → mercy,
   potions, relic placeholders). State plainly what the game does *not*
   have (stances, presets, pricing, themes). `AGENTS.md` points to it
   first, above `spec.md`; `docs/truth-sources.md` ranks it.
2. **`spec.md`** rewritten to the post-revamp product: no enemy keywords,
   no "CHOOSE A STANCE", no big-numbers prompt as source of truth.
3. **`plan/bearings.md`**: every SUPERSEDED paragraph is deleted, not
   annotated. The standing context says what is true now.
4. **Specs 33 and 34** move out of the live set (the parts still true are
   folded into `docs/game-model.md` or the rules doc first); fix
   `specs/README.md` and `plan/README.md:49`.
5. **Plan queues:** sweep `CANDIDATES.md`, `CRITIQUE.md` and
   `AUDIT.md` for rows about presets, the colour law as a deck rule, stances,
   pricing, themes and other deleted subjects; close them as moot with a
   one-line reason.
6. **The archive (D66):** tag the pre-removal commit `archive-pre-revamp`
   (annotated, pushed), delete `plan/archive/` from main, and fix every live
   pointer to it (skills, bearings, specs README, docs, CLAUDE.md's baseline
   note). Reading it later is `git show archive-pre-revamp:plan/archive/...`,
   and only when T asks about history. `AGENTS.md` states this rule.
7. **Lexicon guard:** extend `scripts/check-lexicon.mjs` so retired terms
   (preset deck, colour law as a deck constraint, stance check, punish/yield,
   RPS, pricing, theme, swap pool, the retired keyword names) fail in live
   docs, with an allowlist for the decisions log.

## R10c — Comments and docs truth pass (loop, two ticks)

Tick 1 is `axiomancer-mechanics`, tick 2 is `axiomancer-mobile`.

> Split 2026-10-02 (brief `plan/README.md`):
> **R10c** ships items 1 and 3 for mechanics, **R10c2** items 2 and 4 for
> mechanics, **R10c3** all four for mobile. RC requires all three.

1. **Bannered docs:** every doc carrying a "Superseded (2026-09-23)" banner
   (`docs/combat.md`, `effects.md`, `effects/**`, `enemy.md`, `api.md`,
   `README.md`, `quickstart-world.md`, `oaths.md`; mobile
   `docs/engine-integration-architecture.md`, `early-combat-ux.md`) is
   rewritten to the current code or deleted.
2. **Comments describe the code, not its history.** Strip phase numbers,
   spec numbers, decision numbers, "retired", "legacy", "THE BIG NUMBERS",
   "dice-law rework" and similar narration from code comments. A comment
   that only records history is deleted (git blame is the history); a
   comment that states a rule keeps the rule and loses the story.
3. **Every rule of play lives in a live doc.** Using B4's inventory, each
   rule that governs play (the Color Law, the tray roll,
   FREE/PAID, S3 scaling, VITAE, Conviction, befriend) is stated in
   `docs/game-model.md` or a linked rules doc, with the constant it reads.
   Code comments may point to the doc; they are never the only statement.
4. **Guard:** a lint over `.ts`/`.tsx` comments in both packages that fails
   on the retired-term list from R10b, so the drift cannot come back. It
   runs in the root `npm test`.

## Not in these phases

No rule, card, keyword or number changes. R10b and R10c describe the game;
they never alter it.
