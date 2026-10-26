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
VITAE lost or missing, damage taken, X) grows without limit, and every upgrade still grows something.

Size: M

## Acceptance

- **A1** The two Elementalist lines lose their caps: P-06b PAID reads `GUARD 5, + the foe's STORM. DRAW 1.` and
  P-09a FREE `DEAL 2, + your INFERNO.`, each applying the whole stack (no `Math.min`).
- **A2** Blood Price's fixed-number caps go: What Is Owed, Full Tally (both lines), Reclaim and Repaid in Kind
  (both lines) print no "max" and apply the whole amount they read.
- **A3** The X caps go [T to confirm #1]:
  Blood for Blood and Name Your Price read `SACRIFICE any amount X` with no "max"; X runs from 1 to the most the
  player can pay and keep 1 VITAE. `BLOOD_FOR_BLOOD_X_CAP`, `BLOOD_FOR_BLOOD_X_CAP_STEP` and
  `NAME_YOUR_PRICE_X_CAP` are deleted, and so is Blood for Blood's `ruledCostGrowth` entry. The X picker's range
  (`programXRange`) comes from VITAE, and a test plays Blood for Blood at 150 VITAE and pays more than 21.
- **A4** Every upgrade still grows something. A line whose only upgrade-grown number was its cap grows a flat
  `+n` instead, n being the upgrade scale's `plus` (0 at no upgrade, so an un-upgraded card's text is unchanged
  but for the cap) [T to confirm #2]: Full Tally `DEAL half the VITAE you lost this combat +2` at one upgrade,
  What Is Owed PAID `LEECH 1 per 10 VITAE missing, +1` (an INTENSITY line grows by its step), Repaid in Kind
  likewise, Blood for Blood PAID `DEAL 3X +2` at one and two upgrades and `4X` at three as today. The upgrade law
  suite (A3 "payoffs grow, costs do not") passes with no new exception.
- **A5** Repaid in Kind's PAID stays a bigger line than its FREE once both are uncapped [T to confirm #3]:
  PAID reads `The foe loses VITAE equal to twice the damage you took last turn. EXILE.`; the Spell law's
  `foeLoses` baseline is re-read from the new line, and the Spell law suite passes for every Spell.
- **A6** Name Your Price still satisfies the Spell law with no X cap: its `spellLaw` entry is rewritten or
  removed so the suite checks a number the line still has, and no other Spell's entry changes.
- **A7** No "max" left: a library test fails any live card line (FREE, PAID, Global text) matching
  `/\(max\b|\bmax \d/i`; "max VITAE" (a stat, not a cap) is allowed by name.
- **A8** The docs agree: `docs/game-model.md`, the two ledgers' live-card rows (a dated "caps removed (T,
  2026-10-26)" note, the voted text kept beside it) and `plan/revamp/card-rules-inventory.md` print the uncapped
  lines.

Measure: `npm run verify` green with A7's test in it, and on T's next preview build Blood for Blood's X picker
goes past 21 at full VITAE and P-06b's GUARD counts the whole STORM.

## Scope

- `axiomancer-mechanics/src/Cards/library/elementalist.cards.ts`, `blood-price.cards.ts` (A1-A6).
- `axiomancer-mechanics/src/Combat/combat.card-program.ts`: `sacrificeX` takes no cap (or an optional one) and
  `programXRange` bounds the loop by VITAE (A3).
- `axiomancer-mechanics/src/Cards/card.lanes.ts` only if `ruledCostGrowth` is left empty (A3).
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
- New: A3's 150-VITAE Blood for Blood play, A7's no-max scan.
- `card-upgrade-law.engine.test.ts` and the Spell law suite pass unchanged in their rules (A4-A6).

## Verify gate

`npm run verify` in `axiomancer-mechanics`, the mobile presenter suite, and the root `npm test`.

## Decisions made upfront — DO NOT ASK

- A cap that only kept a number small (every line here) goes. A cap that keeps a line legal (X never takes the
  last VITAE) is not a cap on the card: it is the SACRIFICE floor, and it stays.
- "max VITAE" is a stat name, not a cap, and is untouched.
- An un-upgraded card prints exactly its old text minus the cap (A4's `+0` is never printed).
- [T to confirm #1] The X caps go too. Default: yes, T's ruling names every card.
- [T to confirm #2] Lines whose cap was their only upgrade growth grow a flat `+n` per upgrade.
- [T to confirm #3] Repaid in Kind's PAID is "twice the damage you took last turn".

## Definition of done

A1-A8 met, the verify gate green, the PR names the stale measured columns.

## Follow-ups

- Whether an uncapped number runs away is the sims' question (T: "If there should be a max, I'll call it out");
  nothing here measures it.
