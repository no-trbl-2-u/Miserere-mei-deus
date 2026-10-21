import { fileURLToPath } from 'node:url';

import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

// The Worker's tests run inside the Workers runtime (workerd) against a local
// D1 that miniflare creates per test file; the migrations are read here, in
// Node, and applied inside the runtime by test/apply-migrations.ts.
export default defineWorkersConfig(async () => {
    const migrations = await readD1Migrations(fileURLToPath(new URL('./migrations', import.meta.url)));
    return {
        test: {
            include: ['test/**/*.test.ts'],
            setupFiles: ['./test/apply-migrations.ts'],
            poolOptions: {
                workers: {
                    singleWorker: true,
                    wrangler: { configPath: './wrangler.toml' },
                    miniflare: {
                        bindings: { PUZZLE_API_TOKEN: 'test-token', TEST_MIGRATIONS: migrations },
                    },
                },
            },
        },
    };
});
