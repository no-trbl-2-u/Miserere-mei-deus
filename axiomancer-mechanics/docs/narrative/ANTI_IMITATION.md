# Anti-Imitation Safeguards

Axiomancer may learn from abstract narrative mechanisms. It must not imitate a
living or dead author's recognizable expression. External analysis is research,
not a phrase bank.

## Absolute bans

Do not copy or closely paraphrase recognizable phrases. Do not reproduce an
external work's syntax, punctuation habits, cadence, diction, imagery system,
narrator stance, set-piece sequence, or character analogue. Do not prompt a
model to write “in the style of” an author or title. Do not consult source prose
to polish Axiomancer copy.

Also reject:

- pastiche disguised as homage;
- generic biblical weather or prophetic narration;
- faux archaism and ornamental inversion;
- uniformly grave, laconic, or aphoristic character voices;
- long polysyndetic processions, punctuation signatures, or repeated
  “and…and…and” cadence used for prestige;
- altered nouns pasted into the sentence skeleton of a source passage.

## Allowed abstraction

Writers may use these content-neutral mechanisms: material consequence,
landscape constraints, layered historical scale, moral ambiguity enacted by
outcomes, restrained interiority, concrete object focus, selective ritual
repetition, and shifts between local and systemic scale. Every use must be
rebuilt through Axiomancer's cosmology, imagery families, sentence patterns,
mechanics, and setting facts.

## Provenance firewall

1. Record the desired mechanism in plain operational language (for example,
   “the road repair reveals unequal obligations”).
2. Close external analysis before drafting.
3. Draft from repo canon and the relevant voice register only.
4. Keep no quotations, source excerpts, phrase lists, or imitation prompts in
   the working document.
5. Annotate the mechanism tested, not the work that inspired the abstraction.

The external novel itself is outside the authoring workflow. Research notes may
establish boundaries; they may not supply prose.

## Overlap scanning

Automated scanning is a tripwire, not proof of originality.

### Inputs

- Scan all new or changed narrative strings, including dialogue, item text,
  codex, encounter prose, and headings.
- Compare against an approved reference corpus used only for similarity review.
  Do not commit copyrighted source text to this repository.
- Normalize case, curly quotes, whitespace, and punctuation; retain a second
  punctuation-sensitive pass for cadence signatures.

### Required passes

1. **Exact n-grams:** flag any 6+ word match; flag 4–5 word matches when they
   contain an uncommon word or occur more than once.
2. **Near overlap:** tokenize and compare sliding 8–16 word windows with
   edit-distance or token similarity; review high-similarity windows rather
   than accepting a numerical score as clearance.
3. **Structural scan:** flag repeated long conjunction chains, unusual
   punctuation sequences, and recurrent sentence-length patterns that cluster
   around one reference.
4. **Project self-overlap:** scan against existing Axiomancer prose to prevent
   accidental catchphrase inflation and uniform voices.

Every flag gets a disposition: `rewrite`, `common/mechanical language`, or
`false positive`, with reviewer initials. Mechanical strings such as `CHOOSE A
STANCE` may be exempted as project canon, never silently ignored.

## Human anti-pastiche review

A reviewer other than the drafter reads the copy without being told the intended
influence and answers:

- Does this evoke a specific author or passage rather than Axiomancer?
- Are sentence shapes conspicuously uniform or borrowed-feeling?
- Could each speaker be identified with names removed?
- Are coast/forest/labyrinth objects doing real work, or masking generic
  prestige-dark prose?
- Did mechanical clarity survive the prose?

Any “yes” to specific-author evocation blocks shipment until rewritten. Run the
overlap scan again after rewriting. Human approval is required even when all
scans are clear.

## Generative-tool prompt rule

Prompts name Axiomancer registers and functional goals only. Safe: “Use the
choice register; show a repaired ferry pin and state each VITAE consequence.”
Unsafe: naming an author, asking for a comparable passage, supplying source
prose, or asking for a synonymized transformation.

## The Narrator exemption

The Narrator voice (map, arrival, hazard, rest, dream, travel and quest lines, screen narration, enemy descriptions, journals and cutscenes) is exempt from the bans above under D189. It may calibrate against a named author and an existing game, borrowing manner and never a sentence, on the surfaces and under the rules in [`NARRATOR.md`](NARRATOR.md). Every other voice keeps this file unchanged.
