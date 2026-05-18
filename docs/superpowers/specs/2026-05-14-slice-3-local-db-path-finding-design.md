# Slice 3 — Local DB path finding

Date: 2026-05-14
Status: Design — awaiting implementation plan

## Goal

Move artist search, frontman lookup, and shortest-path finding from MusicBrainz API to the locally-built `mb-final.sqlite`. Result of path search is rendered as a plain text chain (`A → B → C → …`); the richer mock-style UI (person cards with per-band roles) is deferred to a later slice.

## Decisions

1. **Source of data**: local SQLite for all read paths — search, frontman, path.
2. **Architecture**: thin adapter (`ArtistsRepo` interface) with `SqliteRepo` implementation now; D1 implementation added in Slice 5 without touching consumers.
3. **ETL**: extend `relations` schema with `attributes` CSV column populated from MusicBrainz `link_attribute_type`. `is_lead_vocals` stays for now (refactor deferred).
4. **Response shape**: backend returns raw traversal (`nodes[]` + `edges[]`); frontend will compress to person-only view in a later slice.
5. **UI in this slice**: text result only (`nodes.map(n => n.name).join(' → ')`). Loading + "no path" states.
6. **DB location**: `scripts/etl/mb-final.sqlite`, path injected via `DB_PATH` env var.

## Architecture

### New module `src/lib/db/`

```
src/lib/db/
  types.ts        Domain types (Artist, PathEdge, PathResult)
  repo.ts         ArtistsRepo interface (async, 3 methods)
  sqlite-repo.ts  Node-only impl using better-sqlite3, `import 'server-only'`
  index.ts        getRepo() factory + per-process singleton, reads DB_PATH
```

`getRepo()` uses dynamic `import('./sqlite-repo')` so the heavy native dep is not pulled into any client bundle.

### API routes

All routes set `export const runtime = 'nodejs'`.

| Route | Method | Returns | Notes |
|---|---|---|---|
| `/api/artists?q=&limit=` | GET | `Artist[]` | Renamed from `/api/searchArtist` to REST style |
| `/api/artists/[mbid]/frontman` | GET | `{ name: string \| null }` | Dynamic-segment REST |
| `/api/paths?from=&to=` | GET | `PathResult` or error | New |

Removed: `/api/getArtist`, `/api/searchArtist`, `/api/findPath`, `/api/frontman` (RPC-style names).

### Error semantics for `findPath`

- `400 { error: "missing_param" }` — `from` or `to` missing
- `404 { error: "no_path", depth_searched: 7 }` — BFS exhausted MAX_DEPTH
- `200 PathResult` — success
- `500 { error: "internal" }` — repo crash

### Frontend changes

- `Artist.id` → `Artist.mbid` everywhere (callsite refactor in hooks and panels).
- `useArtistSearch` — unchanged URL and contract.
- `useArtistDetails` → renamed/reshaped to `useFrontman(mbid)`. Returns `string | null | undefined`.
- New `useFindPath(from, to, enabled)` — `useQuery` keyed on both mbids.
- `ArtistsSearchPanel`:
  - `handleFindConnection` stops at `console.log` today; in this slice it sets `pathQuery: { from, to }` state which gates `useFindPath`.
  - `lastSelectedMbid` remains the input to `useFrontman` (Poster animated label).
- New component `src/components/PathResult/PathResult.tsx` — text render with loading / empty / error / success states. Lives under the button.

### Removals

- `src/lib/musicbrainz.ts` — entire module. ETL scripts in `scripts/etl/` are independent and may still hit MB elsewhere, but the app layer no longer depends on the external API.
- `src/lib/types.ts` — `ArtistRelation` / `ArtistDetails` no longer needed; only `Artist` retained.

## Schema migration

`db/schema.sql` — add one column on `relations`:

