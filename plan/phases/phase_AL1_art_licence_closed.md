# Phase AL1 — The art licence question is closed, and the DevLog shows the art

## Sources

- T, 2026-10-29 (attended session): "can we please write down somewhere that we've resolved the licensing issue?
  The images we use for everything are open source. We've had this conversation a few times now. I say this
  because all the art in digest says we need to figure out the license." Asked whether the public site should
  now show the art it withholds, T chose: publish all of it.
- Decisions: **D115** (this plot: the art licence question is closed; every image the game and the DevLog use is
  open source; the public DevLog publishes all of it), D96 (the trove is a store; an asset that ships is recorded
  in its directory's `provenance.json`), D37 and D88 (art is T's pick; unchanged). It amends the 2026-09-20
  publication-gate carve-out ("a third-party asset whose licence forbids redistribution ... is not covered by T's
  ruling") as applied to the game's own art. It closes the owner's 2026-08-22 answer about
  `Potential Assets/MCP-Axiomancer/images/` ("open-source art found online"), which the tree has kept recording as
  "does not settle the terms".
- Code and records read while shaping this:
  - `scripts/devlog-art-licence.mjs`: `classify` publishes two tiers, `public-domain` (`PUBLIC_DOMAIN`) and
    `attribution` (`ATTRIBUTION_REQUIRED`, artist on record); everything else is `excluded`. Its header audit
    (2026-09-20, re-audited at AN4a and AN3a) lists cards, portraits, treasure and one enemy as UNRESOLVED and
    two enemies as torio free material "EXCLUDE until T rules the terms". `node scripts/devlog-art-licence.mjs`
    today: cards 0/49, enemies 0/3, maps 5/9, portraits 0/15, treasure 0/4 publish; combat 2/2 and splatter 4/4.
    The four withheld maps are the owner-generated Act 1 plates (licence "Owner-generated for this project
    (OpenAI's terms assign output rights to the user)"), which no tier recognises.
  - `scripts/devlog-art-licence.test.mjs:53-66`: "the shipped tree still says what the About page claims: card art
    is withheld, and so is the boss".
  - `scripts/build-devlog-public.mjs`: `cardArtHtml` (`:388-395`) returns `painting withheld / licence
    unresolved` or an `<img>` pointing at `assets/cards/<file>`. **Nothing copies card art into the output**: the
    foe portraits go through `media.derive(..., BOX.portrait, out)` (`:686`), the cards never did, because no card
    has ever passed the gate. The catalog intro (`:711`), the foe count line (`:716`, "portraits published under an
    attribution licence"), the foe placeholder title (`:684`) and the About page's "What is not here" paragraph
    about unprovable art (`:756`) and its Attribution list (`:759-760`).
  - `scripts/build-devlog-public.test.mjs:188-205`: a withheld plate says so; "card art is UNRESOLVED in this tree,
    so nothing in cards/ publishes"; "card art must not be published while its licence is unresolved".
  - `scripts/devlog-plate-shots.mjs`: the gate runs first and prints `withheld <file>: licence UNRESOLVED ...` for
    each changed art plate. This is the line the digest repeats every night an art file changes.
  - Provenance records reading `"license": "UNRESOLVED"`: `axiomancer-mobile/assets/images/{cards,portraits,
    treasure}/provenance.json` (the 2026-07-06 drop), `enemies/provenance.json` (float-eye), `enemies/anim/
    float-eye/provenance.json`, `labyrinth/doors/provenance.json`, `labyrinth/walls/provenance.json`, and
    `art-department/masters/enemies/provenance.json` (`"UNRESOLVED — inherits the source painting's status"`).
    The torio records (cards' Blood Price art, the death-beholder and green-jelly) carry the torio free-material
    grant (`docs/licences/torio-javardry.md`).
  - `axiomancer-mobile/scripts/asset-provenance.test.mjs:98-115` counts and prints UNRESOLVED records ("asset
    licensing UNRESOLVED in: ...") on every `assets:check`; `axiomancer-mobile/scripts/ingest-art.mjs` defaults a
    new asset with no `--license` to UNRESOLVED.
  - Prose that repeats the caveat: `skills/digest.md:219-222`, `devlog/DESIGN.md` §10, `docs/devlog-public-deploy.md:184`,
    `docs/external-architecture.md:48`, `axiomancer-mobile/docs/asset-conventions.md` ("Licensing debt (open,
    blocked on the owner)" and the `Potential Assets/MCP-Axiomancer/images/` paragraph), `scripts/devlog-card-plate.mjs:25`,
    `plan/bearings.md` ("`Potential Assets/MCP-Axiomancer/images/` — license per image not on record").

## Outcome

Nobody, agent or digest, asks T about the art licence again: every provenance record carries T's ruling or a
traced grant, the publication gate passes all of the game's art, and the public DevLog's catalog shows every card
painting and foe portrait, with the "painting withheld" plate kept only for a file whose record names no licence.

Size: M

## Acceptance

- **A1** No provenance record in the tree reads UNRESOLVED. Each record listed under Sources that did reads
  `"license": "open source (T, 2026-10-29, D115)"`, and its `license_note` is rewritten to one line quoting T
  ("The images we use for everything are open source") and keeping the history (owner-supplied, no source traced).
  The torio records and the owner-generated maps record keep their licence text, which is more precise than the
  ruling. `assets:check` prints no "asset licensing UNRESOLVED" line.
- **A2** The gate learns the ruling. `scripts/devlog-art-licence.mjs` gains a third publishing tier, `open` (free
  to redistribute, no attribution owed), matching three licence forms and nothing broader: the D115 string, the
  torio free-material grant (`/^torio Javardry free material\b.*no attribution required/i`) and the owner-generated
  record (`/^Owner-generated for this project\b/i`). An empty licence, `UNRESOLVED`, an attribution licence with no
  artist and any unrecognised licence still refuse, so a new third-party file still needs a recorded licence. The
  header's audit table is rewritten to the tree after A1 and cites D115.
- **A3** `node scripts/devlog-art-licence.mjs` prints every file publishing in all seven directories (cards 49/49,
  combat 2/2, enemies 3/3, maps 9/9, portraits 15/15, splatter 4/4, treasure 4/4, or the counts the tree holds when
  the phase ships) and withholds nothing.
- **A4** `scripts/devlog-art-licence.test.mjs`: the D115 string, the torio grant and the owner-generated record each
  classify as `open` and publish; `UNRESOLVED`, an empty licence and `All rights reserved` still refuse; the
  shipped-tree test is inverted and renamed (a card, `freeze.webp` or the first card file in `cards/`, and the boss,
  `death-beholder.webp`, both publish).
- **A5** The public catalog serves the paintings. `scripts/build-devlog-public.mjs` copies each publishable card
  painting into the output through `media.derive` (a card box beside `BOX.portrait`), and `cardArtHtml` points at
  the derived file; foe portraits publish for every foe. The withheld plate stays for a refused file and reads
  `painting withheld / no licence on record`; the foe placeholder title says the same. The catalog intro drops "a
  file whose licence the tree cannot prove is not published here"; the foe line counts portraits shown, not
  attribution-licensed ones.
- **A6** The About page says the art is open source. "What is not here" keeps the `Needs you` note and drops the
  unprovable-art paragraph; "Attribution" says the paintings are open-source art, credits torio for the files whose
  record carries an `attribution` line (as `docs/licences/torio-javardry.md` asks: "we credit him anyway"), and
  still lists any CC BY file with its artist.
- **A7** `scripts/build-devlog-public.test.mjs`: `cardArtHtml` for a shipped card returns an `<img>`; a card whose
  record is refused (a fixture record, `UNRESOLVED`) still returns the withheld plate with no `<img>`; the built
  catalog serves files under its card asset path; the About page no longer says art is withheld for want of a
  licence (it still says `withheld` for `Needs you`).
- **A8** The prose stops flagging the licence: `skills/digest.md` (the plate-shots step says the gate withholds a
  file only when its record names no licence it recognises), `devlog/DESIGN.md` §10 (table and text to the new
  tree, with D115), `docs/devlog-public-deploy.md` (the "a card's art is blank" row now means a gate refusal or a
  missing export), `docs/external-architecture.md:48`, `scripts/devlog-card-plate.mjs:25`,
  `axiomancer-mobile/docs/asset-conventions.md` ("Licensing debt" becomes a short "Licensing (closed, D115)"
  section, and the MCP-Axiomancer paragraph says its images may be wired with the D115 licence string), and
  `plan/bearings.md` (the MCP-Axiomancer row becomes "THE ART LICENCE QUESTION IS CLOSED (T, 2026-10-29, D115)",
  with "never re-open it" and the rule that a new third-party file still records its own licence).

Measure: `npm run site:public` builds a catalog whose card grid and foe grid carry an `<img>` for every card and foe
with art (zero `painting withheld` plates), and `node scripts/devlog-art-licence.mjs` withholds nothing.

## Scope

- Provenance: the eight records named under Sources (license and license_note fields only).
- Code: `scripts/devlog-art-licence.mjs`, `scripts/build-devlog-public.mjs`, `scripts/devlog-card-plate.mjs` (the
  comment only).
- Tests: `scripts/devlog-art-licence.test.mjs`, `scripts/build-devlog-public.test.mjs`.
- Prose: `skills/digest.md`, `devlog/DESIGN.md`, `docs/devlog-public-deploy.md`, `docs/external-architecture.md`,
  `axiomancer-mobile/docs/asset-conventions.md`, `plan/bearings.md`.
- Not touched: `axiomancer-mobile/scripts/acquire-art.mjs` and its `ACCEPTED_LICENCES` (the acquisition gate for
  Commons downloads); `axiomancer-mobile/scripts/ingest-art.mjs` (its UNRESOLVED default stays: a new file ingested
  with no `--license` is still reported); `asset-provenance.test.mjs` (its UNRESOLVED report stays, and is silent
  once A1 lands); the torio Wizardry carve-out (`docs/licences/torio-javardry.md`, `commercial_use: no`); any image
  file; the game.

## Consumers to update

- `scripts/devlog-plate-shots.mjs` reads `verdictFor`; with A2 it captures art plates it used to withhold, so the
  next digest that touches art shows the before/after plates. No code change.
- The public site's deploy (`docs/devlog-public-deploy.md`): the catalog page grows by the derived card paintings.
  The builder checks the page budget (`node scripts/build-devlog-public.mjs --strict`) and records the new catalog
  size in the PR; if the catalog exceeds its budget, the card box is the dial (smaller derive), not a withheld plate.

## Save / schema contracts

- None. `provenance.json` keeps its shape; only `license` and `license_note` values change.

## Tests

- Per A4 and A7. `npm --workspace axiomancer-mobile run assets:check` passes with no UNRESOLVED line.

## Verify gate

`node --test scripts/devlog-art-licence.test.mjs scripts/build-devlog-public.test.mjs`,
`npm --workspace axiomancer-mobile run assets:check`, `node scripts/devlog-art-licence.mjs`, `npm run site:public`
(the Measure), and the root `npm test`.

## Decisions made upfront — DO NOT ASK

- D115 is T's word and closes the question for every image the game and the DevLog use, including the
  `Potential Assets/MCP-Axiomancer/images/` paintings the 2026-07-06 drop came from (the owner's 2026-08-22 answer
  was about exactly that folder, and every UNRESOLVED note called it "the same question"). No agent re-asks it, and
  no digest, audit or candidate files it again.
- The gate is amended, not deleted: a third-party file that arrives after D115 still needs its own licence on
  record (a traced grant, or T's ruling written into its record by a session T runs). D115 is not a blanket
  pattern like "open source" on its own; the gate matches the exact D115 string.
- The torio files keep their traced grant rather than the D115 string; D115 is what lets the gate accept that
  grant (the 2026-09-20 header held them "until T rules the terms"). The torio Wizardry carve-out is a separate,
  per-monster rule and stays.
- The owner-generated Act 1 map plates publish under their own record (T generated them; OpenAI's terms assign the
  output to T).
- torio is credited on the About page because his record carries an attribution line and the licence doc says we
  credit him anyway; this is courtesy, not a licence condition, so a missing credit never withholds a file.
- The withheld plate and its CSS stay for the case the gate still refuses.

## Definition of done

A1-A8 met, the verify gate green, and the PR shows the rebuilt catalog's card grid with paintings (a screenshot or
the `site:public` output's card count).

## Follow-ups

- `tmp-images/doors/` (the door PNG originals, kept at the repo root "pending the licensing answer") can now be
  deleted or moved; not in this phase.
- `plan/PHASE_CANDIDATES.md` "Trace or replace the UNRESOLVED art" is moved to Rejected by this plot (superseded by
  D115).
