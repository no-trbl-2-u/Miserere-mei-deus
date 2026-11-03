---
date: 2026-11-02
---
## Edit plan/115-mf1-merciful-trial-set.md
~~~ old
- The Merciful's two other relics (T picks from the session's pitches).
~~~
~~~ new
- The Merciful's two other relics: T picked them on 2026-11-02; see "The Merciful's two quest relics" below.
~~~

## Add plan/115-mf1-merciful-trial-set.md
~~~ section The Merciful's two quest relics
T, 2026-11-02, in session: "let's create 2 relics for the merciful lane. With a caveat, none of the rings should
interact with 'befriending'." T then picked pitches 3 and 8 of eight. The names, stat lines, costs and numbers are the
pitches'. The Suppliant's Ring keeps The Open Hand and stays the lane's elite drop; both new relics are quest relics.

| Relic | Id | Stat line | Signature | Id, kind | Cost | Printed effect |
|---|---|---|---|---|---|---|
| Brimming Locket | `relic-brimming-locket` | +5 Mind | Brim Over | `sig-merciful-locket`, `overheal-guard` | 3 | This turn, healing past your max VITAE becomes GUARD. |
| Penitent's Brooch | `relic-penitents-brooch` | +5 Mind | Absolution | `sig-merciful-brooch`, `absolve` | 3 | Remove all your debuffs, then HEAL 2 for each. |

**Neither touches befriending (T's caveat).** Neither opens mercy, adds MERCY, sets or clears YIELDING, or reads the
befriend gate. A test pins this for both.

**Brim Over.** [T to confirm #1] Default: every VITAE heal you make while it is armed counts: HEAL, RADIANCE, the
signature heals (`programSignatureHeal`) and a LEECH you trigger on your turn. The GUARD is the heal's amount after its
scaling and modifiers, less what it restored, and takes no further stat scaling. BRINE cuts it as it cuts any GUARD
gain. RADIANCE still DEALs only what it restored (T's ruling in the ledger). It ends with your turn, so a heal on the
foe's turn or at the start of your next turn gives no GUARD; casting it while armed is refused ("You are already
brimming"). MERCY's heal on the foe is never counted.

**Absolution.** [T to confirm #2] Default: "your debuffs" means every condition a foe laid on you that a player can
read as one: the debuffs in `player.effects` (VULNERABLE among them), and from `enemyWords` BRINE, TANGLE, UNDERTOW and
LEECH on you. Each cleared condition counts one, whatever its stacks. BARNACLE (a Curse holding a hand slot) is a card,
not a condition, and stays. `clearDebuffs` today reads `player.effects` only, and the sims found it never fired because
no Act 1 foe debuffed you; since then Chapter 1's foes carry these words, most of which live outside `player.effects`.
The HEAL is 2 per condition, mind-scaled in one heal as Open Vein's is, and counts toward "all you healed this turn"
(the ruling above in Decisions; `programSignatureHeal` does not add to that total today, so this signature adds it). With
nothing to remove the cast is refused and spends nothing ("Nothing on you to absolve").

**Stat lines.** [T to confirm #3] Default: both +5 Mind, as pitched. Every other lane's two quest relics carry
different stats.

**Icons.** [T to confirm #4] Art is owner-only (D88) and `item-sprites.test.ts` fails a relic with no sprite. Default:
both relics draw the Suppliant's Ring's sprite, with their own labels, until T picks icons.

**Purifying Light.** [T to confirm #5] Default: the card is unchanged and its clear still reads `player.effects` only.

**Where they come from.** `relicSource: 'quest'`, so a relic quest may pay them; no quest is written or changed here,
and the elite drop pool is unchanged. `/dev`'s relic chips hand them over, as for any relic.
~~~
~~~ acceptance
- **A?brim** Brim Over (◆3, Brimming Locket): armed, a heal past max VITAE gives GUARD equal to the overflow; a heal that fits gives none; RADIANCE's DEAL stays what it restored; BRINE cuts the GUARD; it ends with your turn; casting it armed is refused and spends nothing.
- **A?absolve** Absolution (◆3, Penitent's Brooch): removes each debuff in `player.effects` and BRINE, TANGLE, UNDERTOW and LEECH on you, leaves BARNACLE, HEALs 2 per condition (mind-scaled), and the HEAL counts toward "all you healed this turn"; with nothing to remove it is refused and spends nothing.
- **A?relics** Both relics are in the library with `laneId: 'merciful'`, `relicSource: 'quest'` and +5 Mind; the Merciful has one elite relic and two quest relics; the elite pool is unchanged; both draw a sprite, read on the signature bar, and neither relic's signature touches mercy, MERCY, YIELDING or the befriend gate.
~~~
~~~ chunks
- [ ] **115.?relics** The Merciful's two quest relics · M · closes A?brim, A?absolve, A?relics · needs — · alias: MF1f
  - Mechanics: the two relics, the two signatures and kinds in `combat.signature.ts` and `combat.encounter.types.ts`, the overflow hook on every counted heal, the clears in `combat.card-program.ts`, `signatureCastBlock`'s two refusals, the atlas rows, the relic-library test's counts, `docs/combat.md`.
  - Mobile: the sprite map and labels (the Ring's sprite until T picks), `combat-encounter.engine.ts`'s signature glyph map, the equipment-detail test.
  - Read the section "The Merciful's two quest relics"; apply T's answers to its calls.
~~~
