# The delivery register

How player-facing text is shaped: the register, the bans, sentence form,
the six lexicons and the delivery rules MB-1 to MB-8. It governs every
player-facing surface: card and telegraph text, event copy, map and enemy
descriptions, dialogue and screen copy. It shapes sentences; it does not
restyle the visual layer. `scripts/check-prose.mjs` enforces the lintable
rules; the rest is review.

It sits beside [`STYLE_CONSTITUTION.md`](STYLE_CONSTITUTION.md),
[`VOICE_REGISTERS.md`](VOICE_REGISTERS.md), [`LEXICON.md`](LEXICON.md) and
[`ANTI_IMITATION.md`](ANTI_IMITATION.md). What happens in the story is not
here: that is `content/story/story-overview.md`.

## The register

> **Terse, archaic-flavoured, cold and old. Grim, bodily, superstitious.**
> Concrete nouns with weight. Card and telegraph text reads like a fragment
> of scripture, contract, or confession. Mercy and exploitation are always
> morally charged, never neutral. **No thee / thou / thy / thine / ye.**

## Forbidden registers

Hard bans.

| # | Banned | Why | Example of the violation |
|---|---|---|---|
| V-1 | Philosophy-native jargon | Not this world | thesis, axiom, doxa, lemma, theorem, fallacy, syllogism, dialectic, epistemology, rebuttal |
| V-2 | Modern / clinical / corporate register | Breaks "old" | protocol, system, optimize, energy, matrix, resource, buff, synergy, module |
| V-3 | High-fantasy Tolkien-ism | Wrong genre | arcane, mystic, elven, rune of, "of Doom", "+2 Sword of" |
| V-4 | Invented apostrophe-fantasy names | Wrong genre | Kal'Zareth, Xyl'thoor |
| V-5 | Archaic pronouns | The register | thee, thou, thy, thine, ye |
| V-6 | Exclamation marks, ALL-CAPS words inside prose, emoji | Not cold | "The bell tolls!" |
| V-7 | Second-person heroic address | Not this world | "You are the last hope of…" |
| V-8 | Explanatory parentheticals in flavour text | Terseness | "The Vig (interest owed weekly)" |

Proper nouns already in the world (the Labyrinth's `aporia-*` maps) are
names, not jargon.

## Sentence form

Card text, telegraph text and NPC lines are **one clause per line, present
tense, no subordination beyond one comma**. A line that needs a semicolon
is two lines. Flavour text is at most two sentences and never explains a
rule.

## The six lexicons

Every authored name and every line of flavour draws its nouns from one of
six pools. Mixing two pools in one name is allowed and often good
(*Gangrene Gospel*, *Choirbone Reliquary*); a seventh pool is a defect.

| Pool | Exemplars |
|---|---|
| **Liturgy** | psalter, hymn, unction, communion, gospel, requiem, miserere, amen, cope, offertory, versicle, rubric |
| **Law & debt** | indictment, indenture, distraint, attainder, assize, writ, lien, arrears, vig, pledge, ledger, contempt |
| **Rot & medicine** | poultice, boils, gangrene, chilblain, worm, wound, brine, sepsis |
| **Earth & grave** | spadeful, spadework, grave, pyre, ossuary, sexton, dirge, disinterred |
| **Cold & siege** | palisade, hoarfrost, caltrops, snow, ice, winter, watch, besieger |
| **Folk & household** | knucklebone, thumbprick, grandmother, teeth, bell, needle, bridle, gnaw-marks |

## Delivery rules

**MB-1 — the knife law** *(lintable: length)*. Narration sentences run
short: target under twelve words, hard ceiling twenty. One subordinate
clause per *paragraph*, not per sentence. A semicolon in player-facing
prose is a defect. Full stops are the register.

**MB-2 — indifference.** The narrator states consequences as facts and
never sympathizes, never warns twice, never editorializes. "The water
climbs," never "beware the water." Danger is described the way a ledger
describes arrears.

**MB-3 — the Dial-1 humour law.** Humour arrives only by deadpan
juxtaposition of the mundane and the terrible, and every funny line must
also be literally true in-world. No irony markers, no self-reference, no
fourth wall, no jokes *about* the grimness. If a reader can't tell whether
the line meant to be funny, it is compliant.

**MB-4 — second person and the imperative are permitted.** "Pick a door."
"Wade or don't." V-7 stands: second person may instruct and price; it may
never flatter.

**MB-5 — scenery is priced.** A descriptive beat gets at most one line of
pure atmosphere; the next line must carry a stake, a price, or an
instruction. Scenery that costs the player nothing to ignore is cut.

**MB-6 — no adjective without a decision.** An adjective survives only if
removing it would change what the player does or owes. "Old songs" earns
its place if old means *claimable*; otherwise the songs are just songs.

**MB-7 — brutality is stated, not performed.** The register never
escalates typographically (V-6 stands). The most terrible line in the game
should scan as flatly as a receipt.

**MB-8 — vocabulary discipline** *(lintable — wired)*. The six lexicons,
the V-bans and the retired-term lexicon (`docs/lexicon.json`) govern word
choice. The delivery rules shape sentences on top of them.

## The Narrator exemption

MB-1 (the 20-word sentence cap) and the faux-archaic ban do not bind the Narrator voice (D189). Its sentences run to 40 words, each of its surfaces has its own word cap, and it may use "yet" and "bade" sparingly; see [`NARRATOR.md`](NARRATOR.md). Every other rule here binds all voices, the Narrator included.
