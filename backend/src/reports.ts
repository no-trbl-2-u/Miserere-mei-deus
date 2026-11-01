/**
 * The play-log reports (phase BE2f): `GET /v1/reports/card-usage` and
 * `GET /v1/reports/card-gaps`, and (phase LR1g) `signature-usage`. The SQL is fixed here and never taken from the
 * client; a query string only binds values (`?build=`, `?source=`, and `?card=` on
 * card-usage). `?source=` is `human` (the default: only T's play), `harness`, `sim` or `all` (phase SM1a), and
 * every report's body names the source it read. Every number is a count for T to read; nothing grades the game
 * from it. Ad hoc questions go to `wrangler d1 execute --remote`.
 *
 * The reports read `events_json` with SQLite's JSON functions: each fight's
 * stream is unrolled by `json_each`, whose `key` is the event's position, and
 * a running count of `phase-resolved` events numbers the turn ends.
 *
 * card-usage, per card (a fight counts once per card however many copies):
 *   fightsInDeck  fights whose start deck held the card
 *   drawn         times it came into the hand (`hand-drawn`; the app's fight
 *                 recorder stamps the opening hand as the stream's first one,
 *                 so fights posted before that missed it)
 *   played        `card-played`; `free` the top line, `paid` the bottom line
 *   held          turn ends the card sat in the hand unplayed (below)
 *   fizzled       `effect-fizzled` naming the card
 *   offered       times a combat or cache reward showed it
 *   picked        times it was the reward taken
 *   skipped       times a reward showed it and another card, or none, was taken
 *   removed       times the rest site removed it
 *
 * `held` pairs draws and plays without tracking copies. A copy drawn after
 * `d` turn ends and played after `p` sat through `p - d` of them; a copy never
 * played sat until the fight's last turn end `F`. Summed, the pairing drops
 * out: held = sum(p) - sum(d) + max(0, draws - plays) * F, where a play with
 * no draw before it (an opening hand from an older build) counts from 0. A scrap carries no card
 * id, so a scrapped card counts as held to the end.
 *
 * card-gaps, per enemy:
 *   threats       phases the foe was not hindered (`phase-resolved`
 *                 overwhelmed), named by the threat that fired in that phase
 *   unspentDice   live dice (an available die that is not a miss) rolled in a
 *                 turn that reached its end and neither spent nor banked, by
 *                 colour, beside the live dice rolled
 *   defeats       for each lost fight, the last threat or DoT tick on the
 *                 player before it ended
 *
 * signature-usage, per signature id (a fight counts once however often it
 * cast; `?card=` does not apply):
 *   fightsWorn    fights that posted the signature as worn (`signatures_json`;
 *                 a fight stored before migration 0005 reads as none)
 *   fightsCast    fights that cast it at least once (`signature-cast`)
 *   casts         `signature-cast` events naming it
 *   castsPerFight casts over fightsWorn, to two places; null when never worn
 *   refused       `ui-signature-refused` taps naming it
 *
 * card-vs-bot (phase SM1h), per card at ONE build, T's play beside each sim policy's. A column is `human` or a
 * sim policy id (a sim fight's policy is its run's `play_runs.policy_id`, else its `solver`); `harness` rows
 * and `?source=` are not read. Per column and card: fightsInDeck, drawn, played, offered, picked, skipped, and
 * the rates fightsInDeck/drawn/played per fight in the column and picked/skipped per offer of the card. With no
 * `?build=` the build is the newest one holding both a `human` and a `sim` fight, and the body names it.
 *
 * run-summary (phase SM1h), per source, and per policy for `sim`, over the `play_runs` rows (`?build=` and
 * `?source=` narrow it; with no `?source=` every source is read, since each row group names its own source):
 *   runs, open (not yet ended), runOver, chapterClear, reset (the outcomes), avgLevel and maxLevel,
 *   avgVitaeEnd, avgNodesResolved and maxNodesResolved, and furthestNodeId (where the run that resolved the
 *   most nodes ended).
 *
 * run-ends, run-pacing and coverage (phase SM2e) read the same `play_runs` and `run_events` rows, narrowed by
 * `?build=` and `?source=` (an absent `?source=` reads every source, as run-summary does: each row names its own).
 * Each row is keyed by `source` and `policyId` (the sim's policy; null for any other source), and every id in a
 * row is the raw id the game logged, so a caller can join the rows to Chapter 1's content by id.
 *
 * run-ends, per source, policy and end node, over the CLOSED runs (`ended_at` set): runs, runOver, chapterClear,
 * avgLevel and avgVitaeEnd (to one place).
 *
 * run-pacing, per source, policy and node, over the runs that entered the node:
 *   runs               runs that entered it
 *   avgResolvedBefore  nodes those runs had resolved before first entering it (the sim has no clock: time is nodes)
 *   avgLevel, avgVitae the player's level and VITAE after resolving it, over every resolution; an event from an
 *                      older build carries neither, so it counts for neither, and null when no event carried one
 *   rests              resolutions whose choice was `rest`
 *   withdrawals        resolutions whose choice was `flee`
 *
 * coverage, per source, policy, kind and id (`runs` is the distinct runs; `count` the events; `cleared` the part of
 * them that went through):
 *   node        id = nodeId; count = node-entered; cleared = node-resolved there
 *   quest-step  id = `<questId>/<stepId>`, or the bare questId when the step is null; count = quest-step events;
 *               cleared = the `turn-in` and `complete` ones
 *   enemy       id = the fight's enemy_id, from `fights`; count = fights; cleared = victories
 *   hazard      id = hazardId; count = hazard-ended; cleared = the ones with `cleared` true
 *   item        id = itemId; count = item-gained; cleared = null (an item is not cleared)
 */

