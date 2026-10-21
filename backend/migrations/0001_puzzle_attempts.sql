-- One ended /devpuzzle attempt per row (phase BE1a). Every later change is a
-- new numbered migration; this file is never edited once applied.
CREATE TABLE puzzle_attempts (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    solver TEXT NOT NULL,
    layout_id TEXT NOT NULL,
    route TEXT NOT NULL,
    intended_band TEXT,
    end_kind TEXT NOT NULL,
    end_ms INTEGER NOT NULL,
    cleared INTEGER NOT NULL CHECK (cleared IN (0, 1)),
    moves_json TEXT NOT NULL,
    app_build TEXT NOT NULL
);

CREATE INDEX puzzle_attempts_layout_id ON puzzle_attempts (layout_id);