```sql
CREATE TABLE relations (
    link_id INTEGER PRIMARY KEY,
    entity0_mbid TEXT NOT NULL,
    entity1_mbid TEXT NOT NULL,
    relation_type INTEGER NOT NULL,
    is_lead_vocals INTEGER NOT NULL DEFAULT 0,
    attributes TEXT,                 -- NEW: CSV of attribute names, e.g. "drums,marimba"; NULL when none
    begin_year INTEGER,
    end_year INTEGER
);
```

CSV chosen over a separate `relation_attributes` table because BFS doesn't filter by attribute. Frontend will `.split(',')` when needed. A separate table can come if a future use case demands filtering by instrument.

## ETL extension

`scripts/etl/filter-data.ts`, in `insertRelations`, populate `attributes` via correlated subquery:

```sql
(
    SELECT GROUP_CONCAT(lat.name)
    FROM raw.link_attribute la
    JOIN raw.link_attribute_type lat ON la.attribute_type = lat.id
    WHERE la.link = laa.link
)
```

`GROUP_CONCAT` order in SQLite is non-deterministic without an explicit `ORDER BY`; acceptable for MVP. `NULL` when the link has no attributes.

`is_lead_vocals` logic untouched. Note: current ETL flags it for any vocal-parent attribute (including background vocals, choir), which over-counts true frontmen. Refactor deferred — frontend can later cross-reference `attributes` for precision.

## Types

```ts
// src/lib/db/types.ts
export type Artist = {
    mbid: string;
    name: string;
    type: number | null;            // 1=Person, 2=Group, 3=Other, 4=Character, 5=Orchestra, 6=Choir
    disambiguation: string | null;
};

export type PathEdge = {
    fromMbid: string;
    toMbid: string;
    relationType: number;           // 103/104/105/107
    isLeadVocals: boolean;
    attributes: string[];           // [] when relation has no attributes
};

export type PathResult = {
    depth: number;                  // number of edges
    nodes: Artist[];                // [from, ..., to], length = depth + 1
    edges: PathEdge[];              // length = depth
};
```

## Repo interface

```ts
// src/lib/db/repo.ts
export interface ArtistsRepo {
    searchByName(query: string, limit: number): Promise<Artist[]>;
    getFrontman(bandMbid: string): Promise<string | null>;
    findPath(fromMbid: string, toMbid: string): Promise<PathResult | null>;
}
```

All `async` — D1 is async; SQLite wraps sync calls in resolved Promises. Gives D1-readiness for free.

### Method semantics

- **`searchByName(query, limit)`** — prefix match: `name LIKE query || '%' COLLATE NOCASE`, ordered by `length(name) ASC` (shorter names rank higher when prefix is ambiguous). Limit from caller (frontend asks 5).
- **`getFrontman(bandMbid)`** — query `relations` where `entity1_mbid = ? AND relation_type = 103 AND is_lead_vocals = 1`, prefer rows with `end_year IS NULL` (active), pick `artists.name` from the entity0 side. Returns `null` if none.
- **`findPath(from, to)`** — two-step:
  1. Recursive CTE BFS (as in `scripts/etl/find-path.ts`) returns shortest `{depth, path_mbids}` where `path_mbids` is `|m1|m2|m3|`. Parse to `string[]`.
  2. Hydrate: `SELECT * FROM artists WHERE mbid IN (...)` for nodes; `SELECT * FROM relations WHERE link_id IN (subselect of links connecting consecutive mbid pairs)` for edges. Both directions of the relation are accepted (edge between `a` and `b` may be stored as `(a,b)` or `(b,a)`).
  - Returns `null` if BFS exhausts `MAX_DEPTH = 7`.

## Implementation skeletons

