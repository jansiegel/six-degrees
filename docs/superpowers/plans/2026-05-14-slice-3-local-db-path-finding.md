# Slice 3 — Local DB path finding — Implementation roadmap

> **Style:** lightweight roadmap. No copy-paste code blocks. Each task lists files, what to do, and acceptance criteria. At each task the assistant asks: "Do you code this, or should I?" (learning project rule).

**Spec:** `docs/superpowers/specs/2026-05-14-slice-3-local-db-path-finding-design.md`

**Goal:** Replace MusicBrainz API calls with local SQLite reads; add shortest-path BFS rendered as text.

---

## Phase 1 — Backend foundation (no frontend impact)

### Task 1: ETL schema + attributes

- **Files:** `db/schema.sql`, `scripts/etl/filter-data.ts`
- **Do:**
  - Add `attributes TEXT` column to `relations` in `schema.sql` (placed before `begin_year`).
  - In `insertRelations`, add the correlated `GROUP_CONCAT` subquery selecting from `raw.link_attribute` joined with `raw.link_attribute_type`.
  - User runs `pnpm filter-data` to regenerate `scripts/etl/mb-final.sqlite`.
- **Acceptance:**
  - `sqlite3 scripts/etl/mb-final.sqlite "SELECT attributes FROM relations WHERE attributes IS NOT NULL LIMIT 5"` returns CSV strings.
  - `Summary:` block at end of filter-data run is unchanged (relation/artist counts).
- **Status:** [x]

### Task 2: Env config

- **Files:** `.env.local` (gitignored), optionally `.env.example` if it exists
- **Do:** Add `DB_PATH=scripts/etl/mb-final.sqlite` (path relative to repo root since Next dev cwd = repo root).
- **Acceptance:** `process.env.DB_PATH` resolves in dev server.
- **Status:** [x]

### Task 3: Domain types module

- **Files:** create `src/lib/db/types.ts`
- **Do:** Export `Artist`, `PathEdge`, `PathResult` per spec. `Artist.mbid` not `id`.
- **Acceptance:** `pnpm exec tsc --noEmit` passes (no consumers yet, just type definitions).
- **Status:** [x]

### Task 4: Repo interface

- **Files:** create `src/lib/db/repo.ts`
- **Do:** Define `ArtistsRepo` interface with three async methods per spec.
- **Acceptance:** types compile.
- **Status:** [x]

### Task 5: Install runtime dep

- **Files:** `package.json`
- **Do:** Add `better-sqlite3` to dependencies. (Already in devDependencies of `scripts/etl/package.json`, but app needs its own.)
- **Run:** `pnpm add better-sqlite3 && pnpm add -D @types/better-sqlite3`
- **Acceptance:** package installs cleanly.
- **Status:** [x]

### Task 6: SqliteRepo implementation

- **Files:** create `src/lib/db/sqlite-repo.ts`
- **Do:**
  - `import 'server-only'` at top.
  - Class `SqliteRepo` implements `ArtistsRepo`, constructor takes `dbPath`.
  - Open DB read-only. Cache prepared statements in private fields.
  - `searchByName(query, limit)`: prefix LIKE COLLATE NOCASE, order by `length(name) ASC` then `name`.
  - `getFrontman(bandMbid)`: join `relations` (type=103, is_lead_vocals=1, entity1=bandMbid) → `artists`. Prefer `end_year IS NULL`. Return name or null.
  - `findPath(from, to)`: recursive CTE BFS (port from `find-path.ts`), then hydrate nodes and edges with secondary queries.
- **Acceptance:** unit smoke via tsx script or REPL — instantiate, call each method with known mbid pair (e.g. QOTSA → Foo Fighters), get sensible result.
- **Status:** [x] (smoke test deferred to Task 7 factory + Task 8 API route)

### Task 7: Repo factory + singleton

- **Files:** create `src/lib/db/index.ts`
- **Do:** Export `getRepo(): Promise<ArtistsRepo>`. Process-scoped singleton. Reads `process.env.DB_PATH`, dynamic-imports `sqlite-repo`. Throws on missing env.
- **Acceptance:** importable from API route file without bundling errors.
- **Status:** [x]

---

## Phase 2 — API routes

### Task 8: Replace `/api/searchArtist` impl

- **Files:** modify `src/app/api/searchArtist/route.ts`
- **Do:**
  - Add `export const runtime = 'nodejs'`.
  - Replace `searchArtists(q)` (MB) with `(await getRepo()).searchByName(q, 5)`.
  - Optional: accept `&limit=` query param (default 5).
- **Acceptance:** `curl 'localhost:3000/api/searchArtist?q=queens'` returns array of artists with `mbid` field.
- **Status:** [x]

### Task 9: Replace `/api/getArtist` with `/api/frontman`

- **Files:** delete `src/app/api/getArtist/route.ts`, create `src/app/api/frontman/route.ts`
- **Do:**
  - New route: `GET /api/frontman?mbid=...` → `{ name: string | null }`.
  - Node runtime.
- **Acceptance:** `curl 'localhost:3000/api/frontman?mbid=<qotsa-mbid>'` returns `{ name: "Josh Homme" }` or similar.
- **Status:** [x]

### Task 10: New `/api/findPath`

- **Files:** create `src/app/api/findPath/route.ts`
- **Do:**
  - Node runtime. Read `from`, `to` from `searchParams`.
  - Validation: 400 + `{ error: "missing_param" }` when either is missing.
  - Call `repo.findPath`. Null → 404 + `{ error: "no_path", depth_searched: 7 }`. Throw → 500 + `{ error: "internal" }`. Else 200 + `PathResult`.
