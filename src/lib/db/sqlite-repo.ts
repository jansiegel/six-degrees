import 'server-only';
import Database from 'better-sqlite3';
import type { ArtistsRepo } from './repo';
import { bidirectionalBfs } from './bidirectional-bfs';
import { MAX_DEPTH } from './max-depth';
import { buildPrefixPattern } from './search-pattern';
import type { Artist, PathEdge, PathResult } from './types';

export { MAX_DEPTH };

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

type NeighborRow = { neighbor_mbid: string };

export class SqliteRepo implements ArtistsRepo {
    private db: Database.Database;
    private searchStmt: Database.Statement;
    private neighborsStmt: Database.Statement;
    private edgeStmt: Database.Statement;

    constructor(dbPath: string) {
        this.db = new Database(dbPath, { readonly: true, fileMustExist: true });

        this.searchStmt = this.db.prepare(`
            SELECT mbid, name, type, disambiguation
            FROM artists
            WHERE name LIKE :pattern COLLATE NOCASE
            ORDER BY length(name) ASC, name ASC
            LIMIT :limit
        `);

        this.neighborsStmt = this.db.prepare(`
            SELECT entity1_mbid AS neighbor_mbid FROM relations WHERE entity0_mbid = ?
            UNION
            SELECT entity0_mbid AS neighbor_mbid FROM relations WHERE entity1_mbid = ?
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
        const pattern = buildPrefixPattern(query);

        if (pattern === null) {
            return [];
        }

        const rows = this.searchStmt.all({ pattern, limit }) as ArtistRow[];

        return rows.map(rowToArtist);
    }

    async findPath(fromMbid: string, toMbid: string): Promise<PathResult | null> {
        const bfsResult = await bidirectionalBfs({
            fromMbid,
            toMbid,
            maxDepth: MAX_DEPTH,
            neighborsOf: (mbid) => this.neighborsOf(mbid),
        });

        if (bfsResult === null) {
            return null;
        }

        const nodes = this.hydrateNodes(bfsResult.path);
        const edges = this.hydrateEdges(bfsResult.path);

        return {
            depth: bfsResult.depth,
            nodes,
            edges,
        };
    }

    private async neighborsOf(mbid: string): Promise<string[]> {
        const rows = this.neighborsStmt.all(mbid, mbid) as NeighborRow[];

        return rows.map((r) => r.neighbor_mbid);
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