import type { PlayLogSourceFilter } from './contract';
import type { Env } from './env';

export const REPORTS_PATH_PREFIX = '/v1/reports/';

export const REPORT_NAMES = ['card-usage', 'card-gaps', 'signature-usage', 'card-vs-bot', 'run-summary', 'run-ends', 'run-pacing', 'coverage'] as const;
export type ReportName = (typeof REPORT_NAMES)[number];

export function isReportName(value: string): value is ReportName {
    return (REPORT_NAMES as readonly string[]).includes(value);
}

export interface CardUsageRow {
    cardId: string;
    fightsInDeck: number;
    drawn: number;
    played: number;
    free: number;
    paid: number;
    held: number;
    fizzled: number;
    offered: number;
    picked: number;
    skipped: number;
    removed: number;
}

export interface CardUsageReport {
    report: 'card-usage';
    build: string | null;
    source: PlayLogSourceFilter;
    card: string | null;
    fights: number;
    cards: CardUsageRow[];
}

export interface ThreatGapRow {
    enemyId: string;
    threat: string;
    overwhelmed: number;
    fights: number;
}

export interface DiceGapRow {
    enemyId: string;
    color: string;
    rolled: number;
    unspent: number;
}

export interface DefeatGapRow {
    enemyId: string;
    cause: string;
    fights: number;
}

export interface CardGapsReport {
    report: 'card-gaps';
    build: string | null;
    source: PlayLogSourceFilter;
    fights: number;
    threats: ThreatGapRow[];
    unspentDice: DiceGapRow[];
    defeats: DefeatGapRow[];
}

export interface SignatureUsageRow {
    signatureId: string;
    fightsWorn: number;
    fightsCast: number;
    casts: number;
    castsPerFight: number | null;
    refused: number;
}

export interface SignatureUsageReport {
    report: 'signature-usage';
    build: string | null;
    source: PlayLogSourceFilter;
    fights: number;
    signatures: SignatureUsageRow[];
}

/** One card's counts in one column of card-vs-bot; a rate is null when its denominator is 0. */
export interface CardVsBotCounts {
    fightsInDeck: number;
    drawn: number;
    played: number;
    offered: number;
    picked: number;
    skipped: number;
    inDeckPerFight: number | null;
    drawnPerFight: number | null;
    playedPerFight: number | null;
    pickedPerOffer: number | null;
    skippedPerOffer: number | null;
}

/** A column of card-vs-bot: `human`, or a sim policy id. */
export interface CardVsBotColumn {
    column: string;
    source: 'human' | 'sim';
    fights: number;
}

export interface CardVsBotRow {
    cardId: string;
    /** Every column's counts, keyed by column name; a column that never saw the card holds zeros. */
    columns: Record<string, CardVsBotCounts>;
}

export interface CardVsBotReport {
    report: 'card-vs-bot';
    /** The build read: the asked one, or the newest holding both sources; null when no build holds both. */
    build: string | null;
    /** True when the build was chosen (no `?build=`). */
    buildDefaulted: boolean;
    sources: ['human', 'sim'];
    columns: CardVsBotColumn[];
    cards: CardVsBotRow[];
}

export interface RunSummaryRow {
    source: string;
    /** The sim's policy id; null for any other source, and for a sim run that named none. */
    policyId: string | null;
    runs: number;
    open: number;
    runOver: number;
    chapterClear: number;
    reset: number;
    avgLevel: number | null;
    maxLevel: number | null;
    avgVitaeEnd: number | null;
    avgNodesResolved: number | null;
    maxNodesResolved: number | null;
    furthestNodeId: string | null;
}

export interface RunSummaryReport {
    report: 'run-summary';
    build: string | null;
    source: PlayLogSourceFilter;
    runs: number;
    summary: RunSummaryRow[];
}

export interface RunEndsRow {
    source: string;
    /** The sim's policy id; null for any other source. */
    policyId: string | null;
    /** Where the run ended; null for a run that ended off the map. */
    endNodeId: string | null;
    runs: number;
    runOver: number;
    chapterClear: number;
    avgLevel: number | null;
    avgVitaeEnd: number | null;
}

export interface RunEndsReport {
    report: 'run-ends';
    build: string | null;
    source: PlayLogSourceFilter;
    /** The closed runs read. */
    runs: number;
    ends: RunEndsRow[];
}

export interface RunPacingRow {
    source: string;
    policyId: string | null;
    nodeId: string;
    runs: number;
    avgResolvedBefore: number | null;
    avgLevel: number | null;
    avgVitae: number | null;
    rests: number;
    withdrawals: number;
}

export interface RunPacingReport {
    report: 'run-pacing';
    build: string | null;
    source: PlayLogSourceFilter;
    /** Every run read, whether or not it entered a node. */
    runs: number;
    pacing: RunPacingRow[];
}

export const COVERAGE_KINDS = ['node', 'quest-step', 'enemy', 'hazard', 'item'] as const;
export type CoverageKind = (typeof COVERAGE_KINDS)[number];

export interface CoverageRow {
    source: string;
    policyId: string | null;
    kind: CoverageKind;
    id: string;
    runs: number;
    count: number;
    /** Null for an item. */
    cleared: number | null;
}

