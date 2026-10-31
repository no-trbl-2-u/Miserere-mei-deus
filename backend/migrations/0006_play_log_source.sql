-- Who played each row (phase SM1a): `human` (T on a preview APK), `harness`
-- (a local harness run, e2e or dev server) or `sim` (a headless bot), and the
-- run the row belongs to. An older APK posts neither, so a row it sends
-- lands as `human` with a null run id. Never edited once applied.
ALTER TABLE fights ADD COLUMN source TEXT NOT NULL DEFAULT 'human';
ALTER TABLE fights ADD COLUMN run_id TEXT;
ALTER TABLE deck_events ADD COLUMN source TEXT NOT NULL DEFAULT 'human';
ALTER TABLE deck_events ADD COLUMN run_id TEXT;
ALTER TABLE puzzle_attempts ADD COLUMN source TEXT NOT NULL DEFAULT 'human';
ALTER TABLE puzzle_attempts ADD COLUMN run_id TEXT;

CREATE INDEX fights_source ON fights (source);
CREATE INDEX fights_run_id ON fights (run_id);
CREATE INDEX deck_events_source ON deck_events (source);
CREATE INDEX deck_events_run_id ON deck_events (run_id);

-- T (2026-10-31): start clean. Every fight and deck event stored before this
-- migration, whatever its build commit, is relabelled `harness`; from here on
-- only a build that carries the human stamp posts `human`. Puzzle attempts
-- stay `human`.
UPDATE fights SET source = 'harness';
UPDATE deck_events SET source = 'harness';
