-- The play log (phase BE2a): one ended fight per `fights` row, one change to
-- a run's deck per `deck_events` row. Every later change is a new numbered
-- migration; this file is never edited once applied.
CREATE TABLE fights (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    solver TEXT NOT NULL,
    session_id TEXT NOT NULL,
    build_commit TEXT,
    app_build TEXT NOT NULL,
    enemy_id TEXT NOT NULL,
    player_level INTEGER NOT NULL,
    enemy_hp_multiplier REAL NOT NULL,
    outcome TEXT NOT NULL,
    turns INTEGER NOT NULL,
    vitae_start INTEGER NOT NULL,
    vitae_end INTEGER NOT NULL,
    vitae_low INTEGER NOT NULL,
    deck_json TEXT NOT NULL,
    events_json TEXT NOT NULL
);

CREATE INDEX fights_build_commit ON fights (build_commit);
CREATE INDEX fights_enemy_id ON fights (enemy_id);

-- `kind` is reward, cache-reward, remove or run-end; `upgrade` is reserved
-- and needs no migration when it arrives.
CREATE TABLE deck_events (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    solver TEXT NOT NULL,
    session_id TEXT NOT NULL,
    build_commit TEXT,
    app_build TEXT NOT NULL,
    kind TEXT NOT NULL,
    card_id TEXT,
    offered_json TEXT,
    deck_json TEXT NOT NULL,
    where_json TEXT NOT NULL
);

CREATE INDEX deck_events_card_id ON deck_events (card_id);
CREATE INDEX deck_events_build_commit ON deck_events (build_commit);
