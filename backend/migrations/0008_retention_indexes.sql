-- Retention (chunk 135.7, SM2g): the nightly cron deletes `sim` and `harness`
-- rows older than 14 days, so every table it sweeps by age gets an index on
-- (source, age). A run's age is `play_runs.started_at`; the other four tables
-- go by `received_at`. Indexes only, no data change. Never edited once applied.
CREATE INDEX fights_source_received_at ON fights (source, received_at);
CREATE INDEX deck_events_source_received_at ON deck_events (source, received_at);
CREATE INDEX puzzle_attempts_source_received_at ON puzzle_attempts (source, received_at);
CREATE INDEX run_events_source_received_at ON run_events (source, received_at);
CREATE INDEX play_runs_source_started_at ON play_runs (source, started_at);
