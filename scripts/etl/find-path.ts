/**
 * Demo: find the shortest connection between two bands via shared members.
 *
 * Usage: pnpm find-path "Band A" "Band B"
 *   e.g. pnpm find-path "Queens of the Stone Age" "Foo Fighters"
 *
 * Reads mb-final.sqlite (read-only). Uses a recursive CTE for BFS.
 */

import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const FINAL_DB_PATH = join(import.meta.dirname, 'mb-final.sqlite');
const MAX_DEPTH = 7;

type Artist = { mbid: string; name: string; disambiguation: string | null; type: number | null };
type PathResult = { depth: number; path_names: string };

const TYPE_LABEL: Record<number, string> = {
    1: 'person',
    2: 'group',
    3: 'other',
    4: 'character',
    5: 'orchestra',
    6: 'choir',
};

function findArtist(db: Database.Database, name: string): Artist | null {
    const row = db
        .prepare(
            `SELECT mbid, name, disambiguation, type
             FROM artists
             WHERE name = ?
             ORDER BY CASE WHEN type = 2 THEN 0 WHEN type = 1 THEN 1 ELSE 2 END
             LIMIT 1`,
        )
        .get(name) as Artist | undefined;

    return row ?? null;
}

function findShortestPath(
    db: Database.Database,
    fromMbid: string,
    toMbid: string,
): PathResult | null {
    const row = db
        .prepare(
            `
        WITH RECURSIVE
          neighbors(from_node, to_node) AS (
            SELECT entity0_mbid, entity1_mbid FROM relations
            UNION ALL
            SELECT entity1_mbid, entity0_mbid FROM relations
          ),
          bfs(node, depth, path_mbids, path_names) AS (
            SELECT a.mbid, 0, '|' || a.mbid || '|', a.name
            FROM artists a WHERE a.mbid = ?

            UNION ALL

            SELECT
              n.to_node,
              b.depth + 1,
              b.path_mbids || n.to_node || '|',
              b.path_names || ' → ' || a.name
            FROM bfs b
            JOIN neighbors n ON n.from_node = b.node
            JOIN artists a ON a.mbid = n.to_node
            WHERE b.depth < ${MAX_DEPTH}
              AND instr(b.path_mbids, '|' || n.to_node || '|') = 0
          )
        SELECT depth, path_names
        FROM bfs
        WHERE node = ?
        ORDER BY depth
        LIMIT 1
        `,
        )
        .get(fromMbid, toMbid) as PathResult | undefined;

    return row ?? null;
}

function main(): void {
    if (!existsSync(FINAL_DB_PATH)) {
        console.error('mb-final.sqlite not found. Run `pnpm filter-data` first.');
        process.exit(1);
    }

    const nameA = process.argv[2];
    const nameB = process.argv[3];

    if (!nameA || !nameB) {
        console.error('Usage: pnpm find-path "Artist A" "Artist B"');
        process.exit(1);
    }

    const db = new Database(FINAL_DB_PATH, { readonly: true });

    const artistA = findArtist(db, nameA);
    const artistB = findArtist(db, nameB);

    if (!artistA) {
        console.error(`Artist not found: "${nameA}"`);
        process.exit(1);
    }
    if (!artistB) {
        console.error(`Artist not found: "${nameB}"`);
        process.exit(1);
    }

    const describe = (a: Artist): string => {
        const typeLabel = a.type ? ` [${TYPE_LABEL[a.type] ?? 'unknown'}]` : '';
        const disamb = a.disambiguation ? ` (${a.disambiguation})` : '';

        return `${a.name}${typeLabel}${disamb}`;
    };

    console.log('Searching shortest path:');
    console.log(`  From: ${describe(artistA)}`);
    console.log(`        ${artistA.mbid}`);
    console.log(`  To:   ${describe(artistB)}`);
    console.log(`        ${artistB.mbid}\n`);

    const start = Date.now();
    const result = findShortestPath(db, artistA.mbid, artistB.mbid);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    if (!result) {
        console.log(`No path found within depth ${MAX_DEPTH} (searched in ${elapsed}s).`);
    } else {
        console.log(`Found path at depth ${result.depth} (${elapsed}s):\n`);
        console.log(`  ${result.path_names}`);
    }

    db.close();
}

main();
