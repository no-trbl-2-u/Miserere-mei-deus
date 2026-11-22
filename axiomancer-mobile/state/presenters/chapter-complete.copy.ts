/**
 * The chapter complete screen's labels (phase CE1a). Labels only: no
 * narration lives here (that is the Narrator's).
 */

export const CHAPTER_COMPLETE_TITLE = 'CHAPTER COMPLETE';
export const CHAPTER_COMPLETE_CHAPTER_NAME = 'THE BREAKWATER';
export const CHAPTER_COMPLETE_CONTINUE_LABEL = 'CONTINUE';

export type ChapterStatId = 'level' | 'vitae' | 'nodes' | 'fights' | 'quests' | 'shillings' | 'deck' | 'relics';

export const CHAPTER_COMPLETE_STAT_LABELS: Record<ChapterStatId, string> = {
    level: 'LEVEL REACHED',
    vitae: 'VITAE',
    nodes: 'NODES RESOLVED',
    fights: 'FIGHTS WON',
    quests: 'QUEST STEPS',
    shillings: 'SHILLINGS',
    deck: 'CARDS IN DECK',
    relics: 'RELICS WORN',
};

/** "n of m" figure: the value column's text for a count out of a total. */
export const chapterStatOf = (n: number, of: number): string => `${n} / ${of}`;
