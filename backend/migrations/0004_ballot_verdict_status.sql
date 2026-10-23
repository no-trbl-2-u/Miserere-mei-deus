-- Ballot verdict status (phase BV2a): a row is a `draft` (a Save, progress
-- only) or a `final` (a Submit). Every row stored before this migration was a
-- Submit, so the default makes it `final`. The verdict in force for a
-- ballot_id is its newest `final` row. Never edited once applied.
ALTER TABLE ballot_verdicts
    ADD COLUMN status TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('draft', 'final'));

CREATE INDEX ballot_verdicts_ballot_id_status ON ballot_verdicts (ballot_id, status);