export interface CoverageReport {
    report: 'coverage';
    build: string | null;
    source: PlayLogSourceFilter;
    /** Every run read. */
    runs: number;
    coverage: CoverageRow[];
}

export type Report =
    | CardUsageReport
    | CardGapsReport
    | SignatureUsageReport
    | CardVsBotReport
    | RunSummaryReport
    | RunEndsReport
    | RunPacingReport
    | CoverageReport;

export interface ReportQuery {
    build: string | null;
    card: string | null;
    /** `all` reads every source; the Worker defaults an absent `?source=` to `human`. */
    source: PlayLogSourceFilter;
}

/** The SQL's source binding: null for `all`, else the source. */
const sourceParam = (source: PlayLogSourceFilter): string | null => (source === 'all' ? null : source);

// `?1` is the build filter (null for every build), `?2` the source (null for every source). Every report starts here.
const FIGHTS_CTE = `
    f AS (SELECT * FROM fights WHERE (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)),
    ev AS (
        SELECT f.id AS fight_id, f.enemy_id, CAST(e.key AS INTEGER) AS ord, e.value AS v,
               json_extract(e.value, '$.kind') AS kind
        FROM f, json_each(f.events_json) AS e
    )`;

const FIGHT_COUNT_SQL = 'SELECT COUNT(*) AS n FROM fights WHERE (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)';

// `?3` is the card filter (null for every card).
const CARD_USAGE_SQL = `
WITH ${FIGHTS_CTE},
    seg AS (
        SELECT ev.*, COALESCE(SUM(kind = 'phase-resolved') OVER (
            PARTITION BY fight_id ORDER BY ord ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS turn_ends
        FROM ev
    ),
    fight_ends AS (SELECT fight_id, SUM(kind = 'phase-resolved') AS last_end FROM ev GROUP BY fight_id),
    draws AS (
        SELECT seg.fight_id, c.value AS card_id, seg.turn_ends
        FROM seg, json_each(seg.v, '$.cards') AS c WHERE seg.kind = 'hand-drawn'
    ),
    plays AS (
        SELECT fight_id, json_extract(v, '$.cardId') AS card_id, turn_ends,
               json_extract(v, '$.useBottom') AS paid
        FROM seg WHERE kind = 'card-played'
    ),
    per_fight AS (
        SELECT k.fight_id, k.card_id,
               COALESCE(d.n, 0) AS draws, COALESCE(d.ends, 0) AS draw_ends,
               COALESCE(p.n, 0) AS plays, COALESCE(p.ends, 0) AS play_ends,
               COALESCE(p.paid, 0) AS paid, fe.last_end
        FROM (SELECT fight_id, card_id FROM draws UNION SELECT fight_id, card_id FROM plays) AS k
        JOIN fight_ends AS fe ON fe.fight_id = k.fight_id
        LEFT JOIN (SELECT fight_id, card_id, COUNT(*) AS n, SUM(turn_ends) AS ends
                   FROM draws GROUP BY fight_id, card_id) AS d
               ON d.fight_id = k.fight_id AND d.card_id = k.card_id
        LEFT JOIN (SELECT fight_id, card_id, COUNT(*) AS n, SUM(turn_ends) AS ends, SUM(paid) AS paid
                   FROM plays GROUP BY fight_id, card_id) AS p
               ON p.fight_id = k.fight_id AND p.card_id = k.card_id
    ),
    hand AS (
        SELECT card_id, SUM(draws) AS drawn, SUM(plays) AS played, SUM(paid) AS paid,
               SUM(MAX(0, play_ends - draw_ends + MAX(0, draws - plays) * last_end)) AS held
        FROM per_fight GROUP BY card_id
    ),
    in_deck AS (
        SELECT d.value AS card_id, COUNT(DISTINCT f.id) AS n FROM f, json_each(f.deck_json) AS d GROUP BY d.value
    ),
    fizzles AS (
        SELECT json_extract(v, '$.cardId') AS card_id, COUNT(*) AS n FROM ev WHERE kind = 'effect-fizzled' GROUP BY 1
    ),
    de AS (
        SELECT * FROM deck_events WHERE (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)
    ),
    offers AS (
        SELECT o.value AS card_id, COUNT(*) AS offered,
               SUM(o.value = de.card_id) AS picked,
               SUM(de.card_id IS NULL OR o.value <> de.card_id) AS skipped
        FROM de, json_each(de.offered_json) AS o
        WHERE de.kind IN ('reward', 'cache-reward') GROUP BY o.value
    ),
    removals AS (
        SELECT card_id, COUNT(*) AS n FROM de WHERE kind = 'remove' AND card_id IS NOT NULL GROUP BY card_id
    ),
    -- D1 caps a compound SELECT at a few terms. A fizzle always follows a
    -- play of its card and a pick is always among the cards offered, so
    -- neither adds a card the four below lack.
    cards AS (
        SELECT card_id FROM in_deck UNION SELECT card_id FROM hand
        UNION SELECT card_id FROM offers UNION SELECT card_id FROM removals
    )
SELECT c.card_id AS cardId,
       COALESCE(i.n, 0) AS fightsInDeck,
       COALESCE(h.drawn, 0) AS drawn,
       COALESCE(h.played, 0) AS played,
       COALESCE(h.played, 0) - COALESCE(h.paid, 0) AS free,
       COALESCE(h.paid, 0) AS paid,
       COALESCE(h.held, 0) AS held,
       COALESCE(z.n, 0) AS fizzled,
       COALESCE(o.offered, 0) AS offered,
       COALESCE(o.picked, 0) AS picked,
       COALESCE(o.skipped, 0) AS skipped,
       COALESCE(r.n, 0) AS removed
FROM cards AS c
LEFT JOIN in_deck AS i ON i.card_id = c.card_id
LEFT JOIN hand AS h ON h.card_id = c.card_id
LEFT JOIN fizzles AS z ON z.card_id = c.card_id
LEFT JOIN offers AS o ON o.card_id = c.card_id
LEFT JOIN removals AS r ON r.card_id = c.card_id
WHERE c.card_id IS NOT NULL AND (?3 IS NULL OR c.card_id = ?3)
ORDER BY fightsInDeck DESC, played DESC, cardId`;

