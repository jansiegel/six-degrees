import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteRepo } from '../sqlite-repo';
import { RELATION_TYPE } from '../relations';

const SCHEMA_PATH = join(process.cwd(), 'db', 'schema.sql');

let dbPath: string;
let repo: SqliteRepo;

function seed(db: Database.Database): void {
    db.exec(readFileSync(SCHEMA_PATH, 'utf8'));

    const insertArtist = db.prepare(`
        INSERT INTO artists (mbid, name, sort_name, type, disambiguation, ended)
        VALUES (?, ?, ?, ?, ?, 0)
    `);

    insertArtist.run('b-qotsa', 'Queens of the Stone Age', 'Queens of the Stone Age', 2, null);
    insertArtist.run('p-homme', 'Josh Homme', 'Homme, Josh', 1, null);
    insertArtist.run('b-bowie', 'David Bowie', 'Bowie, David', 1, 'English singer');
    insertArtist.run('b-eagles', 'Eagles of Death Metal', 'Eagles of Death Metal', 2, null);

    const insertRelation = db.prepare(`
        INSERT INTO relations (link_id, entity0_mbid, entity1_mbid, relation_type, is_lead_vocals, attributes)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertRelation.run(1, 'p-homme', 'b-qotsa', RELATION_TYPE.MEMBER, 1, null);
    insertRelation.run(2, 'p-homme', 'b-eagles', RELATION_TYPE.MEMBER, 1, null);
    insertRelation.run(3, 'p-homme', 'b-bowie', RELATION_TYPE.SUPPORTING, 0, 'guitar');
}

beforeEach(() => {
    dbPath = join(tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);

    const writeDb = new Database(dbPath);

    seed(writeDb);
    writeDb.close();

    repo = new SqliteRepo(dbPath);
});

afterEach(() => {
    unlinkSync(dbPath);
});

describe('SqliteRepo.searchByName', () => {
    it('returns prefix matches case-insensitively', async () => {
        const results = await repo.searchByName('queens', 10);

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Queens of the Stone Age');
    });

    it('matches via sort_name', async () => {
        const results = await repo.searchByName('homme', 10);

        expect(results[0].name).toBe('Josh Homme');
    });

    it('respects the limit', async () => {
        const results = await repo.searchByName('e', 1);

        expect(results).toHaveLength(1);
    });
});

describe('SqliteRepo.getFrontman', () => {
    it('returns the lead-vocals member of a band', async () => {
        const result = await repo.getFrontman('b-qotsa');

        expect(result?.artist.name).toBe('Josh Homme');
    });

    it('returns null when no lead vocalist exists', async () => {
        const result = await repo.getFrontman('b-bowie');

        expect(result).toBeNull();
    });
});

describe('SqliteRepo.findPath', () => {
    it('finds a direct connection through a shared member', async () => {
        const result = await repo.findPath('b-qotsa', 'b-eagles');

        expect(result).not.toBeNull();
        expect(result?.depth).toBe(2);
        expect(result?.nodes.map((n) => n.name)).toEqual([
            'Queens of the Stone Age',
            'Josh Homme',
            'Eagles of Death Metal',
        ]);
    });

    it('returns null when no path exists', async () => {
        const result = await repo.findPath('b-qotsa', 'nonexistent');

        expect(result).toBeNull();
    });
});
