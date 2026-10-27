/**
 * Item-reward eyebrows naming where a relic came from (phase LR1c).
 * [content] plain placeholder words for T to rewrite.
 */

/** The eyebrow for an item a completed quest pays. */
export function questRewardSource(questName: string): string {
    return `QUEST REWARD: ${questName.toUpperCase()}`;
}

/** The eyebrow for the relic a won elite fight drops. */
export function eliteDropSource(eliteName: string): string {
    return `DROPPED BY ${eliteName.toUpperCase()}`;
}