const THREAT_GAPS_SQL = `
WITH ${FIGHTS_CTE}
SELECT enemy_id AS enemyId, threat, COUNT(*) AS overwhelmed, COUNT(DISTINCT fight_id) AS fights
FROM (
    SELECT p.fight_id, p.enemy_id,
           COALESCE((SELECT json_extract(t.v, '$.description') FROM ev AS t
                     WHERE t.fight_id = p.fight_id AND t.kind = 'threat-fired' AND t.ord < p.ord
                       AND json_extract(t.v, '$.phaseIndex') = json_extract(p.v, '$.phaseIndex')
                     ORDER BY t.ord DESC LIMIT 1),
                    'phase ' || (json_extract(p.v, '$.phaseIndex') + 1)) AS threat
    FROM ev AS p
    WHERE p.kind = 'phase-resolved' AND json_extract(p.v, '$.mark') = 'overwhelmed'
)
GROUP BY enemy_id, threat
ORDER BY enemyId, overwhelmed DESC, threat`;

const DICE_GAPS_SQL = `
WITH ${FIGHTS_CTE},
    tr AS (
        SELECT ev.*, SUM(kind = 'turn-dice-rolled') OVER (PARTITION BY fight_id ORDER BY ord) AS turn_no FROM ev
    ),
    ended AS (SELECT DISTINCT fight_id, turn_no FROM tr WHERE kind = 'phase-resolved'),
    rolled AS (
        SELECT tr.fight_id, tr.enemy_id, tr.turn_no,
               json_extract(d.value, '$.id') AS die_id, json_extract(d.value, '$.color') AS color
        FROM tr, json_each(tr.v, '$.dice') AS d
        JOIN ended ON ended.fight_id = tr.fight_id AND ended.turn_no = tr.turn_no
        WHERE tr.kind = 'turn-dice-rolled'
          AND json_extract(d.value, '$.state') = 'available'
          AND COALESCE(json_extract(d.value, '$.face'), 'mana') <> 'miss'
          AND json_extract(d.value, '$.color') <> 'x'
    ),
    used AS (
        SELECT DISTINCT fight_id, turn_no, json_extract(v, '$.dieId') AS die_id FROM tr
        WHERE kind IN ('die-spent', 'die-banked', 'floating-die-spent')
    )
SELECT r.enemy_id AS enemyId, r.color, COUNT(*) AS rolled,
       SUM(NOT EXISTS (SELECT 1 FROM used AS u
                       WHERE u.fight_id = r.fight_id AND u.turn_no = r.turn_no AND u.die_id = r.die_id)) AS unspent
FROM rolled AS r
GROUP BY r.enemy_id, r.color
ORDER BY enemyId, unspent DESC, color`;

const DEFEAT_GAPS_SQL = `
WITH ${FIGHTS_CTE}
SELECT enemy_id AS enemyId, COALESCE(cause, 'unknown') AS cause, COUNT(*) AS fights
FROM (
    SELECT f.id, f.enemy_id,
           (SELECT CASE WHEN ev.kind = 'threat-fired' THEN json_extract(ev.v, '$.description')
                        ELSE 'DoT: ' || json_extract(ev.v, '$.label') END
            FROM ev
            WHERE ev.fight_id = f.id
              AND (ev.kind = 'threat-fired'
                   OR (ev.kind = 'dot-tick' AND json_extract(ev.v, '$.target') = 'self'))
            ORDER BY ev.ord DESC LIMIT 1) AS cause
    FROM f WHERE f.outcome = 'defeat'
)
GROUP BY enemy_id, cause
ORDER BY enemyId, fights DESC, cause`;

const SIGNATURE_USAGE_SQL = `
WITH ${FIGHTS_CTE},
    worn AS (
        SELECT s.value AS sig, COUNT(DISTINCT f.id) AS n FROM f, json_each(f.signatures_json) AS s GROUP BY s.value
    ),
    casts AS (
        SELECT json_extract(v, '$.signatureId') AS sig, COUNT(*) AS casts, COUNT(DISTINCT fight_id) AS fights
        FROM ev WHERE kind = 'signature-cast' GROUP BY 1
    ),
    refusals AS (
        SELECT json_extract(v, '$.signatureId') AS sig, COUNT(*) AS n
        FROM ev WHERE kind = 'ui-signature-refused' GROUP BY 1
    ),
    sigs AS (SELECT sig FROM worn UNION SELECT sig FROM casts UNION SELECT sig FROM refusals)
SELECT s.sig AS signatureId,
       COALESCE(w.n, 0) AS fightsWorn,
       COALESCE(c.fights, 0) AS fightsCast,
       COALESCE(c.casts, 0) AS casts,
       CASE WHEN COALESCE(w.n, 0) = 0 THEN NULL ELSE ROUND(1.0 * COALESCE(c.casts, 0) / w.n, 2) END AS castsPerFight,
       COALESCE(r.n, 0) AS refused
FROM sigs AS s
LEFT JOIN worn AS w ON w.sig = s.sig
LEFT JOIN casts AS c ON c.sig = s.sig
LEFT JOIN refusals AS r ON r.sig = s.sig
WHERE s.sig IS NOT NULL
ORDER BY fightsWorn DESC, casts DESC, signatureId`;

