import 'server-only';
import type { ArtistsRepo } from './repo';
import { RELATION_TYPE } from './relations';
import { bidirectionalBfs } from './bidirectional-bfs';
import { MAX_DEPTH } from './max-depth';
import type { Artist, Frontman, PathEdge, PathResult } from './types';
import { D1Client, type D1ClientConfig } from './d1-client';

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

type FrontmanRow = ArtistRow & { attributes: string | null };

const SEARCH_SQL = `
    SELECT mbid, name, type, disambiguation
    FROM artists
    WHERE name LIKE ?1 || '%' ESCAPE '\\' COLLATE NOCASE
       OR sort_name LIKE ?1 || '%' ESCAPE '\\' COLLATE NOCASE
    ORDER BY length(name) ASC, name ASC
    LIMIT ?2
`;

const FRONTMAN_SQL = `
    SELECT a.mbid, a.name, a.type, a.disambiguation, r.attributes
    FROM relations r
    JOIN artists a ON a.mbid = r.entity0_mbid
    WHERE r.entity1_mbid = ?
      AND r.relation_type = ${RELATION_TYPE.MEMBER}
      AND r.is_lead_vocals = 1
    ORDER BY (r.end_year IS NULL) DESC, r.begin_year DESC
    LIMIT 1
`;

const NEIGHBORS_SQL = `
    SELECT entity1_mbid AS neighbor_mbid FROM relations WHERE entity0_mbid = ?
    UNION
    SELECT entity0_mbid AS neighbor_mbid FROM relations WHERE entity1_mbid = ?
`;

const EDGE_SQL = `
    SELECT link_id, entity0_mbid, entity1_mbid, relation_type, is_lead_vocals, attributes
    FROM relations
    WHERE (entity0_mbid = ?1 AND entity1_mbid = ?2)
       OR (entity0_mbid = ?2 AND entity1_mbid = ?1)
    LIMIT 1
`;

export class D1Repo implements ArtistsRepo {
    private readonly client: D1Client;

    constructor(config: D1ClientConfig) {
        this.client = new D1Client(config);
    }

    async searchByName(query: string, limit: number): Promise<Artist[]> {
        const escapedQuery = query.replace(/[\\%_]/g, (m) => `\\${m}`);
        const rows = await this.client.query<ArtistRow>(SEARCH_SQL, [escapedQuery, limit]);

        return rows.map(rowToArtist);
    }

    async getFrontman(bandMbid: string): Promise<Frontman | null> {
        const rows = await this.client.query<FrontmanRow>(FRONTMAN_SQL, [bandMbid]);
        const row = rows[0];

        if (!row) {
            return null;
        }

        return {
            artist: rowToArtist(row),
            attributes: row.attributes ? row.attributes.split(',') : [],
        };
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

        const nodes = await this.hydrateNodes(bfsResult.path);
        const edges = await this.hydrateEdges(bfsResult.path);

        return {
            depth: bfsResult.depth,
            nodes,
            edges,
        };
    }

    private async neighborsOf(mbid: string): Promise<string[]> {
        const rows = await this.client.query<NeighborRow>(NEIGHBORS_SQL, [mbid, mbid]);

        return rows.map((r) => r.neighbor_mbid);
    }

    private async hydrateNodes(mbids: string[]): Promise<Artist[]> {
        const placeholders = mbids.map((_, i) => `?${i + 1}`).join(', ');
        const rows = await this.client.query<ArtistRow>(
            `SELECT mbid, name, type, disambiguation FROM artists WHERE mbid IN (${placeholders})`,
            mbids,
        );
        const byMbid = new Map(rows.map((r) => [r.mbid, r]));

        return mbids.map((m) => {
            const row = byMbid.get(m);

            if (!row) {
                throw new Error(`Hydrate missing mbid: ${m}`);
            }
            return rowToArtist(row);
        });
    }

    private async hydrateEdges(mbids: string[]): Promise<PathEdge[]> {
        const edges: PathEdge[] = [];

        for (let i = 0; i < mbids.length - 1; i++) {
            const a = mbids[i];
            const b = mbids[i + 1];
            const rows = await this.client.query<EdgeRow>(EDGE_SQL, [a, b]);
            const row = rows[0];

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