```ts
// src/lib/db/sqlite-repo.ts
import 'server-only';
import Database from 'better-sqlite3';
import type { ArtistsRepo } from './repo';
import type { Artist, PathResult } from './types';

export class SqliteRepo implements ArtistsRepo {
    private db: Database.Database;
    // prepared statements as private fields, initialised in constructor

    constructor(dbPath: string) {
        this.db = new Database(dbPath, { readonly: true });
    }

    async searchByName(query: string, limit: number): Promise<Artist[]> { /* ... */ }
    async getFrontman(mbid: string): Promise<string | null> { /* ... */ }
    async findPath(from: string, to: string): Promise<PathResult | null> { /* ... */ }
}
```

```ts
// src/lib/db/index.ts
import 'server-only';
import type { ArtistsRepo } from './repo';

let cached: ArtistsRepo | null = null;

export async function getRepo(): Promise<ArtistsRepo> {
    if (cached) {
        return cached;
    }
    const dbPath = process.env.DB_PATH;
    if (!dbPath) {
        throw new Error('DB_PATH missing');
    }
    const { SqliteRepo } = await import('./sqlite-repo');
    cached = new SqliteRepo(dbPath);
    return cached;
}
```

## Frontend wiring

```ts
// src/components/ArtistsSearchPanel/ArtistsSearchPanel.tsx (relevant changes only)
const [pathQuery, setPathQuery] = useState<{from: string; to: string} | null>(null);
const path = useFindPath(pathQuery);

const handleFindConnection: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const first = firstSelected ?? firstArtist.data?.[0] ?? firstPlaceholderArtist.data?.[0];
    const second = secondSelected ?? secondArtist.data?.[0] ?? secondPlaceholderArtist.data?.[0];
    if (!first || !second) {
        return;
    }
    if (!firstSelected) { handleFirstSelect(first); }
    if (!secondSelected) { handleSecondSelect(second); }
    setPathQuery({ from: first.mbid, to: second.mbid });
};
```

`<PathResult data={path.data} isLoading={path.isLoading} error={path.error} />` rendered beneath the button.

## Files touched

| Path | Action |
|---|---|
| `db/schema.sql` | Add `attributes` column |
| `scripts/etl/filter-data.ts` | Add `GROUP_CONCAT` subquery in `insertRelations` |
| `src/lib/db/types.ts` | New |
| `src/lib/db/repo.ts` | New |
| `src/lib/db/sqlite-repo.ts` | New |
| `src/lib/db/index.ts` | New |
| `src/lib/types.ts` | `Artist.id` → `Artist.mbid`; drop `ArtistRelation`/`ArtistDetails` |
| `src/lib/musicbrainz.ts` | Delete |
| `src/app/api/searchArtist/route.ts` | Swap impl to repo |
| `src/app/api/getArtist/route.ts` | Delete |
| `src/app/api/frontman/route.ts` | New |
| `src/app/api/findPath/route.ts` | New |
| `src/hooks/useArtistSearch.ts` | `.id` → `.mbid` callsite refactor |
| `src/hooks/useArtistDetails.ts` | Delete |
| `src/hooks/useFrontman.ts` | New |
| `src/hooks/useFindPath.ts` | New |
| `src/components/ArtistsSearchPanel/...` | Wire findPath, use `mbid` |
| `src/components/PathResult/PathResult.tsx` | New (text MVP) |
| `.env.local` | Add `DB_PATH=scripts/etl/mb-final.sqlite` |

## Out of scope (deferred)

- D1 adapter (`D1Repo`) and factory branching — Slice 5.
- Mock-style person-card UI with per-band roles — future slice (~3.5) or bundled with Slice 4 graph.
- `is_lead_vocals` semantics refactor (current logic over-counts vocalists).
- `country`, `photo_url`, `artist_urls` schema columns — already in schema but not populated by ETL; out of scope here.

## Operator steps after merge

1. `pnpm filter-data` — regenerates `mb-final.sqlite` with new schema + attributes (existing file is deleted/rebuilt).
2. Add `DB_PATH=scripts/etl/mb-final.sqlite` to `.env.local`.
3. `pnpm dev` and verify: type two artists, hit FIND, see text chain. Also try one obscure name to confirm "no_path" path renders.
