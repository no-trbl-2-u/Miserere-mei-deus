# Phase NC1 — No caps on the live cards

## Sources

- T, 2026-10-26 (attended session): "To save me the time of updating a bunch of cards, remove the "(max +n)" from
  every card. If there should be a max, I'll call it out." Then: "Yes, /plot the cap removal for the live
  Elementalist and Blood Price cards."
- The paper side already landed: the Defender ballot's 28 caps removed and `/lane-creator` told to pitch none
  (PR #958, `docs/lane-creator.md` "No caps"). This phase is the live library.
- Decisions: D109 (no caps, this plot), D41 ("`base × stat ÷ 5`, nothing capped": the stat formula already
  carries no cap, the card lines did), D99 (cards are ordinary content, built from a brief T approved), UP1's
  upgrade law (payoffs grow on upgrade, costs do not, `RULED_COST_GROWTH` the exceptions), the Spell law
  (`card-rules.ts` `SPELL_MAGNITUDE_VERBS`, `sacrificeX` among them).
- Code read while shaping this:
  - `axiomancer-mechanics/src/Cards/library/elementalist.cards.ts`: P-06b PAID `GUARD 5, + the foe's STORM
    (max +12)` (`Math.min(u.m(12), c.q.storm)`), P-09a FREE `DEAL 2, + your INFERNO (max +6)`
    (`Math.min(u.m(6), c.q.yourInferno)`). No other Elementalist line caps.
  - `axiomancer-mechanics/src/Cards/library/blood-price.cards.ts`, every capped line:
    - What Is Owed (`p-06d`) PAID `LEECH 1 per 10 VITAE missing (max 8)`;
    - Full Tally (`p-07b`) FREE `DEAL half the VITAE you lost this combat (max 10)`, PAID `DEAL all the VITAE
      you lost this combat (max 30). EXILE.`;
    - Blood for Blood (`e-08n`, rare) PAID `SACRIFICE any amount X (max 12), DEAL 3X`, the cap rising 3 per
      upgrade (`BLOOD_FOR_BLOOD_X_CAP`, `_STEP`; `ruledCostGrowth: { 'bp-e-08n': ['sacrificeX'] }`);
    - Name Your Price (`e-10d`, Spell) PAID `TETHER 1. SACRIFICE any amount (max 21). EXILE.`
      (`NAME_YOUR_PRICE_X_CAP`, `spellLaw: { sacrificeX: 15 }`);
    - Reclaim (`m-02b`) PAID `DEAL 6; HEAL all the damage dealt (max 8)`;
    - Repaid in Kind (`m-10a`, Spell) FREE `The foe loses VITAE equal to the damage you took last turn (max 5)`,
      PAID `Same, max 15. EXILE.` (`spellLaw: { foeLoses: 15 }`).
  - `axiomancer-mechanics/src/Combat/combat.card-program.ts`: `sacrificeX(max)` and `chooseX` already bound X by
    the VITAE the payment must leave (`affordable = vitae - 1`); `programXRange` loops `1..printedMax`, so an
    uncapped X needs a finite bound read from VITAE, not `Infinity`.
  - `axiomancer-mechanics/src/Cards/e2e/card-upgrade-law.engine.test.ts`: A3 "payoffs grow, costs do not"; the
    X-line probe (`:280`). On Full Tally, What Is Owed PAID and Repaid in Kind, **the cap is the only number an
    upgrade grows today** (`u.m(10)`, `u.i(8)`, `u.m(5)`, `S(u).m(15)`), so removing it leaves those lines with
    nothing to grow.
  - Tests pinning caps: `blood-price.engine.test.ts` (`:412-449`, `:682`), `axiomancer-mobile/state/presenters/
    __tests__/card-program.engine.test.ts` (`:71`, `:139`, parser fixtures only).
  - Docs printing caps: `docs/game-model.md:28`, `plan/card-ledger/rehearsal-blood-price.md` (Blood for Blood's
    row), `plan/card-ledger/rehearsal-elementalist.md` (P-06b, P-09a rows), `plan/revamp/card-rules-inventory.md`.

## Outcome

No live card prints or applies a cap: every amount that grows with something (the foe's STORM, your INFERNO,
VITAE lost or missing, damage taken) grows without limit, and every upgrade still grows something. The two
SACRIFICE X caps stay (T: "Sacrifice caps stay").

Size: M

## Acceptance

- **A1** The two Elementalist lines lose their caps: P-06b PAID reads `GUARD 5, + the foe's STORM. DRAW 1.` and
  P-09a FREE `DEAL 2, + your INFERNO.`, each applying the whole stack (no `Math.min`).
- **A2** Blood Price's fixed-number caps go: What Is Owed, Full Tally (both lines), Reclaim and Repaid in Kind
  (both lines) print no "max" and apply the whole amount they read.
- **A3** The X caps stay (Confirmed by T (2026-10-26): "Sacrifice caps stay"): Blood for Blood keeps
  `SACRIFICE any amount X (max 12)`, rising 3 per upgrade (`BLOOD_FOR_BLOOD_X_CAP`, `_STEP`, its
  `ruledCostGrowth` entry), and Name Your Price keeps `(max 21)` (`NAME_YOUR_PRICE_X_CAP`, its `spellLaw`
  entry). Neither card, `sacrificeX` nor `programXRange` changes; a test pins both caps so the no-max scan (A7)
  cannot remove them.
- **A4** Every upgrade still grows something. A line whose only upgrade-grown number was its cap grows a flat
  `+n` instead, n being the upgrade scale's `plus` (0 at no upgrade, so an un-upgraded card's text is unchanged
  but for the cap) (Confirmed by T (2026-10-26): "Sounds good"): Full Tally `DEAL half the VITAE you lost this combat +2` at one upgrade,
  What Is Owed PAID `LEECH 1 per 10 VITAE missing, +1` (an INTENSITY line grows by its step), Repaid in Kind
  likewise. Blood for Blood is unchanged (its cap still grows on upgrade, A3). The upgrade law
  suite (A3 "payoffs grow, costs do not") passes with no new exception.
