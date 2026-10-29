/**
 * The travel screen's words (phase NK1d). The flavor text is each node's own
 * authored `prompt` (the engine's content); this file holds only the chrome:
 * the question, the two answers, the shut line and the crossing toast.
 */
export const TRAVEL_COPY = {
    /** The eyebrow over the art. */
    eyebrow: 'THE WAY ON',
    /** The question under the flavor text. */
    question: (destination: string): string => `Move to ${destination}?`,
    /** The yes button. */
    yes: 'YES · MOVE',
    /** The no button: the player stays on the node. */
    no: 'NO · STAY',
    /** Shown in place of the question while `opensAfter` is unspent. */
    shut: 'The way is shut.',
    /** The one button a shut way offers. */
    leave: 'STAY',
    /** A place with no drawn name (a map with no layout). */
    unnamedPlace: 'the far side',
    /** The toast a crossing to another map shows. */
    crossedToast: (region: string): string => `You cross into ${region}.`,
} as const;
