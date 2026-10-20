// scripts/__tests__/smoke-screens.test.ts
//
// Hermetic tests for the pure helpers in smoke-screens.mjs. Boot,
// expo-export, server, and browser are all integration concerns —
// not covered here. Follows the same pattern as deploy-check.test.ts:
// helpers are duplicated inline so the test file doesn't have to load
// the .mjs entrypoint (Jest's default loader can't require ESM .mjs).

describe('smoke-screens helpers', () => {
    // Mirror of smoke-screens.mjs:ROUTES — keep in sync.
    const ROUTES = [
        { name: 'root', path: '/' },
        { name: 'character', path: '/character' },
        { name: 'inventory', path: '/inventory' },
        { name: 'exploration', path: '/exploration' },
        { name: 'combat-encounter', path: '/combat-encounter', liveFight: true },
        { name: 'memoir', path: '/memoir' },
    ]

    const DIFF_THRESHOLD_RATIO = 0.005

    const EXIT = {
        OK: 0,
        DIFF: 1,
        MISSING_BASELINE: 2,
        BOOT_FAILURE: 3,
        NONDETERMINISTIC: 4,
    }

    const VIEWPORT = { width: 390, height: 844 }

    function pixelDiffRatio(width: number, height: number, diffPixelCount: number): number {
        const total = width * height
        if (total === 0) return 0
        return diffPixelCount / total
    }

    function isOverThreshold(ratio: number, threshold = DIFF_THRESHOLD_RATIO): boolean {
        return ratio > threshold
    }

    type StaticPathCandidate = {
        requestedPath: string
        exists: boolean
        isDirectory: boolean
    }

    function resolveStaticExportPath(_pathname: string, candidates: StaticPathCandidate[]): string {
        const exact = candidates[0]
        const directoryIndex = candidates[1]
        const htmlGuess = candidates[2]
        const fallbackIndex = candidates[3]

        if (exact?.exists && !exact.isDirectory) return exact.requestedPath
        if (exact?.exists && exact.isDirectory && directoryIndex?.exists && !directoryIndex.isDirectory) {
            return directoryIndex.requestedPath
        }
        if (htmlGuess?.exists && !htmlGuess.isDirectory) return htmlGuess.requestedPath
        return fallbackIndex.requestedPath
    }

    describe('resolveStaticExportPath', () => {
        test('serves index.html for extensionless directory routes', () => {
            const resolved = resolveStaticExportPath('/character', [
                { requestedPath: '/export/character', exists: true, isDirectory: true },
                { requestedPath: '/export/character/index.html', exists: true, isDirectory: false },
                { requestedPath: '/export/character.html', exists: false, isDirectory: false },
                { requestedPath: '/export/index.html', exists: true, isDirectory: false },
            ])

            expect(resolved).toBe('/export/character/index.html')
        })
    })

    type SmokeResult = {
        bootError?: string
        matched: unknown[]
        differing: unknown[]
        missing: unknown[]
        consoleErrors: unknown[]
    }

    function resultToExit(result: SmokeResult): number {
        if (result.bootError) return EXIT.BOOT_FAILURE
        if (result.missing.length > 0) return EXIT.MISSING_BASELINE
        if (result.differing.length > 0) return EXIT.DIFF
        return EXIT.OK
    }

    describe('ROUTES', () => {
        test('covers primary routed surfaces with seeded combat encounter evidence', () => {
            const names = ROUTES.map((r) => r.name)
            expect(names).toEqual(
                expect.arrayContaining([
                    'root',
                    'character',
                    'inventory',
                    'exploration',
                    'combat-encounter',
                    'memoir',
                ]),
            )
        })

        test('every route has a leading-slash path', () => {
            for (const r of ROUTES) {
                expect(r.path.startsWith('/')).toBe(true)
            }
        })

        test('route names are unique (no collisions on output PNG filenames)', () => {
            const names = ROUTES.map((r) => r.name)
            expect(new Set(names).size).toBe(names.length)
        })

        test('route names use slug-safe characters (no slashes / spaces)', () => {
            for (const r of ROUTES) {
                expect(r.name).toMatch(/^[a-z][a-z0-9-]*$/)
            }
        })
    })

    describe('pixelDiffRatio', () => {
        test('returns 0 for zero-area images (no division by zero)', () => {
            expect(pixelDiffRatio(0, 0, 0)).toBe(0)
            expect(pixelDiffRatio(0, 100, 5)).toBe(0)
        })

        test('returns diff / area for normal images', () => {
            expect(pixelDiffRatio(100, 100, 50)).toBeCloseTo(0.005)
            expect(pixelDiffRatio(390, 844, 1000)).toBeCloseTo(1000 / (390 * 844))
        })

        test('hits 1.0 for fully-different images', () => {
            const ratio = pixelDiffRatio(10, 10, 100)
            expect(ratio).toBe(1)
        })
    })

    describe('isOverThreshold', () => {
        test('strict greater-than (matches pixelmatch convention)', () => {
            expect(isOverThreshold(0.005, 0.005)).toBe(false)
            expect(isOverThreshold(0.006, 0.005)).toBe(true)
            expect(isOverThreshold(0.004, 0.005)).toBe(false)
        })

        test('defaults to DIFF_THRESHOLD_RATIO (0.5%)', () => {
            expect(DIFF_THRESHOLD_RATIO).toBe(0.005)
            expect(isOverThreshold(0.01)).toBe(true)
            expect(isOverThreshold(0.001)).toBe(false)
        })
    })

    describe('resultToExit', () => {
        test('OK when nothing differs or is missing', () => {
            expect(
                resultToExit({ matched: [{}], differing: [], missing: [], consoleErrors: [] }),
            ).toBe(EXIT.OK)
        })

        test('DIFF when at least one route differs', () => {
            expect(
                resultToExit({
                    matched: [],
                    differing: [{ route: 'character' }],
                    missing: [],
                    consoleErrors: [],
                }),
            ).toBe(EXIT.DIFF)
        })

        test('MISSING_BASELINE for first-run / new route', () => {
            expect(
                resultToExit({
                    matched: [],
                    differing: [],
                    missing: [{ route: 'combat' }],
                    consoleErrors: [],
                }),
            ).toBe(EXIT.MISSING_BASELINE)
        })

        test('BOOT_FAILURE outranks every other signal', () => {
            expect(
                resultToExit({
                    bootError: 'expo export failed',
                    matched: [],
                    differing: [{ route: 'x' }],
                    missing: [{ route: 'y' }],
                    consoleErrors: [],
                }),
            ).toBe(EXIT.BOOT_FAILURE)
        })

        test('MISSING_BASELINE wins over DIFF when both empty + missing present', () => {
            expect(
                resultToExit({
                    matched: [],
                    differing: [],
                    missing: [{ route: 'new' }],
                    consoleErrors: [],
                }),
            ).toBe(EXIT.MISSING_BASELINE)
        })
    })

    describe('EXIT contract', () => {
        test('exit codes are stable + distinct (smoke gate consumers depend on these)', () => {
            expect(EXIT.OK).toBe(0)
            expect(EXIT.DIFF).toBe(1)
            expect(EXIT.MISSING_BASELINE).toBe(2)
            expect(EXIT.BOOT_FAILURE).toBe(3)
            expect(EXIT.NONDETERMINISTIC).toBe(4)
            expect(new Set(Object.values(EXIT)).size).toBe(5)
        })
    })

    describe('VIEWPORT', () => {
        test('viewport is iPhone-13-ish portrait (390x844 @1x)', () => {
            expect(VIEWPORT).toEqual({ width: 390, height: 844 })
        })
    })
})
