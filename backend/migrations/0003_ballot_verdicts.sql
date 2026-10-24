-- Ballot verdicts (phase BV1a): one submitted ballot per row. A resubmit is a
-- new row; the newest row for a ballot_id is the verdict in force and the
-- older rows stay as history. Every later change is a new numbered
-- migration; this file is never edited once applied.
CREATE TABLE ballot_verdicts (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL,
    ballot_id TEXT NOT NULL,
    verdict_text TEXT NOT NULL,
    kept_json TEXT NOT NULL,
    notes_json TEXT NOT NULL,
    general TEXT,
    client TEXT
);

CREATE INDEX ballot_verdicts_ballot_id ON ballot_verdicts (ballot_id);