// card-vs-bot. `?1` is the build. A sim row's column is its run's policy, else its `solver`; T's rows are `human`.
const COLUMN_OF_FIGHT = `CASE WHEN fights.source = 'sim'
        THEN COALESCE((SELECT p.policy_id FROM play_runs AS p WHERE p.run_id = fights.run_id), fights.solver)
        ELSE 'human' END`;
const COLUMN_OF_DECK_EVENT = `CASE WHEN deck_events.source = 'sim'
        THEN COALESCE((SELECT p.policy_id FROM play_runs AS p WHERE p.run_id = deck_events.run_id), deck_events.solver)
        ELSE 'human' END`;

const VS_BOT_BUILD_SQL = `
SELECT build_commit AS build FROM fights
WHERE build_commit IS NOT NULL AND source IN ('human', 'sim')
GROUP BY build_commit
HAVING SUM(source = 'human') > 0 AND SUM(source = 'sim') > 0
ORDER BY MAX(id) DESC LIMIT 1`;

const VS_BOT_COLUMNS_SQL = `
SELECT ${COLUMN_OF_FIGHT} AS col, MAX(source) AS source, COUNT(*) AS fights FROM fights
WHERE build_commit = ?1 AND source IN ('human', 'sim') GROUP BY col`;

const VS_BOT_CARDS_SQL = `
WITH f AS (
        SELECT id, deck_json, events_json, ${COLUMN_OF_FIGHT} AS col FROM fights
        WHERE build_commit = ?1 AND source IN ('human', 'sim')
    ),
    ev AS (
        SELECT f.id AS fight_id, f.col, e.value AS v, json_extract(e.value, '$.kind') AS kind
        FROM f, json_each(f.events_json) AS e
    ),
    in_deck AS (
        SELECT f.col, d.value AS card_id, COUNT(DISTINCT f.id) AS n FROM f, json_each(f.deck_json) AS d GROUP BY 1, 2
    ),
    draws AS (
        SELECT ev.col, c.value AS card_id, COUNT(*) AS n
        FROM ev, json_each(ev.v, '$.cards') AS c WHERE ev.kind = 'hand-drawn' GROUP BY 1, 2
    ),
    plays AS (
        SELECT col, json_extract(v, '$.cardId') AS card_id, COUNT(*) AS n FROM ev WHERE kind = 'card-played' GROUP BY 1, 2
    ),
    de AS (
        SELECT deck_events.kind, deck_events.card_id, deck_events.offered_json, ${COLUMN_OF_DECK_EVENT} AS col
        FROM deck_events WHERE build_commit = ?1 AND source IN ('human', 'sim')
    ),
    offers AS (
        SELECT de.col, o.value AS card_id, COUNT(*) AS offered,
               SUM(o.value = de.card_id) AS picked,
               SUM(de.card_id IS NULL OR o.value <> de.card_id) AS skipped
        FROM de, json_each(de.offered_json) AS o WHERE de.kind IN ('reward', 'cache-reward') GROUP BY 1, 2
    ),
    -- Four terms: D1 caps a compound SELECT at a few.
    keys AS (
        SELECT col, card_id FROM in_deck UNION SELECT col, card_id FROM draws
        UNION SELECT col, card_id FROM plays UNION SELECT col, card_id FROM offers
    )
SELECT k.col AS col, k.card_id AS cardId,
       COALESCE(i.n, 0) AS fightsInDeck, COALESCE(d.n, 0) AS drawn, COALESCE(p.n, 0) AS played,
       COALESCE(o.offered, 0) AS offered, COALESCE(o.picked, 0) AS picked, COALESCE(o.skipped, 0) AS skipped
FROM keys AS k
LEFT JOIN in_deck AS i ON i.col = k.col AND i.card_id = k.card_id
LEFT JOIN draws AS d ON d.col = k.col AND d.card_id = k.card_id
LEFT JOIN plays AS p ON p.col = k.col AND p.card_id = k.card_id
LEFT JOIN offers AS o ON o.col = k.col AND o.card_id = k.card_id
WHERE k.card_id IS NOT NULL`;

