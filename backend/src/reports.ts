/**
 * The two play-log reports (phase BE2f): `GET /v1/reports/card-usage` and
 * `GET /v1/reports/card-gaps`. The SQL is fixed here and never taken from the
 * client; a query string only binds values (`?build=`, and `?card=` on
 * card-usage). Every number is a count for T to read; nothing grades the game
 * from it. Ad hoc questions go to `wrangler d1 execute --remote`.
 *
 * Both reports read `events_json` with SQLite's JSON functions: each fight's
 * stream is unrolled by `json_each`, whose `key` is the event's position, and
 * a running count of `phase-resolved` events numbers the turn ends.
 *
 * card-usage, per card (a fight counts once per card however many copies):
 *   fightsInDeck  fights whose start deck held the card
 *   drawn         times it came into the hand (`hand-drawn`; the opening hand
 *                 is not in the engine's stream, so it is not counted)
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
 * no draw before it (the opening hand) counts from 0. A scrap carries no card
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
 */

import type { Env } from './env';

export const REPORTS_PATH_PREFIX = '/v1/reports/';

export const REPORT_NAMES = ['card-usage', 'card-gaps'] as const;
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
    fights: number;
    threats: ThreatGapRow[];
    unspentDice: DiceGapRow[];
    defeats: DefeatGapRow[];
}

export type Report = CardUsageReport | CardGapsReport;

export interface ReportQuery {
    build: string | null;
    card: string | null;
}

// `?1` is the build filter (null for every build). Every report starts here.
const FIGHTS_CTE = `
    f AS (SELECT * FROM fights WHERE ?1 IS NULL OR build_commit = ?1),
    ev AS (
        SELECT f.id AS fight_id, f.enemy_id, CAST(e.key AS INTEGER) AS ord, e.value AS v,
               json_extract(e.value, '$.kind') AS kind
        FROM f, json_each(f.events_json) AS e
    )`;

const FIGHT_COUNT_SQL = 'SELECT COUNT(*) AS n FROM fights WHERE ?1 IS NULL OR build_commit = ?1';

// `?2` is the card filter (null for every card).
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
        SELECT * FROM deck_events WHERE ?1 IS NULL OR build_commit = ?1
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
WHERE c.card_id IS NOT NULL AND (?2 IS NULL OR c.card_id = ?2)
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

async function fightCount(db: D1Database, build: string | null): Promise<number> {
    const row = await db.prepare(FIGHT_COUNT_SQL).bind(build).first<{ n: number }>();
    return row?.n ?? 0;
}

export async function cardUsage(db: D1Database, query: ReportQuery): Promise<CardUsageReport> {
    const { results } = await db.prepare(CARD_USAGE_SQL).bind(query.build, query.card).all<CardUsageRow>();
    return { report: 'card-usage', build: query.build, card: query.card, fights: await fightCount(db, query.build), cards: results };
}

export async function cardGaps(db: D1Database, query: ReportQuery): Promise<CardGapsReport> {
    const [threats, dice, defeats] = await db.batch([
        db.prepare(THREAT_GAPS_SQL).bind(query.build),
        db.prepare(DICE_GAPS_SQL).bind(query.build),
        db.prepare(DEFEAT_GAPS_SQL).bind(query.build),
    ]);
    return {
        report: 'card-gaps',
        build: query.build,
        fights: await fightCount(db, query.build),
        threats: threats.results as unknown as ThreatGapRow[],
        unspentDice: dice.results as unknown as DiceGapRow[],
        defeats: defeats.results as unknown as DefeatGapRow[],
    };
}

/** Runs one named report; `?card=` only narrows card-usage. */
export function runReport(name: ReportName, env: Env, query: ReportQuery): Promise<Report> {
    return name === 'card-usage' ? cardUsage(env.DB, query) : cardGaps(env.DB, query);
}
