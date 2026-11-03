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
| Brimming Locket | `relic-brimming-locket` | +5 Heart | Brim Over | `sig-merciful-locket`, `overheal-guard` | 3 | This turn, healing past your max VITAE becomes GUARD. |
| Penitent's Brooch | `relic-penitents-brooch` | +5 Mind | Absolution | `sig-merciful-brooch`, `absolve` | 3 | Remove all your debuffs, then HEAL 2 for each. |

**Neither touches befriending (T's caveat).** Neither opens mercy, adds MERCY, sets or clears YIELDING, or reads the
befriend gate. A test pins this for both.

**Brim Over.** Confirmed by T (2026-11-02): all heals on your turn count: HEAL, RADIANCE, the
signature heals (`programSignatureHeal`) and a LEECH you trigger on your turn. The GUARD is the heal's amount after its
scaling and modifiers, less what it restored, and takes no further stat scaling. BRINE cuts it as it cuts any GUARD
gain. RADIANCE still DEALs only what it restored (T's ruling in the ledger). It ends with your turn, so a heal on the
foe's turn or at the start of your next turn gives no GUARD; casting it while armed is refused ("You are already
brimming"). MERCY's heal on the foe is never counted.

**Absolution.** Confirmed by T (2026-11-02): "All those, and actually, even Inferno (your side only). If possible, I'd
like it to clear all future debuffs as well? Maybe tag what are buffs and remove anything not tagged?" So the clear is
default-deny, one shared rule in a new module (`Combat/combat.conditions.ts`) that `clearDebuffs` and Absolution both use:

- `player.effects`: everything whose effect is not tagged `type: 'buff'` goes, so a new debuff in the library clears with
  no further work.
- `enemyWords` on you: BRINE, TANGLE, UNDERTOW (both dice) and LEECH go. The words are a `Record<EnemyKeyword, ...>` tagged
  `foe-side`, `buff` or a clear function, so a new foe word does not compile until it is tagged.
- The weather: your INFERNO goes as "Remove your INFERNO" already reads: the both-sides stack becomes foe-only, the foe
  keeps burning and the INFERNO on you alone is gone (the first lines of `programWeatherSignature`). BLIZZARD and STORM are
  on the foe and stay.
- Your own ledger statuses (THORNS, REFLECT, TETHER, GUARD held and the like) are tagged `buff`. A ledger field is not
  self-describing, so a test lists the ledger's status fields and fails on one with no tag: a future status of that kind is
  caught at build, not cleared silently.
- Not statuses, so never touched: your own Curses and the cards in your deck.

[T to confirm #6] BARNACLE. T's "all those" reads as including it. Default: each Barnacle in your hand goes and counts one,
overriding "only a body die removes a Barnacle" for this signature only. Or: it stays.

Each cleared condition counts one, whatever its stacks; your INFERNO counts one. `clearDebuffs` used to read
`player.effects` only, so it reached VULNERABLE and little else in Chapter 1. The HEAL is 2 per condition, mind-scaled in
one heal as Open Vein's is, and counts toward "all you healed this turn" (the ruling above in Decisions;
`programSignatureHeal` does not add to that total today, so this signature adds it). With nothing to remove the cast is
refused and spends nothing ("Nothing on you to absolve").

**Stat lines.** Confirmed by T (2026-11-02): a different stat for each. The Brimming Locket is +5 Heart, the stat that
scales RADIANCE and MERCY; the Penitent's Brooch stays +5 Mind, the stat that scales its HEAL.

**Icons.** Confirmed by T (2026-11-02): T circled sheet D 1,2 (oval framed stone) and sheet D 0,0 (ivory ring), both unused
cells of T's own sheets. T did not say which goes where; the Brimming Locket takes D 1,2 and the Penitent's Brooch takes
D 0,0. Add both to `ITEM_CELLS` and cut them with `scripts/slice-item-sheet.mjs`, with a provenance entry.

**Purifying Light.** Confirmed by T (2026-11-02): "Just make sure the card can remove all debuffs." Its PAID line clears
everything the shared rule clears, and its FREE line clears one of those, oldest effect first, then foe words, then your
INFERNO. The printed text and numbers do not change. BARNACLE follows call 6.

**Where they come from.** `relicSource: 'quest'`, so a relic quest may pay them; no quest is written or changed here,
and the elite drop pool is unchanged. `/dev`'s relic chips hand them over, as for any relic.
~~~
~~~ acceptance
- **A?brim** Brim Over (◆3, Brimming Locket): armed, a heal past max VITAE gives GUARD equal to the overflow; a heal that fits gives none; RADIANCE's DEAL stays what it restored; BRINE cuts the GUARD; it ends with your turn; casting it armed is refused and spends nothing.
- **A?absolve** Absolution (◆3, Penitent's Brooch): removes every `player.effects` entry not tagged a buff (a fixture debuff new to the library included), BRINE, TANGLE, UNDERTOW and LEECH on you, each Barnacle in hand, and your INFERNO while the foe keeps burning; leaves your buffs, your own Curses, BLIZZARD and STORM; HEALs 2 per condition (mind-scaled), and the HEAL counts toward "all you healed this turn"; with nothing to remove it is refused and spends nothing. An untagged foe word or ledger status fails the build.
- **A?purify** Purifying Light's PAID line clears everything Absolution clears and its FREE line clears one, with its text and numbers unchanged.
- **A?relics** Both relics are in the library with `laneId: 'merciful'`, `relicSource: 'quest'`, the Locket +5 Heart and the Brooch +5 Mind; the Merciful has one elite relic and two quest relics; the elite pool is unchanged; both draw their own sheet icon, read on the signature bar, and neither relic's signature touches mercy, MERCY, YIELDING or the befriend gate.
~~~
~~~ chunks
- [ ] **115.?relics** The Merciful's two quest relics · L · closes A?brim, A?absolve, A?purify, A?relics · needs — · alias: MF1f
  - Mechanics: the two relics, the two signatures and kinds in `combat.signature.ts` and `combat.encounter.types.ts`, the overflow hook on every counted heal, the shared clear in `Combat/combat.conditions.ts` with `clearDebuffs` moved onto it, `signatureCastBlock`'s two refusals, the atlas rows, the relic-library test's counts, `docs/combat.md`.
  - Mobile: the two sheet icons cut and registered, the sprite map and labels, `combat-encounter.engine.ts`'s signature glyph map, the equipment-detail test.
  - Read the section "The Merciful's two quest relics".
~~~
