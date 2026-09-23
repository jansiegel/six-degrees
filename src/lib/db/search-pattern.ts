const LIKE_WILDCARDS = /[%_]/g;

// SQLite only uses an index for LIKE when the pattern is a bound parameter and
// no ESCAPE clause is present, so user-typed wildcards are stripped instead of
// escaped. Null means nothing searchable is left - a bare '%' would scan the
// whole table.
export function buildPrefixPattern(query: string): string | null {
    const literalPrefix = query.replace(LIKE_WILDCARDS, '');

    if (literalPrefix === '') {
        return null;
    }

    return `${literalPrefix}%`;
}
