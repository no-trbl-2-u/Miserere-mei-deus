---
date: 2026-11-02
---
## Edit plan/137-cf1-card-face-grammar.md
~~~ old
- None: T answered all six calls on 2026-11-01.
~~~
~~~ new
- The pitch's six calls: T answered all of them on 2026-11-01.
~~~

## Add plan/137-cf1-card-face-grammar.md
~~~ section Design
### The rules get a home in Settings (T, 2026-11-02)

T, verbatim: "Yeah have a Rules Glossary button in settings". PR #1328 (alias CF1h) takes the system notes off every
opened card, so the rules a short line leans on would print nowhere; that PR asked where they
should go, and this is T's answer. Settings gains the button, and it opens a list of those rules.

**CF1i, the Rules Glossary in Settings.** Built on what exists, with no new flow and no new words:

- **The data is already there.** Every rule `docs/card-voice.md` §8 lists has its words in
  `axiomancer-mobile/state/combat/keywords.ts`: left to right and debuffs in `SYSTEM_GLOSSARY`'s READING A LINE, half
  or less in its HALF YOUR VITAE, the Global durations in its GLOBAL, and VULNERABLE and DISCARD in `KEYWORD_GLOSS`,
  which `keywordGloss` reads. So the list is one entry per `SYSTEM_GLOSSARY` term, in its own order, then VULNERABLE
  and DISCARD from `keywordGloss('Vulnerable')` and `keywordGloss('Discard')`. A word the list prints is read from
  there, never retyped; a rule's words change only in that file, and only as owner content (D37, D88).
- **The presenter.** `selectRulesGlossary()` in `state/presenters/settings.engine.ts` returns the `{ term, def }`
  list, and `SETTINGS_COPY` gains the button's label `RULES GLOSSARY`, its hint and a `rules` section heading (screen
  chrome, not card text). The file's header row list gains the row.
- **The sheet.** `components/settings/RulesGlossarySheet.tsx`, a modal on `components/menu/FeedbackSheet.tsx`'s
  pattern (`visible`, `onClose`, the backdrop and the back gesture close it), with a `ScrollView`, since eleven entries
  pass a phone's height. A modal serves both hosts of `SettingsBody` (the `/settings` route and the SETTINGS tab)
  without a new route. Each entry reads like the notes it replaces: the term in the palette's accent, the def under it.
- **The button.** A `MenuButton` in `SettingsBody` under its own section, above FEEDBACK, `testID`
  `settings-rules-glossary`, shown in and out of a run.
- **The docs follow.** `docs/card-voice.md` §8 and the comment over `SYSTEM_GLOSSARY` name the Rules Glossary as where
  the rules show, replacing whatever they say at build time (#1328 writes "show on no card until T places them").
  Regenerate the feature map (`feature-map.mjs`).

It waits on PR #1328 in the plain sense: the button is why the notes can go. It carries `needs —` because a chunk in an
open PR has no number yet, and it is safe either order, since it reads only `SYSTEM_GLOSSARY` and `keywordGloss`, both
of which #1328 keeps. Built first, the rules show in both places until #1328 lands.
~~~
~~~ acceptance
- **A?rules** Settings, on both its route and its tab, has a RULES GLOSSARY button that opens a scrollable list and
  closes again. The list has exactly one entry per `SYSTEM_GLOSSARY` term plus VULNERABLE and DISCARD, READING A LINE
  and GLOBAL among them. A screen test walks `SYSTEM_GLOSSARY` and `keywordGloss` and finds each term and def on
  screen character for character, so every entry reads from the shared data, a new glossary term appears with no edit
  here, and the presenter and the sheet hold no copy of a rule's words. No card text or `run` body changes.
~~~
~~~ questions
- [T to confirm #1] Does the Rules Glossary also list every keyword's gloss (DEAL, GUARD, LEECH and the rest)? Default:
  no, rules only, since an opened card's keyword panel already explains the keywords it prints, and only VULNERABLE and
  DISCARD join because `docs/card-voice.md` §8 names them. Or: add every keyword below the rules, as a second section.
~~~
~~~ chunks
- [ ] **137.?rules** The Rules Glossary button in Settings, reading the shared glossary · S · closes A?rules · needs — · alias: CF1i
~~~
