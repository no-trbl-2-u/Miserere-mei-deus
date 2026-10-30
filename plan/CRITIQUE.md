# Critique log

> Last pass: 2026-10-29 at commit 3a8c0821
> Pass count: 111

> External-observer feedback for Axiomancer. Populated by
> `/critique` (which drives the local expo-web build with the
> `playtester` agent — there is no hosted URL), drained by
> `/iterate`. See `skills/critique.md` for the contract and
> `plan/bearings.md` § Surface for the local-build adaptation.

> **[critique pass 51, 2026-09-25, commit e073bb6e] Unattended `/march`
> tick.** Used the non-MCP `critique:drive` transport (§3.5,
> `CRITIQUE_VIEWPORT=both`), mobile (375×812) and desktop (1280×800),
> against the full 11-screen set (title, onboarding, combat preview,
> live combat-board, exploration hub, dialogue, village, cutscene,
> rest, hazard, late-game hub) — 22 captures, 0 nav trouble, 0
> console/page errors. Read every screenshot directly across both
> viewports. This pass lands right after the T2a trim merge
> (`cb178978`/`e073bb6e` — legacy d20 pipeline + derived-stats cut) and
> its CI-repair follow-up; confirmed no visible regression from that
> work on any of the 11 screens. Previously-filed candidates
> reconfirmed unchanged and not re-filed: the village "Void
> Essence"/"Heart Draught" wearer wording (pass 41, still Pending), the
> dialogue reply-card label echo ("WHAT NEEDS DOING?"/"LEAVE HIM BE.",
> still Pending), the mobile and desktop combat-board's DoT paid-value
> chip mid-token wrap (`SPOILED POULTICE` → "8/p"/"ay", pass 49, still
> Pending; desktop `THE LONG LENT` "Deal 14" chip also still wraps at
> the same card width), the late-game hub's faint unlabeled desktop
> oval (declined per pass 34/39/40, still ambiguous). The relics'
> description-repeats-signature-name pattern (e.g. Gorgon Brand: "A
> blade that turns the argument to stone. Grants The Stilling.") was
> checked against `relic.library.ts` and confirmed to be the
> deliberate house format across all 11 relics, not a copy bug — not
> filed. Zero fresh findings this pass.

> **[critique pass 52, 2026-09-25, commit 2a484f98] Unattended `/march`
> tick.** Used the non-MCP `critique:drive` transport (§3.5,
> `CRITIQUE_VIEWPORT=both`), mobile (375×812) and desktop (1280×800),
> against the full 11-screen set — 22 captures, 0 nav trouble, 0
> console/page errors. Read every screenshot directly across both
> viewports. This pass lands 40 commits after pass 51 (e073bb6e), which
> is entirely the T2a-tail through T5 trim/archive cycle (dead-code and
> stale-doc removal, the Upgradeable-Dice flag collapse, a combat dice
> off-color CI fix, GLYPHS-pilot and Codex-aesthetic cuts) — no surface
> under critique's screen set was touched by any of it, and none shows
> a regression. Previously-filed candidates reconfirmed unchanged and
> not re-filed: the village "Void Essence"/"Heart Draught" wearer
> wording (pass 41, still Pending), the dialogue reply-card label echo
> (still Pending), the mobile/desktop combat-board DoT paid-value chip
> mid-token wrap (pass 49, still Pending), the late-game hub's faint
> unlabeled desktop oval (declined per pass 34/39/40, still ambiguous),
> and the relics' description-repeats-signature-name pattern (confirmed
> deliberate house format, not a bug — pass 51). Zero fresh findings
> this pass.

> **[critique pass 54, 2026-09-26, commit 5d6eca56] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. First pass
> since map revamp M3a moved the new-game start to the Breakwater. The
> title screen copy was never updated for that move (filed MED). Also
> filed LOW: the combat preview prints the opening tell twice.
> Reconfirmed and not re-filed: the DoT chip mid-token wrap (pass 49,
> Pending), the late-game hub's faint desktop oval (declined), and the
> painted "AxiomanceR" wordmark (waits on new art, per bearings).

> **[critique pass 55, 2026-09-26, commit bd517cf9] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route bounces to the title with no save, as before;
> the fixture-booted late-game hub covers that screen). 24 commits after
> pass 54: map revamp M3b/M3c, T's calls D30-D35 (#394), and the title-line
> fix. Re-verified: pass 54's MED title finding now reads "Your path begins
> on the coast, at a windmill above the breakwater." at both viewports
> (fixed at `1f5fa3b3`/`048eef75`; the row still needs moving to Done).
> Filed MED: D33 reworded two of fishing-village's "breakwater" lines, but
> its arrival scene, Old Marrow's quest offer, the quest text and a gate
> fight still send the player to "the breakwater", which is now the Act 1
> map they walked first. Reconfirmed and not re-filed: the combat
> preview's doubled opening tell (pass 54, Pending), the DoT chip
> mid-token wrap (pass 49, Pending; desktop "Dea"/"14", "POIS"/"8/p"/"ay"),
> the late-game hub's faint desktop oval (declined), and the relic
> "Grants X" echo (pass 53, Pending).

> **[critique pass 56, 2026-09-27, commit 16fb2990] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save; the
> fixture-booted late-game hub covers that screen). 12 commits after pass
> 55: map revamp M3d (the Lantern Deep) and M3e (fishing-village after Act
> 1), the card hold (D36-D38), and two baseline re-stamps. No new map
> surface is in the screen set yet, and none of the 11 screens shows a
> regression. Housekeeping: moved pass 54's title row to Done, since it
> was fixed at `1f5fa3b3` and verified on screen twice. Filed MED: all six
> hazard intros narrate the player in the third person as "he", while
> every other narrated screen says "you". Checked and not filed: the
> late-game hub states the travel instruction three times, but the chip
> fades after 5 s (`exploration/index.tsx:47`). The chart also shows
> empty space past the sheet edge, which is the deliberate no-clamp trade
> documented at `MapCanvas.tsx:323`. Reconfirmed and not re-filed: the
> fishing-village "breakwater" lines (pass 55, Pending; the arrival and
> quest strings are unchanged), the combat preview's doubled opening
> tell (pass 54, Pending), the DoT chip mid-token wrap (pass 49,
> Pending; desktop "POIS"/"8/p"/"ay"), and the relic "Grants X" echo
> (Pending).

> **[critique pass 57, 2026-09-27, commit 409b72bf] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save; the
> fixture-booted late-game hub covers that screen). 14 commits after pass
> 56. Only M4 (the Lantern Deep's vault door into the Aporia) touched
> product. The rest were M5's map docs, the stat-model plan (D39-D42),
> three zero-diff steward passes, a digest and a baseline re-stamp. The
> Aporia door is not in the screen set, and none of the 11 screens shows a
> regression. Checked and not filed: the combat preview's five
> identically labelled "PHASE N · SURGES" rows are the Brine Hag's real
> sequence, not a render bug. The late-game hub's GRACE meter is not
> filed either, because T6 removes GRACE (D39). The mobile hand fan's
> "CHILBLA IN ..." wrap is the ratified two-line-then-ellipsis rule
> (Done, burn-day 3.13). Reconfirmed and not re-filed: the six hazard
> intros' "he"/"his" (pass 56, Pending), fishing-village's "breakwater"
> lines (pass 55, Pending), the doubled opening tell (pass 54, Pending),
> the DoT chip mid-token wrap (pass 49, Pending; desktop "Dea"/"14",
> "POIS"/"8/p"/"ay"), and the relic "Grants X" echo (Pending). Zero fresh
> findings this pass.

> **[critique pass 58, 2026-09-27, commit 36238fd8] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save; the
> fixture-booted late-game hub covers that screen). 22 commits after pass
> 57: T6 (alignment, philosophy and GRACE removed), S3 (stat scaling), P1
> (the purge: the player library is the grey office) and the keyword
> audit. The hand is now A Plain Blow / Ward / Word, and the hazard intro
> says "you" (pass 56's row is Done at `9cf50a65`). Filed MED: T6 ungated
> the four "observer recognition" replies along with the rest, so a first
> meeting with Old Marrow offers "sees who you have become" and answers
> "since we last spoke". Filed MED: A Plain Word, in every starting hand,
> shows its FREE VULNERABLE as "×24" beside its paid "+60%". Checked and not
> filed: the Brine Hag's "shakes off 4 PLEA" is live, because the starting
> Suppliant's Ring applies PLEA; "THE LEDGER" tab is the memoir, not the
> deleted alignment Ledger. Reconfirmed and not re-filed: the DoT/debuff
> chip mid-token wrap (pass 49, Pending; now also desktop "VUL"/"+6"/"%" on
> A Plain Word), fishing-village's "breakwater" lines (pass 55, Pending;
> Marrow's offer unchanged), the doubled opening tell (pass 54, Pending),
> and the relic "Grants X" echo (Pending).

> **[critique pass 59, 2026-09-28, commit 5ebc7c13] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save; the
> fixture-booted late-game hub covers that screen). 41 commits after pass
> 58. Almost all are plan and loop work: THE REVAMP (D46-D64), R0's
> archive of the content stewards, and the keyword purge (D45). Product
> changes are small: the VULNERABLE percent presenter change, the purged
> glyphs and six retired NPC lines. None of the 11 screens shows a
> regression. Old Marrow's first meeting now offers only "WHAT NEEDS
> DOING?" and "LEAVE HIM BE."; the observer replies are gone. Updated, not
> re-filed: pass 58's A Plain Word row is only half-fixed. The presenter
> now emits "+24%", but `compactFree` drops the "%", so the card face
> reads "+24" beside the paid "+60%" at both viewports (evidence added to
> the row). Reconfirmed and not re-filed: fishing-village's "breakwater"
> lines (pass 55, Pending; Marrow's crab offer at `maps.ts:62` is
> unchanged), the doubled opening tell (pass 54, Pending), the relic
> "Grants X" echo (Pending), and the desktop "VUL"/"+6"/"%" and "GUAR"
> wrap on the hand faces (the `plan/AUDIT.md` row "Post-purge: a staged
> A Plain Word wraps +25% mid-token"). Checked and not filed: the rest
> fixture greys out THE CUT for two reasons, an empty purse and a deck at
> its floor, but prints only the floor. That state is the fixture's
> starting point, not one a player earned. Zero fresh findings this pass.

> **[critique pass 60, 2026-09-29, commit 2d918845] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save; the
> fixture-booted late-game hub covers that screen). 16 commits after pass
> 59: R1 (tooling reset), R2a/R2b (the enemy roster down to three foes,
> the keyword code gone) and R3a (deep stair and vault door sealed,
> northern maps parked). The unfixtured fight is the Brine Hag, one of
> the three survivors, and her preview and board render cleanly at both
> viewports. None of the 11 screens shows a regression. Filed MED: after
> R3a, every state fixture except `fresh-start` boots onto fishing-village
> or a parked map. So five of the six fixture-booted screens show places
> no player can reach, and none shows Act 1. Three of those fixtures sit on
> the map R3b deletes. Updated, not re-filed: pass 58's A Plain Word row
> still reads "+24" beside "+60%" at both viewports (`compactFree`
> unchanged). Checked and not filed: the village shop's Clarity Serum
> ("CLEARS AFFLICTIONS") has nothing to clear now that R2a stripped the
> afflictions, and the relics' "GRANTS …" lines point at purged keywords.
> The ratified item and relic phases own both (`plan/revamp/items.md`
> carrier sweep; R4). Reconfirmed and not re-filed: the doubled opening tell
> (pass 54, Pending), fishing-village's "breakwater" lines (pass 55,
> Pending; R3b deletes the map), the relic "Grants X" echo (Pending), and
> the desktop "VUL"/"+6"/"%" wrap on the hand faces (the `plan/AUDIT.md`
> post-purge row).

> **[critique pass 61, 2026-09-29, commit 0be3bb1c] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 12
> commits after pass 60: R3b (fishing-village purged), R3c (Act 1 hygiene,
> shillings) and R4 (ten GUARD 5 signature placeholders, The Open Hand
> befriend). The rest and late-game-hub fixtures now stand on the
> Breakwater, and both render cleanly at both viewports. Filed MED: the
> Breakwater's two inn rests (`bw-9`, `bw-13`) are described as paid
> lodging, but the rest screen offers REST as "Sleep where you stand.
> Free." Updated, not re-filed: pass 60's fixture row is half addressed
> (dialogue, village, cutscene and hazard still boot onto parked maps);
> pass 58's A Plain Word row still reads "+24" beside "+60%". Checked and
> not filed: the village shop now sells three relics under three different
> "GRANTS ..." names that all "RAISE GUARD 5 FOR 4 CONVICTION." at 35s to
> 45s. That is D47's deliberate placeholder ("keep the names, flat cost",
> `plan/revamp/relics.md` R4), and B1 (owner-led) replaces it. Every
> relic-selling market sits on a parked map, which the `plan/AUDIT.md` row
> "Act 1 has no shop" already tracks. The pass 55 fishing-village
> "breakwater" row is now moot, since R3b deleted the map; `/iterate` can
> close it. Reconfirmed and not re-filed: the doubled opening tell (pass
> 54, Pending).

> **[critique pass 62, 2026-09-30, commit 3293e959] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 15
> commits after pass 61: R5 (healing potions only) and R6a (hazard reset),
> plus plan rows for D68-D71. The Glen Market's stall now carries only the
> Minor Healing Potion among consumables, with VITAE copy that reads
> cleanly. Filed MED: on the 375-wide phone the combat rail's five-mark
> phase ledger stacks as a vertical column under the hand. Reconfirmed and
> not re-filed: pass 61's inn-rest wording, pass 60's fixture row (the
> hazard capture is still caverns' Flooded Undercroft, so R6a's honest
> reward screen has not been seen by the critique lens), pass 58's A Plain
> Word "+24" beside "+60%", and pass 54's doubled opening tell.

> **[critique pass 63, 2026-09-30, commit aea7593b] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 14
> commits after pass 62: R6b (the minimal hazard deck) and the engine
> purge R7a-R7c, plus the R7e plan row. No screen shows a regression from
> the purge. Filed LOW: on the 375-wide phone the two corner medallions
> cover the effect rows of the fan's two end cards, which are the only
> cards the fan does not cover. Reconfirmed and not re-filed: pass 62's
> phase ledger column, pass 61's inn-rest wording, pass 60's fixture row,
> pass 58's A Plain Word "+24" beside "+60%", and pass 54's doubled
> opening tell. Checked and not filed: on desktop the hand faces of A Plain
> Ward and A Plain Word wrap their paid chips mid-token ("GUAR" / "12",
> "+6" / "%"). That is the `plan/AUDIT.md` row "Post-purge: a staged A
> Plain Word wraps +25% mid-token", seen here on the hand face as well as
> the staged card, so its fix should cover both. The combat preview's
> "they telegraph WHAT, not their stance", the board's "NO STANCE" and
> "Punishes HEART / Yields to BODY" chips are stance UI that R7d removes.
> The Glen Market's three GUARD 5 relics are R4's placeholders, and R7e
> strips them.

> **[critique pass 64, 2026-10-01, commit c46565c3] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 15
> commits after pass 63: R7c2-R7c3 (engine purge), R7d-R7d2 (stance
> removal), R7e (the parked world's content) and D73. No screen shows a
> regression from them. Filed LOW: with stance gone, the threat sequence's
> four collapsed rows read "PHASE n · ATTACKS" word for word and hide the
> rising damage. Housekeeping: moved three rows to Done. Pass 60's fixture
> row is fixed by R7e (every gated capture is on the Breakwater now). Pass
> 54's doubled tell went with R7d's stance hint. Pass 55's fishing-village
> row has been moot since R3b deleted the map. Reconfirmed and not
> re-filed: pass 63's corner medallions over the end cards ("Dea" under
> END), pass 62's phase ledger column, pass 61's inn-rest wording, and pass
> 58's A Plain Word "+24" beside "+60%". Checked and not filed: the staged
> dialogue, shop and cutscene print R7e's placeholder copy, which is
> deliberate (D58). The mobile and desktop hazard captures show different
> hazards (Cracked Cliff Path, The Famine March) from the same fixture,
> because the hazard is drawn per arrival. The desktop hand's mid-token
> chip wraps are the AUDIT row pass 63 cited.

> **[critique pass 65, 2026-10-01, commit a6ee8167] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 13
> commits after pass 64: R7e2 (the relic strip), B4 (the card-rules
> inventory, docs only), R8 (mobile cleanup, grey card art, app label) and
> R9 (progression retune). No screen shows a regression from them. R8's
> paintings now sit on all three grey cards at both viewports. Filed LOW:
> the Minor Healing Potion restores 10 VITAE (15 below half) against
> starting pools of 160-170. It costs 12 shillings and heals about a
> quarter of what the free rest gives (43). Reconfirmed and not re-filed:
> pass 64's identical "PHASE n · ATTACKS" headers, pass 63's corner
> medallions over the end cards ("Deal" under END), pass 62's phase ledger
> column, pass 61's inn-rest wording ("Sleep where you stand. Free."
> under the customs-house line), and pass 58's A Plain Word "+24" beside
> "+60%". Checked and not filed: the painted "AxiomanceR" wordmark now
> sits beside R8's "Miserere Mei, Deus" launcher label and the load
> screen's "miserere mei, deus". The wordmark waits on new art, as
> before. The mobile hub's dark band above the chart is the documented
> no-clamp trade (pass 56). The Cut's footnote names the deck floor but
> not the empty purse. One reason is enough to explain a disabled door.

> **[critique pass 66, 2026-10-02, commit 630c40fa] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 14
> commits after pass 65: R9a (fight checkpoint), D74's rehearsal plan,
> R10 (every colour a theme token) and R10b-R10b2 (docs only). R10 is the
> one change that could show on screen. No screen shows a colour
> regression at either viewport: foe bar, dice, card faces, shop, rest,
> hazard frame and hub chrome read as in pass 65. Housekeeping: moved the
> burn-day "reload taken DURING a live encounter" row to Done. R9a shipped
> its shape (a), and engine and mobile tests pin the re-offer. A reload
> mid-fight is out of the transport's reach, so it was not seen on screen.
> Reconfirmed and not re-filed: pass 65's Minor Healing Potion "RESTORES
> 10 VITAE" against 160-170 pools, pass 64's identical "PHASE n · ATTACKS"
> headers, pass 63's corner medallions over the end cards, pass 62's phase
> ledger column, pass 61's inn-rest wording, and pass 58's A Plain Word
> "+24" beside "+60%". Zero fresh findings this pass.

> **[critique pass 67, 2026-10-02, commit 0a5a3199] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 13
> commits after pass 66: R10c, R10c2 and R10c3 (docs and code comments
> only) and a consolidate pass. None of it touches a screen, and no
> screen changed: the combat board, rest, hazard and late-game hub read
> as in pass 66 at both viewports. Reconfirmed and not re-filed: pass
> 65's Minor Healing Potion "RESTORES 10 VITAE" against 160-170 pools,
> pass 64's identical "PHASE n · ATTACKS" headers, pass 63's corner
> medallions over the end cards, pass 62's phase ledger column, pass
> 61's inn-rest wording, pass 58's A Plain Word "+24" beside "+60%", and
> the desktop "VUL"/"+6"/"%" and "GUAR"/"12" chip wraps (the
> `plan/AUDIT.md` row "Post-purge: a staged A Plain Word wraps +25%
> mid-token"). Zero fresh findings this pass.

> **[critique pass 68, 2026-10-06, commit 534b93f6] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 19
> commits after pass 67: the RC walk fixes, R10d (tutorial removal), the
> RC cut (D76) and the map perf pass (each road in its own strip). The
> hub draws its roads on the sheet at both viewports with no visible
> regression, and the first-fight coach card no longer appears on the
> combat board. Filed two LOW rows on the hazard route-select screen:
> the mobile top strip runs its three segments together, and the opening
> hand's names are clipped by the next card again. Reconfirmed and not
> re-filed: the RC walk row (the hub footer's "the paths close as you go
> deeper" is still item 1), pass 65's Minor Healing Potion, pass 64's
> identical "PHASE n · ATTACKS" headers, pass 63's corner medallions,
> pass 62's phase ledger column, pass 61's inn-rest wording, pass 58's
> A Plain Word "+24" beside "+60%", and the desktop "VUL"/"+6"/"%" and
> "GUAR"/"12" chip wraps (`plan/AUDIT.md`).

> **[critique pass 69, 2026-10-07, commit 60d52715] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 12
> commits after pass 68, mostly critique fixes. Re-verified on screen:
> the hub footer now reads "every path beside trodden ground stays open
> — tap a glowing node to travel." at both viewports (RC walk item 1),
> and the mobile combat rail's ledger reads "PHASE 1/5 · R1 · T1" on one
> row. Filed two LOW rows: the map legend is 8px text with no backing
> plate over the engraving, and the desktop main menu stretches its
> rows 1232px wide under an empty upper half. Reconfirmed and not
> re-filed: pass 68's hazard top strip and clipped hand names, pass 65's
> Minor Healing Potion, pass 64's identical "PHASE n · ATTACKS"
> headers, pass 63's corner medallions, pass 61's inn-rest wording, and
> the desktop "GUAR"/"12" and "VUL" chip wraps (`plan/AUDIT.md`).
> Checked and not filed: the mobile hub's black band above the sheet
> (the documented no-clamp trade, pass 56).

> **[critique pass 70, 2026-10-07, commit 560de043] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 13
> commits after pass 69. Re-verified on screen: the desktop main menu
> now holds its heading and rows in one centred 520px column, the map
> legend sits on its smoked plate, and the threat headers read "PHASE 2
> · ATTACKS · 16". Filed two LOW rows on the pre-fight preview: on
> desktop its threat rows stretch edge to edge under a centred portrait,
> and an opened phase repeats the header's figure as "(+11 damage)".
> Reconfirmed and not re-filed: pass 68's hazard top strip and clipped
> hand names, pass 65's Minor Healing Potion, pass 63's corner
> medallions, pass 61's inn-rest wording, and the desktop "GUAR"/"12"
> and "VUL" chip wraps (`plan/AUDIT.md`). Checked and not filed: the
> mobile title's ~180px black band between the art and the tagline (the
> documented `contain` trade in `TitleScreen.tsx`), and the fixture
> dialogue/cutscene placeholder lines (fixture content, not shipped).

> **[critique pass 71, 2026-10-08, commit 3c58c902] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 13
> commits after pass 70. Re-verified on screen: the desktop combat
> preview holds the foe and its threat rows in one centred column, an
> opened phase reads "(11 damage)" unsigned, the inn's REST reads "A bed
> for the night, on the house.", the hazard hand fan names every card
> whole ("PILGRIM'S BLESSING", "SURE FOOTING"), and the mobile hazard top
> strip keeps its segments apart. Filed a MED voice row (the Creeping Rot
> hazard's `scenario` line still says "his arm"; the pass 56 fix and its
> test cover `intro` only) and a LOW desktop row (the rest and shop rows
> stretch edge to edge, so a price sits ~1200px from its name).
> Reconfirmed and not re-filed: pass 65's Minor Healing Potion, pass 63's
> corner medallions, and the desktop "GUAR"/"12" and "VUL" chip wraps.
> Checked and not filed: the mobile hazard top strip now ellipsizes its
> instruction to "CHOOSE TO PROC…" (the pass 68 fix's accepted trade);
> the mobile hub's black band above the sheet (the no-clamp trade, pass
> 56); the mobile title's black band (`contain` trade); and the fixture
> placeholder lines in dialogue, cutscene and village (fixture content,
> not shipped). The desktop hazard route panels are also full width but
> carry a three-column threshold grid that uses the width, so they are
> left out of the LOW row.

> **[critique pass 72, 2026-10-09, commit 19459d23] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 12
> commits after pass 71. Re-verified on screen: the rest and settlement
> screens hold their rows in one centred 520px column on desktop, with
> the price beside its name. Filed one LOW visual row: the settlement
> screen's kicker and its TAKE THE ROAD bar sit on the 28px vignette
> frame, not inside it. Reconfirmed and not re-filed: pass 65's Minor
> Healing Potion ("RESTORES 10 VITAE" against "RESTORES 43 VITAE" at
> rest), pass 63's corner medallions ("Dea" under END on mobile), RC
> walk item 9 (the mobile hazard fan's PILGRIM'S BLESSING "RE-CAST +D"
> clipped), and the desktop "GUAR"/"12" and "VU"/"+" chip wraps
> (`plan/AUDIT.md`). Checked and not filed: the main menu's empty upper
> half at both viewports (`MainMenu.tsx` seats the column at the bottom
> on purpose; filling the space would take art); the mobile title's
> black band (`contain` trade) and the mobile hub's black band above the
> sheet (no-clamp trade, pass 56); the cutscene's SKIP straddling the
> frame corner (a corner control, readable); and the fixture placeholder
> lines in dialogue, cutscene and village (fixture content, not shipped).

> **[critique pass 74, 2026-10-10, commit f91bc9e8] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 12
> commits after pass 73. Re-verified on screen: the desktop hand lays its
> five cards side by side with every paid column showing, and the desktop
> hazard route select holds one centred column. Filed a MED row: that
> same desktop fix now shows the long-standing paid-column wrap on every
> A Plain Word, which reads "VU…" / "+6" / "0%" (the `plan/AUDIT.md`
> post-purge row, raised here because the fan used to hide it). Filed a
> LOW row: the desktop title's three-step scrim draws two hard horizontal
> seams across the art, one through the king's crown and one through his
> beard. Reconfirmed and not re-filed: pass 73's mobile hub black band,
> pass 65's Minor Healing Potion, pass 63's corner medallions, and RC
> walk item 9 (the mobile hazard fan's PILGRIM'S BLESSING "RE-CAST +D"
> under IRON GRIP). Checked and not filed: the main menu's empty upper
> half (bottom-seated on purpose), the mobile title's black band
> (`contain` trade), and the fixture placeholder lines in dialogue,
> cutscene and village (fixture content, not shipped).

> **[critique pass 75, 2026-10-10, commit 720ca33d] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 18
> commits after pass 74. Re-verified on screen: both desktop A Plain Word
> cards print "VULNERABLE" and "+60%" whole, the desktop title's scrim
> fades with no seam through the king, and the mobile map plate meets the
> pane's top edge with no black band. Filed a MED row: the mobile hub
> opens the Breakwater at the zoom-out floor (about 0.15x), so the 44px
> node markers draw at about 6px and "tap a glowing node" has almost
> nothing to tap. Filed a LOW row: a hazard hand card with a two-line name
> clips its paid row's effect line ("RE-CAST +DIE", "DRAW 2") at its own
> bottom edge, on desktop where no card overlaps it. Reconfirmed and not
> re-filed: pass 65's Minor Healing Potion, pass 63's corner medallions,
> and RC walk item 9. Checked and not filed: the main menu's empty upper
> half (bottom-seated on purpose), the mobile title's black band
> (`contain` trade), the mobile hazard strip's "CHOOSE TO PROC…" (pass 68
> trade), and the fixture placeholder lines in dialogue, cutscene and
> village (fixture content, not shipped).

> **[critique pass 76, 2026-10-11, commit 69971f5c] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors (the cold
> `exploration-hub` route still bounces to the title with no save). 13
> commits after pass 75, and none of them changes a screen in the set
> apart from the hazard crack overlay's highlight offset (`7c256e72`). The
> route cards' crack strokes draw as before, and the capture logs no
> `translateX`/`translateY` warning. Reconfirmed and not re-filed: pass
> 75's mobile hub zoom floor (the Breakwater's nodes still draw as specks
> at 375 wide), pass 75's hazard hand-card effect-line clip (desktop
> PILGRIM'S BLESSING "RE-CAST +DIE", SURE FOOTING "DRAW 1"), pass 65's
> Minor Healing Potion, pass 63's corner medallions, and RC walk item 9.
> Checked and not filed: the customs-house line "The clerk takes
> shillings, not names" above a FREE rest (pass 61's fix chose "on the
> house", which squares the two), the main menu's empty upper half
> (bottom-seated on purpose), the mobile title's black band (`contain`
> trade), the mobile hazard strip's "CHOOSE TO PROC…" (pass 68 trade), and
> the fixture placeholder lines in dialogue, cutscene and village (fixture
> content, not shipped). Zero fresh findings this pass.

> **[critique pass 77, 2026-10-11, commit cb1f6e41] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 22 commits
> after pass 76. Most of them are off the screen set: Blood Price revision
> 2 and its relics, card programs on the board (no program card in the
> fixture hand), the pacing sim, the dev menu, Open Vein's TETHER order,
> the Doorwarden's ramp, and the cache/Anvil plate fix (neither screen is
> in the set). On screen, the Brine Hag board's hand still reads A Plain
> Word "+24%" free / "VULNERABLE +60%" paid and A Plain Blow "Deal 12",
> both whole on desktop. Reconfirmed and not re-filed: pass 75's mobile
> hub zoom floor, pass 75's hazard hand-card effect-line clip (desktop
> BALANCE POLE "RE-CAST +DIE", SURE FOOTING "DRAW 1"), pass 65's Minor
> Healing Potion, pass 63's corner medallions, and RC walk item 9. Checked
> and not filed: the free row naming its effect by glyph alone ("+24%"
> beside the VULNERABLE glyph, "+4" beside the GUARD shield). That is the
> card face's own grammar, the same on every card, not a regression. Also
> checked and not filed: the customs-house line above a FREE rest, the main
> menu's empty upper half, the mobile title's black band, the mobile hazard
> strip's "CHOOSE TO PROC…", and the fixture placeholder lines. Zero fresh
> findings this pass.

> **[critique pass 78, 2026-10-11, commit a944d1a3] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 14 commits
> after pass 77; two touch the screen set. The hub's map node marks hold
> their 28px floor (pass 75's zoom-floor row, fixed in e6970c5c) and read
> clearly at both viewports. On desktop the hazard hand's utility cards now
> print their whole effect line ("DRAW 1", "DRAW 2", fixed in 05665523).
> That fix was vertical. On the mobile hazard (Hunted by Bandits), Read the
> Wind's effect line is cut short sideways by an ellipsis, so one fresh
> LOW is filed. Reconfirmed and not re-filed: pass 65's Minor Healing
> Potion, pass 63's corner medallions ("Dea" under END), and RC walk item
> 9. Checked and not filed: the cold `/(tabs)/exploration` capture landing
> on the title (the drive opens it with no save, by design) and the
> fixture placeholder lines. One fresh finding this pass.

> **[critique pass 79, 2026-10-12, commit f2065459] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 21 commits
> after pass 78; the one that touches the screen set is #499, the new
> title sequence (the Doré shore plate, the "Miserere Mei, Deus" wordmark
> carried from splash to menu). Three fresh LOWs, all on that screen: the
> faded title copy stays in the accessibility tree under the menu, the
> drive captures the title before its 2.65s intro reaches EMBARK, and the
> desktop menu rows overhang the 464px plate. Checked and not filed: the
> cold `/(tabs)/exploration` capture landing on the title (no save, by
> design), the fixture placeholder lines, the hazard strip's "CHOOSE TO
> PROC…" and the hub's "tap a glowing node" hint (RC2 walk item 13).
> Three fresh findings this pass.

> **[critique pass 80, 2026-10-12, commit 01d3ce8d] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 15 commits
> after pass 79, all loop and plan work (R11 reopening the loop); none
> touches app or engine code (only the mechanics lexicon and CLAUDE.md),
> so every screen matches pass 79. Reconfirmed and not re-filed: pass
> 79's three title LOWs (the drive still captures the wordmark alone at
> 0.7s; the desktop menu rows still overhang the plate), pass 65's Minor
> Healing Potion ("RESTORES 10 VITAE, 15 BELOW HALF"), and pass 63's
> corner medallions over the mobile fan's end cards. Checked and not
> filed: the cold `/(tabs)/exploration` capture landing on the title (no
> save, by design), the fixture placeholder lines, the mobile hazard
> strip's "CHOOSE TO PROC…" (pass 68 trade), and the desktop combat
> board's card faces (no chip wraps mid-token). Zero fresh findings this
> pass.

> **[critique pass 81, 2026-10-13, commit 63c8a6f1] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 23 commits
> after pass 80: R12a (measured truth) and CS1 (card-spec lint) plus
> telemetry and digest. No `axiomancer-mobile` change; the one engine
> edit that touches play code (`walkAct1` now also returns
> `fightLevels`) is read only by the measurement, so every screen
> matches pass 80. Reconfirmed and not re-filed: pass 79's title LOWs
> (the desktop menu rows still overhang the plate), pass 65's Minor
> Healing Potion ("RESTORES 10 VITAE, 15 BELOW HALF"), and pass 63's
> corner medallions over the mobile fan's end cards. Checked and not
> filed: the cold `/(tabs)/exploration` capture landing on the title (no
> save, by design), the mobile hazard strip's "CHOOSE TO PROC…" (pass 68
> trade) and the hub's "tap a glowing node" hint (RC2 walk item 13).
> Zero fresh findings this pass.

