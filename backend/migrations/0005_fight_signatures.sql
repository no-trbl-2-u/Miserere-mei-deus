-- Signature tracking (phase LR1g): the relics and the signatures they grant,
-- worn at a fight's start, as JSON arrays of ids. Every row stored before this
-- migration, and every post from a build that does not send them, reads as
-- empty. Never edited once applied.
ALTER TABLE fights ADD COLUMN relics_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE fights ADD COLUMN signatures_json TEXT NOT NULL DEFAULT '[]';