// run-summary. `?1` build, `?2` source (null for every source). A run's policy counts for `sim` only.
const RUN_SUMMARY_SQL = `
WITH r AS (
    SELECT *, CASE WHEN source = 'sim' THEN policy_id END AS pol FROM play_runs
    WHERE (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)
)
SELECT g.source AS source, g.pol AS policyId, g.runs, g.open, g.runOver, g.chapterClear, g.reset,
       g.avgLevel, g.maxLevel, g.avgVitaeEnd, g.avgNodesResolved, g.maxNodesResolved,
       (SELECT q.end_node_id FROM r AS q
        WHERE q.source = g.source AND q.pol IS g.pol AND q.nodes_resolved IS NOT NULL
        ORDER BY q.nodes_resolved DESC, q.id DESC LIMIT 1) AS furthestNodeId
FROM (
    SELECT source, pol, COUNT(*) AS runs,
           COALESCE(SUM(ended_at IS NULL), 0) AS open,
           COALESCE(SUM(outcome = 'run-over'), 0) AS runOver,
           COALESCE(SUM(outcome = 'chapter-clear'), 0) AS chapterClear,
           COALESCE(SUM(outcome = 'reset'), 0) AS reset,
           ROUND(AVG(level), 1) AS avgLevel, MAX(level) AS maxLevel,
           ROUND(AVG(vitae_end), 1) AS avgVitaeEnd,
           ROUND(AVG(nodes_resolved), 1) AS avgNodesResolved, MAX(nodes_resolved) AS maxNodesResolved
    FROM r GROUP BY source, pol
) AS g
ORDER BY CASE g.source WHEN 'human' THEN 0 WHEN 'harness' THEN 1 ELSE 2 END, g.pol`;

// run-ends. `?1` build, `?2` source (null for every source). Closed runs only.
const RUN_ENDS_SQL = `
SELECT source, CASE WHEN source = 'sim' THEN policy_id END AS policyId, end_node_id AS endNodeId,
       COUNT(*) AS runs,
       COALESCE(SUM(outcome = 'run-over'), 0) AS runOver,
       COALESCE(SUM(outcome = 'chapter-clear'), 0) AS chapterClear,
       ROUND(AVG(level), 1) AS avgLevel, ROUND(AVG(vitae_end), 1) AS avgVitaeEnd
FROM play_runs
WHERE ended_at IS NOT NULL AND (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)
GROUP BY source, policyId, end_node_id
ORDER BY CASE source WHEN 'human' THEN 0 WHEN 'harness' THEN 1 ELSE 2 END, policyId, runs DESC, endNodeId`;

// `?1` build, `?2` source. Every run read, closed or not.
const RUN_COUNT_SQL = `
SELECT COUNT(*) AS n FROM play_runs WHERE (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)`;

// run-pacing. `seq` orders a run's events, so "resolved before" is the node-resolved events with a lower `seq` than the
// run's first node-entered at the node.
const RUN_PACING_SQL = `
WITH r AS (
        SELECT run_id, source, CASE WHEN source = 'sim' THEN policy_id END AS pol FROM play_runs
        WHERE (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)
    ),
    ev AS (
        SELECT r.source, r.pol, e.run_id, e.seq, e.kind, e.payload_json AS p
        FROM run_events AS e JOIN r ON r.run_id = e.run_id WHERE e.kind IN ('node-entered', 'node-resolved')
    ),
    first_in AS (
        SELECT source, pol, run_id, json_extract(p, '$.nodeId') AS node_id, MIN(seq) AS seq
        FROM ev WHERE kind = 'node-entered' GROUP BY source, pol, run_id, node_id
    ),
    entered AS (
        SELECT fi.source, fi.pol, fi.node_id, COUNT(*) AS runs,
               AVG((SELECT COUNT(*) FROM ev AS x WHERE x.run_id = fi.run_id AND x.kind = 'node-resolved' AND x.seq < fi.seq)) AS before
        FROM first_in AS fi GROUP BY fi.source, fi.pol, fi.node_id
    ),
    resolved AS (
        SELECT source, pol, json_extract(p, '$.nodeId') AS node_id,
               AVG(json_extract(p, '$.level')) AS lvl, AVG(json_extract(p, '$.vitae')) AS vit,
               COALESCE(SUM(json_extract(p, '$.choice') = 'rest'), 0) AS rests,
               COALESCE(SUM(json_extract(p, '$.choice') = 'flee'), 0) AS withdrawals
        FROM ev WHERE kind = 'node-resolved' GROUP BY source, pol, node_id
    )
SELECT e.source AS source, e.pol AS policyId, e.node_id AS nodeId, e.runs AS runs,
       ROUND(e.before, 1) AS avgResolvedBefore, ROUND(x.lvl, 1) AS avgLevel, ROUND(x.vit, 1) AS avgVitae,
       COALESCE(x.rests, 0) AS rests, COALESCE(x.withdrawals, 0) AS withdrawals
FROM entered AS e
LEFT JOIN resolved AS x ON x.source = e.source AND x.pol IS e.pol AND x.node_id = e.node_id
ORDER BY CASE e.source WHEN 'human' THEN 0 WHEN 'harness' THEN 1 ELSE 2 END, e.pol, e.runs DESC, e.node_id`;

