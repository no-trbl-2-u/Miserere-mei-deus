/**
 * Village counters — tuning.
 *
 * A village offers a paid rest and a card shop beside the Anvil. These numbers
 * are tuning, not law: the rest heals what a rest node heals
 * (`RESTCHOICE_TUNING.restHealFraction`) for a price between the Anvil's hone
 * (3) and its swap (8); the shop's card price sits at the same mark. A card
 * removal is priced by `Cards/card.removal.pricing.ts`, never here.
 */
export const VILLAGE_TUNING = Object.freeze({
    /** Shillings a village rest costs. */
    restPrice: 6,
    /** Shillings each card in a village's card shop costs. */
    cardPrice: 6,
    /** How many cards a village's card shop offers. */
    cardShopSize: 3,
});
