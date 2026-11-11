/**
 * The travel screen's words. The scene line
 * is each node's own authored `prompt` (the engine's content); this file holds
 * only the chrome: the question, the two buttons, the shut line and the
 * crossing toast. Nothing else is written on the screen: no tag, no purse, no
 * cost (T's verdict on S-01, 2026-11-10).
 */
export const TRAVEL_COPY = {
    /** The question over the scene line. */
    question: (destination: string): string => `Move to ${destination}?`,
    /** The button that takes the trip. */
    move: 'MOVE',
    /** The button that leaves the player on the node. */
    stay: 'STAY',
    /** Shown in place of the question while `opensAfter` is unspent. */
    shut: 'The way is shut.',
    /** A place with no drawn name (a map with no layout). */
    unnamedPlace: 'the far side',
    /** The toast a crossing to another map shows. */
    crossedToast: (region: string): string => `You cross into ${region}.`,
} as const;