// coverage, the part read from run events. A node's `runs` and `count` come from node-entered alone; its resolutions only
// add to `cleared`.
const COVERAGE_EVENTS_SQL = `
WITH r AS (
        SELECT run_id, source, CASE WHEN source = 'sim' THEN policy_id END AS pol FROM play_runs
        WHERE (?1 IS NULL OR build_commit = ?1) AND (?2 IS NULL OR source = ?2)
    ),
    ev AS (
        SELECT r.source, r.pol, e.run_id, e.kind, e.payload_json AS p
        FROM run_events AS e JOIN r ON r.run_id = e.run_id
        WHERE e.kind IN ('node-entered', 'node-resolved', 'quest-step', 'hazard-ended', 'item-gained')
    ),
    keyed AS (
        SELECT source, pol, run_id,
               CASE kind WHEN 'quest-step' THEN 'quest-step' WHEN 'hazard-ended' THEN 'hazard'
                         WHEN 'item-gained' THEN 'item' ELSE 'node' END AS cov_kind,
               CASE kind
                   WHEN 'quest-step' THEN CASE WHEN json_extract(p, '$.stepId') IS NULL THEN json_extract(p, '$.questId')
                                               ELSE json_extract(p, '$.questId') || '/' || json_extract(p, '$.stepId') END
                   WHEN 'hazard-ended' THEN json_extract(p, '$.hazardId')
                   WHEN 'item-gained' THEN json_extract(p, '$.itemId')
                   ELSE json_extract(p, '$.nodeId') END AS cov_id,
               kind <> 'node-resolved' AS counted,
               CASE kind WHEN 'node-resolved' THEN 1
                         WHEN 'quest-step' THEN json_extract(p, '$.action') IN ('turn-in', 'complete')
                         WHEN 'hazard-ended' THEN json_extract(p, '$.cleared') = 1
                         ELSE 0 END AS went
        FROM ev
    )
SELECT source, pol AS policyId, cov_kind AS kind, cov_id AS id,
       COUNT(DISTINCT CASE WHEN counted THEN run_id END) AS runs,
       COALESCE(SUM(counted), 0) AS count,
       CASE WHEN cov_kind = 'item' THEN NULL ELSE COALESCE(SUM(went), 0) END AS cleared
FROM keyed WHERE cov_id IS NOT NULL
GROUP BY source, pol, cov_kind, cov_id
HAVING COUNT(DISTINCT CASE WHEN counted THEN run_id END) > 0`;

// coverage, the part read from `fights`: an enemy's policy is its run's, as the run-summary's is.
const COVERAGE_ENEMIES_SQL = `
SELECT f.source AS source,
       CASE WHEN f.source = 'sim' THEN (SELECT p.policy_id FROM play_runs AS p WHERE p.run_id = f.run_id) END AS policyId,
       'enemy' AS kind, f.enemy_id AS id,
       COUNT(DISTINCT f.run_id) AS runs, COUNT(*) AS count, COALESCE(SUM(f.outcome = 'victory'), 0) AS cleared
FROM fights AS f
WHERE (?1 IS NULL OR f.build_commit = ?1) AND (?2 IS NULL OR f.source = ?2)
GROUP BY f.source, policyId, f.enemy_id`;

const SOURCE_RANK: Record<string, number> = { human: 0, harness: 1 };
const COVERAGE_RANK: Record<string, number> = Object.fromEntries(COVERAGE_KINDS.map((k, i) => [k, i]));
const byText = (a: string | null, b: string | null): number => (a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1);

async function fightCount(db: D1Database, query: ReportQuery): Promise<number> {
    const row = await db.prepare(FIGHT_COUNT_SQL).bind(query.build, sourceParam(query.source)).first<{ n: number }>();
    return row?.n ?? 0;
}

export async function cardUsage(db: D1Database, query: ReportQuery): Promise<CardUsageReport> {
    const { results } = await db.prepare(CARD_USAGE_SQL).bind(query.build, sourceParam(query.source), query.card).all<CardUsageRow>();
    return {
        report: 'card-usage', build: query.build, source: query.source, card: query.card, fights: await fightCount(db, query), cards: results,
    };
}

export async function cardGaps(db: D1Database, query: ReportQuery): Promise<CardGapsReport> {
    const [threats, dice, defeats] = await db.batch([
        db.prepare(THREAT_GAPS_SQL).bind(query.build, sourceParam(query.source)),
        db.prepare(DICE_GAPS_SQL).bind(query.build, sourceParam(query.source)),
        db.prepare(DEFEAT_GAPS_SQL).bind(query.build, sourceParam(query.source)),
    ]);
    return {
        report: 'card-gaps',
        build: query.build,
        source: query.source,
        fights: await fightCount(db, query),
        threats: threats.results as unknown as ThreatGapRow[],
        unspentDice: dice.results as unknown as DiceGapRow[],
        defeats: defeats.results as unknown as DefeatGapRow[],
    };
}

export async function signatureUsage(db: D1Database, query: ReportQuery): Promise<SignatureUsageReport> {
    const { results } = await db.prepare(SIGNATURE_USAGE_SQL).bind(query.build, sourceParam(query.source)).all<SignatureUsageRow>();
    return {
        report: 'signature-usage', build: query.build, source: query.source, fights: await fightCount(db, query), signatures: results,
    };
}

const rate = (n: number, of: number): number | null => (of === 0 ? null : Math.round((100 * n) / of) / 100);

const NO_COUNTS = { fightsInDeck: 0, drawn: 0, played: 0, offered: 0, picked: 0, skipped: 0 };

function countsOf(raw: typeof NO_COUNTS, fights: number): CardVsBotCounts {
    return {
        ...raw,
        inDeckPerFight: rate(raw.fightsInDeck, fights),
        drawnPerFight: rate(raw.drawn, fights),
        playedPerFight: rate(raw.played, fights),
        pickedPerOffer: rate(raw.picked, raw.offered),
        skippedPerOffer: rate(raw.skipped, raw.offered),
    };
}

interface VsBotCardRow extends Record<string, string | number> {
    col: string;
    cardId: string;
}

