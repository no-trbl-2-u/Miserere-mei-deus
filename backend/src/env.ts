/** The Worker's bindings: the D1 database and the shared dev bearer token. */
export interface Env {
    DB: D1Database;
    PUZZLE_API_TOKEN: string;
}
