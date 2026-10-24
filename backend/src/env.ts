/** The Worker's bindings: the D1 database, the shared dev bearer token and the ballot pages' origins. */
export interface Env {
    DB: D1Database;
    PUZZLE_API_TOKEN: string;
    /** Comma-separated origins the ballot routes allow; an entry may be one `*.` subdomain wildcard. */
    BALLOT_ORIGINS?: string;
}