/** `?source=` and `?card=` do not apply: the two sources are the report. Only `?build=` does. */
export async function cardVsBot(db: D1Database, query: ReportQuery): Promise<CardVsBotReport> {
    const defaulted = query.build === null;
    const build = defaulted ? ((await db.prepare(VS_BOT_BUILD_SQL).first<{ build: string }>())?.build ?? null) : query.build;
    const empty: CardVsBotReport = { report: 'card-vs-bot', build, buildDefaulted: defaulted, sources: ['human', 'sim'], columns: [], cards: [] };
    if (build === null) return empty;

    const [cols, cards] = await db.batch([db.prepare(VS_BOT_COLUMNS_SQL).bind(build), db.prepare(VS_BOT_CARDS_SQL).bind(build)]);
    // T's column first, then the policies by name.
    const columns = (cols.results as unknown as { col: string; source: 'human' | 'sim'; fights: number }[])
        .map(c => ({ column: c.col, source: c.source, fights: c.fights }))
        .sort((a, b) => (a.source === b.source ? a.column.localeCompare(b.column) : a.source === 'human' ? -1 : 1));
    const fights = new Map(columns.map(c => [c.column, c.fights]));

    const byCard = new Map<string, Map<string, typeof NO_COUNTS>>();
    for (const row of cards.results as unknown as VsBotCardRow[]) {
        const raw = { fightsInDeck: +row.fightsInDeck, drawn: +row.drawn, played: +row.played, offered: +row.offered, picked: +row.picked, skipped: +row.skipped };
        const perCol = byCard.get(row.cardId) ?? new Map<string, typeof NO_COUNTS>();
        perCol.set(row.col, raw);
        byCard.set(row.cardId, perCol);
    }
    const rows: CardVsBotRow[] = [...byCard].map(([cardId, perCol]) => ({
        cardId,
        columns: Object.fromEntries(columns.map(c => [c.column, countsOf(perCol.get(c.column) ?? NO_COUNTS, fights.get(c.column) ?? 0)])),
    }));
    const lead = columns[0]?.column ?? 'human';
    const total = (r: CardVsBotRow) => Object.values(r.columns).reduce((sum, c) => sum + c.played, 0);
    rows.sort((a, b) => (b.columns[lead]?.fightsInDeck ?? 0) - (a.columns[lead]?.fightsInDeck ?? 0) || total(b) - total(a) || a.cardId.localeCompare(b.cardId));
    return { ...empty, columns, cards: rows };
}

/** `?card=` does not apply. With no `?source=` the route reads every source (see `handleReport`). */
export async function runSummary(db: D1Database, query: ReportQuery): Promise<RunSummaryReport> {
    const { results } = await db.prepare(RUN_SUMMARY_SQL).bind(query.build, sourceParam(query.source)).all<RunSummaryRow>();
    return {
        report: 'run-summary', build: query.build, source: query.source, runs: results.reduce((sum, r) => sum + r.runs, 0), summary: results,
    };
}

export async function runEnds(db: D1Database, query: ReportQuery): Promise<RunEndsReport> {
    const { results } = await db.prepare(RUN_ENDS_SQL).bind(query.build, sourceParam(query.source)).all<RunEndsRow>();
    return {
        report: 'run-ends', build: query.build, source: query.source, runs: results.reduce((sum, r) => sum + r.runs, 0), ends: results,
    };
}

export async function runPacing(db: D1Database, query: ReportQuery): Promise<RunPacingReport> {
    const args = [query.build, sourceParam(query.source)] as const;
    const [pacing, runs] = await db.batch([db.prepare(RUN_PACING_SQL).bind(...args), db.prepare(RUN_COUNT_SQL).bind(...args)]);
    return {
        report: 'run-pacing', build: query.build, source: query.source, runs: (runs.results[0] as { n: number } | undefined)?.n ?? 0,
        pacing: pacing.results as unknown as RunPacingRow[],
    };
}

export async function coverage(db: D1Database, query: ReportQuery): Promise<CoverageReport> {
    const args = [query.build, sourceParam(query.source)] as const;
    const [events, enemies, runs] = await db.batch([
        db.prepare(COVERAGE_EVENTS_SQL).bind(...args), db.prepare(COVERAGE_ENEMIES_SQL).bind(...args), db.prepare(RUN_COUNT_SQL).bind(...args),
    ]);
    const rows = [...(events.results as unknown as CoverageRow[]), ...(enemies.results as unknown as CoverageRow[])];
    rows.sort((a, b) =>
        (SOURCE_RANK[a.source] ?? 2) - (SOURCE_RANK[b.source] ?? 2) || byText(a.policyId, b.policyId)
        || COVERAGE_RANK[a.kind] - COVERAGE_RANK[b.kind] || b.count - a.count || byText(a.id, b.id));
    return {
        report: 'coverage', build: query.build, source: query.source, runs: (runs.results[0] as { n: number } | undefined)?.n ?? 0, coverage: rows,
    };
}

/** Runs one named report; `?card=` only narrows card-usage. */
export function runReport(name: ReportName, env: Env, query: ReportQuery): Promise<Report> {
    if (name === 'card-usage') return cardUsage(env.DB, query);
    if (name === 'signature-usage') return signatureUsage(env.DB, query);
    if (name === 'card-vs-bot') return cardVsBot(env.DB, query);
    if (name === 'run-summary') return runSummary(env.DB, query);
    if (name === 'run-ends') return runEnds(env.DB, query);
    if (name === 'run-pacing') return runPacing(env.DB, query);
    if (name === 'coverage') return coverage(env.DB, query);
    return cardGaps(env.DB, query);
}
