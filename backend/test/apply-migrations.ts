import { applyD1Migrations, env } from 'cloudflare:test';

// Each test file gets a fresh local D1; bring it to the latest schema first.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