- **Acceptance:** `curl 'localhost:3000/api/findPath?from=<qotsa>&to=<foofighters>'` returns `{ depth, nodes, edges }`. Bad mbid → 404. Missing param → 400.
- **Status:** [x]

---

## Phase 3 — Frontend wiring

### Task 11: Migrate `Artist.id` → `Artist.mbid`

- **Files:** `src/lib/types.ts`, `src/hooks/useArtistSearch.ts`, `src/components/SuggestionsList/*`, `src/components/ArtistsSearchPanel/*`, any callsite using `artist.id`
- **Do:**
  - Decide: keep `src/lib/types.ts Artist` and just rename `id → mbid`, OR retire `src/lib/types.ts Artist` in favor of `src/lib/db/types.ts Artist`. Recommend the second — single source of truth.
  - Update all imports/uses. `key={artist.id}` → `key={artist.mbid}`, `setLastSelectedMbid(artist.id)` → `setLastSelectedMbid(artist.mbid)`, etc.
- **Acceptance:** `pnpm exec tsc --noEmit` clean. Dropdown still renders. Selection still works in dev.
- **Status:** [x]

### Task 12: Replace `useArtistDetails` → `useFrontman`

- **Files:** delete `src/hooks/useArtistDetails.ts`, create `src/hooks/useFrontman.ts`. Modify `src/components/ArtistsSearchPanel/ArtistsSearchPanel.tsx`.
- **Do:**
  - `useFrontman(mbid: string | null)` — `useQuery` keyed on mbid, hits `/api/frontman`, returns `string | null | undefined`.
  - Panel: replace `useArtistDetails` + `extractFrontman` chain with the new hook. Pass result to `<InteractiveLabel injectedName={...} />`.
  - Delete the `extractFrontman` import (and the function from `musicbrainz.ts` — but full `musicbrainz.ts` delete waits for Task 16).
- **Acceptance:** Selecting an artist still animates the frontman name on the Poster.
- **Status:** [x]

### Task 13: New `useFindPath` hook

- **Files:** create `src/hooks/useFindPath.ts`
- **Do:**
  - `useFindPath(args: { from: string; to: string } | null)` — `useQuery` with `enabled: !!args`, fetches `/api/findPath?from=&to=`, returns `PathResult | null`.
  - Handle 404 (`no_path`) as success-with-null, not error — easier UI.
- **Acceptance:** importable, types align with API response.
- **Status:** [x]

### Task 14: Wire `findPath` into Panel

- **Files:** modify `src/components/ArtistsSearchPanel/ArtistsSearchPanel.tsx`
- **Do:**
  - Add `const [pathQuery, setPathQuery] = useState<{from: string; to: string} | null>(null);`
  - In `handleFindConnection`, replace `console.log({first, second})` with `setPathQuery({ from: first.mbid, to: second.mbid })`.
  - Call `useFindPath(pathQuery)`. Pass its `data`, `isLoading`, `error` to a new `<PathResult />` rendered under the button.
- **Acceptance:** Click FIND with two valid artists → loading flickers → text result appears below button.
- **Status:** [ ]

### Task 15: PathResult component

- **Files:** create `src/components/PathResult/PathResult.tsx`
- **Do:**
  - Props: `data: PathResult | null | undefined`, `isLoading: boolean`, `error: unknown`.
  - States:
    - `isLoading` → "Searching…"
    - `error` → "Search failed."
    - `data === null` → "No connection found within 7 hops."
    - `data` → `data.nodes.map(n => n.name).join(' → ')`
    - else (idle) → null (render nothing)
- **Acceptance:** All 4 states render correctly. Style is plain (one row of text under button). No mock-style cards.
- **Status:** [ ]

---

## Phase 4 — Cleanup

### Task 16: Delete `src/lib/musicbrainz.ts`

- **Files:** `src/lib/musicbrainz.ts`, `src/lib/types.ts` (drop `ArtistDetails`, `ArtistRelation` if exported only there)
- **Do:** Delete file. Drop now-orphan types. Verify nothing imports them.
- **Acceptance:** `pnpm exec tsc --noEmit` clean. `pnpm build` succeeds.
- **Status:** [ ]

### Task 17: Smoke test the full flow

- **Files:** none (manual)
- **Do:**
  - `pnpm dev`
  - Empty inputs → click FIND → fallback to placeholders (QOTSA + Bowie) → see text path.
  - Type "rad" in slot 1 → pick Radiohead → type "queen" in slot 2 → pick Queen → FIND → path.
  - Try two obscure artists with no connection → "No connection found within 7 hops."
- **Acceptance:** all three scenarios work, no console errors.
- **Status:** [ ]

---

## Dependency order

Tasks within a phase can interleave, but phases gate each other:

```
Phase 1 (Tasks 1-7) → Phase 2 (Tasks 8-10) → Phase 3 (Tasks 11-15) → Phase 4 (Tasks 16-17)
```

Task 11 (`id → mbid` rename) is the biggest cross-file change and is the seam where backend (already returning `mbid` after Task 8) meets frontend (still expecting `id`). After Task 8 the dev server will be broken until Task 11 lands. Consider doing Task 8 + Task 11 in one short window, or commit Task 8 to a branch and do Task 11 immediately after.

## Spec coverage check

Each spec section maps to at least one task:
- Architecture (lib/db module) → Tasks 3, 4, 6, 7
- API routes → Tasks 8, 9, 10
- Schema migration → Task 1
- ETL extension → Task 1
- Types → Task 3
- Repo interface → Task 4
- Frontend changes → Tasks 11-15
- Removals → Task 16
- Operator steps → Tasks 1, 2, 17