> **[critique pass 82, 2026-10-13, commit 330ec3e2] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 12 commits
> after pass 81: RH1 (roster-health lenses, a mechanics CLI and its
> engine test), the R12a truth run, expand pass 32 and telemetry. No
> `axiomancer-mobile` change and no play-code edit, so every screen
> matches pass 81. Reconfirmed and not re-filed: pass 79's title LOWs,
> pass 63's corner medallions over the mobile fan's end cards. Checked
> and not filed: the inn's "takes shillings" scene line beside REST's
> "on the house" (pass 72's chosen copy), the dialogue fixture's
> placeholder lines, and THE CUT dimmed at the 10-card floor (its reason
> prints beneath it). Zero fresh findings this pass.

> **[critique pass 84, 2026-10-14, commit dd61ec90] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 39 commits
> after pass 83: GS1 (Globals stack), BT2a (one card face, D91) and SF1
> (SACRIFICE floor) merged. The live combat board was read but nothing
> filed on it: BT2b (board layout, D92) is rewriting the fan, footer,
> portrait and END, so the mobile hand cards running under the portrait
> and END medallions belong to that PR (same root as pass 63's corner
> medallions row). Reconfirmed and not re-filed: pass 83's capture-settle
> row (fourth die still airborne in both `04-combat-board.png`), pass
> 82's inn-line and THE CUT floor calls, the unfixtured exploration hub
> bouncing to the title (no state, by design). Two fresh findings.

> **[critique pass 85, 2026-10-14, commit 93f05dfe] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 16 commits
> after pass 84: BT2b (combat board layout, D92: footer dock, full-width
> hand, intent top-left) merged as #529, plus the pr-resolve fix (#526).
> The only play-code change is the combat board, so the pass read the
> live board closely; every other screen matches pass 84. Pass 63's
> corner-medallion and the fan-hint rows are gone (closed by #529).
> Reconfirmed and not re-filed: pass 83's capture-settle row (fourth die
> still tilted in both `04-combat-board.png`), pass 84's sealed node mark
> (claimed by #528) and village "12s" price, the antagonist's VITAE
> double-announce row. Checked and not filed: the covered fan cards
> cutting their names and effect rows (each card is whole when lifted)
> and the top-left intent reading "−11" (D92 placement). Three fresh
> findings.

> Earlier pass banners (passes 13-50) and two 2026-07-18 residue notes are archived verbatim in `archive-pre-revamp:plan/archive/CRITIQUE_2026.md`.

> **[critique pass 86, 2026-10-14, commit eb4b804b] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 12 commits
> after pass 85: the sealed node mark (#528) and the village SHILLINGS
> prices (#531) merged, plus expand pass 34. Verified on screen: the
> stalls read "12 SHILLINGS" at both viewports, and every road on the
> walked sheet now ends on a mark. Reconfirmed and not re-filed: pass
> 83's capture-settle row (fourth die still airborne), pass 85's Blow
> FREE pill and dock VITAE width (claimed by #534 and #535), the
> unfixtured exploration hub bouncing to the title. Banner placed below
> the archive note, not after pass 85, so it does not touch the lines
> #534 and #535 rewrite. One fresh finding.

> **[critique pass 87, 2026-10-14, commit a397d3a0] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 17 commits
> after pass 86: the Blow FREE pill (#534), the dock VITAE cap (#535),
> the drive settle (#537), the ledger label (#539), forge SHILLINGS
> (#541), union merge moves (#543) and the hazard springs (#545).
> Verified on screen: the title is captured at full opacity with EMBARK
> lit, all four dice sit flat in both `04-combat-board.png`, and both
> A Plain Blow cards carry a "+4" sword pill. Pass 83's capture-settle
> row is closed by #537. Reconfirmed and not re-filed: the unfixtured
> exploration hub bouncing to the title, the legend's SEALED key (pass
> 86 row), the Minor Healing Potion (pass 65), the covered fan cards
> cutting their names on a phone (each is whole when lifted). One fresh
> finding: on desktop the capped VITAE column leaves END beside it, not
> at the right.

> **[critique pass 88, 2026-10-15, commit 1df5499e] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 13 commits
> after pass 87: PF4 (no exploration map under live combat, #553), the
> size and area/review PR labels, the repo rename and expand pass 35.
> PF4 is not on screen here: the drive opens `/combat-encounter` on its
> own, not through the hub's overlay. Every other screen matches pass 87.
> Reconfirmed and not re-filed: pass 87's desktop END row (END still at
> x~440-550), the unfixtured exploration hub bouncing to the title, the
> top-left intent column far from the foe on desktop (D92 placement,
> pass 85), the covered fan cards cutting their names and effect rows
> on a phone (each is whole when lifted). One fresh finding: the board's
> phase line is 9px, does not scale, and spells ROUND and TURN as "R"
> and "T".

> **[critique pass 89, 2026-10-15, commit 2927472f] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 14 commits
> after pass 88: the dock END row (#555), the HUD phase line (#557),
> the SACRIFICE-floor announce (#559) and the any-rest scar mend
> (#562). Verified on screen: desktop END sits at the far right, and
> the phase line reads "PHASE 1/5 · ROUND 1 · TURN 1" in both
> viewports, so pass 87's and pass 88's rows are closed. The scar mend
> is not on screen (the rest fixture carries no scar); its rest-shelter
> comment and the Scarred desc ("until you next rest") agree with it.
> Reconfirmed and not re-filed: the unfixtured exploration hub bouncing
> to the title, the mobile hazard strip's "CHOOSE TO PROC…" (pass 68
> trade), the legend's SEALED key (pass 86 row), the covered fan cards
> cutting their names on a phone. One fresh finding: the rest and cache
> screens' line "The node is spent the moment you stopped here" mixes
> tenses.

> **[critique pass 90, 2026-10-16, commit 6b5e2b6d] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 14 commits
> after pass 89: the combat route and the overlay-era delete (CR1a,
> CR1b), the level curve (LV1), the parent-replay eval (EV1b), Sentry
> perf (PF3) and two plots. No screen in the set changed shape; the
> drive opens `/combat-encounter` on its own, so CR1b's route is not on
> screen, and the SELF level-up modal is not in the set. Reconfirmed
> and not re-filed: pass 89's "you stopped here" tense row (both rest
> captures), the unfixtured exploration hub bouncing to the title, the
> mobile hazard strip's "CHOOSE TO PROC…" (pass 68 trade), the legend's
> SEALED key (pass 86 row). One fresh finding: after LV1 the late-game
> hub's Sage reads LVL 15 with 680 VITAE, a pool no level-15 pilgrim
> can reach.

> **[critique pass 91, 2026-10-16, commit ef1d1dd3] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 19 commits
> after pass 90: the hazard puzzle engine (B3a-B3d, no screen yet),
> EV1c/EV1d, the dev-section collapse and map wheel zoom (#590), and the
> RV1 plot. Only #590 reaches a screen in the set. Reconfirmed and not
> re-filed: pass 90's level-15 Sage at 680 VITAE (both hub captures),
> pass 89's "you stopped here" tense row (both rest captures), the
> unfixtured exploration hub bouncing to the title, and the mobile hazard
> strip's "CHOOSE TO PROC..." (pass 68 trade). One fresh finding: the map
> gesture line still reads "drag · pinch" on desktop, where #590 made
> the mouse wheel the zoom.

> **[critique pass 92, 2026-10-17, commit c49902c7] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 19 commits
> after pass 91: B3e hazard demo puzzles (dev-menu board, not in the
> set), the /dev menu slim, RV1a verify-gate, the map gesture line
> (#598) and the preset stat curve (#600). Confirmed fixed: pass 90's
> level-15 Sage now reads 290/290 VITAE in both hub captures, and the
> desktop chart reads "drag · scroll to zoom". Reconfirmed and not
> re-filed: pass 89's "you stopped here" tense row (both rest captures),
> the unfixtured exploration hub bouncing to the title, and the mobile
> hazard strip's "CHOOSE TO PROC..." (pass 68 trade). Two fresh
> findings, both born of #598: the transport's mobile viewport reports a
> mouse, so mobile captures now show the desktop gesture line; and the
> desktop hub and hazard still tell a mouse player to "tap".

> **[critique pass 93, 2026-10-18, commit 1a0e7b58] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 12 commits
> after pass 92: the drive's touch context (#606), pointer-neutral verbs
> (#604), the RV1b shadow reviewer and telemetry. Confirmed fixed: the
> mobile hub capture now reads "drag · pinch" and desktop keeps "drag ·
> scroll to zoom"; the desktop hub drawer reads "choose a glowing node"
> and the hazard hand "CHOOSE A CARD TO READ IT". Reconfirmed and not
> re-filed: pass 89's "you stopped here" tense row (both rest captures),
> the desktop title menu overhanging its plate (Pending, PR #614 open),
> the unfixtured exploration hub bouncing to the title, and the mobile
> hazard strip's "CHOOSE TO PROC..." (pass 68 trade). Two fresh
> findings: the cutscene still prints "· tap ·" to a mouse player, the
> remainder #604 did not reach; and the CONVICTION caption under the
> rune column's ◆ chip is 6px with font scaling off.

> **[critique pass 94, 2026-10-18, commit 757d79ff] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 15 commits
> after pass 93: the cutscene pointer verbs (#621), the CONVICTION
> caption (#618), the desktop title menu plate (#614), the Global copy
> label (#616), the VITAE double announce (#612), the B3e2 live puzzle
> UI (dev board, not in the set), RV1c and the HP1 plot. Confirmed
> fixed: the cutscene reads "· continue ·" at both viewports, the
> desktop title menu sits inside its plate, and the CONVICTION caption
> under the rune column's chip is legible at both viewports. Checked and
> not filed: the faint strokes across the hazard risk-route card are the
> deliberate `Cracks` overlay (`RouteSelect.tsx`), and the threat rows'
> "PHASE n · ATTACKS · N" is the 2026-10-07 resolution. Reconfirmed and
> not re-filed: pass 89's "you stopped here" tense row (both rest
> captures), the unfixtured exploration hub bouncing to the title, and
> the mobile hazard strip's "CHOOSE TO PROC..." (pass 68 trade). Zero
> fresh findings this pass.

> **[critique pass 95, 2026-10-19, commit 5b2059cb] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 19 commits
> after pass 94: HP1a, HP1b and HP1c (hazard puzzle engine: no bin,
> signed costs; the puzzle board is a dev surface, not in the set), the
> HP2/HP3/CT1/RS1 plots, the deadline reminder and the measured truth
> runs. None of it reaches a screen in the set, and none of the 22
> captures shows a regression against pass 94. Checked and not filed:
> UNBROKEN OATH printing "DRAW 2" on both lines of the desktop hazard
> hand is its data (`drawBase` = `drawPowered`, a gold major effect in
> `hazard.content.ts`). Reconfirmed and not re-filed: pass 89's "you
> stopped here" tense row (both rest captures), the unfixtured
> exploration hub bouncing to the title, the mobile hazard strip's
> "CHOOSE TO PROC..." (pass 68 trade), and the covered fan cards
> cutting their names on a phone (pass 88; whole when lifted). Zero
> fresh findings this pass.

> **[critique pass 96, 2026-10-19, commit 01b69c66] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 14 commits
> after pass 95: HP1c2 (cost card rules), HP2a (card audit pool), HP3a
> (puzzle roll and draw), a CI fixture fix and the measured truth runs.
> All of it lands in the hazard puzzle engine and its dev board
> (`/devpuzzle`, not in the set); the one live-screen diff is
> `HazardOverlays.tsx` naming its 1700ms roll timeout
> `DICE_ROLL_OVERLAY_MS`, no behaviour change. No capture shows a
> regression against pass 95. Reconfirmed and not re-filed: the village
> Minor Healing Potion row, the exploration legend's SEALED key, the
> covered fan cards cutting their names on a phone (pass 88), and the
> mobile hazard strip's "CHOOSE TO PROC..." (pass 68 trade). Zero fresh
> findings this pass.

> **[critique pass 97, 2026-10-19, commit c9e41d58] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 14 commits
> after pass 96: HP3b (puzzle rerolls replay the cast tumble), HP1d,
> RV2, the potential-assets seal, the VE1 and TP1 plots and the measured
> truth run. The one live-component diff is `HazardBoard.tsx` taking an
> optional `dieRolls` prop that only the dev puzzle board passes, and
> `TumblingDie` now wrapping the shared `DieTumble`; the live hazard tray
> and cast interstitial render as before. No capture shows a regression
> against pass 96. Reconfirmed and not re-filed: the rest/cache tense
> row, the village Minor Healing Potion row, the exploration legend's
> SEALED key, the covered fan cards cutting their names on a phone (pass
> 88), the mobile hazard strip's "CHOOSE TO PROC..." (pass 68 trade) and
> the unfixtured exploration hub bouncing to the title. Zero fresh
> findings this pass.

> **[critique pass 98, 2026-10-20, commit f8058ad6] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 22 commits
> after pass 97: VE1a (one shared web export), VE1b (the web ready
> signal), HP2b and HP2c (dev puzzle board, not in the set), the TP1a
> title plate docs, the RV review fixes and a labyrinth e2e race fix.
> The one live-app diff is `_layout.tsx` setting `data-axm-ready` once
> the fonts settle; no player-facing screen changed, and the title,
> combat, board, hub, village, dialogue, cutscene, rest and hazard
> captures show no regression against pass 97. Reconfirmed and not
> re-filed: the rest/cache tense row, the village Minor Healing Potion
> row, the covered fan cards cutting their names on a phone (pass 88),
> the mobile hazard strip's "CHOOSE TO PROC..." (pass 68 trade) and the
> unfixtured exploration hub bouncing to the title (now caught on the
> boot splash). One fresh finding, born of VE1b: the onboarding capture
> no longer waits out the menu's fade-in, so both viewports show the
> CHRONICLE menu ghosted under the title plate.

> **[critique pass 99, 2026-10-21, commit 02f94d07] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 13 commits
> after pass 98: HP4a to HP4d (the thirty candidate hazard puzzles,
> decision pressure and the dev board's candidate groups, none of it in
> the set), IT1a (item glyph resolver; satchel, not in the set), ML1a,
> OV1b and the DL1/UP1/ML1/OV1 plots. No player-facing screen in the set
> changed, and the title, combat, board, hub, village, dialogue,
> cutscene, rest and late-game hub captures show no regression against
> pass 98. No fresh row: the one new observation (the hazard route
> select caught mid-stagger, its risk route and right-hand fan cards
> ghosted at both viewports) shares pass 98's root cause, so it is
> folded into that row, which is raised MED to HIGH because the lens is
> now blind on three screens. Reconfirmed and not re-filed: the
> rest/cache tense row, the village Minor Healing Potion row, the
> covered fan cards cutting their names on a phone (pass 88), the
> mobile hazard strip's "CHOOSE TO PROC..." (pass 68 trade), the
> per-arrival hazard draw (pass 64), and the unfixtured exploration hub
> caught on the boot splash.

> **[critique pass 101, 2026-10-25, commit 83975010] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 13 commits
> after pass 100: the hazard strip fit (#901), the rest/cache tense
> (#912) and the hazard seed (#916) fixes, EM1 and AW1a (measurement and
> the Act 1 walk audit, not in the set), and the plot PRs. The hazard
> strip, hand fan and route cards render whole at both viewports, and
> the rest screen reads in one tense. One fresh row (LOW, a11y): the
> combat preview's "forfeit the path" line under WITHDRAW. Reconfirmed
> and not re-filed: the covered fan names on a phone (pass 100, waiting
> on T's BT2a call), the village Minor Healing Potion row, the map
> legend's SEALED key, and the customs-house "takes shillings" line
> above the free inn REST (pass 72's chosen copy).

> **[critique pass 102, 2026-10-26, commit 4b316aa2] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 12 commits
> after pass 101: BC1 (board cues: your own INFERNO, the BLIZZARD cut,
> END on a dead tray, the float timing) and SG1 (no starting ring), plus
> the plot PRs (LR1, EQ2, SG1 rework, IO1, RW1, PH1, TQ1, BC1). The BC1
> cues need an Elementalist fight or an all-MISS tray, and the set's
> Float-Eye opening board shows neither; its intent pill, chips, hand
> and footer dock render as in pass 101 at both viewports. SG1 leaves no
> mark on the fresh hub. No fresh row. Reconfirmed and not re-filed: the
> WITHDRAW sub-line contrast (pass 101), the covered fan names on a phone
> (pass 100, waiting on T's BT2a call), and the customs-house "takes
> shillings" line above the free inn REST (pass 72's chosen copy).

> **[critique pass 103, 2026-10-26, commit 79ecad63] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 13 commits
> after pass 102: RW1b (the cache's card offer prints its face), PH1a-c
> (the playtest session tool), IO1a/IO1c (iOS beta config and submit),
> the lane-creator skill and the plot PRs (ER1, LR1e, SB1). The only
> player-facing diff is `app/cache/index.tsx`, and `/cache` is not in
> the set, so RW1b shipped unseen by any pass: one fresh row (LOW,
> process). The 11 screens render as in pass 102 at both viewports.
> Reconfirmed and not re-filed: the WITHDRAW sub-line contrast (pass
> 101), the covered fan names on a phone (pass 100, waiting on T's BT2a
> call), the village Minor Healing Potion row and the map legend's
> SEALED key.

> **[critique pass 104, 2026-10-27, commit f7f5530f] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 46 first-parent
> commits after pass 103 (LR1e relics, EQ2a relic slot, art CLI fixes,
> the truth run). Zoomed crops of the small numerals found one fresh
> row: Pirata One's zero is a barred slab that reads as an 8, and three
> screens print a live 0 in it (MED, comprehension). Reconfirmed and not
> re-filed: the covered fan names on a phone (pass 100), the WITHDRAW
> sub-line contrast (pass 101), the `/cache` gap (pass 103), the village
> Minor Healing Potion row and the map legend's SEALED key. The
> pre-fight "PHASE n · ATTACKS · N" header was checked against its
> 2026-10-07 resolution and left alone.

> **[critique pass 105, 2026-10-27, commit 02372412] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 12 first-parent
> commits after pass 104: IT1b (T's relic icons with colour accents on
> the item cards), DF1a/DF1b (the Defender's spikes engine, verbs and
> keywords, with no card in the starter hand), the expand pass and two
> truth runs. IT1b's only surface is the satchel's item cards, and no
> screen in the set opens the satchel, so like RW1b's cache face it
> shipped unseen. That is the `/cache` row's cause again, not a new one:
> the row now names the satchel too and is raised LOW to MED. No fresh
> row. Reconfirmed and not re-filed: the barred zero ("◆ 8 CONVICTION",
> the rest screen's "PURSE 8"), the covered fan names on a phone, the
> WITHDRAW sub-line contrast, the village Minor Healing Potion row and
> the map legend's SEALED key. The dialogue and cutscene "A placeholder
> line." and the "Fixture Shop" names are the fixtures' own content, not
> findings.

> **[critique pass 106, 2026-10-28, commit 4edd5433] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 24 first-parent
> commits after pass 105: the pass-104 zero fix (#1005), DF1c-DF1e (the
> Defender's spikes board, cards and relics), QL1's map-scoped kills,
> three `plot` merges and the truth runs. The fix reached its three named
> readouts (CONVICTION reads "◆ 0", the rest PURSE reads "0"), but an
> enlarged crop of the hazard route ladder shows "RI 28" for a threshold
> of 20: the same barred zero, in a style the fix did not touch. A grep
> finds about a dozen more numeric styles still in `FONTS.gothic`. Filed
> as one MED row for the sweep and a guard, not one per screen. Reconfirmed and not
> re-filed: the covered fan names on a phone, the WITHDRAW sub-line
> contrast, the `/cache` and satchel gap, the village Minor Healing
> Potion row and the map legend's SEALED key. No screen in the set shows
> a Defender card or relic, so DF1d/DF1e also shipped unseen. That is the
> same coverage gap as the `/cache` row, so it gets no new row.

> **[critique pass 107, 2026-10-28, commit bf5bae72] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), full 11-screen
> set: 22 captures, 0 nav trouble, 0 console/page errors. 19 first-parent
> commits after pass 106: QL1a-QL1c (the quest kind, step rules and the
> new `/quest` screen), DY1a-DY1d (the death rule, the revive and its new
> `/death-return` screen, the dying skull on the combat panes), MD1a/MD1b
> (merge tooling) and the truth runs. No regression on any of the 11
> screens. Both new routes are off the set: `/quest` has a registry
> fixture (`apprentice-staged-quest`, `arrive` pushes it) and
> `/death-return` has a `?preview=1` dev view, yet neither is a SCREENS
> entry, and no fixture boots the board dying, so the DY1d skull went
> unseen too. That is the `/cache` row's cause a fourth pass running, so
> the row names both routes and is raised MED to HIGH; no fresh row.
> Reconfirmed and not re-filed: the barred zero sweep, the covered fan
> names on a phone, the WITHDRAW sub-line contrast.

> **[critique pass 108, 2026-10-28, commit 850ce863] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), the full 15-screen
> set for the first time (#1033 added `/cache`, the satchel, `/quest` and
> `/death-return`): 30 captures, 0 nav trouble, 0 console/page errors. 21
> first-parent commits after pass 107: QL1d (Breakwater quest steps),
> QL1g (the death seam), DY1c (hazard death), DL2a/DL2b and MD1c (tooling)
> and the truth runs. No regression on the 11 known screens. Three rows
> filed, all on the newly reached screens: the cache's column runs the
> full desktop width where rest and quest cap at 520 (MED), TAKE THE GOODS
> hides the rolled goods while the card offer prints its face (LOW), and a
> satchel item tile on desktop is a 390px black well round a 28px glyph
> (LOW). Checked and not filed: `/death-return` prints "[content] YOU
> FELL" and a "[content]" body on purpose (`death-return.copy.ts`; the
> copy waits on T, D88); `/quest` shows the fixture's placeholder giver
> line and step name (fixture data, not shipped copy); the satchel's
> "bare" WEAPON/ARMOR slots (RC2 row 16, accepted). Reconfirmed and not
> re-filed: the barred zero sweep, the covered fan names on a phone, the
> WITHDRAW sub-line contrast, the mobile hub's black band (the no-clamp
> trade).

> **[critique pass 109, 2026-10-29, commit 1250f1d9] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), the 15-screen set:
> 30 captures, 0 nav trouble, 0 console/page errors. 16 first-parent
> commits after pass 108: the cache column and goods reveal, the satchel
> tile width, the gothic figures, the WITHDRAW contrast, the opening-hand
> recorder and #1046 (the map plate always covers the pane). Pass 108's
> three rows read as fixed in the captures. Three rows filed: on desktop
> the level-15 hub opens with the pilgrim's own node above the frame
> (MED), TAKE THE GOODS prints two identical potions as two chips where
> the satchel says x6 (LOW), and the cache's card offer is rolled from
> `Math.random`, not the cache seed, so the two viewports offered
> different cards (LOW). Checked and not filed: `/death-return`'s
> "[content]" copy and `/quest`'s fixture lines (on purpose, as pass
> 108); the Minor Healing Potion's "15 BELOW HALF" (open LOW row);
> THE CUT dimmed with only the deck floor named while the purse is also
> 0 (the floor is the binding reason). Reconfirmed and not re-filed: the
> covered fan names on a phone (waits on T).

> **[critique pass 111, 2026-10-29, commit 3a8c0821] Unattended `/march`
> tick.** `critique:drive` (`CRITIQUE_VIEWPORT=both`), the 15-screen set:
> 30 captures, 0 nav trouble, 0 console/page errors. 13 first-parent
> commits after pass 110: IT2 (T's potion icons, #1088), the Merciful
> plan PRs and the docs drift fix. The satchel's Healing Potion tile now
> draws the red-liquid flask at both viewports; no regression elsewhere.
> Two rows filed: the hub's footer line still tells a desktop player to
> "tap a trodden one" (LOW), and the quest pay prints "+40 XP" over
> "+10 shillings" in two cases (LOW). Checked and not filed: the cache's
> goods chips stay text-only beside the new icon (IT2's brief does not
> name the cache); `/death-return` and `/quest` placeholder copy (on
> purpose, as pass 108). Reconfirmed and not re-filed: the covered fan
> names on a phone, the Anvil label twice, the rest "full" twice, the
> cache's repeated potion chips.

## Pending

### [LOW] exploration / desktop — the hub's footer line still says "tap a trodden one to walk back" to a mouse player, in the same sentence that says "choose a glowing node"
- pass: 111 (commit 3a8c0821)
- viewport: desktop (1280x800), also mobile
- category: voice
- observation: WR1a's new walk-back clause reintroduced the touch verb the pointer-neutral sweep (pass 92 row, c6daa798) removed from this very drawer line. One sentence now uses "choose" for one node and "tap" for the other, and on desktop there is nothing to tap.
- evidence: `.critique-artifacts/desktop/11-late-game-hub.png` (footer); `axiomancer-mobile/state/presenters/exploration.engine.ts:605`; pinned in `state/e2e/exploration.engine.test.ts:587`.
- suggested fix: "choose a glowing node, or a trodden one to walk back." in the presenter and its test; copy only.
- source: critique:drive (unattended)

### [LOW] /quest — THE PAY prints "+40 XP" over "+10 shillings", so two lines of one ledger use two cases, where the cache, village and forge spell the unit "SHILLINGS"
- pass: 111 (commit 3a8c0821)
- viewport: mobile (375x812) and desktop (1280x800)
- category: visual
- observation: the quest's pay lines sit in one mono column; the XP line is upper case and the shillings line lower case. Every other price or reward on the road (cache chips "+6 SHILLINGS", stall and rest "6 SHILLINGS", the forge) reads upper case since the pass 84 shilling sweep.
- evidence: `.critique-artifacts/mobile/14-quest.png`; `axiomancer-mobile/state/presenters/quest.copy.ts:46` returns `+${amount} shillings`.
- suggested fix: return `+${amount} SHILLINGS` in `quest.copy.ts` and pin it in the quest presenter test; copy only.
- source: critique:drive (unattended)

### [MED] balance / Act 1 ledger — the rebuilt Breakwater's 19 fights make the Beacon Crags door free on a full clear (BW1b, 2026-10-29)
- source: phase BW1b, `axiomancer-mechanics/src/Game/act1-progression.test.ts`.
- detail: the new Breakwater stages 15 fights, 3 elites and the sea keep's boss (19, against 6 on the old map), so
  the Act 1 ledger has 39 fights and a full clear meets the four doors at levels 6, 13, 16 and 19 (was 4, 9, 14,
  18). At level 16 the placeholder Death Beholder at the Beacon Crags door (bc-15, level 3) is won about 92% of
  the time, over the test's 90% "not free" ceiling. The test now names bc-15 in `FREE_UNTIL_RETUNED` and pins that
  it is still free, so the exception fails loudly once the retune lands.
- next: T's call with Chapter 1's real foes (enemy sessions 1-2, B2): fewer XP on the Breakwater's placeholder
  fights, a later door level, or the curve. Then drop bc-15 from the set.

### [LOW] /village — the Anvil says its name twice ("THE ANVIL" label over a "THE ANVIL" row), and it is the one counter whose copy is typed into the screen
- pass: 110 (commit c8b1e1a8)
- viewport: mobile (375x812) and desktop (1280x800)
- category: voice
- observation: every other counter pairs a section label with a different row name ("A BED FOR THE NIGHT" over REST, "THE CARD SHOP" over the cards). The Anvil prints "THE ANVIL" as its label and again as its row name, so the text reads "THE ANVIL / THE ANVIL / HONE, TEMPER, SWAP A DIE, UPGRADE A CARD". It is also the one counter whose label, line and price copy sit as literals in the component rather than in `village.copy.ts` (the package rule: no hardcoded player-facing copy in components). At both viewports it sits under the fold, and at 1280 only its bare label peeks above the exit bar.
- evidence: `.critique-artifacts/mobile/07-village.txt` ("THE ANVIL" twice); `desktop/07-village.png` (label alone above TAKE THE ROAD); `axiomancer-mobile/app/village/index.tsx` the `vm.anvil` block (`THE ANVIL` at the section label and the row name, "hone, temper, swap a die, upgrade a card", `FROM ... SHILLINGS`) against `state/presenters/village.copy.ts` (`VILLAGE_CARD_SHOP_LABEL`, `VILLAGE_REST_LINE`).
- suggested fix: move the Anvil's label, line and price string into `village.copy.ts` (a `VILLAGE_ANVIL_LABEL` in the "A BED FOR THE NIGHT" register, e.g. "THE SMITH", over the THE ANVIL row), so the label and the row say different things; presentation only, pinned in the village screen test.
- source: critique:drive (unattended)

### [LOW] /village — at full VITAE the rest counter says it is full twice, once in the row and again in the refusal line under it
- pass: 110 (commit c8b1e1a8)
- viewport: mobile (375x812) and desktop (1280x800)
- category: comprehension
- observation: with VITAE 230/230 the REST row reads "RESTORES NOTHING: VITAE IS FULL" and the refusal line under the row reads "your VITAE is already full". The two lines say the same thing in two registers (caps mono, then lower-case italic), and the refusal starts with a lower-case "your" that reads like a clipped sentence. The card and removal counters print a refusal only when the row itself does not already explain why it is dim.
- evidence: `.critique-artifacts/mobile/07-village.txt` lines 9 and 12; `axiomancer-mobile/state/presenters/village.copy.ts:25` (`restores nothing: VITAE is full`) and `axiomancer-mechanics/src/World/Village/village.engine.ts:77` (`your VITAE is already full`).
- suggested fix: when the refusal is the full-VITAE one, print only the row's effect (drop the refusal line, keep the dimmed price), or keep the refusal and let the effect read "restores nothing"; presentation only, pinned in the village presenter test.
- source: critique:drive (unattended)

### [LOW] /rest and /cache — "there is no walking back out" now reads against the hub's new "tap a trodden one to walk back"
- pass: 110 (commit c8b1e1a8)
- viewport: mobile (375x812) and desktop (1280x800)
- category: comprehension
- observation: since WR1 (D113) the hub's footer teaches "walk back" as a real verb ("choose a glowing node, or tap a trodden one to walk back"). The rest and cache screens still say "Pick one — there is no walking back out." It means "you must choose before you leave", but after WR1 a first-time player can read it as "you cannot walk back to this node", which is now false (they can; a revisited rest heals nothing, WR1 brief rule 5). The same verb now says yes on one screen and no on the next.
- evidence: `.critique-artifacts/mobile/09-rest.png` and `mobile/05-exploration-hub.txt` (footer); `axiomancer-mobile/state/presenters/rest.copy.ts:12` and `cache.copy.ts:10`; `plan/phases/phase_WR1_walk_the_roads.md` rule 5.
- suggested fix: reword both lines so they do not reuse the hub's verb, e.g. "The node is spent the moment you stop here. Pick one before you go; it will not offer again."; copy only, pinned where the presenter tests read the line.
- source: critique:drive (unattended)

### [MED] exploration / desktop — the level-15 hub opens with the pilgrim's own node above the frame, so the first view shows open roads leading from somewhere off-screen
- pass: 109 (commit 1250f1d9)
- viewport: desktop (1280x800)
- category: navigation
- observation: on the `sage-bw-door-gate` hub at 1280 the camera's first frame shows eight open (gold-ringed) nodes and several roads running up off the pane's top edge, but no dotted "you are here" node anywhere; the pilgrim's node sits above the frame. The same fixture at 375 shows it at about (200, 248), and the level-1 hub at 1280 shows it only 40px under the pane's top edge. A first-time player sees choices with no origin until they press the recentre button, which runs the same fit and lands in the same place.
- evidence: `.critique-artifacts/desktop/11-late-game-hub.png` (no dotted current node; roads exit the top near x 680) against `mobile/11-late-game-hub.png`; `desktop/05-exploration-hub.png` (windmill node at y about 210, the pane's top at 170). `axiomancer-mobile/components/exploration/MapCanvas.tsx` `computeFocusTransform`: the scale is floored at `minScaleFor` (the plate covers the pane, #1046, T 2026-10-28), and on the wide, short desktop pane that floor is likely above the scale that fits the focus box's height, so the box overflows the pane and the vertical centre can drop the current node out. The `settleAxis` comment promises it never takes a focus node off-screen; that holds only when the box fits.
- suggested fix: keep the cover floor (T's ruling), but when the floored scale cannot fit the whole focus box, centre the overflowing axis on the current node instead of the box's middle (still clamped by `settleAxis`), so the pilgrim's node is always in the first frame; pin it in `MapCanvas.test.tsx` with a 1260x500 viewport and a focus box taller than the pane.
- pass 110 note: not reproduced at 1280 on the rebuilt Breakwater (BW1b): the `sage-bw-door-gate` hub now frames the dotted current node at about (500, 495). The fixture moved, not the fit: `computeFocusTransform` still floors the scale at `minScaleFor` with no overflow rule, so the row stands.
- source: critique:drive (unattended)

### [LOW] /cache — TAKE THE GOODS prints two identical potions as two "+ GREATER HEALING POTION" chips, where the satchel stacks the same item as "x6"
- pass: 109 (commit 1250f1d9)
- viewport: mobile (375x812) and desktop (1280x800)
- category: comprehension
- observation: the goods offer lists "+ GREATER HEALING POTION", "+ GREATER HEALING POTION", "+12 SHILLINGS" as three chips. At 375 they stack on three lines, so the repeat reads as a rendering echo rather than two potions. The satchel prints a stack as one tile with a "x6" badge, so the game already has a count idiom the cache does not use.
- evidence: `.critique-artifacts/mobile/12-cache.png` and `desktop/12-cache.png` (goods row); `axiomancer-mobile/app/cache/index.tsx:74` maps `offer.goods` one chip per item name, and the outcome ledger at :150 does the same with `itemNames`.
- suggested fix: fold repeats in the presenter into one chip with a count ("+ GREATER HEALING POTION x2"), in both the offer and the outcome ledger; presentation only, pinned in the cache presenter test.
- source: critique:drive (unattended)

### [MED] combat / mobile — at 375 wide the hand fan cuts four of five card names to "A PLAIN" plus one letter, so Blow, Word and Ward look the same
- pass: 100 (commit ee9c5b83)
- viewport: mobile (375x812)
- category: comprehension
- observation: on the opening Float-Eye board the five-card hand overlaps so much that every covered card's name band shows only "A PLAIN" and the first letter of the second word ("A PLAIN W", "A PLAIN U", "A PLAIN B"), and the effect rows are cut too ("Deal", "♥ VULN", "★ GU"). The starter deck's three grey cards differ only by that second word, so a first-time player cannot tell Blow from Word from Ward by name; only the right-end card prints whole. Phase 97 (2026-09-19) had the covered names wrap inside their visible strip; at 1280 the fan no longer overlaps and every name prints.
- evidence: `.critique-artifacts/mobile/04-combat-board.png` (hand row) against `desktop/04-combat-board.png`; `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:428` `handFanLayout` (`HAND_FAN_MIN_STEP` 28).
- suggested fix: size a covered card's name to the strip it shows, as `handNameFontSize` does for hazard hand cards, or print the name's last word first, so the distinguishing word (BLOW / WORD / WARD) is always readable; presentation only, pinned in a CombatBoard hand-fan test at 375.
- loop note (iterate 2026-10-25): not picked. Both suggested fixes cap or reorder the covered name, which reverses T's ruling in `plan/phases/phase_BT2a_card_face.md` A3 (one uncapped line that runs on under its neighbour; T 2026-10-13, itself reversing the old wrap-in-the-sliver fix). The loop does not overturn a T call; this row waits on T's word.
- source: critique:drive (unattended)


### [LOW] ci / pr-resolve — a hand dispatch with a non-`loop/` branch exits green having done nothing
- pass: antagonist on PR #526 (commit efc7f371)
- viewport: n/a
- category: infra
- observation: with `branch` set to anything outside `loop/` (a typo, `main`), `scan` is skipped (`inputs.branch != ''`) and `resolve` is skipped (`startsWith(inputs.branch, 'loop/')` fails), so the run shows green with no jobs run. Separately, `inputs.branch` is spliced into the `pre_run`/`post_run` shell inside single quotes; a refname may contain `'`. Only writers can dispatch, so this is hygiene, not exposure.
- evidence: `.github/workflows/pr-resolve.yml` `scan.if` and `resolve.if`, `pre_run`.
- suggested fix: a tiny guard job that fails loudly when `branch` is set but does not start with `loop/`; pass the branch through `env:` rather than inline `${{ }}` in the script.
- source: antagonist, PR #526


### [LOW] docs — `plan/revamp/card-rules-inventory.md` §17 still says a Global is "unique in play"
- pass: antagonist on PR #520 (GS1, commit fc4aa159)
- viewport: n/a
- category: comprehension
- observation: GS1 marks the stacking rule experimental in `cards.md`, `card-spec.md`, `game-model.md`, the atlas and the gloss. The B4 inventory's "Ratified, not built" table still lists "Global: FREE 3 turns, PAID rest of combat, unique in play". The inventory is a dated snapshot, so this may be intended, but it is the one remaining line that states the old rule.
- evidence: `plan/revamp/card-rules-inventory.md:343`
- suggested fix: either annotate the row "(superseded by GS1, experimental)" or leave it as history and say so in the file header.
- source: antagonist, PR #520

### [LOW] combat / die tap — a die tapped onto a card refused at the SACRIFICE floor flags the VITAE ring, but gets no haptic or reject line
- pass: antagonist on PR #523 (SF1, commit 04e5ebb6)
- viewport: mobile
- category: feedback
- observation: the die-tap path (`dieTapRef` in `CombatBoard.tsx`) still refuses an illegal pairing silently, by design ("a tap has no card to shake"). SF1 adds the VITAE-ring callout on that path for the floor only. So a floor refusal on tap shows the ring callout with no error haptic and no reject line, while the same refusal by drag shows all three, and a tap refused for any other reason (off-colour, printed condition) stays silent.
- evidence: `CombatBoard.tsx` `dieTapRef.current` (`if (!target) { ... flagShortfall(...); return; }`) against the drop path's `setDropReject` and `juiceHaptics.notify`.
- suggested fix: give a refused tap the same reject line and error haptic as a refused drop (owner doctrine: illegal actions prevented loudly).
- source: antagonist, PR #523

### [LOW] combat / perf — `programPlayVM` now probes every hand card's lines twice more per view-model build
- pass: antagonist on PR #523 (SF1, commit 04e5ebb6)
- viewport: n/a
- category: performance
- observation: `programShortfall` re-runs `programIllegalReason` and then `programLineCost` for each line, on top of the two `programLineBlock` calls, so each program card in hand costs about four extra line probes per `buildCombatViewModel`. Small at today's hand sizes, but it is on the board's render path.
- evidence: `axiomancer-mobile/state/presenters/card-program.engine.ts` `programPlayVM`; `axiomancer-mechanics/src/Combat/combat.card-program.ts` `programShortfall`.
- suggested fix: one engine read returning `{ block, shortfall }` per line, so the VM probes each line once.
- source: antagonist, PR #523

### [LOW] RC2 walk 2026-10-11 — copy, feedback and consistency findings (one row per item, accepted for v0.2.0)
- pass: RC2 walk, four `playtester` legs (attended, T present) on eb75f451 with the Blood Price test deck
- viewport: playwright default (desktop)
- category: comprehension / polish
- observation (each its own `/iterate` fix; none blocks v0.2.0; the four rules bugs are AUDIT rows):
  1. [ ] No aftermath panel after a victory, spare or exploit: XP, loot and level-ups show only later on SELF/SATCHEL (carried from RC; accepted).
  2. [ ] The Doorwarden's stage change ("WHAT SHUTS, STAYS SHUT") heals it 15% (47 at 312, 55 at 368) with no toast, banner or number pop; only the LOG overlay says so, and the reveal never mentions the stage.
  3. [ ] The threat numbers disagree with what lands: the Hag's reveal lists phase 3 as 15, the HUD says "Deals 22"; a Float-Eye phase listed at 13 hit 19, 22 and 24.
  4. [ ] The DECK tab prints base numbers while the hand prints scaled ones (P-01a: DECK "SACRIFICE 4, DEAL 16", hand "-2 / Deal 22", dealt 22; P-05b: DECK +50%, hand +28%/+70%).
  5. [ ] Card faces mix the free and paid lines (P-09b "-4 / Foe -12"; Bloodletting "+4" gave 2 Conviction played free); hand cards show only the paid line, so a free play does something the face does not say (P-10c).
  6. [ ] "Same, and gain 2 Conviction" (E-07b) and "Same, max 15." (M-10A) refer to a line shown only in the card detail.
  7. [ ] SPARE and EXPLOIT carry no explanation; their accessibility labels are just "Spare" and "Exploit". (EXPLOIT: victory, a 76-damage finishing blow, +150 XP, a card pick.)
  8. [ ] The combat summary credits every LEECH tick to the card that applied it and counts ticks as plays ("Open Vein 28 dmg, 7 plays" after 2 plays; "P-10c 123 dmg, 16 plays"); the EXPLOIT blow appears in no row.
  9. [ ] The hazard reward sheet shows the route penalty ("-2 VITAE") and the dice reserve but the +6 VITAE reward only as a numberless icon, so the sheet does not add up; at full VITAE the net is capped and nothing changes. Show one net VITAE line.
  10. [ ] An unpowered Global gets a 3-turn chip although the text says "in play for the rest of combat"; a second copy of a Global can never be played and clogs the hand (its reject is already loud).
  11. [ ] Treasure "TAKE A CARD" adds a card with no preview or choice, while the goods option is itemised.
  12. [ ] After a lost hazard round the card pick has no SKIP (the flawless one does), so a card is forced into the deck.
  13. [ ] At the end of a region with every node walked, the hint still says "tap a glowing node to travel" and none glow; the counter says "18 nodes, 0 sealed" while two doors are told as sealed.
  14. [ ] The Vault Door and the Deep Stair are labelled "quest" / "QUEST" before travel and resolve to one-line sealed omens.
  15. [ ] "Momentum" names both the combat chain chip and the hazard surplus; "payload" (Anvil "Sanguine Fitting (+3 payload)") and "the jar holds 4 souls" (THE LEDGER) are unexplained.
  16. [ ] WEAPON and ARMOR satchel slots always read "bare"; nothing in Act 1 fits them.
  17. [ ] Dev only: the `/dev` ENEMY PICKER opened from SELF mounts two encounters (two `beginHazardEncounter` / `encounter-mounted`, every map node listed twice); loading `/dev` by URL avoids it.
  18. [ ] Console (dev only): React 19 "Accessing element.ref was removed" once per load, from react-native-gesture-handler 2.28.0 `web/utils.js:218` (`node.ref?.rngh`) via GestureDetector; upgrading RNGH clears it. Reanimated "may be overwritten by a layout animation" bursts on /hazard.

### [LOW] RC walk 2026-10-02 — copy, label and console findings (one row per item, all presentation)
- pass: RC checkpoint walk, four `playtester` legs (attended, T present), commits a493eaf7 → 169b6dbc
- viewport: playwright default (desktop)
- category: comprehension / polish
- observation (each its own `/iterate` fix; none blocks RC):
  1. [x] (commit ae281b4d, issue #450; the drawer now says paths beside trodden ground stay open) The map footer says "the paths close as you go deeper", but frontier roaming keeps every node next to a resolved node open (`world.reducer.ts` `frontierNodes`). The copy should say what the map does. (`state/presenters/exploration.engine.ts:428`)
  2. [x] (commit 444f5a38, issue #462; travel doors are a `door` node type reading PATH ONWARD in the panel and the accessibility label; the scroll glyph stays until a door icon is drawn, which is art; ld-18 is the sealed stair, a cutscene, not a door) Exit doors (bw-18, cw-20, bc-17, ld-18) are labelled "QUEST" with a scroll icon in the node panel and the accessibility label ("open, quest").
  3. [x] (commit 444f5a38, issue #462; the panel reads THE ANVIL, matching its tooltip and screen) bw-16 says "BLACKSMITH" in the node panel; the screen it opens is "THE ANVIL".
  4. [x] (commit bcb76681, issue #466; the combat die's label says BOON face and the TEMPER refusal reads "the heart die is capped at 2 BOON faces"; the primer went in R10d) The good die face is "SPECIAL face" in the combat primer and "BOON" at the Anvil; the Anvil's TEMPER refusal says a die at its cap "exceeds its special-face cap".
  5. [x] (spoils half shipped in commit 01834312, issue #465; the offer scales with the player's stats through the hand's card builder. Notation half in commit 59edd577, issue #467; the detail's die line was the last surface printing the ×N count and now reads +N% like the face, the FREE line and DECK) A Plain Word's VULNERABLE reads "+10" / "+25%" on the hand face, "vulnerable +10% · 1 turn" / "VULNERABLE ×25 · 2 turns" in detail and spoils, "+25% · 2 turns" on DECK. A Plain Blow reads "Deal 6" in hand but "Deal 5" on SPOILS (the spoils preview appears unscaled).
  6. [x] (commit 72d3bdb1, issue #470; rows read "N plays", the DoT total prints only when DoT dealt damage, and the list is headed DAMAGE BY CARD since GUARD deals none) The fight summary's rows read "92 dmg · 12ph" ("ph" unexplained), print "TOTAL DOT DAMAGE: 0" with no DoT in play, and omit A Plain Ward.
  7. [filed for B3, 2026-10-09: no node names its hazard; `beginHazardAction` draws one of the six library hazards from the seed, so any hazard node can open as any of them. Matching hazards to nodes is hazard design, owned by B3 (T's session), not a copy fix] The Sea Cave hazard (bw-12) opens as "CRACKED CLIFF PATH".
  8. [x] (moot since R10d, commit 859cef19: every tutorial window, the first-fight coach included, was removed) The first-fight coach card ("FIRST FIGHT · 1/4") draws over the card-detail modal and hides the card's name.
  9. [x] (commit 7b4d0cb0, issue #496; the detail card's effect line ran beside the stats and pushed MANA and the socket off the section, on every utility card. It now has its own line and the card grows by the two lines. Seen while checking it: the detail card's own keyword rows and flavor line were already cut off below the salvage line at 330px, before and after; both modals that show it list the keywords outside the card) The Pilgrim's Blessing hazard reward preview: the "RE-CAST +DIE MANA" line overlaps a square glyph.
  10. [x] (commit 48e80293, issue #488; the cache and the Anvil stand on the plate of the map they open from, `mapBackdropFor` into ScreenBg's `regionPlate`; Ludgate Hill stays only off any mapped region) Cache (cw-13) and Anvil (cw-18) screens in the Charcoal Wood draw over a city skyline backdrop.
  11. [x] (commit 8c8b1701, issue #473; the Ascend strip, the ASCEND READY strip and the level-up screen print the level in arabic, as SELF, the combat line and every accessibility label already did) The SELF header says "LVL 4"; the Ascend strip and screen say "level iv".
  12. [nested-button half x] (commit 46f7f3b8, issue #471; the socketed die is no longer its own button and the staged card's label names it; the item card's expand button and USE / DISCARD are siblings, which also puts them in a native screen reader's reach. The `translateX`/`translateY` warning went in commit 7c256e72, issue #487: the hazard `Cracks` overlay offsets its highlight strokes with a `transform`. The `element.ref` warning remains) Console: React 19 "Accessing element.ref was removed"; nested `<button>` hydration errors from the staged combat card (`combat-staged-*` contains `combat-staged-die-face`) and the Satchel potion card (`item-*` contains `use-*`); `translateX`/`translateY` passed to a DOM element on the hazard route-select screen.
  13. Dev only: a hot reload white-screens the app (`useGameState/useGameActions must be used inside <GameStoreProvider>`, thrown from `SaveSlotsProvider`); a reload recovers.
- not filed (by design or owned elsewhere): the Doorwarden's placeholder pictogram (art, B2/B8); no end-of-act screen after the deep stair (`MapEvents/content.ts`: no end-of-run state); the grey-deck Momentum chip (accepted until BT).
- evidence: the four leg reports in the RC session; `plan/revamp/checkpoint.md` → "The walk, 2026-10-02".
- source: playtester (attended)

### [LOW] exploration / map — the sealed node now prints as a dark dot, so the legend's ◌ SEALED key still matches nothing drawn
- pass: 86 (commit eb4b804b)
- viewport: both (375x812 and 1280x800)
- category: comprehension
- observation: #528 made the twelve sealed nodes of the walked Breakwater sheet visible again, and the roads now end on a mark. But the mark reads as a small solid dark dot, the same tone as the black road casing it sits on. The dashed ash ring inside the disc is not legible at either viewport, so the sealed node looks like a filled dot, while the legend keys SEALED as an empty broken ring (◌) and TRODDEN as the solid one (●). On the desktop sheet's darkest stretch (the wreck, about 55,565) the dot melts into the engraving.
- evidence: `.critique-artifacts/mobile/11-late-game-hub.png` (dots at about 160,470, 95,540, 255,505); `desktop/11-late-game-hub.png` (about 55,565); `axiomancer-mobile/components/NodeMark.tsx` locked branch (deepBg disc at `SEALED_MARK_OPACITY.disc` 0.7 under an ash, `strokeWidth` 1.4 dashed ring); the legend's glyph contract in `state/presenters/exploration.engine.ts` (~:424, "◌ SEALED — an EMPTY broken ring").
- suggested fix: let the ring carry the mark: draw it in bone (or a lighter ash) at a slightly heavier stroke over a fainter disc, so a sealed node reads as a hollow broken ring the way the legend draws it, still the smallest and faintest of the kinds. Pin the ring's stroke colour and weight in `ExplorationNode.test.tsx`.
- source: critique-drive (unattended)

### [LOW] village / rest — the Minor Healing Potion restores 10 VITAE against a 160-170 pool, a quarter of the free rest
- pass: 65 (commit a6ee8167)
- viewport: both (375x812 and 1280x800)
- category: comprehension
- observation: the staged shop sells one consumable, the Minor Healing
  Potion: "RESTORES 10 VITAE, 15 BELOW HALF" for 12 shillings. The
  combat board shows a starting pool of 160 VITAE and the rest screen
  170. That is 6% of the bar, or 9% when below half. The rest screen on
  the same pass offers "RESTORES 43 VITAE" for free. A first-time player
  comparing the two reads the potion as not worth buying. The amounts
  predate the VITAE pools. R5 kept the potion ladder but did not resize
  it.
- evidence: `.critique-artifacts/mobile/07-village.{png,txt}`,
  `mobile/04-combat-board.txt` ("♥ 160 / 160"), `mobile/09-rest.txt`
  ("VITAE 20/170", "RESTORES 43 VITAE");
  `axiomancer-mechanics/src/Items/consumable.library.ts:32-38`
  (`healAmount: 10`, `healAmountBelowHalf: 15`).
- suggested fix: resize the existing potions' `healAmount` /
  `healAmountBelowHalf` against the Act 1 VITAE pools, so the minor
  potion at least matches a rest. Pin the ratio with a test. Number
  change on existing items only, no new content. If heal magnitudes
  belong to B2's balance pass, route it there rather than tune it in
  `/iterate`.
- source: critique:drive (unattended)

### [MED] combat — the only SUMMON carrier cannot reach wave 2, so half the spawn rule is dead on the roster
- pass: burn-day audit 2026-09-19 (row 3.9)
- viewport: n/a — engine reach, not layout
- category: design-reach / coverage
- observation: Phase 102 shipped SUMMON with a two-wave rule: wave 1 at the
  first phase boundary, wave 2 only at a boundary where a STAGE fires. The
  roster's sole carrier is The Jeweled Tree, an elite. Elites get no stages
  — `defaultEnemyStages` hands its two-stage floor to bosses and uniques
  only — and the tree authors none, so it can never enter a stage, so the
  only door to wave 2 never opens. `ADD_WAVE_CAP = 2` is live engine and
  dead roster: a player can meet the brood, but never the second wave. It
  is not an engine bug; the rule is correct and tested. The tests simply
  never asked a shipped enemy.
- evidence: `axiomancer-mechanics/src/Enemy/enemy.library.ts` — `JeweledTree`
  is `difficulty: 'elite'`, `keywords: [hide 5, summon 2]`, no `stages` key;
  `Enemy/index.ts` — `stages: stages ?? defaultEnemyStages(difficulty, …)`,
  which returns `[]` for anything that is not a boss or unique;
  `Combat/combat.engine.ts` — `ADD_WAVE_CAP = 2`, and `processBetweenPhases`
  gates every wave after the first on `stageFiredNow`. Driven against the
  real library enemy over eight phase boundaries, damaged past 50% VITAE and
  undamaged, `addWavesSpawned` tops out at 1. Counterfactual, same harness:
  `RawheadRex` with SUMMON 2 reaches wave 2/2 at its `vitaePct: 0.6` stage.
  `summon` appears in no branch of `defaultEnemyKeywords` and nothing
  outside the library calls `createEnemy` in production, so no other shipped
  foe carries it. Every SUMMON suite builds its own foe:
  `Combat/e2e/summon.engine.test.ts` uses `makeEnemy({ keywords, stages })`;
  `axiomancer-mobile/state/e2e/summon-surface.engine.test.ts` retrofits
  `createMockEncounterEnemy()`.
- suggested fix: a second carrier that has `stages` — the audit's §8 Block 2
  item 2, a one-keyword retrofit on `RawheadRex` or `Mirac`, both already in
  the mid-stage matrix roster beside the tree. `RawheadRex` is the better
  data point: its `UP FROM UNDER THE STAIRS` stage grants SWIFT at the same
  boundary that would fire wave 2, so the SWIFT path row 3.2 fixed gets
  exercised on a real foe. Two gates first — row 3.2 must be in (it is), and
  the deck-matrix baseline must be re-stamped in the same tick naming both
  causes (Phase 102 risk row 8), since the trade moves a rostered mid-profile
  foe. Ship it with a guard that sweeps `EnemyLibrary` for SUMMON carriers,
  opens a real encounter, damages the foe past its stage threshold and
  asserts some carrier reaches `ADD_WAVE_CAP` — reachability only, no
  magnitudes, so retunes leave it alone. Explicitly rejected: authoring
  `stages` onto the elite carrier (it repeals the boss/unique stage floor
  for the whole roster) and loosening `stageFiredNow` to a round or
  emptiness check (the engine comment refuses the emptiness check by name —
  it makes the player's own clear cause the respawn).
- source: burn-day audit 2026-09-19

### [MED] ui-fresh-eyes SWARM 2026-09-12 — the 309-row candidate set is drained
- pass: swarm follow-up to the 2026-09-12 sweep, run from
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/2026-09-12-ui-fresh-eyes-swarm.prompt.md`
- viewport: 375x812 and 1280x800
- auth_state: fixture-booted, static preview export (no Docker in the container)
- category: meta
- observation: every one of the 309 candidate rows that sweep #301 left
  unverified now carries a disposition. The rows collapsed to 187 semantic
  clusters; 149 reached a three-lens adversarial panel; 30 findings shipped as
  `FE-029`..`FE-058`, one genuine scope wall remains open, and the rest were
  refuted, already fixed by #301, settled by an owner decision, or were capture
  harness artifacts. Two regression readers then found ten regressions the sweep
  had caused itself, and a repair fleet closed all ten. Two harness facts worth
  carrying forward: the capture driver dismisses the combat tutorial coach, so
  no screenshot shows a first-time player's first fight; and every cross-screen
  naming cluster was refuted on the ground that the competing senses never
  co-occur on one screen.
- report: `axiomancer-mobile/docs/reports/UI_FRESH_EYES_SWARM_2026-09-12.md`,
  row-by-row ledger alongside it as `.ledger.md`
- source: ultracode swarm run, 96 agents across five workflows, 0 errors

### [MED] ui-fresh-eyes sweep 2026-09-12 — 21 rows shipped, a large candidate set still open
- pass: dedicated UI fresh-eyes sweep (not a `/critique` pass — no 6-finding cap), archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/2026-09-12-ui-fresh-eyes.prompt.md adjusted for ultracode
- viewport: 375x812 and 1280x800
- auth_state: fixture-booted, static preview export (no Docker, no dev server in the container)
- category: meta
- observation: a full 27-route x 2-viewport walk plus an eight-lens observation
  fleet. Twenty-one findings were verified individually and fixed in the same
  sitting, each with a guarding test and a re-exported before/after capture —
  among them a raw float in a stat readout, engine slugs printed to the player,
  a character sheet whose grace and alignment were never wired to the state
  they read, a DERIVED table with three headers over two columns, and the six
  console errors the build has carried for several passes. Console is now clean
  at every captured cell. The sweep's own candidate set is much larger than
  what shipped and is NOT verified; the report keeps it separate on purpose.
  Full write-up, gate results, refuted rows and the deferred decisions:
  axiomancer-mobile/docs/reports/UI_FRESH_EYES_2026-09-12.md, with the raw
  candidate table beside it in the same directory.

### [LOW] mobile — combat die/card-face components accrete hex literals against the AXM-token doctrine
- pass: combat declutter residue (PR #135, 2026-07-19)
- viewport: n/a
- auth_state: n/a
- category: engineering
- observation: the package doctrine says "no hex literals (use AXM tokens)", but CombatDie's cube greys, the card face's scrim/rarity/glyph-pop colors, and HazardDie's palette all carry raw hex — the cube recut + glyph-pop pass (PR #135) extended an already-widespread pattern rather than fixing it.
- evidence: CombatDie.tsx (cube greys, rim colors), CombatBoard.tsx (READ_ACCENT, rarity colors, lighten/darken helpers), components/hazard/palette.ts.
- suggested fix: a token-hygiene pass folds the recurring combat/hazard colors into the AXM runtime palette; new code then has a token to reach for.
- source: owner session 2026-07-19 (press-fate/momentum/dice PR)

### [MED] engine hooks missing for two ratified-adjacent bridge shapes
- pass: session-closeout 2026-07-12 (commit ffadca96)
- viewport: n/a
- category: engine-gap
- observation: two ratified-adjacent bridge shapes have no engine hook:
  (1) player-side affliction-expiry → Soul (the Soul economy counts
  ENEMY afflictions only), and (2) a rungs-denied ledger for
  STAGGER → REPRISE causality. Both bridge cards were shipped
  nearest-buildable instead; the killed bridges barbed-compliment and
  interest-on-the-flesh point at the re-homes.
- evidence: session A/B report + card notes in
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-11-honest-rebaseline-and-evidence.md`.
- suggested fix: add the two hooks as small engine substrate items in
  the next engine phase, then revisit the killed bridge designs.
- source: session closeout

### [MED] UI-communication testing gap — sim evidence is text-blind
- pass: session-closeout 2026-07-12 (commit ffadca96)
- viewport: mobile
- category: process
- observation: the sim/evidence loop cannot see player-facing WORDING.
  The user caught a three-surface contradiction (keyword gloss vs
  detail modal vs card face) that no agent test covered — fixed in
  8c25374e, and this closeout fixed another (stale RUPTURE cap gloss
  in `axiomancer-mobile/state/combat/keywords.ts`), but the class is
  ungated.
- evidence: fix commit 8c25374e; the card-face-honesty guard test
  covers face formatting, not cross-surface numeric consistency.
- suggested fix: run a /deep-playtest pass post-merge focused on
  copy consistency, and add the WS9.3 "why did the enemy change
  plan?" question to the next /combat-playtest brief. Consider a
  guard test that derives every printed cap/constant gloss from the
  engine constants.
- source: user + session closeout

### [LOW] `web:container` dev-server script is broken
- pass: 1 (commit 6e23724a)
- viewport: n/a
- category: infra
- observation: `axiomancer-mobile/scripts/dev-server-container.sh`
  (`npm run web:container`) pulls Expo via `npx --yes expo start`
  inside a throwaway `node:20-alpine` container, which resolves a
  different/incompatible Expo CLI version than the repo's pinned
  one and fails immediately with `SyntaxError: Error reading Expo
  config at /app/app.config.ts: Unexpected token '{'`, exiting
  before it ever binds the port (`web:container:wait` then fails
  with "container is not running"). Worked around this pass by
  running `npx expo start --web --port 8081` directly on the host
  from `axiomancer-mobile/`, which uses the repo's already-installed
  Expo 54.0.35 and bundles cleanly.
- evidence: container log —
  `SyntaxError: Error reading Expo config at /app/app.config.ts`.
- suggested fix: pin the container's Expo CLI to the repo's
  installed version (e.g. run `node_modules/.bin/expo` from the
  mounted repo instead of `npx --yes expo`), or drop the container
  path in favor of the host-run command until fixed.
- source: critique pass 1

> Seeded 2026-07-03 from the retired `/archive` critique history —
> only the recurring *patterns* were carried; stale one-off rows
> were dropped. Each maps to category `external-critique`.

### [LOW] aftermath — the parley "Heart Opens" reward panel is a pixel-art heart, style outlier
- pass: session-critic 2026-08-31 (Phase V8 closure `/critic-loop`
  screenshot pass, `axiomancer-mobile/screenshots/audit-2026-06/after/27-aftermath-parley.png`)
- viewport: 390x844 (audit-capture rig)
- category: visual / aesthetic cohesion
- observation: the "an accord" heart art is a chunky 16-bit pixel-art
  sprite, sharply out of style against the ink-woodcut/engraving art
  every other screen uses — reads as a placeholder that never got
  swapped when the Woodcut Codex direction landed.
- suggested fix: replace with a woodcut-style bleeding/sacred-heart
  illustration matching the engraving direction (candidate for a
  `/forge` art tick or the V-sequence's PixelEmblem carve-out review —
  confirm whether this is the intentional PixelEmblem exception before
  swapping).
- source: loop

## Done

### [x] [LOW] /cache / determinism — the card offer is rolled from `Math.random`, not the cache seed, so the same fixture offered A Plain Ward at 375 and A Plain Word at 1280 — RESOLVED 2026-10-30 (branch loop/iterate-cache-card-seed, 789abec5e: the card draws from `cacheCardRng(seed)`, a mulberry32 stream of the cache seed offset from the goods' stream, so one seed reproduces the whole cache; pinned in `cache.flow.engine.test.ts`)
- pass: 109 (commit 1250f1d9)
- viewport: mobile (375x812) and desktop (1280x800)
- category: infra
- observation: both viewports booted `apprentice-bw-cache` with the same seed and drew the same goods, but TAKE A CARD offered a different card in each. `beginLootCacheChoiceAction` resolves a cache seed and rolls the goods from it, then rolls the card with `rollCombatCardRewards(player, Math.random, 1)`. A cache is not reproducible from its seed, a mobile/desktop or pass-to-pass comparison of `/cache` is not like for like (the pass-100 hazard row, again), and a test cannot pin the card the screen shows.
- evidence: `axiomancer-mobile/state/cache/store-actions.ts:72` (`Math.random`) beside :67 (`resolveMinigameSeed('cache', ...)`) and :71 (`rollCacheReward({ seed })`); `.critique-artifacts/mobile/12-cache.png` (A PLAIN WARD, GUARD 5) against `desktop/12-cache.png` (A PLAIN WORD, VULNERABLE +25%).
- suggested fix: draw the card from a PRNG built from the cache seed (the mulberry32 `cache-reward.ts` already uses, offset so it does not share the goods' stream), and pin "same seed, same card" in the cache store-actions test.
- source: critique:drive (unattended)
- issue: #1092

### [x] [LOW] satchel / desktop — a lone item tile is a 390px-wide black well with a 28px glyph in the middle, so the Healing Potion reads as an empty box — RESOLVED 2026-10-29 (branch loop/iterate-satchel-tile-width, 760c8bb05: a collapsed tile caps at `ITEM_CARD_MAX_WIDTH` 140, so a wide window packs more tiles per row and phones are unchanged; an expanded tile still takes the full row; pinned in `ItemCard.test.tsx`)
- pass: 108 (commit 850ce863)
- viewport: desktop (1280x800); on a phone the tile is ~100px and reads fine
- category: visual
- observation: under PHIALS & SOPS the only item, Healing Potion x6, draws as a tile 31.5% of the panel wide (~390px) with a 50px-high black glyph well; the vial glyph is a thin sliver at its centre, so at a glance the tile looks like a blank placeholder with a name under it. The tile width is a percentage, so it grows with the window while the glyph stays 28px.
- evidence: `.critique-artifacts/desktop/13-satchel.png` (y~585-675) against `mobile/13-satchel.png`; `axiomancer-mobile/components/inventory/ItemCard.tsx:50` (`size={28}`), `:355` (`width: '31.5%'`), `:363-364` (well `height: 50`).
- suggested fix: cap the item tile's width (a `maxWidth` near the phone width, ~140) so the grid packs more tiles per row on a wide window instead of stretching each one; presentation only, pinned in the ItemCard test.
- source: critique:drive (unattended)
- issue: #1047

### [x] [LOW] play log / fight recorder — the opening hand never reaches the fight's event stream — RESOLVED 2026-10-28 (branch loop/iterate-opening-hand-drawn, 13312468d: the recorder stamps the first observed state's hand as one `hand-drawn` ahead of the engine's events, so card-usage counts it as drawn at turn end 0; no engine or contract change; pinned in `fightRecorder.test.ts`)
- pass: ship-a-phase BE2f (PR #877)
- viewport: n/a
- category: infra
- observation: `initializeCombatEncounter` deals the opening hand without a `hand-drawn` event (the engine's only `hand-drawn` emitters are the between-phase refill and a draw effect), and `lib/fightRecorder.ts` stamps log entries only. So `npm run api -- card-usage` counts `drawn` from turn end 1 onward, and a card played from the opening hand looks like a play with no draw. The report header and `docs/dev-tools.md` state the caveat, but the draw counts for a short fight are mostly missing.
- evidence: `axiomancer-mechanics/src/Combat/combat.engine.ts` (`initializeCombatEncounter`, `log: []`); `axiomancer-mobile/lib/fightRecorder.ts` `observe`; `backend/src/reports.ts` header.
- suggested fix: have the recorder push one stamped `hand-drawn` event with the first observed state's hand (`state.hand.map(h => h.cardId)`, adding `hand` to `ObservedFight`) at `ms` 0, so no engine or contract change is needed; the held formula already treats it as a draw at turn end 0.
- source: ship-a-phase BE2f
- issue: #1044

### [x] [LOW] combat preview — WITHDRAW's "forfeit the path" line prints at 8.5px in `AXM.ash`, about 1.95:1 against the page — RESOLVED 2026-10-28 (branch loop/iterate-withdraw-sub-contrast, d420c2e30: `withdrawSub` draws in `AXM.bone` at 10px under the 12px WITHDRAW label; pinned in CombatEncounterPanel.withdraw-sub.test.ts)
- pass: 101 (commit 83975010)
- viewport: mobile (375x812) and desktop (1280x800)
- category: a11y
- observation: on the Float-Eye preview the WITHDRAW button's sub-line "FORFEIT THE PATH" is the only text that says what withdrawing costs, and it is the faintest text on the screen: barely legible in both captures. `withdrawSub` sets `fontSize: 8.5` and `color: AXM.ash` (`#46403a` in Ashen Gold), which measures 1.95:1 against the `#0b0a09` page (WCAG asks 4.5:1 for small text). The WITHDRAW label above it uses `AXM.bone`.
- evidence: `.critique-artifacts/mobile/03-combat.png` and `desktop/03-combat.png` (below ENTER COMBAT); `axiomancer-mobile/components/combat/encounter/CombatEncounterPanel.tsx:811` and `:1375` `withdrawSub`.
- suggested fix: draw the sub-line in `AXM.bone` at a size of at least 10, keeping it dimmer than WITHDRAW by opacity or weight, not by the ash token; presentation only, pinned in the panel's existing test.
- source: critique:drive (unattended)
- issue: #1038

### [x] [LOW] /cache — TAKE THE GOODS says only "whatever's inside", while TAKE A CARD prints the exact card, so the one irreversible choice weighs a known card against a blind box — RESOLVED 2026-10-28 (branch loop/iterate-cache-goods-reveal, 1273ff68: the goods offer prints its rolled items and shillings as the outcome ledger's chips and names them in its accessibility label; loop-call, the reveal over "sight unseen" copy; pinned in `cache.engine.test.ts` and `cache-card-preview.screen.test.tsx`)
- pass: 108 (commit 850ce863)
- viewport: both (375x812, 1280x800)
- category: comprehension
- observation: the intro warns "Pick one — there is no walking back out." The card offer shows its rolled card face (A Plain Word, RW1b); the goods offer shows "WHATEVER'S INSIDE, PLUS WHAT IT'S WORTH." and nothing else, though the session already holds the rolled items and the shilling sum (`itemCandidates`, `currencyCandidate`) before the player picks. A first-time player cannot tell whether the goods are a potion and 10 shillings or a relic and 60, so the choice is a guess. RW1b's brief left TAKE THE GOODS unchanged; it did not rule the goods must stay hidden.
- evidence: `.critique-artifacts/mobile/12-cache.png`, `desktop/12-cache.png`; `axiomancer-mobile/state/presenters/cache.copy.ts:19`; `axiomancer-mechanics/src/World/LootCacheChoice/lootcachechoice.types.ts:40-43` (candidates rolled before the choice); `plan/phases/phase_RW1_reward_rule.md:78`.
- suggested fix: print the rolled goods under the goods offer as chips, reusing the outcome's `cacheOutcomeItemChip` and `cacheOutcomeCurrencyChip` (e.g. "+ HEALING POTION · +10 SHILLINGS"), and add them to its accessibility label; presentation only. If the blind box is meant, the loop leaves the reveal alone and instead makes the copy say so ("sight unseen"), which is T's copy call.
- source: critique:drive (unattended)
- issue: #1041

### [x] [MED] /cache / desktop — the choice column runs the full 1280 width, so both offers are 1250px bars with the card and its text crowded at the left edge — RESOLVED 2026-10-28 (branch loop/iterate-cache-column, db76f4dc7: the cache content sits in a column capped at `CACHE_COLUMN_MAX_WIDTH = 520` and centred, as rest and quest do; pinned in `rest-village-column.critique-71.test.tsx`)
- pass: 108 (commit 850ce863)
- viewport: desktop (1280x800); mobile unaffected
- category: visual
- observation: on the loot cache at 1280 the TAKE A CARD and TAKE THE GOODS buttons stretch from x=14 to x=1266. The card face and "TAKE A CARD / ONE CARD, STRAIGHT INTO THE DECK." sit in the first ~370px, leaving ~880px of empty gold-bordered box, and the eyebrow, title and intro hug the left edge too. The sibling one-choice screens centre a capped column: `/rest` and `/quest` both cap at 520 (this pass's `desktop/14-quest.png` shows the column centred over the art), so the cache is the one node screen that reads as an unstyled stretch.
- evidence: `.critique-artifacts/desktop/12-cache.png` against `desktop/14-quest.png` and `desktop/09-rest.png`; `axiomancer-mobile/app/cache/index.tsx:160` `scroll` (no column, no `maxWidth`); `app/rest/index.tsx:228,235` `REST_COLUMN_MAX_WIDTH = 520` and `app/quest/index.tsx:185,190`.
- suggested fix: wrap the cache's content in a `column` style `{ width: '100%', maxWidth: CACHE_COLUMN_MAX_WIDTH, alignSelf: 'center' }` with `CACHE_COLUMN_MAX_WIDTH = 520`, as rest and quest do; presentation only, pinned by the cache screen test reading the exported constant.
- source: critique:drive (unattended)
- issue: #1034

### [x] [MED] hazard / village / forge / deck — the barred gothic zero still prints in about a dozen numeric styles, so the hazard ladder reads "RI 28" for a threshold of 20 — RESOLVED 2026-10-28 (branch loop/iterate-gothic-figures, 9be8fceb: the 18 figure styles the guard names (the ladder, stall price, forge budget, DECK and hazard-deck stats and tallies, character-select and SELF stats and level, the hazard flash stat, the pilgrim conviction and stats, the satchel purse, the puzzle clock, the level-up number, the labyrinth room number) and the SACRIFICE floor tag print in FONTS.sans; names and titles stay gothic; `theme/__tests__/no-gothic-figures.test.ts` fails on any figure-named style in app/ or components/ that sets FONTS.gothic)
- pass: 106 (commit 4edd5433)
- viewport: both (375x812, 1280x800)
- category: comprehension
- observation: #1005 moved the CONVICTION chip, the rest PURSE and the hazard card FORCE/ESCAPE values to `FONTS.sans`, and those three now read correctly. The same Pirata One zero still prints wherever another style puts a number in `FONTS.gothic`. In this pass's captures the Ledge Crawl ladder's first cell reads "RI 28" for a threshold of 20 when enlarged, beside "RII 23" and "RIII 25". The other styles are off the critique set but print live figures: a 10, 20 or 30-shilling stall price reads 18, 28 or 38, and a forge budget of 200 reads 288.
- evidence: enlarged crop of `.critique-artifacts/desktop/10-hazard.png` (the Ledge Crawl PASS row, y~460-484); `components/hazard/RouteSelect.tsx:315` `ladderValue`; other numeric styles still in `FONTS.gothic`: `app/village/index.tsx:336` `warePrice`, `app/blacksmith/index.tsx:416` `budgetValue`, `app/(tabs)/deck/index.tsx:177,192` `statValue`/`tallyValue`, `app/hazard-deck/index.tsx:221,228`, `app/character-select/index.tsx:272` `statValue`, `app/(tabs)/character/index.tsx:329,343` `levelText`/`baseStatValue`, `components/hazard/HazardOverlays.tsx:310` `flashStatValue`, `components/combat/encounter/CombatEncounterPanel.tsx:1389,1392` `pilgrimConviction`/`pilgrimStatVal`.
- suggested fix: move each style that prints a number to `FONTS.sans`, leaving names and titles in the gothic face as #1005 did. Then guard it so a fourth spot-fix is not needed: a lint test over `app/` and `components/` that fails when a style named for a figure (`*Value`, `*Price`, `*Stat*`, `level*`, `*Budget*`, `*Count`, ...) uses `FONTS.gothic`, or a shared `TYPE.figure` token used by every one of them.
- source: critique:drive (unattended)
- issue: #1036

### [x] [HIGH] ci / critique-drive — `/cache`, the satchel, `/quest` and `/death-return` are not in the critique set, so four passes of shipped surfaces went unseen — RESOLVED 2026-10-28 (branch loop/iterate-critique-drive-new-routes, cf5957ead: `cache` and `quest` boot their arrival fixtures and wait for the gate's push, `satchel` opens `/inventory` on `sage-bw-door-gate`, `death-return` opens the `?preview=1` dev view through a new `devTools` flag; the mobile drive captured all 15 screens with no errors; pinned in critique-drive.test.mjs. No preset wears a relic and no fixture boots a dying board, so the relic icons and the DY1d skull wait on fixtures: AUDIT row filed)
- pass: 103 (commit 79ecad63); raised LOW to MED at pass 105 (commit 02372412); raised MED to HIGH at pass 107 (commit bf5bae72)
- viewport: n/a (both)
- category: navigation
- observation: RW1b (#947) changed the loot cache's card offer to print a `CombatCardFace` beside the label, the only player-facing diff since pass 102, but the drive's 11 screens never reach `/cache`. The registry already holds `apprentice-bw-cache` (`arrive` starts the cache session and pushes `/cache`), and the drive's own header names `/cache` among the gated routes, yet no `SCREENS` entry uses it.
- evidence: `axiomancer-mobile/scripts/critique-drive.mjs` SCREENS (fixtures at lines 193-242, none for the cache); `axiomancer-mechanics/src/Game/fixtures/state-fixture.registry.ts:95` `apprentice-bw-cache`; `axiomancer-mobile/app/cache/index.tsx` (RW1b).
- pass 105: IT1b (#989) gave the relics T's icons with colour accents (`components/icons/item-glyphs.ts`, `components/inventory/ItemCard.tsx`); they draw only on the satchel tab (`app/(tabs)/inventory`), which no SCREENS entry opens, so a second shipped surface went unseen in two passes.
- pass 107: QL1c (#1023) shipped `/quest` (`app/quest/index.tsx`, pushed by `components/QuestGate.tsx`) and DY1b (#1018) shipped `/death-return` (`app/death-return/index.tsx`); DY1d (#1022) added the dying skull to the combat panes. The registry already holds `apprentice-staged-quest` (`state-fixture.registry.ts:86`, `arrive` pushes `/quest`) and the death screen has a `?preview=1` dev view, but no SCREENS entry opens either, and no fixture boots a dying board.
- suggested fix: add a `cache` screen entry booting `apprentice-bw-cache` with `waitForPath: '/cache'` (its seed is already shared through `openScreenContext`), and pin it in `critique-drive.test.mjs`; if that fixture's offers hold no card, note it so the face is judged on the next pass that rolls one. Add a `satchel` entry the same way: boot a fixture whose inventory holds at least one relic (or add one to the registry, which is an AUDIT row, not drive code) and open the inventory tab. Add `quest` (fixture `apprentice-staged-quest`, `waitForPath: '/quest'`) and `death-return` (path `/death-return?preview=1`) entries the same way; a dying-board fixture for the skull is an AUDIT row, not drive code.
- source: critique:drive (unattended)
- issue: #1032

### [x] [MED] combat / rest / hazard — the display face's zero reads as an 8, so a fresh fight shows "◆ 8 CONVICTION" and an empty purse shows "8" — RESOLVED 2026-10-28 (branch loop/iterate-open-zero-numerals, 0992025c2: the conviction chip, the rest PURSE figure and the hazard FORCE/ESCAPE values print in `FONTS.sans`; names and titles keep the gothic face; each pinned in its component test)
- pass: 104 (commit f7f5530f)
- viewport: mobile (375x812) and desktop (1280x800)
- category: comprehension
- observation: Pirata One (`FONTS.gothic`) draws 0 as a narrow slab with a bar through it; at 15-17px it is the same silhouette as its 8. Three readouts print a live number in it: the CONVICTION chip on the combat board (0 at the start of every fight), the rest screen's PURSE figure (0 in the `apprentice-bw-rest` fixture, beside "VITAE 20/170" in Bebas, which reads correctly), and the FORCE/ESCAPE values on hazard cards (Cliffrunner and Scramble print 0 FORCE). A first-time player reads "8 conviction" and "8 shillings" and plans on both.
- evidence: zoomed crops of `mobile/04-combat-board.png` (the ◆ chip, top left) and `mobile/09-rest.png` (PURSE) show the slab glyph while the DOM text is "◆ 0" and "PURSE 0"; `mobile/10-hazard.png` Cliffrunner's FORCE cells. Sources: `components/combat/encounter/CombatBoard.tsx:2140` `convictionText`, `app/rest/index.tsx:261` `purseValue`, `components/hazard/HazardCard.tsx:117` value text, all `FONTS.gothic`.
- suggested fix: print numerals in a face with an open zero (`FONTS.sans` Bebas, as VITAE and the shilling labels already do) for these three readouts, keeping the gothic face for names and titles; pin the font choice in each component's existing test.
- source: critique:drive (unattended)
- issue: #1004

### [x] [LOW] general — AccessoryKind union must open when accessory flavors grow — RESOLVED 2026-10-26 (phase EQ2a, branch loop/ship-EQ2a-relic-slot: the union and `Equipment.accessoryKind` are deleted; the slot is `relic`, a relic is named anything and fits any relic position, and the v38 -> v39 hop drops the kind from old saves)
- pass: user-jot (commit 4e045d05)
- viewport: unspecified
- auth_state: anonymous
- category: content
- observation: Equipment model confirmed with owner (2026-07-18): 5 worn slots (1 weapon / 1 armor / 3 accessories), accessories are flavor-free mechanically — but AccessoryKind in axiomancer-mechanics/src/Items/types.ts is a CLOSED union (`head|hands|feet|amulet|ring|charm`) that pure flavor must register in. Owner intent: accessories can be literally anything (a cape, etc.). When new accessory content lands, extending the union is a one-word additive change, no migration, nothing reads the kind. Not blocking anything today.
- evidence: user-spotted at 2026-07-18T19:40:08Z
- suggested fix: [user has not specified — iterate to determine]
- source: user

### [x] [LOW] ci / critique-drive — the hazard capture is unseeded, so the two viewports (and two passes) play different hazards — RESOLVED 2026-10-25 (branch loop/iterate-critique-hazard-seed, db0dc4f6: every screen context opens through `openScreenContext`, which injects `minigame-seed-injector.mjs`'s shared seeds, so hazard, rest and cache resolve one seed at both viewports and across passes; pinned in critique-drive.test.mjs)
- pass: 100 (commit ee9c5b83)
- issue: #915
- viewport: both
- category: infra
- observation: the `l30-bw-hazard-arrive` fixture carries a seed, but the hazard minigame resolves its own seed through `resolveMinigameSeed`, which falls back to `Date.now() ^ Math.random()` when no `__AXM_MINIGAME_SEEDS__` global is set. `critique:drive` sets none, so this pass captured The Famine March at 375 and Flooded Undercroft at 1280, with different hands. A mobile/desktop comparison, or a before/after across passes, is not like for like.
- evidence: `.critique-artifacts/mobile/10-hazard.txt` against `desktop/10-hazard.png`; `axiomancer-mobile/state/minigame-seeds.ts` `fallbackMinigameSeed`; `axiomancer-mobile/scripts/critique-drive.mjs` hazard entry (no seed); `scripts/minigame-seed-injector.mjs` already exists for `hazard-e2e`.
- suggested fix: have the hazard entry in `critique-drive.mjs` inject a fixed hazard seed with the existing `minigame-seed-injector.mjs` before navigation; pin it in critique-drive.test.mjs.
- source: critique:drive (unattended)

### [x] [LOW] rest / cache — "The node is spent the moment you stopped here" mixes present and past tense — RESOLVED 2026-10-25 (branch loop/iterate-rest-tense, 55b5aaa9: both copy files read "the moment you stop here"; no test pinned the string)
- pass: 89 (commit 2927472f)
- issue: #911
- viewport: both (375x812 and 1280x800)
- category: voice
- observation: the italic line above the two rest offers reads "The node is spent the moment you stopped here. Pick one — there is no walking back out." "is spent" and "Pick one" are present tense, but "you stopped" is past, so the sentence reads as a slip in an otherwise careful voice. The treasure cache carries the same line.
- evidence: `.critique-artifacts/mobile/09-rest.txt`, `desktop/09-rest.png` (fixture `apprentice-bw-rest`); `axiomancer-mobile/state/presenters/rest.copy.ts:12`, `cache.copy.ts:10`.
- suggested fix: "The node is spent the moment you stop here." in both copy files (and any test that pins the string); copy only, no rule change.
- source: critique:drive (unattended)

### [x] [LOW] hazard / mobile — the route-select top strip ellipsizes to "NO RETREAT — CHOOSE TO PROC…", cutting the instruction's verb — RESOLVED 2026-10-25 (branch loop/iterate-hazard-strip-fit, e574fe7d: the middle segment's letter spacing is fitted to the width by `topStripMidSpacing`, 2 at 414 and up, 1.2 at 375, floor 0.5; copy unchanged; pinned in RouteSelect.test.tsx)
- pass: 100 (commit ee9c5b83)
- issue: #900
- viewport: mobile (375x812)
- category: voice
- observation: since d63cf279 the middle segment of the hazard strip shrinks to one ellipsized line. At 375 wide it reads "NO RETREAT — CHOOSE TO PROC…", so the one line that tells the player what to do loses its last word. Desktop prints it whole.
- evidence: `.critique-artifacts/mobile/10-hazard.png` (top strip); `axiomancer-mobile/components/hazard/RouteSelect.tsx:177`.
- suggested fix: tighten the strip's letter spacing at narrow widths or shorten the copy so it fits at 375 (for example "NO RETREAT — CHOOSE A ROUTE"); pin the fit in RouteSelect.test.tsx.
- source: critique:drive (unattended)

### [x] [HIGH] ci / critique-drive — captures are taken mid-fade since VE1b: the onboarding menu and the hazard routes never show — RESOLVED 2026-10-25 (branch loop/iterate-critique-drive-settle, 70877f90: onboarding settles on `menuSettled` (the title menu opaque), hazard on `entranceSettled` (no finite CSS animation under the route select on two polls in a row), and the hub boots `fresh-start` and passes the omen and the first-waypoint ring instead of bouncing to the title; checked by eye at both viewports; pinned in critique-drive.test.mjs)
- pass: 98 (commit f8058ad6); raised MED to HIGH at pass 99 (commit 02f94d07)
- issue: #896
- viewport: both (375x812 and 1280x800)
- category: infra
- observation: VE1b replaced `captureScreen`'s fixed `waitForTimeout(700)` with `waitForReady`. The ready flag is set once at boot, when the fonts settle, so on the onboarding entry it is already true when EMBARK is clicked; the shot lands two frames after the click. Both `02-onboarding.png` captures show the title plate still up and the THE CHRONICLE / NEW GAME / LOAD GAME / SETTINGS menu faint beneath it, while `02-onboarding.txt` lists every menu line. The critique lens on the new-player menu is blind until this is fixed. The unfixtured `05-exploration-hub` capture now lands on the boot splash for the same reason. Pass 99: the hazard route select is caught mid-stagger too. `RouteSelect.tsx` fades the hand in at `220 + i * 70`ms and the routes at `320 + i * 120`ms (320ms each), so at both viewports the right-hand hand cards and the whole risk route (THE LEAP, THE DROWNED DOOR) are still ghosted. The lens is now blind on three of the eleven screens, and the hazard screen is where the HP4 puzzle work is about to land.
- evidence: `.critique-artifacts/{mobile,desktop}/02-onboarding.png` against `.txt`, and `{mobile,desktop}/10-hazard.png` (risk route and right-hand fan cards faded) against `10-hazard.txt` (every route line present); `axiomancer-mobile/scripts/critique-drive.mjs` onboarding `prepare` (click, no settle) and `captureScreen` (`waitForReady` in place of the 700ms wait); `scripts/lib/page-ready.mjs`.
- suggested fix: give the onboarding entry a `settle` that waits for the menu to be opaque (the `titleSettled` pattern, keyed on a menu testID such as the NEW GAME row), and the hazard entry one that waits for the last route card's entering animation to finish (or a short post-ready settle on every fixtured screen), rather than restoring a blind sleep.
- source: critique:drive (unattended)

### [x] [LOW] combat / rune column — the CONVICTION caption under the ◆ chip is 6px text that ignores the system font size — RESOLVED 2026-10-18 (branch loop/iterate-conviction-caption, 7debe9d9: the caption is 9px on an 11pt line with font scaling on; the chip is 38pt and five runes still clear the tray at 375x812; pinned in CombatBoard.sig-column.test.tsx)
- pass: 93 (commit 1a0e7b58)
- issue: #617
- viewport: both (375x812 and 1280x800)
- category: a11y
- observation: the word that names the game's spell economy prints at `fontSize: 6` with `allowFontScaling={false}`, so in both board captures it is a smudge under "◆ 0" rather than a word, and a player who has raised the system text size gets no larger. The HUD meta line had the same shape (9px, scaling off) and was raised to 11px with scaling on (Done, 2026-10-15).
- evidence: `.critique-artifacts/mobile/04-combat-board.png`, `desktop/04-combat-board.png` (left rail, under the ◆ chip); `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:2041` (`convictionCaption`), `:282`.
- suggested fix: raise the caption to the board's smallest legible size (9-10px) with font scaling on, letting the chip widen; re-check `signatureColumnHeight` keeps the column clear of the dice tray at 375; pin the size in the board test.
- source: critique:drive (unattended)

### [x] [LOW] cutscene / desktop — the omen plate still tells a mouse player "· tap ·", the remainder of the pass-92 pointer row — RESOLVED 2026-10-18 (branch loop/iterate-cutscene-pointer-verbs, 60a241b3: the plate hint moves to CUTSCENE_HINT in the event presenter and reads "· continue ·" / "· walk on ·"; the dock hint and the here-node tooltip say "choose"; pinned in cutscene-skip.S4-world-C17.test.tsx)
- pass: 93 (commit 1a0e7b58)
- viewport: desktop (1280x800); mobile reads correctly
- category: voice
- observation: #604 moved the hub drawer, the hazard hand and the rewards subtitle to "choose", but the cutscene plate under the omen line still reads "· tap ·" (and "· tap to walk on ·" on the last line) at 1280 under a mouse. The same visible "tap" survives in the satchel dock hint ("TAP A SLOT TO SEE WHAT ELSE FITS") and the map's here-node tooltip ("tap an adjacent node to step toward it"), neither in the drive's screen set. The cutscene string is also inline in the screen, not a presenter.
- evidence: `.critique-artifacts/desktop/08-cutscene.txt` ("· tap ·"; fixture `wanderer-staged-cutscene`); `axiomancer-mobile/app/cutscene/index.tsx:152`, `state/presenters/inventory.engine.ts:292`, `state/presenters/tooltip.engine.ts:199`.
- suggested fix: lift the cutscene hint into a presenter constant and use a pointer-neutral verb ("· continue ·" / "· walk on ·"), and do the same for the dock hint ("CHOOSE A SLOT ...") and the tooltip ("choose an adjacent node"), as #604 did; copy only, pinned by the screens' existing tests.
- source: critique:drive (unattended)
- issue: #620

### [x] [LOW] combat / IN PLAY row — two copies of one Global give two chips with the same accessibility label — RESOLVED 2026-10-18 (branch loop/iterate-global-copy-label, d65ef6950: `globalsVM` names the copy, "copy 2 of 2", when one Global is in play more than once; a single copy keeps its label; pinned in CombatBoard.program-cards.test.tsx)
- pass: antagonist on PR #520 (GS1, commit fc4aa159)
- viewport: n/a (screen reader)
- category: accessibility
- observation: GS1 lets copies of a Global stack, and the chips are keyed by instance. Each chip's label is still `<name>, a Global in play for N more turn starts. Tap to read it.`, so two FREE copies played the same turn are announced the same way and a screen-reader user cannot tell there are two.
- evidence: `globalsVM` in `axiomancer-mobile/state/presenters/combat-encounter.engine.ts`; the GS1 jest case renders two chips with the same `a11y`.
- suggested fix: when more than one instance of a card is in play, name the count in the label (for example "copy 2 of 2"); terse, presenter-only.
- source: antagonist, PR #520
- issue: #615

### [x] [LOW] title / desktop — the menu rows (520px) overhang the 464px title plate, and the plate reads as a lit strip in a black field — RESOLVED 2026-10-18 (branch loop/iterate-title-menu-plate, 529c70a5: `titleLayout` returns a `menu` band equal to the plate's and TitleScreen hosts the menu in it, so the rows sit within the art on a wide window; a phone keeps the full width; pinned in title.engine.test.ts and TitleScreen.test.tsx)
- pass: 79 (commit f2065459)
- viewport: desktop (1280x800)
- category: visual
- observation: on a wide window `titleLayout` caps the plate at `height * 0.72 * PLATE_ASPECT` (464px at 800 tall), centred with feathered sides. The menu column under it is `MENU_COLUMN_MAX_WIDTH` 520, so NEW GAME, LOAD GAME and SETTINGS stick out about 28px past the art on each side, and the menu sits on flat black below the plate's foot. About two thirds of the screen is unbroken black around a narrow grey band.
- evidence: `.critique-artifacts/desktop/02-onboarding.png` (rows 380-900, plate ~408-872); `01-title.png` (the band)
- suggested fix: on a wide window, cap the embedded menu column at `min(MENU_COLUMN_MAX_WIDTH, layout.plate.width)` so the rows sit within the art (one value passed from TitleScreen to MainMenu's embedded mode); phone layout unchanged.
- source: critique-drive (unattended)
- issue: #613

### [x] [LOW] combat / footer dock — VITAE is announced twice, by the readout and by the bar — RESOLVED 2026-10-18 (branch loop/iterate-vitae-double-announce, 9d8fda0a: the text readout is hidden from the reader, the progressbar keeps the label and its value; pinned in CombatBoard.playtest-2026-09-04.test.tsx)
- pass: antagonist on PR #529 (commit ce44dd8f)
- viewport: n/a (screen reader)
- category: accessibility
- observation: `combat-rail-vitae` and the `progressbar` `combat-rail-vitae-bar` both carry `VITAE <hp> of <max>`, so swiping the dock reads the same line twice in a row.
- evidence: `axiomancer-mobile/components/combat/encounter/CombatFooterDock.tsx` (`VitaeBar`, the `vitaeText` label).
- suggested fix: keep the label on the progressbar (it also carries `accessibilityValue`) and hide the text readout from the reader (`importantForAccessibility="no"` / `accessibilityElementsHidden`), or the reverse.
- source: antagonist, PR #529
- issue: #611

### [x] [LOW] critique / transport — the mobile viewport emulates a mouse, so phone captures show the desktop map gesture line — RESOLVED 2026-10-17 (branch loop/iterate-critique-touch-context, 2fe330ad: `contextOptions(viewport)` gives the mobile context `hasTouch` and `isMobile`, desktop keeps the mouse; pinned in critique-drive.test.mjs; the mobile hub capture now reads "drag · pinch")
- pass: 92 (commit c49902c7)
- viewport: mobile (375x812)
- category: infra
- observation: since #598 the map's gesture line follows `(pointer: fine)`. `critique:drive` opens every context with `hasTouch: false` and no `isMobile`, so headless Chromium reports a fine pointer at 375x812 and the mobile late-game hub capture reads "drag · scroll to zoom", a line no phone shows. Every later pointer-dependent copy or layout will be mis-captured the same way, and a pass reading the mobile screenshot would either file a false finding or miss a real one.
- evidence: `.critique-artifacts/mobile/11-late-game-hub.png` and `.txt` ("drag · scroll to zoom"); `axiomancer-mobile/scripts/critique-drive.mjs` `driveViewport` (`browser.newContext({ viewport: dims, hasTouch: false })`); `detectMapPointer()` in `components/exploration/MapOverlays.tsx`.
- suggested fix: give the mobile entry in `VIEWPORTS` `hasTouch: true, isMobile: true` and pass them to `newContext` (desktop keeps the mouse); check the two scripted clicks (`Embark`, `combat-enter`) still land, and pin the context options in `critique-drive.test.mjs`. Tooling only, no game change.
- source: critique:drive (unattended)
- issue: #605

### [x] [LOW] desktop — the hub drawer and the hazard hand still tell a mouse player to "tap" — RESOLVED 2026-10-17 (branch loop/iterate-pointer-neutral-verbs, c6daa798: "choose" in the drawer line, `HAZARD_HAND_LABEL` in the hazard presenter, and the combat rewards subtitle; pinned in RouteSelect.test.tsx and exploration.engine.test.ts)
- pass: 92 (commit c49902c7)
- viewport: desktop (1280x800)
- category: voice
- observation: #598 taught the chart's gesture line which pointer it is talking to, but the lines beside it did not follow. On desktop the hub drawer under the chart reads "every path beside trodden ground stays open — tap a glowing node to travel." and the hazard hand header reads "YOUR HAND — TAP A CARD TO READ IT, OR CHOOSE YOUR ROUTE BELOW", one line below a chart that now says "scroll to zoom". A mouse player clicks; the screen speaks to two devices at once.
- evidence: `.critique-artifacts/desktop/11-late-game-hub.png` (drawer line under "drag · scroll to zoom"), `desktop/10-hazard.png` (hand header); `DRAWER_COPY.emptyMessage` in `axiomancer-mobile/state/presenters/exploration.engine.ts`; the hazard hand header is hardcoded at `axiomancer-mobile/components/hazard/RouteSelect.tsx:190`, against the package rule that player-facing copy lives outside components.
- suggested fix: use pointer-neutral verbs ("choose a glowing node to travel", "choose a card to read it") in both strings (moving the hazard one into its presenter copy) and any test that pins them; copy only, no rule change. (Picking "tap"/"click" off `MapPointer` is the heavier alternative.)
- source: critique:drive (unattended)
- issue: #603

### [x] [LOW] exploration hub / tooling — the level-15 Sage fixture shows 680 VITAE, twice what a level-15 pilgrim can now reach — RESOLVED 2026-10-17 (branch loop/iterate-preset-stat-curve, 428a91a2: every preset holds exactly 15 + (level - 1) x `STAT_POINTS_PER_LEVEL`, spread in the old proportions; Sage is 8/11/10; pinned by presets.engine.test.ts "stat curve")
- pass: 90 (commit 6b5e2b6d)
- viewport: both (375x812 and 1280x800)
- category: comprehension
- observation: the late-game hub (fixture `sage-bw-door-gate`) heads the screen "Sage · LVL 15 · PILGRIM", VITAE 680/680. Since LV1 a level gives 1 stat point (`STAT_POINTS_PER_LEVEL = 1`), so a level-15 pilgrim holds 15 + 14 = 29 points; every point in BODY gives at most 50 + 19x12 + 5x6 + 5x6 = 338 VITAE. The Sage preset carries 75 points (heart 20, body 30, mind 25). The other level presets miss the curve too: `kid-l15` 38 points (reachable 29), `kid-l30` 78 (44), `kid-l50` 126 (64), and `wanderer` at L8 holds 13, fewer than the 15 a fresh L1 starts with. Every late-game critique pass, and any sim or e2e that boots these presets (`PRESET=sage`), reads numbers no player sees.
- evidence: `.critique-artifacts/{mobile,desktop}/11-late-game-hub.png` and `.txt` ("LVL 15 · PILGRIM", "680/680"); `axiomancer-mechanics/src/Character/presets.ts:83-198`; `calculateMaxHealth` in `src/Utils/index.ts:143`; `STAT_POINTS_PER_LEVEL` in `src/Game/game-mechanics.constants.ts:49`.
- suggested fix: set each level preset's `baseStats` to a reachable spread, start stats plus (level - 1) x `STAT_POINTS_PER_LEVEL`, and add a guard test that no preset's stat total exceeds what its level can bank. Dev presets only, no player rule changes; label `review:rules-change` anyway, since sims and e2e read these numbers.
- source: critique:drive (unattended)
- issue: #599

### [x] [LOW] exploration / map — on desktop the gesture line still says "drag · pinch", but a mouse zooms with the wheel since #590 — RESOLVED 2026-10-16 (branch loop/iterate-map-gesture-line, 41a733aa: `MAP_GESTURE_LINE` in the exploration presenter; MapOverlays reads "drag · scroll to zoom" for a fine pointer on web, "drag · pinch" otherwise; pinned in MapOverlays.test.tsx)
- pass: 91 (commit ef1d1dd3)
- viewport: desktop (1280x800); mobile is correct
- category: comprehension
- observation: the late-game hub's chart heads its top-left corner "drag · pinch" at both viewports. #590 gave web a wheel zoom anchored at the cursor (a mouse has no pinch), so on desktop the line names a gesture the player cannot make and leaves out the one that works. The string is also hardcoded in the component, against the package rule that player-facing copy lives outside components.
- evidence: `.critique-artifacts/desktop/11-late-game-hub.png` and `.txt` ("drag · pinch"); `axiomancer-mobile/components/exploration/MapOverlays.tsx:35`; the wheel handler in `MapCanvas.tsx` (`Platform.OS !== 'web'` guard); `MapOverlays.test.tsx:27,127` pin the string.
- suggested fix: move the line to a copy file and pick it by platform: "drag · pinch" on native, "drag · scroll to zoom" on web; update the two test pins. Copy only, no rule change.
- source: critique:drive (unattended)
- issue: #597

### [x] [LOW] combat / a11y — the SACRIFICE-floor callout changes the ring's label but announces nothing — RESOLVED 2026-10-15 (branch loop/iterate-sacfloor-announce, 6974aa46: `flagShortfall` announces `PROGRAM_COPY.floorA11y` once per refusal; the label change stays for focus; pinned in CombatBoard.sacfloor.test.tsx)
- pass: antagonist on PR #523 (SF1, commit 04e5ebb6)
- viewport: n/a (screen reader)
- category: accessibility
- observation: during the 900ms callout the medallion's `accessibilityLabel` becomes `VITAE <v> of <max>. SACRIFICE <cost> would leave you below 1.` (A5). A label change is only heard when focus is already on the medallion, and the callout clears before a user could move there, so a screen-reader user who drops a die on a card is not told why it was refused.
- evidence: `CombatCombatantPane.tsx` `PlayerMedallion` label; no `AccessibilityInfo.announceForAccessibility` or live region on the callout.
- suggested fix: announce the floor line once per refusal (`announceForAccessibility(PROGRAM_COPY.floorA11y(...))`), keeping the label change for focus.
- source: antagonist, PR #523
- issue: #558

### [x] [LOW] combat / HUD — "PHASE 1/5 · R1 · T1" is 9px text that ignores the system font size, and "R1 · T1" is never explained — RESOLVED 2026-10-15 (branch loop/iterate-hud-meta-line: the presenter builds the whole line, "PHASE 1/5 · ROUND 1 · TURN 1", as `metaLine`; the board prints it as given at 11px with font scaling on, and the name row wraps; pinned in legibility-sweep.engine.test.ts)
- issue: #556
- pass: 88 (commit 1df5499e)
- viewport: mobile + desktop
- category: comprehension
- observation: the line beside the foe's name is the only place the board says which phase, round and turn it is, and it is the smallest text on the screen (top-right, about 7px tall in both captures). The presenter hands over "ROUND 1" and "TURN 1"; `CombatBoard` cuts them to "R1" and "T1" with `.replace`, so a first-time player reads two bare codes. `allowFontScaling={false}` also keeps it 9px for a player who has raised their text size.
- evidence: `.critique-artifacts/mobile/04-combat-board.png` and `desktop/04-combat-board.png` (top-right, "PHASE 1/5 · R1 · T1"); `CombatBoard.tsx` `metaLine` (`.replace('ROUND ', 'R').replace('TURN ', 'T')`); `CombatCombatantPane.tsx` `hudMeta` (`fontSize: 9`) and its `allowFontScaling={false}`.
- suggested fix: let the presenter build the whole line (for example "PHASE 1/5 · ROUND 1 · TURN 1", or drop TURN where it repeats ROUND), stop rewriting it in the component, raise `hudMeta` to at least 11px, and allow font scaling, letting the name row wrap if it has to. Pin the line's text in a presenter test.
- source: critique-drive (main agent)

### [x] [MED] combat / desktop — the capped VITAE column leaves END at x~440-550 with ~720px of empty dock to its right — RESOLVED 2026-10-15 (branch loop/iterate-dock-end-right: `endWrap` takes `marginLeft: 'auto'`, so END sits at the dock's right edge on a wide window and a phone is unchanged; pinned in CombatBoard.footer-dock.test.tsx)
- issue: #554
- pass: 87 (commit a397d3a0)
- viewport: desktop
- category: visual
- observation: since #535 caps the VITAE column at `DOCK_VITAE_MAX_WIDTH` (360), nothing pushes END to the dock's right edge: the row is avatar, VITAE, END packed left with `gap` only. At 1280 the turn-ending button sits left of the centred hand (x~440-550) and the right 60% of the dock is empty. The #535 Done row says "END stays at the right"; on screen it does not.
- evidence: `axiomancer-mobile/.critique-artifacts/desktop/04-combat-board.png` (END box at x~440-553, y~737-791); `CombatFooterDock.tsx` `dock` has no `justifyContent` and `endWrap` no `marginLeft: 'auto'`.
- suggested fix: give `endWrap` `marginLeft: 'auto'` (or put a flex spacer before it) so END stays on the right edge on wide windows; a phone is unchanged because the VITAE column already fills there. Pin END's right edge in CombatBoard.footer-dock.test.tsx at a wide width.
- source: critique-drive (main agent)


### [x] [LOW] anvil — HONE, TEMPER and SWAP prices read "40s" while the forge's budget says SHILLINGS — RESOLVED 2026-10-14 (branch loop/iterate-forge-shillings: each offer prints "40 SHILLINGS" on its own line under the verb, and the card chip, the cannot-cover reason and the outcome chip spell the unit too; pinned in forge-vocabulary.S5-talk-C12.test.tsx)
- issue: #540
- pass: residue of the pass-84 village fix (iterate 2026-10-14)
- viewport: mobile (375x812)
- category: comprehension
- observation: the same bare "s" as the village stalls: `OfferButton` prints `{offer.price}s` and the card's cost chip `−{cost}s`, under a "<budget> SHILLINGS" header. Not changed with the village fix because HONE and TEMPER sit side by side (`offerRow`, each `flex: 1`, label left and price right), and at 375 wide "TEMPER" plus "40 SHILLINGS" in mono 12 likely overruns the ~144pt button.
- evidence: `axiomancer-mobile/app/blacksmith/index.tsx:86-88` and `:266`; `styles.offerRow` / `offerButton`
- suggested fix: put the price on its own line under the verb (or under the button with the effect line) as "40 SHILLINGS", so the forge names its unit the way the village and the rest screen do; pin it in the forge test.
- source: iterate (residue)

### [x] [LOW] combat / a11y — the phase ledger under VITAE is five unlabelled marks, so a screen reader never hears which phases were cleared or overwhelmed — RESOLVED 2026-10-14 (commit 8ecc2871; the `combat-ledger` row is one accessible element labelled by the presenter's `ledgerA11y`, run by run: "Phases: 1 cleared, 2 overwhelmed, 3 to 5 ahead"; pinned in CombatBoard.footer-dock.test.tsx)
- issue: #538
- pass: 85 (commit 93f05dfe)
- viewport: n/a (screen reader)
- category: accessibility
- observation: the dock's ledger (`combat-ledger`) maps `vm.ledger` to `LedgerMark` glyphs with no `accessibilityLabel` on the row or the marks. The header's "PHASE 1/5" names the current phase, but the record of earlier phases (clear O, overwhelmed X) is visual only. This predates BT2b; the dock move kept it.
- evidence: `axiomancer-mobile/components/combat/encounter/CombatFooterDock.tsx` (the `combat-ledger` row); `components/hazard/glyphs.tsx` `LedgerMark` (no accessibility props); `.critique-artifacts/mobile/04-combat-board.txt` (no ledger text).
- suggested fix: make the ledger row one accessible element labelled from `vm.ledger` (for example "Phases: 1 cleared, 2 overwhelmed, 3 to 5 ahead"), presenter-built and terse.
- source: critique-drive (unattended)

### [x] [MED] title + combat / tooling — the drive captures the title 0.7s into its 2.65s intro, so every pass sees only the wordmark; EMBARK is tappable before it is visible — RESOLVED 2026-10-14 (branch loop/iterate-drive-settle: the drive waits for title-cta at full opacity and for combat-dice-skip to detach; EMBARK is disabled until its fade-in begins. Proving the dice signal found the round-start springs never came to rest under Reanimated 4, so the skip layer ate the first tap; fixed in the same PR, 672b38d6)
- issue: #536
- pass: 79 (commit f2065459); widened and bumped LOW to MED at pass 83 (commit 3225cc64)
- pass 83 addendum: the same fixed 700ms settle (`axiomancer-mobile/scripts/critique-drive.mjs` ~:271) also cuts the `combat-board` capture short. The round-start roll ritual staggers four dice 130ms apart over a 480ms fall plus springs (`DICE_ROLL_TIMING`), so it runs about 1s. Both `04-combat-board.png` captures (mobile and desktop) show three dice in the tray and the fourth still tilted and in the air beside the foe. So the unattended lens has never seen a settled hand-and-dice board, which is the screen that matters most. Fix the same way: wait on a settle signal (no `RollingDie` mounted, or the summed ritual timing) rather than a flat 700ms.
- viewport: mobile + desktop
- category: comprehension
- observation: `scripts/critique-drive.mjs` settles 700ms after load. The title sequence holds 450ms, lifts the wordmark for 1500ms, then fades the psalm and EMBARK in over 700ms (`TITLE_TIMING`). So `01-title.png` shows the wordmark over a half-faded plate and an empty black lower half, while its `.txt` lists the psalm and EMBARK. The unattended lens never sees the first screen a player sees. During those 2.65s the invisible EMBARK is already pressable (`pointerEvents` "box-none", not disabled), so a tap on the empty lower half can skip to the menu before the button has appeared.
- evidence: `.critique-artifacts/mobile/01-title.png` (no psalm, no EMBARK) against `01-title.txt` (both present); the `onboarding` capture's `getByRole('button').first()` click lands at ~0.7s.
- suggested fix: in the drive, have the `title` screen wait for the EMBARK button to reach full opacity (or the sum of `TITLE_TIMING`) before capturing. Separately, ignore EMBARK presses until `cta` has begun (or make a tap during the lift finish the sequence rather than open the menu).
- source: critique-drive (unattended)

### [x] [MED] combat / hand — A Plain Blow draws no FREE pill, so one of the three grey cards looks like it has no free play — RESOLVED 2026-10-14 (commit 4080f4a0; riderPairs leads with a DEAL pair for the damage rider, programFreeCell reads DEAL and spells unprinted amounts n/+n/X/×2, a DEAL sword silhouette joins glyphShapes; pinned in combat-card-vm.test.ts by the Blow pill and a lane sweep: FREE line iff pill)
- issue: #532
- pass: 85 (commit 93f05dfe)
- viewport: both (375x812 and 1280x800)
- category: comprehension
- observation: on the Brine Hag board, A Plain Ward shows its FREE pill ("+4") and A Plain Word shows "+24%", but both A Plain Blow cards show no pill at all, only the paid "Deal 12". The card has a free line (`free: { damage: 2 }`), and the engine resolves it, so a dieless Blow deals damage while its face says nothing. The grey office is the card set that teaches FREE against PAID in fight one, and one of its three cards hides the FREE half.
- evidence: `.critique-artifacts/mobile/04-combat-board.png` and `desktop/04-combat-board.png` (pills on the Ward and Word cards only); `04-combat-board.txt` lists "+4" and "+24%" but nothing for either Blow. Cause: `riderPairs` in `axiomancer-mobile/state/presenters/combat-encounter.engine.ts` (~:141) maps `guard` and `applyEffect` only, so a `damage` rider gives no `freeKeyword`/`freeValue`, `freeGlyphMeta` returns `''`, and the face's `hasFree` is false. `card-rules.ts:99` already prints `DEAL <n>` for the same rider.
- suggested fix: add a `DEAL` pair for `r.damage` in `riderPairs` (stat-scaled the way the Ward's guard is; `FREE_KW_GLYPH` already maps `DEAL` to ⚔), and pin a Blow face with its FREE pill in the presenter test.
- source: critique-drive (unattended)

### [x] [LOW] village — stall prices read "12s" while the purse, rest offers and sell labels say "SHILLINGS" — RESOLVED 2026-10-14 (branch loop/iterate-shilling-prices: buy and sell rows print "12 SHILLINGS"; pinned in stall-price-shillings.critique-84.test.tsx)
- pass: 84 (commit dd61ec90)
- viewport: both
- category: comprehension
- observation: the settlement's purse reads "240 SHILLINGS" and the rest screen prices THE CUT at "5 SHILLINGS", but each stall row prints its price as "12s" (buy and sell). The bare "s" is the only place the currency is abbreviated, and the player meets it before any key to it.
- evidence: `.critique-artifacts/mobile/07-village.png`, `desktop/07-village.png`; `axiomancer-mobile/app/village/index.tsx:168` and `:191` (`{ware.price}s`, `{sellable.sellPrice}s`) against `:114` (`{vm.currency} SHILLINGS`) and `app/rest/index.tsx` (`${offer.price} SHILLINGS`)
- suggested fix: print one form for every price. Either "12 SHILLINGS" on the stall rows, or "12s" everywhere with the purse header naming the unit once. The first matches the rest screen. Pin it in the village screen test.
- source: critique-drive (unattended)
- issue: #530

### [x] [LOW] combat / desktop — the footer dock stretches the VITAE bar 1075px, so the VITAE figure sits a screen's width from the pile counts — RESOLVED 2026-10-14 (commit 0879fb60; the VITAE column stops at DOCK_VITAE_MAX_WIDTH 360, so a wide window keeps the piles beside the figure and END stays at the right; a phone column never reaches the cap; pinned in CombatBoard.footer-dock.test.tsx)
- issue: #533
- pass: 85 (commit 93f05dfe)
- viewport: desktop (1280x800)
- category: visual
- observation: BT2b's footer dock spans the whole window. Its VITAE column is `flex: 1`, so at 1280 wide "♥ 160 / 160" sits at the far left, the deck and discard counts at the far right next to END, and one thin green bar runs about 1075px between them, under a hand that occupies the middle 650px. The menu, rest, village and preview screens all cap their content at a 520 column for this reason.
- evidence: `.critique-artifacts/desktop/04-combat-board.png` (dock row y 740-790: VITAE at x 68, piles at x 1090-1140, bar x 68-1143); `axiomancer-mobile/components/combat/encounter/CombatFooterDock.tsx` `vitaeCol: { flex: 1 }`.
- suggested fix: cap the dock's VITAE column (for example at the hand's width, or a `DOCK_VITAE_MAX_WIDTH`) on wide windows and keep the piles beside the figure; phones unchanged. Pin the cap in `CombatBoard.footer-dock.test.tsx`.
- source: critique-drive (unattended)

### [x] [MED] exploration hub — sealed nodes draw no visible mark, so most roads end at bare vertices — RESOLVED 2026-10-14 (commit cf095d5a; the node wrapper no longer dims sealed nodes by 0.45 on top of NodeMark, so SEALED_MARK_OPACITY (ring 0.85, disc 0.7) is the whole dimming; pinned in ExplorationNode.test.tsx)
- issue: #527
- pass: 84 (commit dd61ec90)
- viewport: both (375x812 and 1280x800)
- category: comprehension
- observation: on the walked Breakwater sheet ("18 nodes · 12 sealed"), the six trodden and open nodes draw their discs, but none of the twelve sealed nodes can be seen. The black roads run to junctions on the engraving and stop, with no mark where they meet, so the map reads as a web of lines leading nowhere. The legend's ◌ SEALED key matches nothing on screen. The sealed mark is meant to recede (`NodeMark` draws an empty dashed ash ring at the smallest radius), but `ExplorationNode` also wraps it in `nodeWrapLocked` opacity 0.45, so the ring prints at about 0.38 and its backing disc at about 0.3. That vanishes on the light engraving.
- evidence: `.critique-artifacts/mobile/11-late-game-hub.png` (junctions near 160,470, 95,540 and 255,505); `desktop/11-late-game-hub.png` (bare vertices at about 55,565 and 390,665); `axiomancer-mobile/components/NodeMark.tsx:86-103`; `components/exploration/ExplorationNode.tsx:167` (`nodeWrapLocked`)
- suggested fix: drop the extra 0.45 wrapper opacity for sealed nodes, or raise the ring's stroke opacity, so the sealed ring is the faintest mark that still shows where each road ends. Keep it the faintest of the four kinds, and pin the sealed mark's effective opacity in `ExplorationNode.test.tsx`.
- source: critique-drive (unattended)

### [x] [MED] combat / hand fan — the D91 free corner pill covers the "tap a card to read it" hint — RESOLVED 2026-10-14 (PR #529, phase BT2b: the hint is dropped per D92 (A8), and the hand dock keeps the pill's overhang above the card tops inside its clip; pinned in CombatBoard.handfan.test.tsx)
- pass: antagonist on PR #521 (BT2a, commit 042b4471)
- viewport: mobile (375x812)
- category: visual
- observation: the pill straddles 15pt above each card's top edge (`freePill` top -15), into the strip where `styles.fanHint` sits (`top: 1` in the fan). With a five-card phone fan, a middle card's pill sits over the start of the hint, so it reads "· · card to read it". BT2a's brief keeps the fan band out of scope (BT2b), so the PR did not move the hint.
- evidence: `axiomancer-mobile/screenshots/bt2a/1-grey-hand.jpg` and `2-blood-price-hand.jpg` (hint under the "+4" / "-2" pills); the prototype shot `bt2-prototype/1-board.jpg` has no hint in that strip.
- suggested fix: in BT2b, place the hint clear of the pills' overhang (above the pill row, or drop it once the BT2b fan reads names whole), and pin it with a layout test.
- source: antagonist, PR #521

### [x] [LOW] combat / mobile — on a 375-wide phone the corner medallions cover the effect rows of the fan's two end cards — RESOLVED 2026-10-14 (PR #529, phase BT2b: no corner chrome remains; the avatar and END live in the footer dock under the hand (A3), pinned in CombatBoard.footer-dock.test.tsx)
- pass: 63 (commit aea7593b)
- viewport: mobile (375x812); desktop (1280x800) seats the fan between the corners and is clear
- category: mobile
- observation: a five-card opening hand does not fit the band between the
  corners, so `handFanLayout` lays it across the whole board (12 to 363)
  and lets the corner chrome float over it. The two end cards are the only
  ones no neighbour covers, yet the END disc sits over the rightmost card's
  effect row ("Deal 12" reads "Dea") and the player medallion sits over the
  leftmost card's chip row. The first-time player sees whole cards but not
  what the two end ones do until they tap one. The fan comment already
  accepts "the last card landed half under the END disc" as the price of a
  readable fan. The cost is the one line that tells the player what the
  card does.
- evidence: `.critique-artifacts/mobile/04-combat-board.png` (bottom right,
  "Dea" under END; bottom left, the Ward's chip under the portrait);
  `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:238-334`
  (`END_CORNER_FOOTPRINT_W`, `handFanLayout` board-band fallback) and
  `:2066` (`endWrap` 80x80).
- suggested fix: keep the full-board fan, but when it takes the board band
  lift the two corner stacks above the card tops (or shrink them to a
  compact size), so no end card's effect row sits under chrome. Pin it with
  a layout test at 375 with five cards: the END and player-medallion
  rects must not intersect any card's effect row.
- source: critique:drive (unattended)

### [x] [LOW] title / a11y — after EMBARK the faded psalm, EMBARK button and footer stay in the accessibility tree under the menu — RESOLVED 2026-10-13 (commit fafba096; the CTA block sets accessibilityElementsHidden, importantForAccessibility no-hide-descendants and aria-hidden once the phase leaves 'title'; pinned in TitleScreen.test.tsx)
- issue: #511
- pass: 79 (commit f2065459)
- viewport: mobile + desktop
- category: a11y
- observation: EMBARK fades the title's call-to-action block to opacity 0 and sets its `pointerEvents` to none, but the block stays mounted (`components/TitleScreen.tsx`, the `ctaStyle` view). The menu's DOM text still reads "Have mercy upon me, O God… / PSALM 51 / EMBARK… / begin the pilgrimage / Your path begins on the coast…" after the four menu rows. A screen reader on the menu reaches an invisible psalm and a disabled "EMBARK" button.
- evidence: `.critique-artifacts/{mobile,desktop}/02-onboarding.txt` (menu shown, title copy still listed after SETTINGS)
- suggested fix: when `phase === 'menu'`, hide the block from assistive tech (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`, `aria-hidden` on web) or unmount it once the menu fade ends; pin with a TitleScreen test that the menu phase exposes no EMBARK.
- source: critique-drive (unattended)

### [x] [LOW] hazard / mobile — a utility card's effect line truncates sideways in the hand, so Read the Wind's free and paid rows both read "CONVERT …" — RESOLVED 2026-10-11 (commit d406c027; in hand mode the line drops its ⬡ mark and `handEffectFontSize` sizes a card's two rows from the longer label, so Read the Wind prints at 8px and the other utility cards stay at 11; measured in the web build at 375, both convert lines print whole; pinned in HazardCard.test.tsx. Play mode still cuts the line on the 70px staged card)
- issue: #494
- pass: 78 (commit a944d1a3)
- viewport: mobile (375x812); the desktop hand in this pass held no card
  with a long effect line
- category: mobile
- observation: the hazard hand prints each utility card's effect line under
  its stat rows with `numberOfLines={1}`. On the 90px hand card, Read the
  Wind's free line "CONVERT 1 ✕→◆" and paid line "CONVERT ✕→◆ ALL" are
  both cut to "CONVERT 1 …" and "CONVERT …". The cut removes what the card
  converts and the ALL that makes the paid row worth its die, so the free
  and paid rows look nearly the same until the player taps the card.
  05665523 fixed the vertical clip of this line; this is the horizontal
  one.
- evidence: `.critique-artifacts/mobile/10-hazard.png` (the 2nd and 5th
  hand cards); `10-hazard.txt` lines 21/25 hold the full strings;
  `axiomancer-mobile/components/hazard/HazardCard.tsx:159-166`.
- suggested fix: in hand mode let the effect line wrap to two lines or shrink
  its font to fit the frame (react-native-web ignores
  `adjustsFontSizeToFit`, so size it from the label's length as
  `handNameFontSize` does for names). Pin it with a test that every
  library utility label fits the 90px hand frame.
- source: critique:drive (unattended)

### [x] [LOW] hazard — a hand card with a two-line name clips its paid row's effect line at its own bottom edge — RESOLVED 2026-10-11 (commit 05665523; the cause was the utility effect lines, not the name: every purple and gold card ran its paid line 5px past the frame. In hand mode a utility card draws the 20px medallion, `handArtSize`, and its last line sits 9px inside at 1280 and 375; pinned in HazardCard.test.tsx)
- issue: #493
- pass: 75 (commit 720ca33d)
- viewport: both (clearest on desktop 1280x800, where no card overlaps another)
- category: visual
- observation: in the route-select hand, BALANCE POLE and SURE FOOTING
  (two-line names) push their two stat rows down far enough that the
  paid row's effect line is cut by the card frame: "RE-CAST +DIE" and
  "DRAW 2" show only the top half of their letters. SCRAMBLE (one-line
  name) shows its paid row whole. This is the card's own height, not the
  fan overlap of RC walk item 9.
- evidence: `desktop/10-hazard.png`, cards 1-3 and 5 of the Flooded
  Undercroft hand; `HazardCard.tsx` hand mode: `frame` has
  `overflow: 'hidden'` and a fixed height, with the name's `minHeight: 28`
  plus 30px art above `rowsBox`.
- suggested fix: size the hand-mode frame (or tighten the name/art
  margins) so name + art + both rows fit, and pin it with a test that
  a two-line name leaves the bottom row's effect line inside the frame.
- source: critique-drive (unattended)

### [x] [MED] exploration / mobile — the hub opens the map at about 0.15x, so the 44px node markers draw at about 6px — RESOLVED 2026-10-11 (commit e6970c5c; node marks, their press targets and halos are counter-scaled by `nodeCounterScale` to a 28px screen floor at any zoom, the plate and roads keep scaling; 28 not 44 because the closest Act 1 nodes sit ~32px apart at the phone fit; pinned in ExplorationNode.test.tsx)
- issue: #492
- pass: 75 (commit 720ca33d)
- viewport: mobile (375x812)
- category: mobile / a11y
- observation: the `sage-bw-door-gate` hub (late-game-hub capture) frames
  the whole 2400px Breakwater plate inside a ~355px pane. Node markers
  and their halos scale with the camera, so each node reads as a dot
  about 6px across and its press target shrinks the same way. On desktop
  (1280x800) the same nodes draw at about 20px. The footer says "tap a
  glowing node to travel", but on a phone a first-time player has to
  find and hit 6px dots or pinch in first.
- evidence: `mobile/11-late-game-hub.png` (orange dots at roughly
  (180,262), (147,293), (297,290), (228,350)); `MapCanvas.tsx`
  `computeFocusTransform` clamps the fit to `minScaleFor` (=
  `min(0.6, vw/2400, vh/2400)` ≈ 0.148 here) and `ExplorationNode.tsx`
  `NODE_SIZE = 44` is drawn inside the scaled canvas.
- suggested fix: counter-scale the node marker and its press target by
  `1/scale` (with a floor near 24-28px drawn, 44px pressable) so they keep
  a usable screen size at any zoom; the plate and roads keep scaling.
  Alternatively raise the phone fit floor so it frames the open nodes
  rather than the whole plate. Presentation only.
- source: critique-drive (unattended)

### [x] [LOW] exploration / mobile — the map pane leaves a ~140px empty black band above the engraving — RESOLVED 2026-10-10 (commit c5d0dda6; `computeFocusTransform` settles each axis against the plate: a plate covering the pane slides to meet the frame edge, a smaller one is centred, focus nodes stay in frame; pinned in MapCanvas.test.tsx)
- issue: #482
- pass: 73 (commit 1f5e2896)
- viewport: mobile (375x812)
- category: visual
- observation: on the mid-campaign hub (fixture `sage-bw-door-gate`)
  the map pane starts under "drag · pinch" at about y=175, but the
  Breakwater engraving and its nodes begin at about y=325. The space
  between is flat black, a fifth of the screen, with nothing to drag
  to. On desktop the same pane is filled edge to edge.
- evidence: `.critique-artifacts/mobile/11-late-game-hub.png`
  against `desktop/11-late-game-hub.png`
- suggested fix: start the phone camera so the plate fills the
  pane's height (cover rather than fit-width), or centre the plate
  vertically so the empty space is split and smaller.
- source: critique:drive (unattended)

### [x] [LOW] title / desktop — the three-step scrim draws two hard seams across the art, through the king's crown and his beard — RESOLVED 2026-10-10 (commit 85672440; the scrim is one SVG LinearGradient, `titleScrimStops`, from clear to 0.9+ under the CTA; desktop capture shows no step, mobile unchanged; pinned in TitleScreen.test.tsx)
- issue: #481
- pass: 74 (commit f91bc9e8)
- viewport: desktop (1280x800)
- category: visual
- observation: the bottom scrim is three flat translucent bands (0.25 /
  0.6 / 0.9, `TitleScreen.tsx` `scrimBand1-3`). On a 1280x800 window
  their edges are straight lines across the full width, at about y=360,
  y=510 and y=655. The y=510 seam crosses the king's crown and the y=655
  seam crosses his beard, just above EMBARK. They read as UI stripes,
  not shade. The source says a coarse step "reads as atmosphere" over
  half a screen. That holds on a phone, where the art sits above the
  bands, but not on desktop, where the bands lie over the figures.
- evidence: `.critique-artifacts/desktop/01-title.png`, left half,
  y=350-700.
- suggested fix: give the scrim the same finer ramp as `artFoot` (about
  seven bands with eased opacities), or a real gradient on web, so no
  step shows. Keep the CTA panel's final darkness.
- source: critique:drive (unattended)

### [x] [MED] combat / desktop — A Plain Word's paid column reads "VU…" / "+6" / "0%" now that the desktop hand shows every column — RESOLVED 2026-10-10 (commit 8d579f67; `paidLedgerFit` stacks a small face's ledger when the side-by-side PAID column cannot hold the keyword's longest word or the value, and the value keeps one line at a computed size; both Word cards print VULNERABLE and +60% whole at 1280x800; pinned in CombatBoard.paid-column.test.tsx)
- issue: #479
- pass: 74 (commit f91bc9e8)
- viewport: desktop (1280x800)
- category: comprehension
- observation: since commit cc556113 the desktop hand sits side by side,
  so both A Plain Word cards show their paid column in full. The column
  is too narrow for its two lines: the keyword ellipsizes to "♥ VU…" and
  the value "+60%" breaks inside the number, as "+6" over "0%". A player
  reads a +6 and a 0%. The DOM text is right ("♥ VULNERABLE", "+60%"),
  so this is layout only. A Plain Ward's "★ GUARD 12" fits.
  `plan/AUDIT.md` has carried this since 2026-09-27 ("Post-purge: a
  staged A Plain Word wraps +25% mid-token", impact 4), when the fan
  covered most columns. Now every desktop opening hand shows it, so the
  severity goes up here.
- evidence: `.critique-artifacts/desktop/04-combat-board.png`, the
  paid cells of the second and fourth cards (around x=540 and x=800,
  y=700-750); `desktop/04-combat-board.txt` lines 18-19 and 24-25.
- suggested fix: in `CombatBoard.tsx` (`paidTextWrap` / `paidValue`,
  around line 1757), keep the value on one line (`numberOfLines={1}`
  plus a computed font size, as `handNameFontSize` does for hazard
  names, since react-native-web ignores `adjustsFontSizeToFit`). Give the
  paid cell the width the free cell does not need, so the keyword shows
  whole. Pin it in a CombatBoard test at 1280 wide, and close the AUDIT
  row with it.
- source: critique:drive (unattended)

### [x] [LOW] hazard / mobile — the opening hand breaks CLIFFRUNNER mid-word as "CLIFFRUNN / ER" — RESOLVED 2026-10-10 (commit f9d7c190; a single-word hand-mode name sizes itself to the room beside the pips and the fanned neighbour (`handNameFontSize`, computed because react-native-web ignores `adjustsFontSizeToFit`): CLIFFRUNNER renders at 10px, 44px wide in a 48px strip; multi-word names keep 13px and the wrap; pinned in HazardCard.test.tsx)
- issue: #478
- pass: 73 (commit 1f5e2896)
- viewport: mobile (375x812)
- category: visual
- observation: since commit 8d5aee2a a covered card's name wraps
  inside its visible strip. Multi-word names wrap cleanly ("BALANCE /
  POLE", "UNBROKEN / OATH"), but CLIFFRUNNER is one word, longer than
  the strip, and breaks at a letter: "CLIFFRUNN" over "ER".
- evidence: `.critique-artifacts/mobile/10-hazard.png`;
  `hazard.content.ts:52` (name "CLIFFRUNNER")
- suggested fix: shrink a single-word name to fit its strip
  (`adjustsFontSizeToFit` / a min font scale on the hand-mode name)
  instead of letting it break mid-word; keep the 2-line wrap for
  multi-word names.
- source: critique:drive (unattended)

### [x] [LOW] hazard / desktop — the route cards stretch 1240px edge to edge, so each threshold sits across the screen from its label — RESOLVED 2026-10-09 (commit 3c25eb28; the header, opening hand and route cards sit in a column capped at `ROUTE_COLUMN_MAX_WIDTH` (520), centred, full width below the cap; the fan sizes its overlap to the column; pinned in RouteSelect.test.tsx)
- issue: #475
- pass: 73 (commit 1f5e2896)
- viewport: desktop (1280x800)
- category: visual
- observation: under a centred opening hand, both route cards (Cinder
  Ridge, The Ash Run) run the full width. The three round cells
  ("RI 22", "RII 23", "RIII 25") spread over ~1170px, the PASSAGE /
  FORCE / ESCAPE badges sit at the far right edge, and TAKE SAFE
  ROUTE is a 1220px bar. The menu, combat reveal, rest and village
  screens were each capped at a centred 520 column (2026-10-07/08);
  the hazard route select is the one state screen left at full
  width.
- evidence: `.critique-artifacts/desktop/10-hazard.png`
- suggested fix: cap the route-select scroll content at a centred
  column the way `REST_COLUMN_MAX_WIDTH` does (wider than 520 if the
  three round cells need it); phone keeps full width.
- source: critique:drive (unattended)

### [x] [MED] combat / desktop — the hand fan still overlaps at 1280 wide, so every covered card's paid column is hidden — RESOLVED 2026-10-09 (commit cc556113; `handFanLayout` lets `step` grow to `HAND_CARD_W + HAND_FAN_GAP` when the band has room, a fan with no overlap caps no names, phones unchanged; pinned in CombatBoard.fresh-eyes-repair.test.tsx)
- issue: #474
- pass: 73 (commit 1f5e2896)
- viewport: desktop (1280x800)
- category: comprehension
- observation: the five-card hand sits in a ~550px row in the middle
  of an 1280px board, and each card tucks about 16px under its right
  neighbour. That 16px is the card's paid column, so on A Plain Ward
  and both A Plain Words the paid side reads "★ GUAR" / "♥ V" and the
  figure is cut ("12", "+60%" are in the DOM but not on screen). Only
  the last card in the row shows its paid value. There is ~350px of
  empty board on each side. A first-time player on desktop sees the
  FREE half of every card and not what paying the die buys.
- evidence: `.critique-artifacts/desktop/04-combat-board.{png,txt}`
  (txt carries "★ GUARD 12", "♥ VULNERABLE +60%" for the clipped
  cards); `CombatBoard.tsx` `handFanLayout` caps `step` at
  `HAND_CARD_W - 16`, so the fan overlaps by at least 16 at any width.
- suggested fix: let `step` reach `HAND_CARD_W` plus a small gap when
  the band has room, as the hazard fan's `routeFanOverlap` does
  (commit 8d5aee2a); keep today's overlap on phones.
- source: critique:drive (unattended)

### [x] [LOW] village — the settlement screen's header and exit bar sit on the vignette frame, not inside it — RESOLVED 2026-10-09 (commit 3284b582; `ScreenBg` exports the vignette width as `SCREEN_FRAME_INSET`, the settlement pads its scroller top and exit bar bottom by it; pinned in village-frame-inset.critique-72.test.tsx)
- issue: #469
- pass: 72 (commit 19459d23)
- viewport: both (375x812 and 1280x800)
- category: visual
- observation: `ScreenBg` draws its plate inside a 28px vignette border.
  The rest, cache and item-reward screens centre their column, so it
  sits inside the frame. The settlement screen top-aligns its scroll with
  14px padding, so the "SETTLEMENT" kicker (y~20) sits on the dark
  border above the plate and the "FIXTURE SHOP" title starts on its
  edge. At the bottom, the TAKE THE ROAD bar (14px padding) runs across
  the lower border. On the same pass the rest screen, behind the same
  frame, leaves a clear margin above its heading. A first-time player
  sees the settlement's heading pushed against the top of the screen,
  outside the frame every other stop screen respects.
- evidence: `.critique-artifacts/desktop/07-village.png` (kicker at
  y~20 above the plate's top edge at y=28; exit bar's bottom edge at
  y~785 inside the band at 772-800), `mobile/07-village.png` (same
  kicker at y~20), against `desktop/09-rest.png`;
  `axiomancer-mobile/components/ScreenBg.tsx` (`vignette.borderWidth:
  28`), `axiomancer-mobile/app/village/index.tsx:231` (`scroll: {
  padding: 14 }`) and `:351` (`exitBar: { paddingHorizontal: 14,
  paddingBottom: 14 }`).
- suggested fix: pad the settlement scroll and exit bar by at least the
  vignette width (export the 28 from `ScreenBg` as a named inset, rather
  than repeat the literal), so the heading and the bar sit inside the
  plate. Pin it with a test that the village scroll's top padding and
  the exit bar's bottom padding are not less than that inset.
- source: critique:drive (unattended)

### [x] [LOW] rest / village / desktop — the offer and stall rows stretch 1250px edge to edge, so a price sits across the screen from its name — RESOLVED 2026-10-08 (commit 9bd8b26c; each screen's content sits in one column capped at `REST_COLUMN_MAX_WIDTH` / `VILLAGE_COLUMN_MAX_WIDTH` 520 and centred, the pinned TAKE THE ROAD shares the cap, phone fills it; pinned in rest-village-column.critique-71.test.tsx)
- issue: #464
- pass: 71 (commit 3c58c902)
- viewport: desktop (1280x800)
- category: visual
- observation: at 1280 wide, the rest screen's REST and THE CUT rows
  and the settlement's BUY/SELL toggle and stall rows each span the
  full window. The Minor Healing Potion's name is at the left edge and
  its "12s" price at the right, ~1200px apart. REST and its "FREE" tag
  are just as far apart. The heading, purse and copy are left-aligned
  above. On mobile these screens fill the phone and read well. Passes
  69 and 70 found the same thing on the main menu and the combat
  preview, and both were fixed with a centred 520px column
  (`MENU_COLUMN_MAX_WIDTH`, `REVEAL_COLUMN_MAX_WIDTH`).
- evidence: `.critique-artifacts/desktop/09-rest.png`,
  `desktop/07-village.png`; compare `mobile/09-rest.png`,
  `mobile/07-village.png`
- suggested fix: put the rest and settlement content in the same capped,
  centred column the menu and preview use (phone still fills it), and
  pin the cap in each screen's test.
- source: critique:drive (unattended)

### [x] [MED] hazard — the Creeping Rot's scenario line narrates the player as "his arm", the one gendered line left after pass 56 — RESOLVED 2026-10-08 (commit 81ab72b6; the line reads "the cut on your arm", and hazard.voice.engine.test.ts now checks every string a hazard def carries, not only intro)
- issue: #463
- pass: 71 (commit 3c58c902)
- viewport: both (375x812 and 1280x800)
- category: voice
- observation: the hazard screen for THE CREEPING ROT reads, under its
  title, "The marsh air carries the fever. It has already found the cut
  on his arm." The intro of the same hazard says "It is already past
  your elbow", and every other narrated screen says "you". Pass 56
  rewrote the six hazard `intro` fields in the second person (commit
  9cf50a65), but the `scenario` field shown at the top of the
  route-select screen was not in scope, and
  `hazard.voice.engine.test.ts` checks `intro` only. This is the only
  `scenario` in `HAZARD_LIBRARY` with a gendered pronoun.
- evidence: `.critique-artifacts/desktop/10-hazard.{png,txt}` (fixture
  `l30-bw-hazard-arrive` drew fever-rot on this pass);
  `axiomancer-mechanics/src/World/Hazard/hazard.content.ts:219`;
  `axiomancer-mechanics/src/World/Hazard/e2e/hazard.voice.engine.test.ts:17`
- suggested fix: reword the line in the second person ("...found the
  cut on your arm."), a one-word copy correction with no new content,
  and widen the voice test to check every player-facing string field of
  a hazard (`scenario`, `intro`, route descriptions), not only `intro`.
- source: critique:drive (unattended)

### [x] [LOW] hazard — the opening-hand fan clips card names again ("SURE FOOTIN", "BALANCE POL") — RESOLVED 2026-10-08 (commit 8d5aee2a; the fan overlaps only as much as the row needs, a 6px gap at desktop and up to 22 on a phone, a covered card's name wraps inside its visible strip, and every hand-mode name clears the rarity pip; guarded by RouteSelect.test.tsx)
- issue: #461
- pass: 68 (commit 534b93f6)
- viewport: both (375x812 and 1280x800)
- category: visual / legibility
- observation: the route-select hand preview shows each card name on
  one line, and the next card in the fan covers its tail: "SURE
  FOOTIN", "BALANCE POL" twice, at both viewports. The 2026-09-11 fix
  (`8f3acef7`, Done row "the fanned route-choice hand truncates card
  names illegibly") cut the overlap to -22 so names wrapped inside the
  visible strip. The overlap is still -22, so the names now lay out
  wider than the 68px the fan leaves visible. Tap-to-read still works,
  so this is legibility only. Desktop has room to spare and still
  overlaps.
- evidence: `.critique-artifacts/{mobile,desktop}/10-hazard.png`;
  `RouteSelect.tsx:181` (`marginLeft: -22`); `HazardCard` hand-mode
  name at `components/hazard/*Card*.tsx` (`numberOfLines={2}`).
- suggested fix: make the hand-mode name wrap inside the visible strip
  (fixed width), or open the fan out when the row has room
  (e.g. no overlap at desktop widths).
- source: critique:drive (unattended)

### [x] [LOW] hazard / mobile — the route-select top strip reads "◆ HAZARDNO RETREAT — CHOOSE TO PROCEED◆" with no gaps — RESOLVED 2026-10-08 (commit d63cf279; the strip row has a 10px gap and the middle segment shrinks to one ellipsized line; guarded by RouteSelect.test.tsx. The copy stays inline, as every UI label in the hazard components does)
- issue: #460
- pass: 68 (commit 534b93f6)
- viewport: mobile (375x812); desktop is fine
- category: visual
- observation: the strip above the hazard title is three `Text`
  segments ("◆ HAZARD", "NO RETREAT — CHOOSE TO PROCEED", "◆") in a
  `justifyContent: 'space-between'` row. At 1280 they sit far apart. At
  375 the three, at 11px mono with 2px letter-spacing, fill the row, and
  space-between leaves no gap, so they read as one run-on string.
- evidence: `.critique-artifacts/mobile/10-hazard.png` (top strip);
  `desktop/10-hazard.png` for the intended spacing;
  `axiomancer-mobile/components/hazard/RouteSelect.tsx:157-160` and the
  `topStrip` style at `:217`.
- suggested fix: give the row a `gap` (or margins on the middle
  segment) and let the middle segment shrink/ellipsize, or drop the
  middle line below 400px. The strip's copy is also hardcoded in the
  component; move it with the fix.
- source: critique:drive (unattended)

### [x] [LOW] combat preview — an opened threat phase repeats the header's figure as "(+11 damage)", and the "+" reads as a bonus — RESOLVED 2026-10-08 (commit 544f9422; `buildThreatAction` prints "N damage" unsigned, so preview, intent, log and CLI all drop the "+"; guarded by combat.threat.test.ts)
- issue: #459
- pass: 70 (commit 560de043)
- viewport: both (375x812 and 1280x800)
- category: comprehension
- observation: since ccf6f7eb the collapsed header reads "PHASE 1 ·
  ATTACKS · 11". Opening it shows "The Wet Congregation — The drowned
  congregation sings your mercy back into its pews (+11 damage)." The
  same number now prints twice in one row, and "+11" is the sign the
  game uses for gains (`+24` VULNERABLE chip, `+43 VITAE` at rest), so
  the hit reads like something added rather than taken.
- evidence: `.critique-artifacts/mobile/03-combat.png` and
  `desktop/03-combat.png` (phase 1 opened);
  `axiomancer-mechanics/src/Combat/combat.threat.ts:259` builds
  `` `+${damage} damage` ``, rendered as `p.threatAction.description`
  at `CombatEncounterPanel.tsx` (the `revealPhaseText` branch).
- suggested fix: in the preview, show the flavour clause alone (the
  header already carries the figure), or have the resolver print
  "11 damage" without the sign; keep any effect/heal/cleanse parts.
  Check the combat log and the board's intent text, which may read the
  same description.
- source: critique:drive (unattended)

### [x] [MED] rest — the Breakwater's inns are described as paid rooms, but REST reads "Sleep where you stand. Free." — RESOLVED 2026-10-08 (commit 698f8ac2; `restOfferDesc` reads the session shelter, inns say "A bed for the night, on the house.", camps keep theirs; pinned in rest.copy.test and rest-offer-heal-cap.audit.test)
- issue: #458
- pass: 61 (commit 0be3bb1c)
- viewport: both (375x812 and 1280x800)
- category: voice
- observation: `bw-9` is the first rest node a new run reaches. Its line
  reads "The customs house lets rooms by the night. The clerk takes
  shillings, not names." Directly under it, the REST offer reads "SLEEP
  WHERE YOU STAND. FREE. RESTORES 44 VITAE." `bw-13` has the same
  contradiction ("An inn above the harbour. Warm, loud, and paid for in
  advance."). The node promises a bed you pay for, and the button offers
  bare ground at no cost. The player can't tell whether the inn charged
  them, or whether there is a better paid option they missed. Both nodes
  are built by `innRestPool` (`shelter: 'inn'`). The rest-choice copy
  doesn't read `shelter`, so it words every rest as a camp. That matches
  the heal (T, 2026-08-15: no shelter distinction in the heal) but not
  the prose.
- evidence: `.critique-artifacts/mobile/09-rest.txt` and
  `desktop/09-rest.png` (fixture `apprentice-bw-rest`);
  `axiomancer-mechanics/src/World/MapEvents/content.ts:698-701`;
  `axiomancer-mobile/state/presenters/rest.copy.ts:20`.
- suggested fix: make the REST description shelter-aware in
  `rest.copy.ts` (keep "Sleep where you stand. Free." for camps; give inns
  a line like "A bed for the night, on the house.") and pass `shelter`
  through the rest-choice presenter. Or reword the two inn lines so they
  don't name a price. Either way it is a copy change with no new content,
  so pin it with a presenter test on an inn node.
- source: critique:drive (unattended)

### [x] [LOW] combat preview / desktop — the threat rows stretch 1236px edge to edge under a centred portrait column — RESOLVED 2026-10-07 (commit 31c785d8; the reveal's scroll content sits in one column capped at `REVEAL_COLUMN_MAX_WIDTH` 520 and centred, phone fills it; pinned in combat-encounter.screen.test.tsx)
- issue: #457
- pass: 70 (commit 560de043)
- viewport: desktop (1280x800); mobile is fine
- category: visual
- observation: the "A FOE BARS THE WAY" preview centres the eyebrow,
  portrait, name and both VITAE lines in a narrow column, then each
  THREAT SEQUENCE row runs the full width: the "PHASE n · ATTACKS · N"
  label sits at x≈60 and its chevron at x≈1245, with the expanded
  phase text one short line along the left edge. The eye has to cross
  the screen to tie a label to its chevron, and the list reads as a
  separate layout from the foe above it. Same shape as pass 69's main
  menu row, fixed in 9c435716.
- evidence: `.critique-artifacts/desktop/03-combat.png`;
  `axiomancer-mobile/components/combat/encounter/CombatEncounterPanel.tsx:1307`
  (`revealPhase` is `alignSelf: 'stretch'`; `revealSection` at `:1306`
  likewise) inside `revealScroll` (`:1299`, no width cap).
- suggested fix: cap the preview's content at one column width (a
  named constant, as `MENU_COLUMN_MAX_WIDTH` did for the menu) and
  centre it, so the phone still fills the width; pin it in the combat
  encounter screen test.
- source: critique:drive (unattended)

### [x] [LOW] main menu / desktop — the rows stretch 1232px edge to edge under an empty upper half — RESOLVED 2026-10-07 (commit 9c435716; heading and rows sit in one column capped at `MENU_COLUMN_MAX_WIDTH` 520 and centred, phone fills it, bottom anchor kept; pinned in MainMenu.test.tsx)
- issue: #456
- pass: 69 (commit 60d52715)
- viewport: desktop (1280x800); mobile reads well
- category: visual
- observation: after EMBARK, the chronicle menu anchors to the bottom
  (`justifyContent: 'flex-end'`), which suits a phone's thumb. At 1280
  the top 55% of the screen is empty black, and NEW GAME, LOAD GAME and
  SETTINGS each run the full width, with the label at the far left and
  the ">" 1200px away at the far right. The heading "miserere mei, deus"
  is centred above them, so the screen reads as two unrelated layouts.
  Dialogue already caps its column at about 530px on desktop.
- evidence: `desktop/02-onboarding.png` against `mobile/02-onboarding.png`;
  `axiomancer-mobile/components/menu/MainMenu.tsx:78-85` (`root` has no
  `maxWidth` and no centring).
- suggested fix: cap the menu column (heading and rows) at a reading
  width (about 480-560px) and centre it, keeping the bottom anchor on
  narrow screens. Layout only; no copy or art change.
- source: critique:drive (unattended)

### [x] [LOW] combat — the threat sequence's collapsed rows all read "PHASE n · ATTACKS", so the preview hides how the fight escalates — RESOLVED 2026-10-07 (commit ccf6f7eb; `threatPhaseHeader` prints "PHASE 2 · ATTACKS · 13" from the structured threat effects, spoken as "Phase 2, ATTACKS, 13 damage"; branch phases omit the figure; pinned in threat-phase-header.test.ts and combat-encounter.screen.test.tsx)
- issue: #455
- pass: 64 (commit c46565c3)
- viewport: both (375x812 and 1280x800)
- category: comprehension
- observation: the "A FOE BARS THE WAY" preview lists the Brine Hag's five
  phases. Only phase 1 opens by default. The other four collapse to
  identical headers: "PHASE 2 · ATTACKS" through "PHASE 5 · ATTACKS". Since
  R2 every live enemy card deals plain damage, so every header carries the
  same icon and word. The one thing that differs between phases, the damage
  (the budget rises 20% a phase), sits behind four taps. A first-time player
  sees five copies of the same row and learns nothing about whether to take
  the fight. Before R7d the open row's stance tell at least varied. Now the
  headers are the whole telegraph, and they are all the same.
- evidence: `.critique-artifacts/mobile/03-combat.{png,txt}` and
  `desktop/03-combat.png`;
  `axiomancer-mobile/components/combat/encounter/CombatEncounterPanel.tsx:750-771`
  (the header renders only `PHASE {p.index} · {meta.label}`; the threat
  text mounts only when open); `axiomancer-mechanics/src/Combat/combat.enemy-cards.ts:11-24`
  (every card is plain damage, weighted up by phase).
- suggested fix: put each phase's damage figure in its header ("PHASE 2 ·
  ATTACKS · 13"), read from the structured threat payload rather than
  parsed from the description. Keep the accordion for the action sentence.
  Pin it with a presenter or render test that each collapsed header carries
  its phase's damage. Presentation only, no new content.
- source: critique:drive (unattended)

### [x] [LOW] exploration hub — the map legend is 8px bone text laid straight over the engraving, and roads run through it — RESOLVED 2026-10-07 (commit ddb93536; the keys and count sit on a smoked plate capped at the strip's width, text raised to 9px, pinned in MapOverlays.test.tsx)
- issue: #453
- pass: 69 (commit 60d52715)
- viewport: both (375x812 and 1280x800)
- category: a11y / legibility
- observation: the legend in the chart's bottom-left corner
  ("● TRODDEN ● OPEN · SEALED" over "18 nodes · 12 sealed") is the
  smallest text in the game, and it has no backing. On the walked
  Breakwater sheet it sits on light engraved rock with black road
  strokes crossing it, so the three keys and the count are hard to
  read at either viewport. It is the only key to what the node colours
  mean.
- evidence: `desktop/11-late-game-hub.png` and
  `mobile/11-late-game-hub.png` (bottom-left of the chart);
  `axiomancer-mobile/components/exploration/MapOverlays.tsx:94-110`
  (`legend` is absolutely placed, no background; `legendText` is
  `fontSize: 8`).
- suggested fix: give the legend a translucent `AXM.bg` plate with a
  little padding (as the recentre button has its own disc), and raise
  the text to the 9-10px the other mono eyebrows use. Keep the
  `RECENTRE_CLEARANCE` right inset.
- source: critique:drive (unattended)

### [x] [MED] combat / mobile — on a 375-wide phone the phase ledger stacks as a five-mark vertical column under the hand — RESOLVED 2026-10-07 (commit 67fc1541; railLedgerStacks puts the ledger on its own unwrapped line at the top of the rail when the row cannot hold it, pinned in CombatBoard.rail-ledger.test.tsx)
- issue: #452
- pass: 62 (commit 3293e959)
- viewport: mobile (375x812); desktop (1280x800) renders the same five marks as one row
- category: mobile
- observation: the bottom rail shows the fight's five-phase ledger (one
  mark per Brine Hag phase). On desktop the marks sit as one row between
  "160 / 160" and the deck piles. On the phone they stack one above the
  other, a column of five empty circles running from under the hand's
  middle card down to the screen's bottom edge, so it reads as stray
  chrome rather than "phase 1 of 5". The rail pads 104 left and 92 right
  for the two medallions, which leaves 179pt. The VITAE readout and the
  piles never shrink, so the ledger, the one flexible cell, gets roughly
  one mark's width and `flexWrap: 'wrap'` breaks after every mark. The
  style comment expects "a second row on a narrow phone", not five.
- evidence: `.critique-artifacts/mobile/04-combat-board.png` (bottom
  centre, below the third card) vs `desktop/04-combat-board.png` (bottom
  centre, one row); `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:1585`
  (ledger render) and `:2181-2189` (`rail` paddings, `railLedger` wrap).
- suggested fix: keep the ledger on one row at 375: drop `flexWrap` and
  shrink the marks (`LedgerMark size`) on narrow widths, or move the
  ledger to its own centred line above the rail when it can't fit. Pin
  it with a layout test that measures the ledger as one row at 375.
- update (pass 63, commit aea7593b): unchanged. The ledger still stacks as a
  five-mark column under the hand at 375.
- source: critique:drive (unattended)

### [x] [MED] combat — A Plain Word's FREE VULNERABLE chip reads "+24", dropping the unit next to its paid "+60%" — RESOLVED 2026-10-07 (commit ef0e7a8b; compactFree keeps a trailing "%", pinned in CombatBoard.S1-board.test.tsx)
- pass: 63 (commit aea7593b)
- history: pass 58 (commit 36238fd8, filed as "×24" vs "+60%"), pass 59
  (commit 5ebc7c13, presenter fix landed but `compactFree` strips the "%"),
  pass 60 (commit 2d918845, unchanged), pass 61 (commit 0be3bb1c, unchanged)
- viewport: both (375×812 and 1280×800)
- category: comprehension
- observation: A Plain Word (`grey-word`) is in every starting hand since P1.
  The presenter emits "+24%" (`percentIntensity` in
  `combat-encounter.engine.ts`, fixed pass 59), but the board's
  `compactFree` (`CombatBoard.tsx:1669`) matches `^\+?(\d+)` and returns
  "+24", dropping the unit — both viewports still read "A PLAIN WORD / +24 /
  VULNERABLE / +60%", unchanged since pass 59 and reconfirmed through pass 66.
- evidence: `.critique-artifacts/mobile/04-combat-board.txt` ("A PLAIN WORD /
  +24 / VULNERABLE / +60%"); `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:1669`;
  `axiomancer-mechanics/src/Cards/library/starters.cards.ts:79-80`.
- suggested fix: keep a trailing "%" in `compactFree` and pin it with a
  presenter test on "+24%".
- source: critique:drive (unattended)
- issue: #451

### [x] [MED] exploration — a reload taken DURING a live encounter still lands past the fight — RESOLVED 2026-10-02 (R9a, commit 1bad8fce; shape (a), pinned by fight-checkpoint.engine.test.ts and the mobile reload-mid-fight tests)
- pass: burn-day audit 2026-09-19 (row 3.1 fix, residual)
- viewport: both (375×812 and 1280×800) — the loss is in persistence, not
  layout; on web it is one browser reload away
- category: progression / persistence
- observation: row 3.1 closed the reload-during-the-PRELUDE hole — an
  arrival the player never answered is now re-offered on the next mount,
  because the node's absence from `consumedNodes` is the debt and
  `consumedNodes` rides the save. But `consumedNodes` marks "the MapEvent
  resolved", i.e. "the prelude was shown", not "the fight ended". The
  moment the player commits to the fight, `beginHazardEncounter` clears
  the event slice and the hazard-pattern combat runs in the panel's local
  React state, while the node is already consumed. A reload from there
  rebuilds the app standing past the encounter, its onward edges open,
  with no fight pending and nothing owed — the same player-visible loss as
  row 3.1, one step later. It bites hardest on a boss node, where the walk
  back is longest.
- evidence: `axiomancer-mechanics/src/World/MapEvents/resolve-map-event.ts`
  (`markNodeConsumed` runs at resolve time, on every non-travel path);
  `axiomancer-mobile/state/actions.ts` `beginHazardEncounter` (clears the
  event slice, then `startCombat`); `axiomancer-mechanics/src/Game/store.ts`
  — the persisted payload destructures `currentEncounter: _drop` with the
  standing comment "encounters re-roll on load (Spec 07)", so no live fight
  is ever written; the panel's own turn state is not in the store at all.
- suggested fix: two shapes, and the choice is a design call, not a
  mechanical one. (a) Defer `markNodeConsumed` until the encounter settles
  (victory / flee / defeat) so the existing `arrivalPending` re-offer
  covers the fight too — smallest change, but it makes "consumed" mean
  "answered" and every other consumer of that field has to agree. (b)
  Persist enough to rebuild the fight (foe id, the encounter's seed, the
  node) and re-enter the panel on load — truer to the player's experience,
  and it contradicts the Spec 07 "encounters re-roll on load" note, which
  would need reopening first. Do NOT ship (a) and (b) together.
- source: burn-day audit 2026-09-19

### [x] [LOW] village / items — two consumables use "wearer" language for items the player drinks, not wears
- pass: 41 (commit 6a804a02)
- viewport: mobile and desktop (both render the same source text)
- category: comprehension / voice
- observation: `axiomancer-mechanics/src/Items/consumable.library.ts`
  describes two `category: 'consumable'` items as affecting "the
  wearer" even though both are drunk: `void-essence` ("A vial of
  substance that refuses to be observed. Drinking it leaves the
  wearer slightly insistent and intensely present.", line 147-148) and
  `heart-draught` ("A warm draught that quickens the wearer's
  convictions.", line 78). Every other consumable in the file
  describes an effect on the drinker/self, not a "wearer" — this reads
  as flavor text drafted from an equipment-item template and never
  re-worded for a drinkable. Live in the shop: Void Essence is sold at
  Glen Market (`wanderer-nf-village` fixture, confirmed in
  `07-village.png`/`.txt` this pass).
- evidence: `axiomancer-mobile/.critique-artifacts/{mobile,desktop}/07-village.png`;
  `axiomancer-mechanics/src/Items/consumable.library.ts:78,147-148`.
- suggested fix: reword both descriptions to drinker-appropriate
  language, e.g. void-essence → "...leaves the drinker slightly
  insistent and intensely present"; heart-draught → "...quickens the
  drinker's convictions". Data-only text edit, no effect/wiring change.
  Equipment/consumable-lifecycle territory (`/adjust-equipment`).
- source: loop
- closed: moot (R10b2, 2026-10-02): both consumables were deleted in R5 (healing potions only); `void-essence` survives only as a migration id.

### [x] [MED] ratified-exception HP arms bypass the damage-instance clock funnel
- pass: review-closeout 2026-07-12 (commit 4680e5e2, branch
  claude/axiomancer-dawncaster-comparison-cz6008)
- viewport: n/a
- category: design
- observation: the three spec 32 §12 ratified direct-HP exceptions — the
  `conclude` signature arm (Conclusion, per-stack), the `mercy` signature
  arm (Disarming Plea, flat magnitude; both `combat.signature.ts`, plain
  `applyDamage`), and the mercy-exploit strike
  (`selectEncounterMercyChoice` exploit branch, `combat.engine.ts`) —
  apply damage OUTSIDE the `applyEnemyDamage` funnel. Every status-gated
  payoff burst advances BLEED's WS3.2 damage-instance clock; these three
  hits do not, so a Conclusion cast or a mercy-exploit strike lands on a
  bleeding enemy without the bleed paying out. Ratified exceptions ARE
  allowed to differ from the funnel — whether they SHOULD feed the clock
  is a design call, not a bug fix, hence filed instead of changed.
- evidence: `combat.engine.ts` `applyEnemyDamage` doc comment ("the
  shared enemy-damage funnel"); `combat.signature.ts` conclude/mercy arms
  call `applyDamage` directly; the mercy-exploit branch likewise. The
  doctrine witness (`doctrine-strike-dead.engine.test.ts`) ratifies the
  three arms' RIGHT to chip HP (spec 32 §12) but nothing rules on their
  clock semantics.
- suggested fix: owner call under the spec 32 §12 framing — either (a)
  ratify "exception damage is clock-silent" as spec text (one sentence in
  §12, plus a witness pinning it), or (b) route the three arms through
  `applyEnemyDamage` so BLEED treats every enemy-HP hit uniformly. Do NOT
  change behavior without the ratification; (b) also changes Conclusion's
  effective damage against bleeds and needs a balance glance.
- source: adversarial code review (2026-07-12)
- closed: moot (R10b2, 2026-10-02): the `conclude` and `mercy` signature arms were deleted (R4, R7e2) and no card applies BLEED after the card purge, so the clock this row weighs has no carrier.

### [x] [MED] WS9 reactive cleanse strips a whole merged instance — tension with the enemy-cleanse mitigation
- pass: review-closeout 2026-07-12 (commit 4680e5e2, branch
  claude/axiomancer-dawncaster-comparison-cz6008)
- viewport: n/a
- category: design
- observation: the WS9 reactive cleanse (`enemyCleanse` threat-branch
  payload, `combat.engine.ts`; prototype carrier Tri-Eyes,
  `combat.threat-sequences.ts`) removes one whole merged `ActiveEffect`
  instance in application order. Because same-id afflictions
  intensity-stack into ONE instance, a single cleanse can erase an
  arbitrarily tall stack — e.g. a poison the player spent three cards
  deepening — which sits in tension with the standing "enemy cleanse <
  cheapest DoT output" mitigation (the cleanse should never out-tempo the
  cheapest re-application). The guardrails are real (never the last
  affliction, telegraphed branch, at most once per sequence pass) but
  none of them bound the VALUE removed, only the count.
- evidence: `combat.encounter.types.ts` `enemyCleanse` doc; the
  `applyCleanse`-based shed in `combat.engine.ts` (WS9 reactive cleanse
  block); witness `threat-branches.engine.test.ts` ("cleanses exactly one
  affliction... never the last") asserts instance count, not intensity.
- suggested fix: propose intensity-SHAVING as the follow-up — the cleanse
  removes N intensity from the chosen affliction (washing it out only at
  0) instead of the whole instance, so the shed price stays comparable to
  one cheap DoT application regardless of stack height. Needs a design
  pass on N (flat 1? per-branch payload?) and a re-run of the WS9 branch
  witnesses; until ratified, the current whole-instance shed stands.
- source: adversarial code review (2026-07-12)
- closed: moot (R10b2, 2026-10-02): its carrier (Tri-Eyes) was deleted in R2a and no player card stacks an affliction after the purge; nothing can be over-cleansed.

### [x] [MED] tooling / critique — after R3a, every state fixture boots off Act 1, so critique's gated screens show places no player can reach — RESOLVED 2026-10-01 (R7e, commit 1017c8d5; verified on screen pass 64)
- pass: 60 (commit 2d918845)
- viewport: both (coverage, not layout)
- category: navigation
- observation: R3a parked the northern maps and left fishing-village for
  R3b to delete, and v28 migrates any real save off those maps onto the
  Lantern Deep. The state-fixture registry was not touched. Of its 11
  fixtures, every one but `fresh-start` sits on `fishing-village` (6) or a
  parked map (`northern-forest` 2, `caverns` 2). Fixtures bypass the
  migration, so critique's dialogue, village, cutscene, rest, hazard and
  late-game-hub captures all show a map the player can no longer reach
  (for example "the Drowned Parish · Map i of ii" and Old Marrow). No
  fixture stands on the Breakwater, Charcoal Wood, Beacon Crags or the
  Lantern Deep, so the critique lens has not seen Act 1's gated screens or
  R3a's two sealed-door cutscenes. The R3 brief never mentions fixtures,
  and R3b deletes the map that `apprentice-fv-interaction`,
  `apprentice-fv-rest` and `sage-fv-boss-gate` stand on.
- evidence: `axiomancer-mechanics/src/Game/fixtures/state-fixture.registry.ts:34,43,53,67,78,90,99,109,118,128`;
  `.critique-artifacts/mobile/06-dialogue.txt` (Old Marrow),
  `11-late-game-hub.txt` ("the Drowned Parish"), `10-hazard.txt`
  (caverns' Flooded Undercroft); `plan/phases/phase_R3_world_reset.md`
  (no fixture item in R3a-R3c).
- suggested fix: re-point the fixtures at Act 1 nodes carrying the same
  screen kinds, including one on a sealed door (`ld-15` or `ld-18`). Do it
  in R3b alongside the fishing-village purge, or as a named R3b/R3c scope
  line, with `critique-drive.mjs` and `smoke-screens.mjs` following the
  new ids. Uses existing nodes only, so no content is created.
- update (pass 61, commit 0be3bb1c): half addressed. `apprentice-bw-rest`
  and `sage-bw-door-gate` now stand on the Breakwater, and the `fv-` ids are
  gone. Four fixture screens still boot onto parked maps: dialogue
  (`apprentice-nf-interaction`, nf-3), village (`wanderer-nf-village`,
  nf-8), cutscene (`wanderer-nf-cutscene`, nf-17) and hazard
  (`l30-caverns-hazard-arrive`, nc-17). Hazard can move now (the Breakwater
  has `bw-3` and `bw-12`), and so can the cutscene, using a sealed door.
  Dialogue and village have no Act 1 node of their kind yet (the registry
  comment says so, and so does the `plan/AUDIT.md` row "Act 1 has no shop").
- resolution (pass 64, commit c46565c3): R7e moved the last four. The
  dialogue, village and cutscene fixtures now stage neutral events on the
  Breakwater (`StateFixture.stagedEvent`), the hazard fixtures stand on
  `bw-3`, and the late-game hub reads "The Breakwater · Map i of iv". Every
  gated capture now shows Act 1. The staged dialogue, shop and cutscene
  print the R7e placeholder copy by design ("A placeholder line.", "Fixture
  Shop"; D58), so the critique lens judges their layout, not their voice.
- source: critique:drive (unattended)

### [x] [MED] fishing-village — the village still points the player at "the breakwater", which is now the first map they already walked — RESOLVED-STALE 2026-10-01 (map deleted in R3b, no commit)
- pass: 55 (commit bd517cf9)
- viewport: both (content, not layout)
- category: comprehension
- observation: since M3a a new game starts on the Act 1 map named "The
  Breakwater", and fishing-village is reached only after crossing all of
  Act 1. D33 (T, 2026-09-26) kept the map's name and ruled that
  fishing-village's lines must stop pointing at it, but reworded only two
  (`fv-6`'s boss description and the King's brutal-defeat line). The rest
  of the village still does. Its arrival scene says "Nobody here has
  hauled a full net since the breakwater went quiet." and "Whichever way
  you go, the breakwater is at the end of it." Old Marrow's offer (the
  dialogue screen this pass captured) says a great crab "has nested at the
  breakwater". The quest reads "Slay the King of Revenge holding court at
  the breakwater." The column-6 gate fight is "On the breakwater steps a
  skull...". A player who has just come from The Breakwater will read
  these as a sign to go back, or as a map that loops. The arrival scene
  also opens "You step out of the hovel", a new-game wake-up line that no
  longer fits a player walking in from the Lantern Deep or the Beacon Crags.
- evidence: `axiomancer-mechanics/src/World/MapEvents/content.ts` (`fvArrival`
  lines, about 954-959; `FV_ENCOUNTER_FOES['fv-28']`, about 649);
  `axiomancer-mechanics/src/World/Continents/Coastal-Village/maps.ts:79`
  (Marrow's `offer`) and `:382` (`startingQuest.description`);
  `axiomancer-mechanics/src/Enemy/enemy.library.ts:566,649` (King of Revenge
  lore); D33 in `plan/2026-09-25-refactor-strategy.decisions.md`;
  `.critique-artifacts/mobile/06-dialogue.txt`.
- suggested fix: finish D33 over the remaining fishing-village lines, using
  its own word, "the harbour wall" (or "the sea wall"). Reword the arrival
  scene's hovel line so it reads as arriving rather than waking. Add a
  test that no fishing-village player-facing string contains "breakwater".
  Keep the map name. Route through `content-curator` for the prose.
- resolution (pass 64, commit c46565c3): R3b deleted fishing-village, so
  none of the quoted lines ships. `Coastal-Village/` now holds only
  `breakwater.ts` and `charcoal-wood.ts`, and `MapEvents/content.ts` names
  fishing-village only in history comments. Pass 61 flagged it as moot.
- source: critique-drive (unattended, §3.5)

### [x] [LOW] combat — the pre-fight preview prints the foe's opening tell twice, word for word — RESOLVED 2026-10-01 (R7d, commit 2a727668; verified on screen pass 64)
- pass: 54 (commit 5d6eca56)
- viewport: both (375×812 and 1280×800)
- category: comprehension
- observation: on the "A FOE BARS THE WAY" preview, the Brine Hag's
  quote under its portrait ("They have heard kinder sermons than yours,
  and drowned anyway.") is repeated verbatim in the expanded PHASE 1 row
  as "🜲 stance hidden — They have heard kinder sermons than yours, and
  drowned anyway." The header quote is the current phase's `stanceHint`,
  and phase 1 is open by default, so every fight's preview repeats
  its opening tell. The second copy reads like a layout bug, and it
  buries the one piece of new information in that row (that the stance
  is hidden).
- evidence: `axiomancer-mobile/components/combat/encounter/CombatEncounterPanel.tsx:816`
  (header renders `vm.enemy.stanceHint`) and `:861` (phase row renders
  `p.stanceHint`); `axiomancer-mobile/state/presenters/combat-encounter.engine.ts:1532`
  (`vm.enemy.stanceHint` = the current phase's hint);
  `.critique-artifacts/mobile/03-combat.{png,txt}`.
- suggested fix: in the phase row, drop the hint when it equals the
  header's (show only "🜲 stance hidden"), or drop the header quote once
  the threat sequence renders the per-phase tells.
- resolution (pass 64, commit c46565c3): R7d removed the stance hint, so
  the preview no longer has a header quote. Phase 1's row prints the
  threat line once ("The Wet Congregation — ... (+11 damage).") at both
  viewports.
- source: critique-drive (unattended, §3.5)

### [x] [MED] village / inventory — every signet relic's flavor text restates the auto-generated "grants X" line verbatim — CLOSED 2026-09-29 (R4)
- pass: 53 (commit 82bbf241)
- viewport: both (375×812 and 1280×800) — reproduces identically at both
- category: voice
- observation: a relic's shop/inventory row prints two lines: a mechanical
  subtitle auto-built by joining stat modifiers with `grants
  ${signatureName}`, then the authored `description` flavor text below it.
  All 11 signet relics' authored descriptions end with the exact same
  "Grants <Signature Name>." clause the subtitle already states, so the
  grant is printed twice back to back. In the Glen Market shop alone, 3 of
  the 5 visible stalls show it: Gorgon Brand — "GRANTS THE STILLING" /
  "A blade that turns the argument to stone. Grants The Stilling.";
  Coldglass Aegis — "+5 MAX VITAE · GRANTS READ THE ENTRAILS" / "See the
  blow before it lands. Grants Read the Entrails."; Gambler's Knot —
  "GRANTS PRESS FATE" / "Bend fate on the bad dice. Grants Press Fate."
  Reads as a copy-paste residue rather than authored flavor, unlike the
  non-relic consumables on the same screen (Minor Healing Potion, Clarity
  Serum), whose flavor lines say nothing the mechanical line already said.
- evidence: `axiomancer-mobile/state/presenters/village.engine.ts:222-228`
  builds the subtitle via `parts.push(`grants ${signature}`)`;
  `axiomancer-mechanics/src/Items/relic.library.ts` — all 11 `RelicSpec`
  rows' `description` end with "Grants <Name>." (lines 69, 82, 100, 106,
  114, 123, 130, 137, 143, plus Capstone Maul/Ashen Cuirass). Captured via
  `critique:drive` pass 53, screen `village` (fixture
  `wanderer-nf-village`), both viewports
  (`.critique-artifacts/{mobile,desktop}/07-village.png`).
- suggested fix: drop the trailing "Grants <Name>." clause from each
  `RelicSpec.description` in `relic.library.ts` — the mechanical subtitle
  already carries the grant; the flavor line should read like the
  non-relic items' (world/mood only, no restated mechanics).
- source: critique-drive (unattended, §3.5)
- resolution: phase R4 rewrote every `RelicSpec.description` to what the
  relic now does ("Raise GUARD 5 for 4 Conviction.", the ring's befriend line);
  none repeats the grant the subtitle prints.

### [x] [LOW] combat — a DoT's paid-value chip word-wraps mid-token on the small hand-card face ("8/play" → "8/p" / "ay") — CLOSED 2026-09-28 (R0)
- pass: 49 (commit 94b6b96f)
- viewport: both (375×812 and 1280×800) — reproduces at both, worse on
  desktop where the card is otherwise unobscured by the fan overlap
- category: visual
- observation: on the small (non-inspect) hand-card face, a card whose
  paid clause is a DoT (e.g. Spoiled Poultice's POISON) renders its
  value chip as `${perTick}${unit}` (e.g. "8/play"). The chip's `Text`
  allows `numberOfLines={2}` at small size, and the container is narrow
  enough that RN's default word-break wraps *inside* the token instead
  of at the "/" — "8/play" breaks to "8/p" on one line and "ay" on the
  next, reading as a rendering glitch rather than the intended "8 per
  play" tick. The keyword line above it clips to "POIS" for the same
  reason. Short values ("+8", "12", "+5") never hit this because they
  fit on one line; only the longer DoT tick strings do.
- evidence: `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:2161-2170`
  — `paidValue` `Text` with `numberOfLines={large ? 1 : 2}`, `styles.paidValue`
  has no `maxWidth`/break-word override (line 2520); `axiomancer-mobile/state/presenters/combat-encounter.engine.ts:2729-2738`
  `clauseValue()` builds the DoT string as `${c.dot.perTick}${unit}${clock}…`
  with `unit` one of `/play | /hit | /payoff | /turn` — no non-breaking
  join between the number and the unit. Reproduced via `critique:drive`
  pass 49, screen `combat-board`, both viewports, card "Spoiled Poultice"
  in a 5-card hand (`.critique-artifacts/{mobile,desktop}/04-combat-board.png`).
- suggested fix: join the number and unit with a non-breaking space (or
  `wordBreak: 'keep-all'`/`hyphenationFrequency: 'none'` at the RN-web
  layer) in `clauseValue()`, or cap the chip at `numberOfLines={1}` with
  `adjustsFontSizeToFit` like the paid-apply line above it (line 676)
  so a too-long value shrinks instead of wrapping.
- source: critique-drive (unattended, §3.5)
- **CLOSED 2026-09-28 (R0):** re-verified against the grey library. No player card carries a DoT any more: the library is A Plain Blow (Deal 5), A Plain Ward (GUARD 5) and A Plain Word (VULNERABLE +25%) (`axiomancer-mechanics/src/Cards/library/starters.cards.ts`, D36). The same unjoined number-and-unit wrap now shows on A Plain Word's "+25%" and is tracked by the `plan/AUDIT.md` row "Post-purge: a staged A Plain Word wraps +25% mid-token".

### [x] [LOW] mechanics — akrasia swap-pool cleanse-while-Fallen tension knob needs matrix eyes — CLOSED 2026-09-28 (R0)
- pass: swap-pool fan-out residue (PR #130, 2026-07-18)
- viewport: n/a
- auth_state: n/a
- category: content
- observation: `absolution-on-account` and `the-wound-that-teaches` (swap-akrasia) deliberately CLEANSE while Fallen — the state is checked at play time, then walked back. A real tension knob per the designer, but it can read as anti-synergy confusion in play.
- evidence: swap-pool fan-out report §needs-user-call; designer note in the akrasia pool file.
- suggested fix: when the swap-pool measurement pass runs, watch these two cards' usage + FALLEN uptime; if the matrix shows confusion (played then immediately un-Fallen with no payoff), redesign toward pay-then-cash ordering.
- source: /deck-tuning fan-out session
- **CLOSED 2026-09-28 (R0):** moot. Both cards and the akrasia swap pool were purged (D36), and no swap-pool pass will run (D37).

### [x] [LOW] mechanics — fated-course engine hook survives its retired card as a test harness — CLOSED 2026-09-28 (R0)
- pass: D8 ship residue (commit 10ec4fe8)
- viewport: n/a
- auth_state: n/a
- category: engineering
- observation: `combat.engine.ts` (~lines 4011/4059) still keys the telegraph-forcing hook on `fated-course`, retired from the library in D8's ten-in/ten-out ledger. Unreachable in live play (no preset/reward fields the card), but `oracle-omen-v2.engine.test.ts` depends on it as its deterministic telegraph harness — swapping the id would destroy the guaranteed-hit assertions.
- evidence: fixture-sweep report, 2026-07-18; archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-18-d8-preset-dice-valves.md §Residue
- suggested fix: next oracle pass ports the harness onto a live card or a test-only hook id, then deletes the dead engine branch.
- source: ship-a-phase D8
- **CLOSED 2026-09-28 (R0):** moot as a standalone row. R7 deletes every carrier-less engine hook and the tests that load them (D50, `plan/revamp/engine.md`).

### [x] [LOW] data — Card Ledger dashboard + preset-metrics exports measure the PRE-D8 decks — CLOSED 2026-09-28 (R0)
- pass: D8 ship residue (commit 10ec4fe8)
- viewport: n/a
- auth_state: n/a
- category: data
- observation: `docs/reports/preset-metrics/2026-07-18-*.json` and the Card Ledger dashboard were measured on the pre-valve flag-on decks (and a 70-card library that no longer exists — the dead ten are retired, ten valves are live). Their triage verdicts remain historically valid but the preset rollups no longer describe the shipped decks.
- evidence: D8 gate rerun already shows different curves (standstill 50→59 blind-early).
- suggested fix: re-run the accumulation (both arms, two seeds) + republish the dashboard after the post-D8 curve-repair phase lands, so the next triage reads the real game.
- source: ship-a-phase D8
- **CLOSED 2026-09-28 (R0):** moot. The presets are gone (D36) and the deck-matrix baseline, the tuning-lab pages and preset readings are retired until the retune (D57, R1).

### [x] [LOW] card-editor cannot edit the three new mechanic fields — CLOSED 2026-09-28 (R0)
- pass: session-closeout 2026-07-12 (commit ffadca96)
- viewport: desktop
- category: tooling
- observation: the card-editor UI has no inputs for the three mechanic
  fields added this session: `grant_pip.overflow`,
  `spend_all_pips.markPer`, and `synergy.statePredicate`. Cards using
  them can only be authored by hand-editing JSON/TS.
- evidence: `axiomancer-card-editor` form components lack the fields;
  the mechanics exist in `axiomancer-mechanics/src/Cards/types.ts`.
- suggested fix: add the three fields to the editor's mechanic form
  (enum/number/checkbox as appropriate).
- source: session closeout
- **CLOSED 2026-09-28 (R0):** moot. The card editor is deleted (D56, R1); its successor is the B5 card-creator workflow, and the three fields' mechanics are deleted in R7 (D50).

### [x] [MED] general — rethink early-game as canned preset-deck tutorial, defer deckbuilding to labyrinth choice — CLOSED 2026-09-28 (R0)
- pass: user-jot (commit 63cfb3ba)
- viewport: unspecified
- auth_state: anonymous
- category: design
- observation: for the early game / "child" levels, potentially remove the deck-building aspect entirely. Instead each battle is a canned tutorial introducing a new preset deck, teaching each mechanic in a controlled vacuum. Pre-maze gameplay is really just the tutorial: "build a boat" -> "sail to friend" -> "go to labyrinth". The labyrinth is when the player commits to which deck they want to start the game with, which dictates their reward offering for the labyrinth. When the player completes the labyrinth and lands in the new city, they gain the ability to switch base decks post-labyrinth and trade their current deck for a new mid-game deck (since during the labyrinth they earn card rewards focused on their current deck's theme).
- evidence: user-spotted at 2026-07-08T18:36:36Z
- suggested fix: [user has not specified — iterate to determine]. Related: build-plan Phase 17 (quest-board tutorial) was dropped via `/oversight` 2026-07-10 because its narrow scope overlaps this rethink — the correct next step is to route this design idea through `/iterate` or a design skill and re-derive any per-minigame tutorial phases from whatever it lands on.
- source: user
- **CLOSED 2026-09-28 (R0):** moot. The preset decks it was built around were purged (D36); every run deals the grey deck, and what the early game teaches with cards is decided in the owner-led card sessions (D37, B6).

### [x] [LOW] small hand-card face clips authored paid text at 3 lines — CLOSED 2026-09-28 (R0)
- pass: session 2026-07-17 (card-text work)
- viewport: mobile hand card (132×194)
- category: ui
- observation: authored paid sentences render up to 5 lines on the
  large/inspect face (`numberOfLines large ? 5 : 3`) but ellipsize at
  3 lines on the small hand card; longer rares (e.g. The Closing
  Word) are unreadable until inspected. May be acceptable (the owner
  doctrine says the overlay is the reading surface) — filed as an
  owner call, not a defect.
- evidence: `CombatBoard.tsx` OutcomeText numberOfLines.
- suggested fix: owner call — bump small-face lines to 4-5 (layout
  risk: name/glyph crowding) or keep 3 and accept the ellipsis.
- **CLOSED 2026-09-28 (R0):** re-verified against the grey library. The three surviving paid lines ("Deal 5.", "GUARD 5.", "VULNERABLE +25% for 2 turns.") are one line each, so nothing reaches the 3-line clip (D36). The owner call returns only if the card sessions (B6) author longer paid text.

### [x] [MED] general — rebuild the retired tuning/playtest commands later — CLOSED 2026-09-28 (R0)
- pass: user-jot (commit cc26613c)
- viewport: unspecified
- auth_state: anonymous
- category: observation
- observation: Rebuild the retired tuning/playtest commands (deck-tuning, hazard-tuning, world-tuning, combat-ux-tuning, critic-loop, deep-playtest, hermes-playtest, dep-upgrades — retired in trim T5, D10) once the mechanics settle: after the D4 stat hooks + damage-scaling formula and the card rework. Recover old doctrine with `git show c7de2d6d:.claude/commands/<name>.md`; rebuild fewer, merged loops, not eight.
- evidence: user-spotted at 2026-09-25T20:06:40Z
- suggested fix: [user has not specified — iterate to determine]
- source: user
- **CLOSED 2026-09-28 (R0):** superseded by THE REVAMP. R0 rewrote `/combat-playtest` around the S3 questions, the baseline stays retired until the retune (D57), and the XP retune is phase R9; any further tuning loop is planned after the rebuild sessions, not by the loop now (D58).

### [x] [MED] dialogue — T6 left four "you have changed" replies ungated, so a first meeting says "since we last spoke" — RESOLVED 2026-09-28 (adjust-npcs pass 21)
- pass: 58 (commit 36238fd8)
- viewport: both (content, not layout)
- category: comprehension
- observation: four trees had a reply that only showed when the player's
  alignment cell had moved since their last talk
  (`playerAlignmentCellChangedSince`). T6 removed the gate and kept the
  reply, per its "ungated, not deleted" rule. Those replies now show on the
  very first meeting. The dialogue screen this pass captured is Old
  Marrow's greeting, which offers "(Stand quietly. He looks up and sees who
  you have become.)" to a stranger he has just met. The reply leads to
  "Something's moved in you since we last spoke." The same happens with
  Captain Blackwater ("He sees how you deal differently now." -> "Your manner of
  dealing has shifted, since we last spoke."), the fisherman's daughter
  ("Something's different in you, since we last spoke.") and the
  Northern-Forest Keeper. With alignment gone, nothing can make these
  replies true.
- evidence: `axiomancer-mechanics/src/World/Continents/Coastal-Village/maps.ts:59`
  (Marrow, `observer_recognition`);
  `axiomancer-mechanics/src/World/Continents/Coastal-Village/npcs.ts:30,154,192,389`;
  `axiomancer-mechanics/src/World/Continents/Northern-Forest/npcs.ts:30`;
  `git show 67fd0106` (the removed `requires: { playerAlignmentCellChangedSince: true }`);
  `.critique-artifacts/mobile/06-dialogue.txt`.
- suggested fix: delete the four recognition replies and their target nodes,
  since they belonged to the deleted system. Or gate them on something that
  is still true, such as having finished that NPC's quest.
- source: critique:drive (unattended)
- resolution: took the first suggested fix. D39 removes "the dialogue gates
  and read-backs that use" alignment, and the observer cache was deleted in
  T6, so these replies are that system's read-backs. The retired replies and
  their target nodes are Old Marrow `observer_recognition`, Blackwater
  `merchant_recognition`, the Daughter `growth_recognition`, and three the
  row did not list: the Shrine Keeper `observer_transformation`, the
  Chronicler `scholar_observation` and the Wandering Philosopher
  `philosophical_recognition`. That is all six sites where T6 removed
  `playerAlignmentCellChangedSince`. The ~30 formerly `requiresAlignment`-gated
  topic replies stay, because they claim nothing about the past. Pinned by
  `continents.engine.test.ts` ("no staged NPC claims to remember a change")
  and the updated mobile `event.engine.test.ts` Blackwater case.

### [x] [MED] hazard — every hazard intro narrates the player as "he", while the rest of the game says "you" — RESOLVED 2026-09-27 (commit 9cf50a65)
- pass: 56 (commit 16fb2990)
- viewport: both (content, not layout)
- category: voice
- observation: the hazard card that opens every crossing speaks about the
  player in the third person, as a man. Ashfall Crossing (the fixture
  `l30-caverns-hazard-arrive`): "It fills his bootprints behind him, then
  his lungs. ... It will not even notice him." All six authored hazards do
  the same: "He will join them" (cracked cliff), "faster than he can climb
  them" (the flooded crypt), "His body has begun eating itself" and "He
  dies walking" (starvation), "They have his scent, his pace, and his
  road" (bandits), "Men twice his size ... He has a day" (fever). Every
  other narrated screen addresses the player directly: the rest stop ("You
  stop to bind your wounds"), the fishing-village arrival ("You step out of
  the hovel"), the combat tells ("sings your mercy back"). So on the one
  screen where the stakes are highest, the game switches to a stranger,
  and it fixes that stranger as male whichever preset is playing. Spec 34
  §2.5.4 (MB-4) permits second person for instructing and pricing, and a
  hazard intro prices a death, so "you" is allowed here.
- evidence: `axiomancer-mechanics/src/World/Hazard/hazard.content.ts:550,566,582,598,614,630`
  (the six `intro:` strings); `.critique-artifacts/{mobile,desktop}/10-hazard.{png,txt}`;
  `axiomancer-mechanics/specs/34-dark-fantasy-campaign.md` §2.5.4 (MB-4)
  and §2.2 V-7 (second person may never flatter, so "you" must not turn
  these into "you are the last hope").
- suggested fix: rewrite the six intros in the second person, keeping
  their cold, priced shape ("It fills your bootprints behind you, then
  your lungs."). Route the prose through `content-curator`. Add a test
  that no `HazardDef.intro` contains a gendered third-person pronoun
  (he/him/his/she/her).
- source: critique-drive (unattended, §3.5)
- issue: #405

### [x] [MED] title — the title screen still promises the fishing village, but a new game now opens on the Breakwater — RESOLVED 2026-09-26 (commit 1f5fa3b3, test pin 048eef75; verified on screen passes 55-56)
- pass: 54 (commit 5d6eca56)
- viewport: both (375×812 and 1280×800)
- category: comprehension
- observation: the first screen a player sees ends with the line "Your
  path begins in the fishing village, where travelers gather before
  venturing into the realms beyond." Since map revamp M3a (`dd204684`,
  D27) a new game starts on the Breakwater, "a walled harbour on a storm
  coast" whose start node is a windmill. The fishing village is now only
  reachable later, across the river bridge. So the title makes a promise
  the next screen breaks, at the moment a first-time player is building
  their picture of the game. The line is also hardcoded in the component,
  which breaks the package rule that player-facing copy must not be
  hardcoded in components.
- evidence: `axiomancer-mobile/components/TitleScreen.tsx:104-105`
  (literal JSX string); `.critique-artifacts/{mobile,desktop}/01-title.png`
  and `01-title.txt`; `axiomancer-mechanics/src/World/Continents/Coastal-Village/breakwater.ts`
  (header: "A new game starts here (D27)").
- suggested fix: derive the line from the engine's `STARTING_MAP`
  definition (its name/description), or at minimum reword it to the
  Breakwater and move it out of JSX into the copy module the rest of the
  title uses, so the next start-map change cannot make it stale again.
- source: critique-drive (unattended, §3.5)

### [x] [HIGH] exploration — the late-game hub's node-graph map renders completely blank on mobile — RESOLVED 2026-09-24 (commit 2dfcafeb, issue #366)
- pass: 48 (commit 87a8b6fc)
- viewport: mobile (375×812); desktop (1280×800) unaffected
- category: navigation / mobile
- issue: #366
- observation: booted the `sage-fv-boss-gate` fixture ("the Drowned
  Parish", 28 nodes · 20 sealed) at both viewports via
  `critique:drive`. Desktop renders the full hex node graph — nine
  visible nodes, connecting roads, the "NODE GRAPH" compass mark, all
  centered in frame. Mobile shows only the header (VITAE/GRACE bars),
  the "the Drowned Parish" title, the "NODE GRAPH" label, and the
  legend/count text ("28 nodes · 20 sealed") — the entire graph area
  between them is solid black. No nodes, no edges, no backdrop plate
  render. The "Tap a glowing node to travel — drag or pinch the chart"
  hint floats over empty space with nothing to tap.
- evidence: `axiomancer-mobile/.critique-artifacts/mobile/11-late-game-hub.png`
  vs `desktop/11-late-game-hub.png` (pass 48); DOM text
  `mobile/11-late-game-hub.txt` confirms the node data loaded ("28
  nodes · 20 sealed") despite nothing rendering — this is a render/
  camera-fit gap, not a data gap.
- **root cause, found 2026-09-24:** not the `MIN_SCALE` floor or the
  first-layout-wins `viewport` capture this row originally suspected —
  both were re-verified live and are correct. The real defect:
  `computeFocusTransform`'s `tx`/`ty` (`MapCanvas.tsx:98-123`) assume the
  canvas `Animated.View`'s scale pivots around its own TOP-LEFT corner.
  React Native's (and CSS's) actual default `transformOrigin` is the
  element's CENTER. Invisible whenever the fitted scale lands at 1
  (desktop always does — `Math.min(1, …)` caps it there), but on this
  fixture's measured 355×474 mobile wrap the fit clamped to `scale: 0.6`,
  and the origin mismatch threw the whole 936×1040 canvas almost entirely
  below the fold. Confirmed by direct DOM inspection of the exported web
  build (`getBoundingClientRect()` + the computed CSS `transform` matrix)
  against a throwaway Playwright probe, not by re-reading the math alone.
- **fix:** `transformOrigin: '0 0'` on the `canvas` style, matching the
  pivot the math already assumes (precedent already in the codebase:
  `CombatCombatantPane.tsx`'s `transformOrigin: 'center bottom'`).
  Regression test pins the style (`MapCanvas.test.tsx`, CRITIQUE pass 48).
  Verified visually via `critique:drive` on both viewports post-fix —
  mobile now shows the full 8-node focus set centered; desktop unchanged.
- source: critique pass 48 (unattended `/march` tick, `critique:drive`
  transport)

### [x] [MED] combat — Phase 97's "tap a card to read it" hint never shows for the truncated hand fan it was built to fix — RESOLVED 2026-09-20 (burn-day audit row 3.13)
- pass: 42 (commit bbd22a94)
- viewport: mobile (375×812) — the hand-fan truncation this hint
  addresses doesn't occur on desktop (1280×800), so the gap is
  practically mobile-only
- category: comprehension / legibility
- observation: Phase 97 (RESOLVED row below, commit cecae8f, issue
  #343) fixed the mobile hand fan's name *occlusion* by capping
  `plateName`'s width to the visible sliver (`namePeek`) so covered
  names wrap/truncate instead of being painted over, and shipped a
  visible line — `{deadTray ? '...' : 'drag a die onto your card ·
  APPLY to commit · tap a card to read it'}` — advertising the
  already-wired tap-to-inspect escape hatch. That line only renders
  inside the `stagedCards.length > 0 && !stagedCards.some(assigned) &&
  ...` branch (`CombatBoard.tsx:1546-1556`) — i.e. only after a card
  has already been dragged up to stage. The hand fan itself
  (`CombatBoard.tsx:1677-1706`, where `HandCard` receives `namePeek`
  and the truncation actually happens) carries the same tap gesture
  and an `accessibilityHint="Drag up to stage, or tap to read"`
  (line 1690), but no on-screen text — a sighted player looking at
  "CHILBLA IN..." / "THE LONG..." / "SPOILED POULT..." in the fan has
  no visible cue that tapping reveals the full name; they have to
  already know, or discover it by accident, before staging the very
  card whose name they couldn't read. This reproduces on a fresh
  `Brine Hag` opening hand with no staged cards yet, i.e. the exact
  moment the hint is needed.
- evidence: `axiomancer-mobile/.critique-artifacts/mobile/04-combat-board.png`
  (hand row: "THIN HYMN", "CHILBLA IN...", "THE LONG...", "SPOILED
  POULT...", "CHILBLAIN WATCH"); `04-combat-board.txt` confirms
  untruncated names ("Chilblain Watch", "The Long Lent", "Spoiled
  Poultice"); `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:1546-1556`
  (hint gated on staged cards), `:1677-1706` (hand fan, no visible hint),
  `:1690` (a11y-only hint on hand cards).
- suggested fix: surface the same visible line (or a shorter variant)
  whenever the fan contains a card whose `namePeek` is non-null and no
  card is yet staged — e.g. extend the existing `stageHint` `Text` to
  also render for `fan.some((c, i) => i !== fan.length - 1)` before
  anything is staged, reusing the string that already exists at
  `CombatBoard.tsx:1554`. Component: `CombatBoard.tsx` (`stageHint`,
  hand-fan render block).
- source: loop
- resolution (burn-day audit row 3.13, 2026-09-20): the row reproduced exactly
  as filed, and the audit had found the same thing independently — this row and
  audit row 3.13 are one finding, closed here once. The hatch now renders on the
  fan itself: a `styles.fanHint` line inside the hand dock, gated on
  `fan.length > 1 && !cardDragLive`, which is precisely the condition under
  which `HandCard` receives a non-null `namePeek` — so the sentence is on screen
  exactly while a name is being clipped, and gone once nothing is covered. The
  suggested fix here was to extend the existing `stageHint` and reuse its
  string; the audit split it instead, because the string was also 67 characters
  inside `numberOfLines={1}` at 12pt and RN ellipsizes the TAIL — so `tap a card
  to read it` was the clause being dropped even in the staged branch where it
  did render. The staged line is now `drag a die onto your card · APPLY to
  commit` (43 chars) and the fan line `tap a card to read it` (21), each guarded
  against a 56-character one-line budget. `ellipsizeMode` was deliberately NOT
  added: RN already defaults to `'tail'`, so the ellipsis was never the bug.
  Guards in `CombatBoard.handfan.test.tsx`, all three verified red first: the
  hatch is present with `stagedUids={[]}`, both hint lines fit their line, and
  a tap driven through the gesture's registered test id reaches `onInspect`.

### [x] [HIGH] process — a committed playtest bug report reached `main` filed NOWHERE in `plan/` — RESOLVED 2026-09-19 (phases 99-100)
- pass: burn-day player-visibility sweep 2026-09-19
- viewport: n/a
- category: meta / process
- observation: `axiomancer-mobile/docs/reports/PLAYTEST_BUGS_2026-09-18.md`
  (committed 2026-09-18, `1d48483`) is a hands-on playtest bug hunt carrying
  FOUR root-caused, reproducible bugs — one of them critical (every returning
  player with a save got a permanently blank screen on launch). `grep -rn
  'PLAYTEST_BUGS' plan/ .claude/` returned **zero hits**: no CRITIQUE row, no
  AUDIT row, no `PHASE_CANDIDATES.md` row, no build-plan row. No loop verb
  reads `axiomancer-mobile/docs/reports/`, so nothing in the autonomous loop
  could ever have picked this up. All four bugs were still live at HEAD a day
  later, and would have stayed live indefinitely.
- evidence: the report itself; the zero-hit grep; all four bugs re-verified
  against the tree at `b9acf40` before being fixed.
- resolution: the four bugs shipped as Phase 99 (BUG-02 blank screen, BUG-03
  save-on-exit) and Phase 100 (BUG-04 map camera, BUG-01 legend counter). This
  row exists so the PROCESS gap is visible rather than silently closed along
  with them.
- **`[needs-user-call]` — the process gap itself is NOT fixed.** A
  hand-written report under `<package>/docs/reports/` is invisible to the
  loop by construction. Options for `/oversight`: (a) require every report
  landing there to file a matching `plan/CRITIQUE.md` row in the same commit;
  (b) teach `/iterate` (or `/march`'s triage step) to sweep
  `*/docs/reports/*.md` for unfiled findings; (c) accept that reports are
  human-only artefacts and route them through `/jot`.
  **T ruled 2026-10-19: (b)**, the loop sweeps `*/docs/reports/*.md` for unfiled findings
  (Phase RS1). Until one is chosen,
  the next hand-written report will go the same way.
- source: loop (burn-day sweep)

### [x] [MED] combat — the mobile hand fan overlaps card-name bands, hiding the covered cards' names — RESOLVED 2026-09-19 (Phase 97, commit cecae8f, issue #343)
- pass: 37 (commit 7d470de1)
- issue: #343
- viewport: mobile (375×812) — confirmed absent on desktop (1280×800),
  same encounter/hand
- category: visual / legibility
- observation: `Brine Hag`'s opening hand ("Thin Hymn", "Chilblain
  Watch", "The Long Lent", "Spoiled Poultice", "Chilblain Watch") fans
  five cards left-to-right on mobile with each card's name band
  overlapped by the next card. Only the rightmost (topmost z-order)
  card shows its full name; the other four read "THIN HYM", "CHILBLAI",
  "THE LONG", "SPOILED " — the overlap physically covers the tail of
  the name, not a text-wrap truncation (`CombatBoard.tsx`'s
  `plateName` is `numberOfLines={2}` with an explicit comment that
  long names should wrap rather than truncate to a stub). On desktop
  the same hand renders with enough per-card width that all five names
  are fully legible. This is the same root-cause shape as the
  fanned-hand issue just fixed on the hazard route-choice screen
  (`RouteSelect.tsx`, RESOLVED 2026-09-11, commit 8f3acef7, issue
  #295: fan overlap covering text, not a wrap limit) — that fix did
  not touch this component.
- evidence: `axiomancer-mobile/.critique-artifacts/mobile/04-combat-board.png`
  (crop of the hand row shows "THIN HYM|CHILBLAI|THE LONG|SPOILED |CHILBLAIN WATCH");
  domText `04-combat-board.txt` confirms the untruncated names are
  "Thin Hymn" / "Chilblain Watch" / "The Long Lent" / "Spoiled
  Poultice"; desktop `04-combat-board.png` shows all five full names.
- suggested fix: widen the mobile hand's per-card overlap/spacing (the
  same lever `RouteSelect.tsx` used — `-32` to `-22` overlap) or wire
  the existing `CardDetailOverlay`/inspect tap pattern onto covered
  hand cards so a player can always read a name before playing a die
  into it. Component: `components/combat/encounter/CombatBoard.tsx`
  (`plateBand`/`plateName`, hand-row fan layout).
- source: loop


- resolution (Phase 97, 2026-09-19): the row's own suggested fix — copy the
  RouteSelect `-32` -> `-22` precedent — could not transfer. CombatBoard has no
  flat margin (the overlap is derived by `handFanLayout` since the 2026-09-12
  S1-board-C11 repair), and the geometry lever is exhausted: the fan must satisfy
  `120 + 4*step <= 375`, capping `step` at 63.75 against the shipped 57.75, so
  widening the overlap buys about ONE character before the outermost cards run
  off the phone. Diagnosed instead as OCCLUSION rather than truncation —
  `plateName` is already `numberOfLines={2}` and already wraps, but was laid out
  across the full 95pt column and then painted over by an opaque neighbour
  (`zIndex: i` ascending), leaving 40.25pt visible. Fixed by sizing the name BOX:
  new `NAME_BAND_LEFT_CHROME` (17.5, derived from the four styles it sums) and
  `nameColumnPeek(step)`, threaded to `CombatCardFace` as an optional `namePeek`
  that caps `plateName`'s maxWidth so the name wraps inside the visible sliver.
  `handFanLayout` was left byte-identical, so the C11-R/C11-R2 geometry
  invariants stayed green untouched rather than being re-derived. Also shipped
  the precedent's second half: the board now states "tap a card to read it"
  visibly — the tap path was already wired but lived only in an
  accessibilityHint. New 10-test guard suite
  `CombatBoard.handfan.test.tsx`; combat-encounter 31 suites / 186 tests green.
- residual, and the reason this row STAYS resolved (burn-day audit row 3.13,
  2026-09-20): re-captured at 375x812 on the same Brine Hag opening hand, the
  fan now reads `THIN HYMN / CHILBLA IN ... / THE LONG ... / SPOILED POULTI... /
  CHILBLAIN WATCH`. That is this row's complaint answered — the names are no
  longer PAINTED OVER, which is what "hiding the covered cards' names" meant and
  what the pass-37 through pass-41 captures showed — but it is not "every name
  reads in the fan". The visible sliver is 40.25pt and `plateName` is 13pt/15pt,
  so a covered card affords roughly nine or ten uppercase glyphs across its two
  lines and anything longer ellipsizes: `FROSTBITTEN PALISADE` truncates, it
  does not read. No new Pending row is filed for that, because no lever is left
  that this row could ask for. The geometry is exhausted and pinned
  (`120 + 4*step <= 375` caps `step` at 63.75 against 57.75, and C11-R / C11-R2
  in `CombatBoard.fresh-eyes-repair.test.tsx` hold it there); the name box is
  already sized to exactly the peek; and the way to read a long name in full is
  the tap hatch, which as of this audit is finally ON the fan, in the same frame
  as the truncation — see the row closed above. If the loop ever wants full
  names in the fan itself, that is a different change with a different cost (the
  vertical-stagger lever in Phase 97 decision 8, already filed as a follow-up
  there), not an unfinished piece of this one.

### [x] [MED] combat — the arena's art registers are incoherent (painted foe, flat-vector dice, mono chrome) — RESOLVED 2026-09-19 (Phase 89, commit 6137ca5b; residual is the backdrop row below)
- pass: expo playthrough 2026-09-04 (owner-requested full-combat playtest, web export at 390x844)
- viewport: 390x844
- auth_state: fresh save, first map encounter (Brine Hag)
- category: visual
- observation: three unrelated art vocabularies share one screen — a painterly
  enemy portrait, flat-vector dice with saturated primaries, JetBrains-mono
  HUD chrome, plus a purple ruined-city backdrop behind a coastal foe (the
  pass-23 backdrop row, still open). None is wrong alone; together the board
  reads as a prototype. Not a code fix: it needs an art-direction decision
  (one register, then re-key the dice/HUD to it) before any asset work.
- evidence: `screenshots/playtest/` captures from the 2026-09-04 run
- suggested fix: art-direction pass — pick the painted register (the portraits
  are the most finished asset) and restyle the dice faces + chip chrome
  toward it; fold the pass-23 backdrop row into the same pass.
- source: owner playtest

- resolution (verified 2026-09-19): Phase 89 (`6137ca5b`, 9 files, +76/-35)
  shipped both surfaces this row named as fixable — the CombatDie shell faces
  got a woodcut cross-hatch clipped to their polygons plus an inner hairline
  rule, and `FONTS.mono` is now RESERVED for bare numeric readouts across the
  eight combat-encounter files (19 mono call sites remain against 121
  sans/serif). The board no longer reads as three unrelated vocabularies.
- DIVERGENCE this row's text does not anticipate, recorded honestly: Phase 89
  deliberately chose the **Woodcut Codex ink/hairline** register, NOT the
  "painted register" this row's suggested fix named. Painted enemy-portrait
  bitmaps (Phase 88) are untouched and literal painted-bitmap dice are deferred
  to a V4/V7 asset-acquisition phase. So three vocabularies were reduced to two
  by a shared ink language rather than collapsed to one. That is an owner-level
  art-direction judgement, not a measurement — flag it at the next `/oversight`
  if the painted register was meant literally.
- this row's second instruction — "fold the pass-23 backdrop row into the same
  pass" — was NOT honoured by Phase 89 (its only change to
  `CombatCombatantPane.tsx` is a 2-line font swap). That work is tracked on the
  backdrop row below, which stays open as PARTIAL.

### [x] [HIGH] combat — user crash on ACCEPTING the post-combat card reward (second unreproduced crash report) — RESOLVED 2026-09-19 (verified closed; CI gap closed by Phase 98, `51fede4`)
- **LIKELY THE SAME BUG — RESOLVED 2026-09-04 (verify before closing).** The
  row below was root-caused to a Reanimated worklet calling a plain JS
  function (`EnemyActionCard.tsx`, fixed). Its signature matches this one
  exactly: native-only, unreproducible on web, a hard process close rather
  than an ErrorBoundary. The reward overlay mounts animated views on the
  same post-combat beat. Keep this row open only until the owner plays the
  fixed build through a victory + ACCEPT without a close; Sentry now reports
  it automatically if anything remains.
- pass: user-jot 2026-08-29 (session: card-design check-in)
- viewport: unspecified (user's own device/build — platform not yet known)
- auth_state: real progression save
- category: functional
- observation: the user reports "the game crashes after a successful
  combat and I accept the card reward". A dedicated web-build repro
  session could NOT reproduce it on latest main (0b39b120): the accept
  path (tap offer tile → CHOOSE THIS → TAKE CARD) was driven end-to-end
  in the LIVE encounter flow with the endgame preset (max level), the
  sage preset with a pending level-up (XP granted pre-fight, cascaded
  post-victory), then walked out through the summary — zero pageerrors,
  no error-boundary mount, next combat mounts clean with the accepted
  card in deck. A fresh-save organic run (village → Drowned Shrine →
  Black Cairn → Ash Mire boss) produced only defeats, so the organic
  low-level victory→accept case is still unwitnessed.
- evidence: root-caused a REAL harness hole while hunting: every prior
  `combat-round-e2e.mjs` run silently SKIPPED the reward draft —
  `combat-reward-confirm` is disabled until a tile is picked, and the
  aftermath walk never tapped a tile, so the accept path (the code path
  the user crashes on: `claimCombatRewardAction` mutates the player and
  re-renders the panel) had zero e2e coverage. Fixed this session: the
  walk now taps the first offer tile before the preview-select/confirm
  clicks, so every live victory run drives the ACCEPT path crash-strict.
- suggested fix: get the crash's identity from the user's device — the
  persisted log survives restarts: /dev (SELF → dev tools) → DIAGNOSTICS
  → PREV SESSION with domain ERROR (or PERSISTENCE) shows the last
  session's captured error; also whether it was the ErrorBoundary panel
  (+ its code) or a hard app close, and whether it is the native EAS
  build (react-native-svg / expo-image behave differently there than on
  web — the new PRINTED PLATE face and the reward preview both render
  Svg paths). Pin that case in `combat-round-e2e.mjs` once known.
  Related: the 2026-08-19 row below — same signature (user crash the
  harness cannot see), possibly the same underlying cause.
- source: user

- resolution (2026-09-19, burn-day verification pass): the row's own
  "verify before closing" instruction was carried out against the live tree.
  Four independent confirmations: (1) the Reanimated worklet root-cause fix IS
  present at HEAD — `EnemyActionCard.tsx` reads `shouldInstantSettleJuice()` on
  the JS thread and lets the worklet capture the resulting boolean, with the
  crash mechanism documented inline; (2) a STATIC GUARD for the whole class
  exists and the tree is clean — `npm run lint:worklets` reports "195 file(s)
  clean"; (3) `combat-round-e2e.mjs` now genuinely drives the ACCEPT path (it
  taps the first offer tile before the preview-select/confirm walk), and the
  live-mode variants that reach a victory run in CI; (4) Sentry (Phase 77) is
  wired end-to-end with a baked-in DSN, so a survivor reports itself. The
  sibling Done row records the same bug REPRODUCED and root-caused by Sentry on
  2026-09-04 at `com.swmansion.worklets.AndroidUIScheduler.triggerUI` in
  `EnemyActionCardTsx1`, which confirms this row's "LIKELY THE SAME BUG"
  hypothesis was correct.
- honest caveat on the close: the row's LITERAL close condition — the owner
  playing a fixed NATIVE build through a victory + ACCEPT without a close — has
  no in-repo record and remains UNVERIFIED. This row is closed on the
  fix + guard + coverage + telemetry evidence above, not on that playthrough.
  If the owner still sees a close on a current native build, reopen: Sentry will
  now carry the identity automatically.
- one real gap found while verifying, and fixed: the worklet guard had NO CI
  trigger of any kind — not in the mobile verify gate, not as a workflow step,
  and the root `npm test` that carries its unit suite runs nowhere in CI. The
  single guard standing between this crash class and `main` was local-only.
  Closed as Phase 98 (`verify-mobile.yml` now runs `npm run lint:worklets` and
  the guard's own unit test, and re-runs on any edit to the guard itself).

### [x] [MED] combat — the arena backdrop is region-keyed but only 1 of 7 regions has a plate — RESOLVED 2026-09-19 (phases 101 + 103)
- pass: 23 (commit c063ac48)
- viewport: mobile (375×812)
- category: visual
- observation: the live combat board's full-bleed arena backdrop is a
  single static image used for literally every fight
  (`axiomancer-mobile/components/combat/encounter/CombatCombatantPane.tsx:49`
  — `const ARENA_BG = require('@/assets/images/combat/arena-ruined-city.jpg')`,
  documented in the file's own header comment as "a storm-lit ruined
  city over a cracked stone floor"). The Brine Hag encounter captured
  this pass is entirely nautical/liturgical in its own text — "the
  drowned congregation", "They have heard kinder sermons than yours,
  and drowned anyway", "The sea breaks over the whole argument at
  once" — yet the player fights it in front of a generic cityscape
  with no water, dock, or coastal-village signifier anywhere in frame.
  Phase 44g just rethemed the coastal-village NPC dialogue prose to
  lean harder into this nautical flavor, which widens the gap between
  the (now more vivid) text and the fixed generic art rather than
  narrowing it.
- evidence: `axiomancer-mobile/.critique-artifacts/mobile/04-combat-board.png`
  (arena backdrop behind Brine Hag) + `03-combat.txt` (the encounter's
  own nautical/liturgical threat-sequence copy).
- suggested fix: out of scope for a one-line fix — this is a candidate
  for a dedicated art-asset or backdrop-selection phase (e.g. a small
  set of backdrops keyed to map/region, coastal-village first) rather
  than something `/iterate` should attempt piecemeal. Route via
  `/expand` if picked up.
- source: critique pass 23 (unattended, critique:drive artifacts)

- update (verified 2026-09-19, burn-day verification pass): PARTIAL, not open
  as originally written. The row's literal claim — "a single static image used
  for literally every fight", `const ARENA_BG = require(...)` — is no longer
  true. Phase 83 (`cb3b1c97`) replaced that single `require` with
  `arenaBackdropFor(region)` / `arenaAltTextFor(region)`, rendered under testID
  `combat-arena-backdrop`. The MECHANISM is shipped; the CONTENT is not.
- the measured residual: exactly ONE region rule is keyed (`/drowned parish/i`
  -> `coastal-village.webp`) against SEVEN live mobile regions, so six of seven
  still render the original ruined-city plate. Against the engine's map registry
  the ratio is 1 of 10 maps (three of which are dev-only Aporia labyrinth maps
  with no mobile layout). `assets/images/combat/` holds exactly TWO backdrops:
  `arena-ruined-city.jpg` (owner-supplied, licence UNRESOLVED per the file's own
  header) and `coastal-village.webp` (a V4-pipeline Dore plate).
- so the Brine Hag capture this row was filed on is now CORRECT — the coastal
  village is the one region that has its plate. The gap moved to the other six.
- Phase 83's own brief already names this residual verbatim as out-of-scope
  follow-up: "Arena plates for the remaining regions (caverns,
  connecting-river, northern-city, the-capital, northern-forest) — each its own
  curation decision". Each plate is an art-sourcing call (the Phase 78/88
  pipeline), not an engineering one, which is why this stays filed rather than
  being shipped by a loop tick. Note the outstanding licence question on
  `arena-ruined-city.jpg` should be resolved in the same pass.

- **RESOLVED 2026-09-19, in two phases, and the licence question with it.**
  - Phase 101 keyed The Northern City, The Connecting River and The
    Sweetheart's Village to their own Doré plates from the same edition as the
    coastal arena (1 of 7 → 4 of 7). It could go no further because
    `acquire-art.mjs` had no crop step, and the registers the remaining regions
    want exist only on *scanned pages* — caption bands, cream margins, the
    physical edge of the book. Hand-cropping outside the licence-proving
    pipeline defeats the one thing that pipeline exists to do, so it stopped and
    filed the tooling gap.
  - Phase 103 built that step (`detectPlateBox` / `buildPlatePage`, recipe
    `plate-page`, crop box recorded in provenance) and took The Caverns and The
    Capital. **Bespoke arenas are 6 of 7.** Only The Northern Forest is left,
    and it is no longer blocked on anything but finding the right plate.
  - The licence question is closed the way this row asked. `arena-ruined-city.jpg`
    is RETIRED, not documented: untraceable, licence UNRESOLVED, and on
    inspection saturated pixel art of modern high-rises among nine grayscale
    wood engravings — and, being the fallback, the most-seen arena in the game.
    THE OPEN GATE ¶6 makes that a loop call. Doré's "The New Zealander" (1873)
    replaced it; `assets/images/screens/index.ts` was repointed; the record was
    removed with the file.
  - Two holes in `scripts/asset-provenance.test.mjs` that let the deleted file
    stay referenced are closed (a `../` require was never swept; a `covers`
    entry was never checked against the disk), each proven to fail on the
    condition it claims to catch.
  - witness: `assets/images/combat/__tests__/index.test.ts` now asserts that NO
    live region reaches the fallback — the row's actual claim, rather than one
    example of it.

### [x] [HIGH] general — no mid/late equipment or signature skills exist for THE PATH's sixth axis — RESOLVED 2026-09-15 (Phase 85, commit 9f313d0c)
- pass: user-jot (commit 343d7e98)
- viewport: unspecified
- auth_state: anonymous
- category: content
- observation: we need to create a series of equipment/sig-skills and items for mid game and late game
- evidence: user-spotted at 2026-09-03T11:20:00Z
- suggested fix: [user has not specified — iterate to determine]
- source: user
- update (adjust-equipment pass 1, 2026-09-04): audited — the 8 relics are
  1:1-locked to the 8 existing signature skills, load-bearing per
  `relic.library.ts`'s own header; the 3 empty accessory kinds
  (head/hands/feet) can't be filled without designing new signature skills
  first. Filed as `[loop-call]` in `plan/AUDIT.md` (owner call needed on
  approach) rather than guessed at solo. Still open here.
- update (adjust-equipment pass 12, 2026-09-17): Phase 85 (2026-09-15,
  commit `9f313d0c`) shipped the owner-decided option (a) — 3 new signature
  skills (`sig-mounting-dread`/`sig-endless-labor`/`sig-unbroken-stride`)
  plus their carrying relics for `head`/`hands`/`feet`. `relic.library.ts`
  now ships 11 relics across all 6 `AccessoryKind`s, all `grantsSignature`
  values resolving in the live `SignatureSkillId` union. Closed.

### [x] [HIGH] late-stage global collapse — all 10 presets 0.00 late — RESOLVED 2026-09-15 (Phase 81)
- **RESOLVED (Phase 81, 2026-09-15).** The row's own 2026-08-08 reopen
  conditions — the card redesign landing, and Phase 43 defining a live
  objective function — have both happened. THE BIG NUMBERS REWRITE
  (2026-09-02) is the redesign; Phase 43 shipped, but its "objective
  function v2" is the repeal of having one at all —
  `axiomancer-mechanics/CLAUDE.md` § Load-bearing doctrine, pillar 3:
  *"There is no governing objective function any more: no win-rate
  curve, no CQI, no rank bands, no count pins, no status-engagement
  floor."* The row's 80/50/25-35/0 target band this row measured
  against is dead law. Separately, and mooting the doctrine question
  entirely: the measurement itself is stale. Fresh read of
  `axiomancer-mechanics/docs/reports/baselines/deck-matrix-baseline.json`
  (stamp `b123cdba`, measured 2026-09-15, `reduced-nightly` confidence,
  stale by one unrelated equipment-content commit) shows late-band
  aggregate win rate at **82.0%**, **zero of 48 late cells at 0%**
  (worst cell 13.3%, `the-abortive` vs the `turtle` sim policy). "All
  10 presets 0.00 late" has not been true since THE PATH (commit
  `515ac4d9`, 2026-09-02) moved the late band 9% -> 44% via card
  upgrades/deck tiers/CONDEMN rescale — a fourth lever, not any of the
  three this row's PHASE_CANDIDATES successor named and declined to
  pick. Full writeup: `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/phases/phase_81_late_campaign_difficulty_cliff.md`.
  Residual: the three weakest late cells (13-23%, all passive-policy
  shaped) are a legitimate small follow-up, not a design-level cliff —
  filed as a Follow-up in the phase brief, not a new HIGH.
- **PARKED behind the card redesign (/oversight 2026-08-08).** T, ruling
  on this row's Phase 39 successors: *"This is fine. We're working on a
  new card redesign anyway."* Do not pick this row, do not promote a
  phase off it, and do not author cards to move its numbers — the
  library it measures is transitional. It re-opens for assessment once
  the redesign lands and Phase 43 defines a live objective function.
- **SUPERSEDED AS A TARGET by the unshackling (/oversight 2026-08-08).**
  "All 10 presets 0.00 late" was a failure *against the status-dominance
  doctrine*, which T voided this day. Whether a 0.00 late win rate is
  still a defect is now an open question that **Phase 43** (objective
  function v2) answers — and normal damage, newly legal, is the most
  obvious lever if it is. Keep this row open as evidence; do not treat
  its 80/50/25-35/0 target band as live. The post-Phase-39 reading below
  is a faithful record of the measurement, but it measures the old law.
- **Phase 39 landed 2026-08-08 (commit `8d50591e`) but did NOT drain
  this row — the matrix is the witness, and it still reads a
  violation.** The digest's first post-Phase-39 baseline (reduced
  nightly, regenerated at `8eb33fb8` — see `plan/AUDIT.md`'s new
  "Doctrine-curve confirmation post-Phase-39" row for full numbers)
  reads blind policy-pick early 61.1% (unchanged) / mid 2.0% (up from
  0.0%, still a
  deep violation against ~50) / late 0.0% (unchanged) / impossible 0%
  (unchanged, correct) against the 80/50/25-35/0 doctrine. This
  corroborates Phase 39's own shipped `needs-user-call`: the mid/late
  cliff reads as engine/enemy-scaling shaped, not card-composition
  shaped (10/13 staple-duplication candidates were already fully
  deployed pre-Phase-39 and those presets still sat at 0% mid). Do NOT
  let `/iterate` pick this row for a partial card-level fix — per the
  original assignment, per Phase 39's own finding, and per this
  project's standing rail that engine constants are tuned manually
  (not via `/deck-tuning`), the next move is an owner-scoped call via
  `/oversight` on whether to open a dedicated mid/late enemy-scaling
  phase.
- pass: session-closeout 2026-07-12 (commit ffadca96)
- viewport: n/a
- category: design
- observation: every one of the 10 starter presets reads 0.00 win rate
  at the late stage, and the mid-stage ratchet clears only via erosion.
  The WS3/WS4 late gates FAILED on this global condition, not on their
  own cards — late-stage failure is currently unattributable to any
  individual card or theme.
- evidence: `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-11-honest-rebaseline-and-evidence.md`
  (honest re-baseline matrix). Doctrine curve target is late ~25-35%
  for starter presets (`axiomancer-mechanics/CLAUDE.md`).
- suggested fix: a dedicated late-stage tuning phase (global
  condition: enemy HP/threat scaling vs win-path throughput), not
  per-card forging; candidates via /expand.
- source: session closeout (evidence pass, 2026-07-11)

### [x] [MED] village — two shop wares print byte-identical effect lines at different prices — RESOLVED 2026-09-14 (commit f19afd0d, issue #307)
- pass: 37 (commit 7d470de1)
- viewport: mobile and desktop (both show the same text)
- category: comprehension / economy
- issue: #307
- observation: Glen Market's stall lists "Philosopher's Tea" (35s) and
  "Void Essence" (40s) with the exact same mechanical line — "ADVANTAGE
  ON BODY / MIND / HEART, 3 ROUNDS" — differing only in flavor text and
  a 5-shilling price gap. `consumable.library.ts` confirms both items
  share `effectId: 'buff_critical_damage_up'` with no `resourceGrant`
  or other field distinguishing them; the code's own comments say the
  items were intended to diverge (Philosopher's Tea: "sharpens the
  mind"; Void Essence: "Heart aligns with the void-essence flavor") but
  the Spec 05b Q3(B) ruling that dropped philosophical-token grants
  from consumables left both wired to the same generic effect. A
  first-time player facing this stall has no way to tell why Void
  Essence costs more — the shop states nothing it doesn't state for
  the cheaper item.
- evidence: `axiomancer-mobile/.critique-artifacts/mobile/07-village.txt`
  (`wanderer-nf-village` fixture); `axiomancer-mechanics/src/Items/consumable.library.ts`
  lines 94-140.
- suggested fix: either differentiate the two effects to match their
  authored flavor split (e.g. one buffs a single stat's advantage
  instead of all three), or collapse the price gap so the stall isn't
  charging more for an identically-worded effect. Equipment-lifecycle
  territory (`/adjust-equipment`).
- source: loop
- resolution: differentiated rather than collapsed the price gap. The
  engine's `advantageModifier.grantAdvantage` payload already supports
  single-stance grants generically, so this was a data-only addition:
  two new buffs in `buffs.library.json` (`buff_liars_gambit`, mind-only,
  for Philosopher's Tea's "sharpens the mind"; `buff_abyssal_presence`,
  heart-only, for Void Essence's "heart aligns with the void-essence
  flavor"), both modeled on the retired pre-v3 `buff_advantage_body`/
  `buff_advantage_heart` pair's numbers (duration 3, stacking none,
  resistDR 13, resist-stance rotated one step from the granted stance).
  `buff_critical_damage_up` (used by neither item after the rewire) is
  untouched. Added mobile keyword gloss entries and a regression test
  (`dead-consumable-payload.engine.test.ts`) pinning the two consumables
  to distinct effect ids and their own single-stance grants. Verify:
  `axiomancer-mechanics` 213/213 files, 3432/3432 tests, build green;
  `axiomancer-mobile` 299/299 suites, 2854/2854 tests, 3/3 snapshots,
  lint/typecheck/assets/art green.

### [x] [LOW] village — dimmed unaffordable stall items dim the item name along with the price — RESOLVED 2026-09-11 (issue #297)
- pass: session-critic 2026-08-31 (Phase V8 closure `/critic-loop`
  screenshot pass, `axiomancer-mobile/screenshots/audit-2026-06/after/28-village.png`)
- viewport: 390x844 (audit-capture rig)
- auth_state: 0 shillings
- category: visual / legibility
- issue: #297
- observation: stall rows for items the player can't afford (Minor
  Healing Potion, Antidote at 0 shillings) dim the item name and
  description text along with the price/CTA, making the description
  borderline hard to read. Combat's disabled-item pattern keeps the
  name bright and dims only the price/CTA.
- suggested fix: align the village stall row's disabled treatment with
  the combat pattern — keep item name bone/parchment-bright, dim only
  price/affordability cue.
- source: loop
- resolution: `app/village/index.tsx`'s `wareRow` no longer applies
  `opacity` across the whole row when unaffordable — a new
  `wareRowUnaffordable` style dims only the border color (`AXM.ash`),
  and a new `wareCtaDimmed` (`opacity: 0.6`) applies only to the price
  and struck-through base-price text. Item name/description stay full
  bone/parchment brightness. `disabled`/`accessibilityState` unchanged.
  Mobile verify green (260/260 suites, 2655/2655 tests, lint 0 errors,
  typecheck clean).

### [x] [LOW] dialogue — reply cards echo their label as an identical sub-line — RESOLVED 2026-09-11 (commit 393354c6, issue #296)
- pass: session-playtest 2026-08-28 (continent playtest, The Delver at
  caverns nc-2)
- viewport: 390x844
- auth_state: anonymous
- category: visual
- observation: each reply card renders its label in display type AND
  the same text again beneath it in caption type ("WHAT DO YOU WANT
  WITH THE IRON?" twice, "WALK ON." twice). Reads as a data echo, not
  a design choice; wastes a line per reply on small screens.
- suggested fix: in the dialogue screen/presenter, render the caption
  sub-line only when it differs from the label (or drop it — the
  authored tree likely supplies no distinct sub-caption and the
  presenter falls back to the label). Check whether every dialogue
  tree shows this or only trees authored without reply descriptions.
- source: loop
- resolution: `composeNpcDialogue` (event.engine.ts) sets narrative-
  choice `label`/`description` to the same source string re-cased, by
  design (combat-prelude choices already differ). Guarded both render
  sites (`app/dialogue/index.tsx`, `app/event/index.tsx`) so the
  sub-line only shows when it differs from the label, rather than
  touching the shared `EventChoice` type. Regression coverage added in
  `event.screen.test.tsx` for both screens. Verify green (mobile
  260/260 suites, 2655 tests).

### [x] [MED] hazard — the fanned route-choice hand truncates card names illegibly — RESOLVED 2026-09-11 (commit 8f3acef7, issue #295)
- pass: session-critic 2026-08-31 (Phase V8 closure `/critic-loop`
  screenshot pass, `axiomancer-mobile/screenshots/audit-2026-06/after/14-hazard-board.png`)
- viewport: 390x844 (audit-capture rig)
- auth_state: dev-seeded hazard node
- category: visual / legibility
- observation: the five route-choice cards fan out so tightly overlapped
  that most names truncate before the player can read the choice
  ("FAITH LE…", "BALANCE P…", "SCRAMB…"), so the hand preview doesn't
  actually let a player scan their options before committing to a route.
- suggested fix: widen card spacing in the fan, or reveal the full name
  on tap/hold before the route is chosen. Component likely under
  `components/hazard/`.
- source: loop
- resolution (2026-09-11, commit 8f3acef7, `/iterate` via `/march`): did
  both named options rather than picking one. `RouteSelect.tsx`'s
  opening-hand fan overlap went from a flat `-32` to `-22` (68px visible
  per card instead of 58, confirmed against the actual card names in
  `hazard.content.ts` — "BALANCE POLE"/"UNBROKEN OATH" etc. wrap fully
  within a card's 2-line name box at full width, so the old truncation
  was the physical overlap covering the text, not a text-wrap limit).
  Also wired the already-existing `CardDetailOverlay`/`onInspect`
  pattern (used by the live in-round hand in `HazardBoard.tsx`) onto the
  preview: each fanned card is now a `Pressable` that opens the same
  full-size detail card on tap, wired through `app/hazard/index.tsx`'s
  existing `detailCard` state — no new component, reused the live-hand's
  own inspect mechanism. Verify: `axiomancer-mobile` full gate
  (lint/typecheck/jest/assets/art) green, including two new
  `RouteSelect.test.tsx` cases pinning the tap → onInspect wiring.

### [x] [MED] exploration — open map nodes just off-screen no-op silently on tap; the map recenters against manual panning — RESOLVED 2026-09-10 (commit 6fe4e47c, issue #294)
- pass: user-session playthrough 2026-08-29 (commit 0b39b120)
- viewport: 420x900 (web export)
- auth_state: fresh save
- category: functional / UX
- observation: open (glowing) nodes that sit outside the viewport
  (e.g. Sea Cave at x=-46 on a 420-wide screen) accept the tap event
  but open no travel sheet — a silent dead tap with no feedback.
  Manually panning the map to bring the node into view fights an
  auto-recenter that pulls the camera back, so reaching an edge node
  takes several attempts. The node legend advertises "tap a glowing
  node to travel", which reads as a lie the first time it happens.
- suggested fix: either auto-pan the camera to a tapped off-screen
  node (then open its sheet), or clamp the initial camera so every
  currently-open node is in view; at minimum give the dead tap
  feedback (toast or camera nudge). Check the recenter behavior in
  the map canvas component for why manual pans are overridden.
- source: user (session playthrough)
- resolution: root cause was `MapCanvas.tsx`'s one-time initial-camera
  effect, unchanged since the finding's own pass date — it centred the
  focus (available + current) nodes' centroid at a fixed 1x scale, so a
  wide branch of simultaneously-open nodes could still leave the
  outermost one off-screen the instant the map opened (no code path in
  `onNodePress` actually drops an 'available' tap — the described "dead
  tap" was this off-screen unreachability, not a handler bug). Took the
  suggested fix's second option: `computeFocusTransform` now fits the
  whole focus bounding box into the viewport, zooming out (never in,
  and never past the pinch gesture's own 0.6 floor) just enough that
  every currently-open node starts on-screen. Auto-pan-on-tap (option
  one) was left undone — the initial-fit gap was the reproducible
  defect; a tap-to-pan affordance is separable follow-up if a future
  pass still finds nodes going out of frame after a move.

### [x] [MED] world — the Ash Mire boss sits three natural steps from a fresh spawn and flattens a level-1 pilgrim — RESOLVED-STALE 2026-09-10 (superseded by redesign, no commit — pre-existing since Phase 53c/65)
- pass: user-session playthrough 2026-08-29 (commit 0b39b120)
- viewport: 420x900 (web export)
- auth_state: fresh save, level 1
- category: functional
- observation: a brand-new run walked its most obvious open path —
  Crossing (quest) → Drowned Shrine (quest) → Black Cairn (gather) —
  and the next open node was Ash Mire, labelled "boss" on the map:
  The King of Revenge, 150 VITAE, 4 phases. It killed the level-1
  pilgrim (80 VITAE, starter deck) in four rounds. The node IS
  signposted as a boss, but it sat on the natural forward path with
  ordinary encounter/rest nodes still sealed around it, so the
  first real fight of the run can be an unwinnable one.
- suggested fix: audit the fishing-village unlock graph so at least
  one ordinary encounter/rest node opens before (or beside) the Ash
  Mire edge, or gate the boss edge behind more trodden nodes. Check
  the per-map doctrine in world-tuning for the intended first-fight
  difficulty curve.
- source: user (session playthrough)
- resolution: re-verified directly against current source (`Coastal-
  Village/maps.ts`, `MapEvents/content.ts`) before picking this row —
  the fishing-village unlock graph this finding describes no longer
  exists. Phase 53c/53d/60/61 rebuilt the map into a column-layered
  gauntlet where every node's kind/foe is now an explicit, pinned
  assignment (an unassigned node throws on import — no random rotation
  survives); the boss (fv-6, still `king-of-revenge`) sits four columns
  past spawn behind two branching columns of ordinary normal-difficulty
  encounters (Little Belle, Foot-Stealer, Water-Holger — none elite)
  and a GUARANTEED pre-boss rest node (fv-20, reachable from every one
  of the branch's five terminal nodes per the map's own routing
  comment) — exactly the suggested fix's "ordinary encounter/rest node
  before the boss edge" condition, already met. The boss is also pinned
  to `FV_BOSS_LEVEL = 3`, a deliberately low absolute level, with the
  map's own comment stating the reason verbatim: "so a fresh player can
  actually win the climax." The specific complaint (an unwinnable
  first-real-fight sprung on a fresh level-1 run) no longer describes
  the current map; not re-filed.

### [x] [MED] combat — the first map fight is an elite-tier foe with a 3-phase threat sequence — RESOLVED-STALE 2026-09-10 (superseded by redesign, no commit — pre-existing since Phase 53c/53d/61)
- pass: expo playthrough 2026-09-04
- viewport: 390x844
- auth_state: fresh save, first map encounter
- category: pacing
- observation: the very first fight (Brine Hag) opened with HIDE + RAVENOUS and
  a three-phase telegraph, before the tutorial had taught staging or the
  stance check. A new player reads two foe keywords, a fork glyph and a
  stance check on their first turn. The fight was won in the playtest, so
  the ask is cognitive, not mechanical.
- evidence: `screenshots/playtest/` 2026-09-04; `combat.mock.ts` deliberately
  mirrors this foe so the UI evidence tests see the same load.
- suggested fix: gate the first encounter of a fresh save to a one-phase,
  zero-keyword foe (or strip keywords from the first roll of the encounter
  table) and let Brine Hag be fight two. Engine-side: encounter table /
  first-encounter policy, not the UI.
- source: owner playtest
- resolution: re-verified directly against current source before picking
  this row (same investigation as the Ash Mire row above, both closed
  together — the fishing-village redesign resolved both at once). Brine
  Hag (still `difficulty: 'elite'`, still a 4-phase enemy deck in
  `combat.enemy-decks.ts`) has NO authored node assignment anywhere on
  the current fishing-village map (`grep` across `World/MapEvents/
  content.ts` for the slug: zero hits) — Phase 53c/53d/61 replaced the
  map's old random-rotation encounter draw with per-node pinned foes,
  and Brine Hag was never one of the ones re-pinned. The actual first
  three combat foes a fresh save meets are Little Belle (`difficulty:
  'normal'`, fv-13), Foot-Stealer (`normal`, fv-15), and Water-Holger
  (`normal`, fv-24) — none elite, none multi-phase-telegraph before the
  first ordinary fight. The specific complaint no longer describes the
  current map; not re-filed. Noted in passing, not chased here (out of
  scope for a pacing row): Brine Hag still sits in `EnemiesByMap
  ['fishing-village']`, but every fishing-village node's event pool now
  carries an explicit pinned `enemySlug`, so `generateEncounter`'s
  random-draw branch (the only path that would ever pick her from that
  array) looks unreachable for this map — a `/adjust-enemies` sweep may
  want to check whether her `mapName` field should move.

### [x] [HIGH] combat — user hit a mid-combat crash that 30 seeded UI runs could not reproduce — COVERAGE-COMPLETE 2026-09-10 (commit c51547ae, issue #277); crash itself still UNREPRODUCED on web
- **RESOLVED 2026-09-04 — REPRODUCED, ROOT-CAUSED, FIXED.** Sentry landed
  the crash within minutes of the first instrumented build:
  `CppException: Object is not a function`, fatal/unhandled, at
  `com.swmansion.worklets.AndroidUIScheduler.triggerUI` — a **Reanimated
  worklet**, in `EnemyActionCardTsx1` inside `useAnimatedStyle`.
  `EnemyActionCard.tsx` called `shouldInstantSettleJuice()` FROM INSIDE the
  worklet. Reanimated serializes a worklet's closure into a separate
  UI-thread runtime, where a plain JS function arrives as an OBJECT, not a
  callable; invoking it threw a C++ exception on the UI thread that no JS
  handler can catch, and Android killed the process. The card mounts on
  every END PHASE, which is why "it minimizes when I end my turn" was
  exactly reproducible for the owner.
- **Why 30+ seeded UI runs never saw it:** react-native-web's Reanimated has
  NO separate UI runtime, so the identical call just works on web. This was
  never a harness gap — it was a platform the harness cannot reach. The
  lesson is filed as a standing one below.
- **Fix:** read the flag on the JS thread and let the worklet capture the
  boolean (`EnemyActionCard.tsx`). Doubly correct — the helper reads a
  JS-thread global the UI runtime does not share.
- **Guard:** `scripts/check-worklets.mjs` + `check-worklets.test.mjs` (in
  root `npm test`) statically reject any plain-JS call inside a worklet
  body across mobile `components/`, `app/`, `lib/`, `hooks/`. Self-tested:
  it catches the original line, passes the fix, and does not fire on the
  comment prose that fooled its first draft.
- **Standing lesson:** a green web e2e is NOT evidence about native. Any
  crash report that the web harness cannot reproduce should go straight to
  device telemetry rather than another seed sweep — three reports and ~30
  runs were spent before Sentry answered it in one build.
- **Platform pinned 2026-09-03 (third report, this time on END TURN).** The
  owner confirmed both unknowns the rows above kept guessing at: it is the
  **EAS preview APK (native)** and the app **closes to the home screen** — a
  process death, not a caught JS throw, so the in-app ErrorBoundary can never
  see it and neither can any web harness. Ruled out on web the same session:
  the live map encounter played to a terminal outcome on 5 seeds, plus a
  pure END-TURN-only sweep (no card played, 5 seeds x up to 20 rounds) —
  zero pageerrors, zero boundary mounts. **Next step is a native stack**:
  `adb logcat -c && adb logcat *:E AndroidRuntime:V libc:V` while
  reproducing on the device. Until that lands, treat `react-native-svg` /
  `expo-image` / Reanimated (all divergent on native) as the suspect set.
  The hunt did surface two real defects on the way, both fixed — see the
  rune-column row.
- **Partial coverage extension shipped 2026-09-03 (commit 6529212a,
  issue #277).** `combat-round-e2e.mjs` gained `ENCOUNTER_KIND=boss` (arms
  the lowest boss foe instead of a standard encounter) and `WITHDRAW=1`
  (takes the reveal screen's retreat instead of entering combat), and CI
  now runs a boss+`PRESET=sage` (non-starter deck) pass plus a withdraw
  pass in both `verify-mechanics.yml` and `verify-mobile.yml`. Verified
  locally clean on seed 16 for both new axes. **Still open:** the
  level-up-out-of-victory path is untested, and the crash itself remains
  UNREPRODUCED — this only closes 3 of the 4 axes the suggested fix named.
  Do not mark this row Done until either the crash reproduces (so it can
  be pinned) or the remaining axis ships too.
- **Last axis shipped 2026-09-10 (commit c51547ae, `/iterate` dispatched by
  `/march`).** `combat-round-e2e.mjs` gained `LEVEL_UP=1`: before the
  encounter triggers, it clicks the real `/dev` XP-grant control 9 times
  (900 XP) so the player sits exactly 100 XP short of the next level —
  `buildCharacterFromPreset` always seeds `experience = (level-1)*1000`
  against `experienceToNextLevel = level*1000`, so that 1000-XP gap is
  preset-independent, not a guess. A won fight's own XP reward then crosses
  the threshold and `applyHazardOutcome`'s level-up cascade
  (`CombatEncounterPanel.tsx`) runs mid-aftermath — the exact "sage preset
  with a pending level-up, XP granted pre-fight, cascaded post-victory"
  shape the sibling ACCEPT-crash row below reports. Wired as
  `e2e:combat-round:levelup` (`MODE=live LEVEL_UP=1 PRESET=sage`), added as
  a fourth CI step beside boss/withdraw in both workflow files. Verified
  locally: seed 16 won cleanly and walked the reward-accept path with no
  crash; seed 8 stalled at the round cap (ran out of playable cards) the
  same way the existing boss axis does on some seeds — a clean PASS under
  the harness's own exit criteria, not a new failure mode. This closes all
  4 axes the original suggested fix named. Marking Done per this row's own
  stated condition ("the remaining axis ships too") — **the crash itself is
  still UNREPRODUCED on web**; only a native device stack trace can pin it,
  per the lesson above. If it resurfaces, re-file fresh rather than
  reopening this one.
- issue: #277
- pass: user-jot (commit 24475f48)
- viewport: unspecified
- auth_state: anonymous
- category: functional
- observation: the user reported the game crashing mid-combat during
  real play. PR #216 built `axiomancer-mobile/scripts/combat-round-e2e.mjs`
  to hunt it — a crash-strict full-round harness that plays real cards
  (stage, power with a die, APPLY, END PHASE) on BOTH the
  `/combat-encounter` dev sandbox and the live map encounter (real deck,
  real enemy, `persistOutcome` write-back + aftermath panels). 30 runs
  across 15 seeds x both modes all reached a terminal outcome clean. The
  crash was NOT reproduced and remains unexplained; this row exists so
  that negative result does not read as "fixed".
- evidence: user-spotted 2026-08-19. Harness merged in PR #216 (main
  c54bcd1). Contributing cause for why it was never caught: every e2e
  attached `page.on('pageerror')` and only `console.error`'d it, so an
  uncaught exception exited 0, and nothing checked `error-boundary-screen`
  — both fixed in #216, so a recurrence now fails CI loudly.
- suggested fix: extend `combat-round-e2e.mjs` along the axes it does not
  yet reach — boss encounters (`debug-trigger-encounter-boss`), the
  mercy/WITHDRAW branches, decks carrying cards/keywords absent from the
  4-card starter, and the level-up path out of victory. Run wider seed
  sweeps (`MODE=both COMBAT_ROUND_E2E_SEEDS=... ROUNDS=20`). If the user
  supplies repro detail (enemy, last action, blank screen vs. the
  ErrorBoundary panel + its error code), pin that case first.
- source: user

### [x] [MED] combat — the LOG toggle button overlaps the new stance-check telegraph text — RESOLVED 2026-09-09 (issue #292)
- pass: critique pass 31, 2026-09-04 (commit 7f6b4312)
- viewport: desktop 1280x800 (reproduces on mobile 375x812 too, tighter)
- auth_state: fresh save, first map encounter (Brine Hag)
- category: visual
- observation: commit 636f3040 (same-day) added the open "Punishes X /
  Yields to Y" stance-check telegraph under the enemy's intent icon, plus
  a persistent-log toggle pinned at a fixed `topInset + COMBAT_HUD_HEIGHT
  + 8` offset (`COMBAT_HUD_HEIGHT = 148`, a constant). Both are
  right-aligned to the same screen edge. `COMBAT_HUD_HEIGHT` was not
  re-measured against the combined height of an active alt-win meter
  (PLEA, visible here) plus a full two-line stance-check telegraph — with
  both present, the HUD's actual right column runs long enough that the
  LOG button's near-opaque pill (`zIndex: 20`, `rgba(10,8,6,0.82)`
  background, `CombatEncounterPanel.tsx` `logToggle` style) paints over
  the tail of the "Yields to BODY ×0.5 +1◆" line. Same bug class as the
  already-fixed "signature rune column sat ON the dice tray" HIGH (pass
  2026-09-03): a fixed-offset sibling anchored off an unmeasured height
  constant, colliding with newly added dynamic content on the same edge.
- evidence: `axiomancer-mobile/.critique-artifacts/desktop/04-combat-board.png`
  (this pass) — the "L0G" pill sits directly over the second telegraph
  line at the Brine Hag encounter; `CombatCombatantPane.tsx` `hud` is
  `position: absolute, top: 0` with no fixed height, `hudRight`
  (`alignItems: 'flex-end'`) now grows by up to 2 extra 10pt lines via
  `IntentIcon`'s `stanceCheck` block; `CombatEncounterPanel.tsx`
  `logToggle` anchors off the `COMBAT_HUD_HEIGHT` constant, not a
  measured HUD height.
- suggested fix: same fix pattern as the dice-tray row — anchor the LOG
  toggle off a measured HUD bottom (e.g. `onLayout` on the `hud` View, as
  the signature-column fix did with `sigTop`) instead of the fixed
  `COMBAT_HUD_HEIGHT` constant, or raise the constant and audit all its
  consumers (`CombatTutorialCoach` shares the same anchor and may have
  the same exposure).
- resolution: `CombatCombatantPane`'s `hud` View now reports its own
  measured height via a new `onHudLayout` callback on every layout pass.
  `CombatBoard` threads it through (using the measurement for its own
  HUD-clearance spacer too) and forwards it up to `CombatEncounterPanel`,
  which now anchors both the LOG toggle and `CombatTutorialCoach` off the
  measured value (`hudBottom ?? topInset + COMBAT_HUD_HEIGHT` fallback
  until the first layout pass lands) instead of the static
  `COMBAT_HUD_HEIGHT` constant — the exact fix pattern the dice-tray row
  set. New regression test in `CombatEncounterPanel.log.test.tsx` fires a
  220pt HUD layout event and asserts the toggle's `top` tracks it exactly
  (not the static estimate). `axiomancer-mobile` `npm run verify` green.
- source: critique (unattended /march tick)

### [x] [HIGH] combat — the signature rune column sat ON the dice tray — RESOLVED 2026-09-03 (commit 1464fae9, issue #293)
- pass: crash hunt 2026-09-03 (live e2e probe, `elementFromPoint`)
- viewport: 390x844
- auth_state: real progression save (endgame + sage presets, boss and standard)
- category: functional
- observation: `sigColumn` is absolutely positioned at `top: '34%'`, `zIndex:
  30`, and grows DOWNWARD with the signature count. With a full loadout it
  reached into the dice row: probing `elementFromPoint` at the leftmost die's
  centre mid-fight returned `combat-signature-sig-press-the-point`, not the
  die. That die could not be dragged at all, and a tap aimed at it CAST a
  signature and spent Conviction. Same class as the 2026-07-18 fix that
  right-aligned the player status strip off this column.
- evidence: the drag failed SILENTLY — `resolveDrop` never ran, so no loud
  rejection fired and nothing reached the log. It also rotted the e2e:
  `combat-round-e2e.mjs` reported PASS while powering a die only in round 1
  and playing FREE every round after (boss+sage: 1 powered in 10 rounds).
  Second, compounding defect: the drag ghost and the staged card's die socket
  both rendered a `CombatDie`, so up to three nodes answered to one
  `combat-die-<id>` — the harness's prefix match picked the parked ghost,
  holding a PREVIOUS turn's die, and dragged from wherever it sat.
- fix: the column now anchors off the MEASURED tray top (`sigTop`), so its
  last rune always clears the tray whatever the loadout grants and however
  many rows the tray wraps to; the ghost and socket dice carry their own
  testIDs. `combat-round-e2e.mjs` gained an occlusion guard that fails the
  run naming the occluder, plus a coverage assertion that fails a run which
  keeps being offered a legal die and never lands one. Self-tested by
  restoring the bug: the guard fired. Powered plays went 1 -> 3-4 per fight
  (boss+sage 1 -> 9).
- source: crash hunt (owner report)
- resolution (2026-09-10, `/iterate`): this row's own `fix:` field already
  described a shipped fix, but it was never moved from Pending to Done.
  Confirmed both artifacts are still live in the tree — `sigTop`
  measurement in `axiomancer-mobile/components/combat/encounter/
  CombatBoard.tsx` and the occlusion guard in
  `axiomancer-mobile/scripts/combat-round-e2e.mjs` — both landed in commit
  `1464fae9` (`fix(combat): the rune column sat on the dice tray — dice
  you could not touch (#280)`). Ledger correction only; no code changed
  this tick.

### [x] [MED] combat — the defeat screen has a large dead black gap mid-page — RESOLVED 2026-09-02 (commit f6e4745e, issue #271)
- pass: session-critic 2026-08-31 (Phase V8 closure `/critic-loop`
  screenshot pass, `axiomancer-mobile/screenshots/audit-2026-06/after/26-aftermath-defeat.png`)
- viewport: 390x844 (audit-capture rig)
- auth_state: dev-seeded defeat aftermath
- category: visual
- observation: roughly the bottom half of the screen between the
  flavor-text epitaph and the Ledger stats block is empty near-black
  space, making the death beat read as unfinished rather than weighty —
  other aftermath screens (parley, victory) fill that space with art or
  content.
- resolution: centered a dim `FiligreeRule` (existing decorative
  divider primitive) inside `ledgerSpacer`, and gave the spacer a
  `minHeight` floor instead of pure empty flex space. No new art
  assets — keeps the panel's own "no splatter, no celebration" doctrine
  for a defeat beat intact. `CombatDefeatPanel.test.tsx` 13/13 green,
  `axiomancer-mobile` `npm run verify` green.
- source: loop

### [x] [MED] combat — first-run coach overlay still preaches the retired status-dominance doctrine — RESOLVED 2026-09-01 (commit 596e0a19, issue #269)
- pass: session-jot 2026-08-28 (THE OPEN GATE session; spotted on the
  refreshed `combat-encounter` smoke baseline)
- viewport: 390x844 (smoke rig)
- auth_state: anonymous
- category: copy
- observation: the "A NEW KIND OF FIGHT / STATUS DOES THE WORK" coach
  card tells the player "basic blows are weak. Status effects do the
  real damage" — the exact balance law THE UNSHACKLING voided
  (2026-08-08) and CQI replaced (spec 35). Direct damage is a
  first-class win path now; the tutorial teaches the dead doctrine as
  gospel to every new player.
- resolution: rewrote both `CombatTutorialPrimer.tsx`'s first two
  panels and `combat-tutorial-steps.ts`'s 'tracks' step off "there is
  no strike — status is the only blade" onto the real doctrine: one
  bar, VITAE; strikes, statuses, Conviction, Surge and dice all
  compete on merit. Mobile `npm run verify` green (0 fail).
- source: loop

### [x] [MED] combat — the momentum chain chip's empty state ("no momentum") has no contrast against the arena floor art — RESOLVED 2026-08-28 (ui-cleanup pass)
- pass: 21 (commit 75ba5a34)
- resolution: `chainEmpty` (CombatBoard.tsx) now gets the same
  contrast-guaranteeing container the filled chain nodes use — dark alpha
  fill (`rgba(0,0,0,0.55)`) + 1pt `AXM.ash` border + radius/padding
  (`overflow: 'hidden'` for the Android radius), matching the guardChip
  treatment. Text color unchanged (`AXM.ash` reads fine on the dark box).
- viewport: mobile (375×812) barely legible; desktop (1280×800) fully invisible — same underlying bug, worse at the wider viewport
- category: visual
- observation: at the start of every fight (T1, no stance played yet
  — the most common opening state a player sees), the momentum chain
  chip renders its empty state as bare `○ no momentum` text directly
  over the busy arena floor artwork, just above the "NO STANCE" chip.
  On mobile it's a faint grey smear, barely readable against the
  floor texture. On desktop, at the same combat state, it does not
  render visibly at all — the text is in the DOM (confirmed via
  `critique-drive`'s extracted innerText) but produces zero visible
  pixels against the lighter floor art there. Every other momentum
  state (charged/surged/broke/chain-in-progress) has a colored
  border + alpha-fill background box behind its text, so only the
  empty state lacks a contrast-guaranteeing container.
- evidence: `axiomancer-mobile/.critique-artifacts/mobile/04-combat-board.png`
  vs `.../desktop/04-combat-board.png` (both T1, no stance played;
  compare the strip directly above "NO STANCE"). DOM text for both
  confirms `○ no momentum` is present in `04-combat-board.txt` for
  both viewports despite the desktop screenshot showing nothing there.
  Root cause: `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:627`
  — `<Text style={[styles.chainEmpty, { color: AXM.ash }]}>○ no momentum</Text>`
  — `chainEmpty` (line 1818) sets only font/size/spacing, no
  background or border, unlike `chainNode` (the filled-link style,
  which sets `backgroundColor` + `borderColor`) and `wheelCharged`/
  `chainBroke` (which set `textShadowColor`).
- suggested fix: give the empty-state text the same kind of
  contrast-guaranteeing container the other momentum states get —
  e.g. wrap it in a `chainNode`-style box (dark alpha background +
  ash border) instead of bare text, or at minimum add a
  `textShadowColor` matching the other chip states.
- source: critique pass 21 (unattended, critique:drive artifacts)

### [x] [MED] exploration hub — node-legend's "N nodes · M sealed" count is clipped to a bare number on the desktop viewport — RESOLVED 2026-08-28 (ui-cleanup pass)
- pass: 20 (commit dc1270ca)
- resolution: `MapCanvas` grew a viewport-fixed `overlays` slot rendered as a
  sibling of the vignette/compass chart furniture (after the
  `GestureDetector`, inside `graphWrap`, wrapped `pointerEvents="none"`), and
  the exploration hub now passes `<MapOverlays legend=... />` through it
  instead of through `children` — so the legend's absolute positions resolve
  against the visible viewport, not the 936×1040 pannable canvas. Mobile
  placement unchanged (same `bottom/left/right` insets, now against the same
  box the vignette uses). Tests added in `MapCanvas.test.tsx`.
- viewport: desktop (1280×800) only — mobile (375×812) unaffected
- category: visual
- observation: on the exploration-hub map, the legend's right-hand
  string reads "25 nodes · 22 sealed" on mobile but renders as a bare
  "25" in the map's bottom-right corner on desktop — "nodes · 22
  sealed" is clipped off. This is the same node-legend the sibling
  Pending row below already flags as disagreeing with the header
  count; on desktop the legend loses its own meaning too, since a
  lone "25" with no unit reads as noise.
- evidence: `axiomancer-mobile/.critique-artifacts/desktop/05-exploration-hub.png`
  (bottom-right of the map box) vs `.../mobile/05-exploration-hub.png`
  (same string renders in full). Root cause traced in
  `axiomancer-mobile/components/exploration/MapCanvas.tsx:218`: `{children}`
  (which includes `<MapOverlays>`, the component that renders the
  legend — `axiomancer-mobile/components/exploration/MapOverlays.tsx:22-25`)
  is rendered *inside* the pannable/zoomable `<Animated.View
  style={[styles.canvas, mapTransform]}>`, so the legend's
  `position: 'absolute', bottom: 8, left: 12, right: 12` resolves
  against the 936×1040 canvas, not the viewport. The genuinely
  viewport-fixed furniture (vignette + compass rose SVGs, explicitly
  commented "Viewport-fixed chart furniture — never pans with the
  map" at line 222) lives *outside* that `Animated.View`, siblings of
  it — `MapOverlays` should live there too. The initial centering
  translate (`MapCanvas.tsx`'s `cx = viewport.w / 2 - ax * SPREAD`)
  depends on viewport width, so the legend's on-screen position shifts
  per viewport; at 1280px wide, `graphWrap`'s `overflow: 'hidden'`
  (line 263) clips most of the right-hand text.
- suggested fix: move `<MapOverlays legend={vm.legend} />` (and the
  compass/node-graph-label text it renders) out of `MapCanvas`'s
  `children` slot and render it as a sibling of the vignette/compass
  SVGs (after the `</GestureDetector>` closing tag, still inside
  `graphWrap`), so it's positioned against the viewport like the rest
  of the "chart furniture" instead of the pannable canvas.
- source: critique pass 20 (unattended, critique:drive artifacts)

### [x] [MED] exploration hub — static `regionProgress` header count doesn't reconcile with the dynamic node-legend on the same screen — RESOLVED 2026-08-28 (ui-cleanup pass)
- pass: 19 (commit 18eb0ddb)
- resolution: dropped the stale static counts from both layouts — the header
  now reads the ordinal only ("Map i of ii" / "Map ii of ii") and the single
  live-computed legend (`${def.nodes.length} nodes · ${locked.length} sealed`)
  is the one count on screen. `MapLayout.regionProgress`'s doc comment now
  forbids counts; pinned test updated + a regression guard added
  (`fishing-village.layout.test.ts`).
- viewport: mobile + desktop (both)
- category: comprehension
- observation: the Fishing Village exploration screen shows "Map i of
  ii · 24 paths open" as a header directly above a node graph whose
  own legend reads "25 nodes · 22 sealed". A first-time player reads
  two node/progress counts on one screen that don't agree (24 vs 25;
  "open" vs only ~3 unsealed by the legend's math) and has no way to
  tell which is current. The header string is authored-static and
  never changes as the player unlocks/seals nodes; the legend is
  computed live from `MapDefinition`.
- evidence: `axiomancer-mobile/state/exploration-maps/fishing-village.layout.ts:7`
  (`regionProgress: 'Map i of ii · 24 paths open'`, hardcoded) vs
  `axiomancer-mobile/state/presenters/exploration.engine.ts:418`
  (`` `${def.nodes.length} nodes · ${locked.length} sealed` ``,
  computed). Same pattern on the second map:
  `northern-forest.layout.ts:7` (`'Map ii of ii · 9 paths remain'`).
- suggested fix: derive the header count from the same live node
  state the legend already reads (or drop the number from
  `regionProgress` and keep just "Map i of ii"), so the two counts on
  screen can't disagree.
- source: critique pass 19 (unattended, critique:drive artifacts)

### [x] [LOW] mobile — combat corner medallions occlude the fan-end hand cards' touch centers — RESOLVED 2026-08-28 (ui-cleanup pass)
- pass: combat declutter residue (PR #135, 2026-07-19)
- resolution: the player medallion's touch box no longer reaches the leftmost
  hand card's bounding-box centre: its dock dropped flush with the rail top
  (`bottom: bottomInset + 26`, was `+34` — touch box tops out at ~118pt vs
  card centres at ~120–126pt across hand sizes) and its `hitSlop` now slops
  only toward the screen corner (`{ left: 6, bottom: 6 }`, was uniform 6 —
  the top/right edges are where the fan runs under it). END medallion checked
  and already clears (top ≈112pt, no hitSlop). Re-run the PR #135
  elementFromPoint probe on the next capture pass to confirm.
- viewport: 375×812
- auth_state: n/a
- category: ux
- observation: the player medallion (bottom-left) and END medallion (bottom-right) deliberately float ABOVE the fan ends (reference chrome) — but the LEFTMOST hand card's bounding-box center sits under the player medallion, so a drag started from its middle hits the medallion, not the card. Found while the upgradeable-dice e2e's SWAY guard failed staging the leftmost Soft Word; the harness now picks the rightmost copy, but a real player dragging the leftmost card from its lower half hits the same occlusion. Playable (the card's upper half drags fine) — just a friction spot on small screens.
- evidence: PR #135 (elementFromPoint probe: combat-hand-c1 center → combat-player-medallion); scripts/upgradeable-dice-e2e.mjs SWAY-guard comment.
- suggested fix: next combat-UX pass, either inset the fan band from the medallions or shrink the medallion hit-slop so the card wins the touch; verify with the same probe.
- source: owner session 2026-07-19 (press-fate/momentum/dice PR)

### [x] [HIGH] title screen — tagline said "modern steel", contradicting the shipped anti-modern-word doctrine — RESOLVED 2026-08-14 (commit 0f408571, issue #204)
- pass: 23 (commit c063ac48)
- viewport: mobile (375×812)
- category: voice
- resolution: swapped "modern steel" for "cold iron" in the title
  screen tagline (`axiomancer-mobile/components/TitleScreen.tsx:57-58`)
  — archaic register, and doubles as folkloric ward-against-curses
  flavor for "the cursed lands await." One-line copy change, no
  code/data plumbing.
- source: critique pass 23 (unattended, critique:drive artifacts)

### [x] [LOW] Combat kill-path legibility — RESOLVED 2026-08-07 (commit 615ff26b, issue #174)
- The status kill-path (DoT / execute) is the intended win path
  but is not obviously legible on the combat board. A
  projected-lethality readout would close the gap (build-plan
  Phase 2).
- issue: #174
- resolution: build-plan Phase 2 had shipped the mechanics selector
  `projectCombatOutcome` (pending DoT / rounds-to-kill /
  lethal-in-flight), but nothing in `axiomancer-mobile` ever consumed
  it — the API existed, the board stayed illegible. Forwarded the
  projection onto `CombatEnemyPaneVM` in the enemy-pane presenter
  (`combat-encounter.engine.ts`) and rendered it on the combat board
  (`CombatCombatantPane.tsx`) as a "DOT PENDING" / "LETHAL IN N"
  readout, reusing the existing `AltWinMeter` component (same HUD slot
  as the SWAY/PREMISE alt-win meters). Added presenter coverage
  (`legibility-sweep.engine.test.ts`) pinning the hidden/pending/lethal
  states against the same fixture as mechanics' own
  `projected-lethality.engine.test.ts` e2e. Mobile lint + typecheck +
  268 files/2719 tests green.

### [x] [MED] general — color-match die riders are a fake condition; remove — RESOLVED 2026-08-07 (commit d793d607, issue #173)
- pass: user-jot (commit 486dbded)
- viewport: unspecified
- auth_state: anonymous
- category: mechanics
- issue: #173
- observation: Owner directive (2026-07-18, combat UI polish session): color-match die riders must go. Under the color law (only same-stance or WILD powers a card), the 7 library cards with an on-color dieBonus (e.g. soft-word "HEART die: SWAY 1") have a fake condition — it fires on every paid play except WILD, and the printed line reads as a replacement not a bonus. Owner: "There should be no color match riders... ignoring gold since that's a big win anyway." Open sub-call: fold the rider into the paid effect (soft-word → SWAY 4; preserves colored-die behavior, tiny WILD buff — recommended) vs drop outright (small nerf). Related residue: the global colorMatch flag (combat.engine.ts:1915) counts WILD as a match so it is ALWAYS true — the +3 Guard/Barrier COLOR_MATCH_DAMAGE_BONUS and the status-duration bonus are flat bonuses wearing conditional copy; bake the constants into base math and delete the misleading "+3 on colour match" wording (zero gameplay change). Affected: 7 cards' dieBonus fields + pricing comments (dieBonus x0.6 weight), combat.engine.ts rider path, mobile presenter colorMatchHint/armedReadValue copy.
- evidence: user-spotted at 2026-07-18T15:17:02Z
- suggested fix: [user has not specified — iterate to determine]
- source: user
- resolution: re-verified the "7 cards" count was stale — Phase 30's
  FREE-lines rewrite had already stripped `dieBonus` from 6 of them;
  only `the-burden-of-repetition` still carried the fake
  `onColor: 'match'` condition. Folded its `conviction: 1` rider
  directly into `specialMechanics` as a plain unconditional rider and
  re-priced it at full weight (was the conditional dieBonus ×0.6
  discount) — 11.40 → 12.60, still inside the printed uncommon band
  4.5-13. Reworded the momentum-wheel tooltip that misattributed the
  color-match bonus to the wild die specifically. Did NOT bake the
  flat `COLOR_MATCH_DAMAGE_BONUS`/duration bonus into unconditional
  math: the FATE Engine's X-die mechanism is a genuine, tested
  exception (`colorMatch` is correctly `false` for an X-die-powered
  play — no live card uses `fate` today, but baking the bonus in would
  silently grant it to any future fate-flagged card). That portion of
  the finding was a false premise, not a bug — closing as
  verified-not-a-bug rather than shipped. `axiomancer-mechanics` 190
  files/4085 tests green; `axiomancer-mobile` 268 files/2716 tests
  green.

### [x] [LOW] catalog keyword bolder still speaks dead vocabulary — RESOLVED 2026-08-06 (commit 489819a6, issue #171)
- pass: session 2026-07-17 (card-text work)
- viewport: devlog/catalog.html
- category: content/copy
- issue: #171
- resolution: pruned `KEYWORD_WORDS` in `scripts/build-catalog.mjs` to drop
  the 12 dead words. Confirmed against the mechanics guard allowlist
  (`paid-summary-honesty.engine.test.ts`) and the live mobile
  `KEYWORD_GLOSS` registry (`axiomancer-mobile/state/combat/keywords.ts`)
  that none of the 12 are real keywords. "damage" was the only one
  actually live in card text (18 bolded occurrences pre-fix, 0 after);
  regenerated `devlog/catalog.html`. Root verify green.
- observation: `scripts/build-catalog.mjs` KEYWORD_WORDS bolds words
  the spec 32 v3 registry retired or never had — DAMAGE, STUN, SLOW,
  BURN, CONFUSION, SILENCE, REGEN, EXECUTE, COMPOUND, VULNERABLE,
  BARRIER, REPRISE — so prose like "3 damage each" renders "damage"
  as a bold keyword-styled token, implying a keyword the overlay
  cannot define. Mobile bolding is honest (chip-driven); only the
  catalog over-bolds.
- evidence: The Closing Word's catalog face renders "3 DAMAGE each"
  bold; the mechanics guard allowlist
  (`paid-summary-honesty.engine.test.ts`) is the current vocabulary.
- suggested fix: prune KEYWORD_WORDS to the guard's registry +
  structural allowlist.

### [x] [MED] combat — authored `paidSummary` card text still prints round-clock "for N turns" for event-triggered poison/bleed, reopening the WI-2 "RESOLVED — stale" closure — RESOLVED 2026-08-05 (commit d320ee12, issue #170)
- pass: 16 (commit 63574686)
- issue: #170
- resolution: reworded all 12 offending authored `paidSummary` strings (the
  sweep found 5 more than this row's cited 7) to name the real trigger while
  keeping the honest duration number; extended the WI-2 guard test to read
  every card's `combatEffects` directly instead of `faceStats`'s
  primary-effect classification, which is what let a multi-effect authored
  card (e.g. this row's own Opening Statement citation) slip through
  undetected. See `plan/AUDIT.md`'s mirrored row for the full account.
- viewport: mobile + desktop (375×812, 1280×800)
- auth_state: anonymous
- category: comprehension
- observation: this pass's cold drive reached the live combat-board
  and captured the "Slippery Slope" hand card printing "Inflict
  POISON 1 for 4 turns." — round-clock duration language — at both
  viewports. `debuff_poison`'s trigger is `"card-played"` (an event,
  not a per-round tick — confirmed in
  `axiomancer-mechanics/src/Effects/debuffs.library.json`), so this is
  exactly the lie the WI-2 fix (issue #168) was supposed to have
  killed. The 2026-08-04 "RESOLVED — stale" closure of the prior DoT
  round-clock row (below, in Done) only verified the auto-generated
  path: `faceStats`'s `dot` case
  (`axiomancer-mobile/state/presenters/combat-encounter.engine.ts:1643-1660`)
  and its guard test
  (`card-face-honesty.guard.test.ts:110-153`, "WI-2 — every
  event-triggered DoT face names its trigger"). Neither touches a card
  with an authored `paidSummary` override: `combat.cards.ts:389`
  (`const authored = !persistent ? card.paidSummary : undefined`) and
  `:415` (`dotSuffix = authored ? '' : ...`) show the authored string
  fully replaces the auto-generated event-aware text, and the guard
  test only walks `faceStats`'s classification — never the raw
  `bottomActionText`/`paidSummary` sentence that
  `CombatBoard.tsx`'s `cleanPaidSentence()` (line 1518) actually prints
  on the hand card. The fix landed; it just doesn't cover authored
  cards, and the regression guard can't catch what it never reads.
- evidence: `axiomancer-mobile/.critique-artifacts/{mobile,desktop}/04-combat-board.png`
  + `.txt` (this pass); `axiomancer-mechanics/src/Cards/cards.library.ts`
  — at least 7 cards share the pattern (lines 45, 203, 226, 519, 578,
  830, 1765), e.g. `slippery-slope`: `paidSummary: 'Inflict POISON 1
  for 4 turns.'`.
- suggested fix: either reword the 7 authored `paidSummary` strings to
  event-based phrasing (matching the auto-generated `evt.verb` text,
  e.g. "each card you play" / "each hit taken"), or drop the
  `paidSummary` override for pure-DoT cards so the already-correct
  auto-generated `dotFace`/`dotSuffix` renders instead — then extend
  the WI-2 guard test to sweep `bottomActionText`/`paidSummary`
  strings too, not just `faceStats`'s `dot` classification, so this
  can't regress silently again.
- source: critique (unattended `/march` tick, non-MCP transport)

### [x] [MED] DoT card faces print round-clock math that contradicts their own keyword glosses (RESOLVED — stale, already fixed by WI-2, issue #168)
- RESOLVED 2026-08-04 (verified stale; no new code). The trigger-clock
  source of truth this row's suggested fix asked for already exists:
  `debuffs.library.json`'s `damageOverTime.trigger` field
  (`debuff_poison` tagged `"card-played"`, `debuff_bleed` tagged
  `"damage-instance"`). It is read once in `cardCalc()`
  (`axiomancer-mobile/state/presenters/combat-encounter.engine.ts:1187-1188`,
  `out.dotTrigger`) and consumed by both the card-face generator
  (`faceStats`) and the detail-overlay generator (`detailCore`).
  Event-triggered DoT faces now read e.g. "foe loses VITAE each card
  you play" (poison) / "foe loses VITAE each time it is struck"
  (bleed) — round-clock "X over Nt turns" phrasing is emitted ONLY for
  the `dotTrigger === null` branch (genuinely round-clock/legacy
  effects), never for poison or bleed. Fix landed in commit
  `b097efec` ("Fixes from cleanup", WI-2, 2026-07-12 11:45:52) — ten
  minutes BEFORE this CRITIQUE row was even filed (11:55:20 the same
  day), so the finding was already stale at filing time. Regression
  coverage: `axiomancer-mobile/state/presenters/__tests__/card-face-honesty.guard.test.ts`
  sweeps the entire card library asserting no event-triggered DoT face
  prints round-clock phrasing; passes clean on current `main`.
- issue: #168
- pass: owner-playtest 2026-07-12
- viewport: mobile (expo-web via Playwright)
- category: content/copy
- observation: all DoT card faces still print round-clock phrasing
  ("12 over 2t" / "foe loses HP each turn"), but the underlying
  keyword glosses (and the actual trigger, per the finding above) are
  event-triggered — per-card-played for poison, per-damage-instance
  for bleed. The face text describes a mechanic the card doesn't run.
  Same root cause as Phase 29's keyword-honesty doctrine (`plan/steps/
  01_build_plan.md` Phase 29, KW-2/5/6/7 still open) and squarely in
  Phase 32's DoT-clock scope.
- evidence: card-face aria-labels captured during the same Playwright
  session read round-clock phrasing on cards whose keyword definition
  is event-triggered.
- suggested fix: fold into Phase 32's DoT-clock work — regenerate DoT
  card-face text from the same trigger-clock source of truth once it
  exists, rather than patching copy ad hoc.
- source: playtester (owner-directed break-test session)

### [x] [MED] SWAY has no meter anywhere in the combat UI (RESOLVED — stale, already fixed by WI-5, issue #167)
- RESOLVED 2026-08-03 (verified stale; no new code). WI-5 (2026-07-12,
  commit `88406af8`) already shipped an `AltWinMeter` (SWAY →
  CAPITULATE, PREMISE → ORATORY) under the VITAE bar in
  `CombatCombatantPane.tsx` — `testID="combat-sway-meter"`, full
  `accessibilityRole="progressbar"` semantics, gated on
  `enemy.swayVisible` (visible once sway accrues or the preset's deck
  feeds the mechanic). Presenter-level regression coverage already
  exists: `legibility-sweep.engine.test.ts` "surfaces the SWAY meter
  with the engine capitulate target when sway accrues" pins
  `swayVisible`/`sway`/`swayTarget`. The row predates or narrowly
  missed WI-5's same-day landing; the queue was overstating an open
  MED. Corrected.
- issue: #167
- pass: owner-playtest 2026-07-12
- viewport: mobile (expo-web via Playwright)
- category: visual/legibility
- observation: SWAY (decays 1/turn, capitulate at ≥ enemy VITAE — per
  the card-editor's own mechanic hint) has no visible meter anywhere
  in the combat UI, despite `axiomancer-card-editor` already modeling
  it as a real mechanic (see PR #68's `CardForm.tsx` SWAY field). A
  player has no way to see SWAY progress toward capitulation.
  Sequencing risk for Phase 33 (Enemy Answers, SWAY-cleanse enemies,
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-10-theme-identity.md` §1): that phase plans
  enemy counterplay against a mechanic the player currently cannot
  observe.
- evidence: full-screen accessibility snapshot of an in-progress
  combat with an active SWAY effect shows no SWAY meter/readout
  anywhere in the tree.
- suggested fix: land a SWAY meter (mirroring the Premise-track /
  disrupt-meter legibility work from Phase 28) before or alongside
  Phase 33's SWAY-cleanse enemy work.
- source: playtester (owner-directed break-test session)
