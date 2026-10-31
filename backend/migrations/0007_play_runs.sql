-- The whole run (phase SM1c): one `play_runs` row per run, opened when the run
-- starts and closed once when it ends, and the `run_events` that happened
-- between. `run_id` is the save's `GameState.runId`, the same id `fights` and
-- `deck_events` carry since 0006. `source` is human, harness or sim. A run's
-- close fields are NULL while it is open. Never edited once applied.
CREATE TABLE play_runs (
    id INTEGER PRIMARY KEY,
    run_id TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL DEFAULT 'human',
    solver TEXT NOT NULL,
    session_id TEXT NOT NULL,
    build_commit TEXT,
    app_build TEXT NOT NULL,
    character_id TEXT,
    policy_id TEXT,
    start_deck_json TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    outcome TEXT,
    end_node_id TEXT,
    level INTEGER,
    vitae_end REAL,
    nodes_resolved INTEGER,
    end_deck_json TEXT
);

CREATE INDEX play_runs_source ON play_runs (source);
CREATE INDEX play_runs_build_commit ON play_runs (build_commit);

-- `kind` is node-entered, node-resolved, hazard-ended, xp-gained, level-up or
-- item-gained; `seq` orders a run's events across batches.
CREATE TABLE run_events (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    run_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'human',
    seq INTEGER NOT NULL,
    kind TEXT NOT NULL,
    payload_json TEXT NOT NULL
);

CREATE INDEX run_events_run_id ON run_events (run_id);
CREATE INDEX run_events_kind ON run_events (kind);
