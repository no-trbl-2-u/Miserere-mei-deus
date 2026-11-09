# 165 — The Rules Glossary lists every keyword

> Settings' Rules Glossary shows the systems glossary and two keywords. T ruled it lists every keyword's gloss. This spec makes it read the whole keyword registry.

## Why

### Sources

- **T, 2026-11-02, at the end of the spec 137 pilot:** the Rules Glossary lists the rules and every keyword's gloss (D183).
- **T, 2026-11-09:** shown that 137.9 shipped only two keywords, "Yes, plot it".

### What exists today (read 2026-11-09, at 7c7e5ada2)

- **The list** (`axiomancer-mobile/state/presenters/settings.engine.ts`): `selectRulesGlossary()` returns `SYSTEM_GLOSSARY`'s nine entries, then the `RULES_GLOSSARY_KEYWORDS` constant, `['Vulnerable', 'Discard']`, each through `keywordGloss`.
- **The registry** (`state/combat/keywords.ts`): `allRegistryKeywords()` returns every word in `KEYWORD_GLOSS`, 33 today, and is the registry itself rather than a copy.
- **The sheet** (`components/settings/RulesGlossarySheet.tsx`) draws whatever the selector returns.

## Design

- The list is the systems glossary in its own order, then every registered keyword, upper-cased, alphabetical.
- `RULES_GLOSSARY_KEYWORDS` goes. A keyword added to the registry appears with no edit here.
- No word is written or changed: every gloss is the one the registry already holds.

### Decisions made upfront (do not ask)

- Alphabetical, because it is a reference list a player scans for one word.
- The sheet's look is unchanged, apart from what scrolling 42 entries needs.

### Out of scope

- Search or sections inside the sheet.
- Rewording any gloss (authored text, D88).

## Acceptance

- **A1** `selectRulesGlossary()` returns the systems glossary in order, then one entry for every name in `allRegistryKeywords()`, alphabetical and upper-cased. Its test reads the registry and hardcodes no list or count.
- **A2** All 42 entries can be read on the Settings sheet at 360 wide: it scrolls to the last entry, and none is clipped.

## Open questions

none

## Chunks

Measure: 2 open · 0 closed · next A3

- [ ] **165.1** The Rules Glossary reads the whole keyword registry · S · closes A1, A2 · needs — · alias: RG1a
  - `settings.engine.ts` only, unless the sheet does not scroll, and then `RulesGlossarySheet.tsx`.
  - Measure: its Jest file with `--maxWorkers=1`, and a 360-wide shot of the sheet scrolled to the end, in the PR.