- **A5** Repaid in Kind's PAID stays a bigger line than its FREE once both are uncapped (Confirmed by T (2026-10-26): "Fine
  with me"):
  PAID reads `The foe loses VITAE equal to twice the damage you took last turn. EXILE.`; the Spell law's
  `foeLoses` baseline is re-read from the new line, and the Spell law suite passes for every Spell.
- **A6** The Spell law suite passes for every Spell; only Repaid in Kind's `spellLaw` entry changes (A5).
- **A7** No "max" left: a library test fails any live card line (FREE, PAID, Global text) matching
  `/\(max\b|\bmax \d/i`; "max VITAE" (a stat, not a cap) and the X cap on a `SACRIFICE any amount` line
  (A3) are allowed by name.
- **A8** The docs agree: `docs/game-model.md`, the two ledgers' live-card rows (a dated "caps removed (T,
  2026-10-26)" note, the voted text kept beside it) and `plan/revamp/card-rules-inventory.md` print the uncapped
  lines.

Measure: `npm run verify` green with A7's test in it, and on T's next preview build P-06b's GUARD counts the
whole STORM and Full Tally deals all the VITAE lost past 30.

## Scope

- `axiomancer-mechanics/src/Cards/library/elementalist.cards.ts`, `blood-price.cards.ts` (A1-A6).
- Docs per A8. Not touched: the grey cards (no caps), card ids, names, colours, ranks, every uncapped number.

## Consumers to update

- `devlog/data/cards.json` is regenerated (`npm run catalog:export`), not hand-edited.
- `docs/reports/measured/latest.md` goes stale for Blood Price and the Elementalist (D57: a measurement, not a
  gate); the PR says so, and the next measured run picks the new numbers up. UP1g and UP1h read half-upgraded
  Blood Price; UP1h's numbers are taken after this lands.

## Save / schema contracts

- None. Card text and programs only; card ids unchanged, so saved decks load as before.

## Tests

- Update `blood-price.engine.test.ts` (`:412-449`, `:682`) to the uncapped amounts and the `+n` upgrade growth;
  the mobile presenter tests' fixtures may keep their strings (parser input), or move to uncapped ones.
- New: A3's pin on the two X caps, A7's no-max scan.
- `card-upgrade-law.engine.test.ts` and the Spell law suite pass unchanged in their rules (A4-A6).

## Verify gate

`npm run verify` in `axiomancer-mechanics`, the mobile presenter suite, and the root `npm test`.

## Decisions made upfront — DO NOT ASK

- A cap that only kept a number small goes. The SACRIFICE floor (X never takes the last VITAE) is not a cap and
  stays; the two X caps stay by T's call (A3).
- "max VITAE" is a stat name, not a cap, and is untouched.
- An un-upgraded card prints exactly its old text minus the cap (A4's `+0` is never printed).
- Confirmed by T (2026-10-26): the SACRIFICE X caps stay (call 1, changed from the default).
- Confirmed by T (2026-10-26): lines whose cap was their only upgrade growth grow a flat `+n` per upgrade (call 2).
- Confirmed by T (2026-10-26): Repaid in Kind's PAID is "twice the damage you took last turn" (call 3).

## Definition of done

A1-A8 met, the verify gate green, the PR names the stale measured columns.

## Follow-ups

- Whether an uncapped number runs away is the sims' question (T: "If there should be a max, I'll call it out");
  nothing here measures it.
