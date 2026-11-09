/** The Worker's bindings: the D1 database, the two bearer tokens and the ballot pages' origins. */
export interface Env {
    DB: D1Database;
    /** The owner token: every route and method. */
    PUZZLE_API_TOKEN: string;
    /**
     * The tester token, the one a published APK carries (spec 163): accepted only on the POST of a
     * route marked `tester: true`. Unset, the Worker behaves as it did before it existed.
     */
    PUZZLE_TESTER_TOKEN?: string;
    /** Comma-separated origins the ballot routes allow; an entry may be one `*.` subdomain wildcard. */
    BALLOT_ORIGINS?: string;
}
