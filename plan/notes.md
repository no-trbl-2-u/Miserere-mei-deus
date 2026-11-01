

Defaults taken: migration 0008 was the next free number; the cron's clock is `controller.scheduledTime`; child deletes also filter on `source IN ('sim','harness')`, so a stray `human` row sharing a bot run id is kept rather than deleted with the run.

Live proof (first cron log line, `GET /v1/play-runs?source=sim` with no run older than 14 days) is a post-merge step after `backend-deploy` runs.
