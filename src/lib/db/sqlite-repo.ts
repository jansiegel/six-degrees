import 'server-only';
import Database from 'better-sqlite3';
import type { ArtistsRepo } from './repo';
import { RELATION_TYPE } from './relations';
import type { Artist, Frontman, PathEdge, PathResult } from './types';

export const MAX_DEPTH = 7;

type ArtistRow = {
    mbid: string;
    name: string;
    type: number | null;
    disambiguation: string | null;
};

type EdgeRow = {
    link_id: number;
    entity0_mbid: string;
    entity1_mbid: string;
    relation_type: number;
    is_lead_vocals: number;
    attributes: string | null;
};

type BfsRow = {
    depth: number;
    path_mbids: string;
};

type FrontmanRow = ArtistRow & { attributes: string | null };

export class SqliteRepo implements ArtistsRepo {
    private db: Database.Database;
    private searchStmt: Database.Statement;
    private frontmanStmt: Database.Statement;
    private bfsStmt: Database.Statement;
    private edgeStmt: Database.Statement;

    constructor(dbPath: string) {
        this.db = new Database(dbPath, { readonly: true, fileMustExist: true });

        this.searchStmt = this.db.prepare(`
            SELECT mbid, name, type, disambiguation
            FROM artists
            WHERE name LIKE :q || '%' ESCAPE '\\' COLLATE NOCASE
               OR sort_name LIKE :q || '%' ESCAPE '\\' COLLATE NOCASE
            ORDER BY length(name) ASC, name ASC
            LIMIT :limit
        `);

        this.frontmanStmt = this.db.prepare(`
            SELECT a.mbid, a.name, a.type, a.disambiguation, r.attributes
            FROM relations r
            JOIN artists a ON a.mbid = r.entity0_mbid
            WHERE r.entity1_mbid = ?
              AND r.relation_type = ${RELATION_TYPE.MEMBER}
              AND r.is_lead_vocals = 1
            ORDER BY (r.end_year IS NULL) DESC, r.begin_year DESC
            LIMIT 1
        `);

        this.bfsStmt = this.db.prepare(`
            WITH RECURSIVE
              neighbors(from_node, to_node) AS (
                SELECT entity0_mbid, entity1_mbid FROM relations
                UNION ALL
                SELECT entity1_mbid, entity0_mbid FROM relations
              ),
              bfs(node, depth, path_mbids) AS (
                SELECT a.mbid, 0, '|' || a.mbid || '|'
                FROM artists a WHERE a.mbid = ?

                UNION ALL

                SELECT
                  n.to_node,
                  b.depth + 1,
                  b.path_mbids || n.to_node || '|'
                FROM bfs b
                JOIN neighbors n ON n.from_node = b.node
                WHERE b.depth < ${MAX_DEPTH}
                  AND instr(b.path_mbids, '|' || n.to_node || '|') = 0
              )
            SELECT depth, path_mbids
            FROM bfs
            WHERE node = ?
            ORDER BY depth
            LIMIT 1
        `);

        this.edgeStmt = this.db.prepare(`
            SELECT link_id, entity0_mbid, entity1_mbid, relation_type, is_lead_vocals, attributes
            FROM relations
            WHERE (entity0_mbid = ? AND entity1_mbid = ?)
               OR (entity0_mbid = ? AND entity1_mbid = ?)
            LIMIT 1
        `);
    }

    async searchByName(query: string, limit: number): Promise<Artist[]> {
        const escapedQuery = query.replace(/[\\%_]/g, (m) => `\\${m}`);
        const rows = this.searchStmt.all({ q: escapedQuery, limit }) as ArtistRow[];

        return rows.map(rowToArtist);
    }

    async getFrontman(bandMbid: string): Promise<Frontman | null> {
        const row = this.frontmanStmt.get(bandMbid) as FrontmanRow | undefined;

        if (!row) {
            return null;
        }

        return {
            artist: rowToArtist(row),
            attributes: row.attributes ? row.attributes.split(',') : [],
        };
    }

    async findPath(fromMbid: string, toMbid: string): Promise<PathResult | null> {
        const bfsRow = this.bfsStmt.get(fromMbid, toMbid) as BfsRow | undefined;

        if (!bfsRow) {
            return null;
        }

        const mbids = bfsRow.path_mbids.split('|').filter(Boolean);
        const nodes = this.hydrateNodes(mbids);
        const edges = this.hydrateEdges(mbids);

        return {
            depth: bfsRow.depth,
            nodes,
            edges,
        };
    }

    private hydrateNodes(mbids: string[]): Artist[] {
        const placeholders = mbids.map(() => '?').join(', ');
        const rows = this.db
            .prepare(`SELECT mbid, name, type, disambiguation FROM artists WHERE mbid IN (${placeholders})`)
            .all(...mbids) as ArtistRow[];
        const byMbid = new Map(rows.map((r) => [r.mbid, r]));

        return mbids.map((m) => {
            const row = byMbid.get(m);

            if (!row) {
                throw new Error(`Hydrate missing mbid: ${m}`);
            }
            return rowToArtist(row);
        });
    }

    private hydrateEdges(mbids: string[]): PathEdge[] {
        const edges: PathEdge[] = [];

        for (let i = 0; i < mbids.length - 1; i++) {
            const a = mbids[i];
            const b = mbids[i + 1];
            const row = this.edgeStmt.get(a, b, b, a) as EdgeRow | undefined;

            if (!row) {
                throw new Error(`Hydrate missing edge: ${a} - ${b}`);
            }
            edges.push({
                fromMbid: a,
                toMbid: b,
                contributorMbid: row.entity0_mbid,
                relationType: row.relation_type,
                isLeadVocals: row.is_lead_vocals === 1,
                attributes: row.attributes ? row.attributes.split(',') : [],
            });
        }
        return edges;
    }
}

function rowToArtist(row: ArtistRow): Artist {
    return {
        mbid: row.mbid,
        name: row.name,
        type: row.type,
        disambiguation: row.disambiguation,
    };
}
