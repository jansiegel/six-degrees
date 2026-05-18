/**
 * Filters and transforms raw MusicBrainz data into our target schema.
 *
 * Input:  ./mb-raw.sqlite      (produced by load-raw.ts)
 * Output: ./mb-final.sqlite    (matches db/schema.sql)
 *
 * Minimal version: fills `artists` and `relations` (musical collaborations).
 * country / photo_url / artist_urls are handled by later scripts.
 *
 * Included relation types: see src/lib/db/relations.ts (RELATION_TYPE).
 */

import Database from 'better-sqlite3';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { RELATION_TYPE } from '../../src/lib/db/relations';

const RELATION_TYPES = Object.values(RELATION_TYPE);

const SCRIPT_DIR = import.meta.dirname;
const RAW_DB_PATH = join(SCRIPT_DIR, 'mb-raw.sqlite');
const FINAL_DB_PATH = join(SCRIPT_DIR, 'mb-final.sqlite');
const SCHEMA_PATH = join(SCRIPT_DIR, '..', '..', 'db', 'schema.sql');

/**
 * Indexes needed in the raw DB to make the filter queries fast.
 * load-raw.ts doesn't create these by default since they slow inserts down;
 * we add them here just in time.
 */
function ensureRawIndexes(): void {
    console.log('Ensuring raw DB indexes...');
    const raw = new Database(RAW_DB_PATH);

    raw.pragma('journal_mode = WAL');
    raw.exec(`CREATE INDEX IF NOT EXISTS idx_link_link_type ON link(link_type)`);
    raw.exec(`CREATE INDEX IF NOT EXISTS idx_link_attribute_link ON link_attribute(link)`);
    raw.close();
}

function applySchema(db: Database.Database): void {
    console.log('Applying schema...');
    const schema = readFileSync(SCHEMA_PATH, 'utf8');

    db.exec(schema);
}

function insertRelations(db: Database.Database): number {
    console.log('Inserting relations...');
    const placeholders = RELATION_TYPES.map(() => '?').join(', ');
    const result = db
        .prepare(
            `
        INSERT INTO relations (link_id, entity0_mbid, entity1_mbid, relation_type, is_lead_vocals, attributes, begin_year, end_year)
        SELECT
            laa.id,
            e0.gid,
            e1.gid,
            l.link_type,
            CASE
                WHEN l.link_type = ${RELATION_TYPE.MEMBER} AND EXISTS (
                    SELECT 1 FROM raw.link_attribute la
                    JOIN raw.link_attribute_type lat ON la.attribute_type = lat.id
                    WHERE la.link = laa.link
                      AND (lat.id = 4 OR lat.parent = 4)
                ) THEN 1
                ELSE 0
            END,
            (
                SELECT GROUP_CONCAT(lat.name)
                FROM raw.link_attribute la
                JOIN raw.link_attribute_type lat ON la.attribute_type = lat.id
                WHERE la.link = laa.link
            ),
            l.begin_year,
            l.end_year
        FROM raw.l_artist_artist laa
        JOIN raw.link l ON laa.link = l.id
        JOIN raw.artist e0 ON laa.entity0 = e0.id
        JOIN raw.artist e1 ON laa.entity1 = e1.id
        WHERE l.link_type IN (${placeholders})
    `,
        )
        .run(...RELATION_TYPES);

    return result.changes;
}

function insertArtists(db: Database.Database): number {
    console.log('Inserting artists...');
    const result = db
        .prepare(
            `
        INSERT INTO artists (mbid, name, sort_name, type, disambiguation, begin_year, end_year, ended)
        SELECT
            a.gid,
            a.name,
            a.sort_name,
            a.type,
            NULLIF(a.comment, ''),
            a.begin_year,
            a.end_year,
            COALESCE(a.ended, 0)
        FROM raw.artist a
        WHERE a.gid IN (
            SELECT entity0_mbid FROM relations
            UNION
            SELECT entity1_mbid FROM relations
        )
    `,
        )
        .run();

    return result.changes;
}

function printSummary(db: Database.Database): void {
    const get = (sql: string): number => (db.prepare(sql).get() as { c: number }).c;

    const relTotal = get('SELECT COUNT(*) AS c FROM relations');
    const relMember = get(`SELECT COUNT(*) AS c FROM relations WHERE relation_type = ${RELATION_TYPE.MEMBER}`);
    const relSupporting = get(`SELECT COUNT(*) AS c FROM relations WHERE relation_type = ${RELATION_TYPE.SUPPORTING}`);
    const relInstrumental = get(`SELECT COUNT(*) AS c FROM relations WHERE relation_type = ${RELATION_TYPE.INSTRUMENTAL_SUPPORTING}`);
    const relVocal = get(`SELECT COUNT(*) AS c FROM relations WHERE relation_type = ${RELATION_TYPE.VOCAL_SUPPORTING}`);
    const relAlias = get(`SELECT COUNT(*) AS c FROM relations WHERE relation_type = ${RELATION_TYPE.PERFORMANCE_NAME}`);
    const leadCount = get('SELECT COUNT(*) AS c FROM relations WHERE is_lead_vocals = 1');
    const distinctEntity0 = get('SELECT COUNT(DISTINCT entity0_mbid) AS c FROM relations');
    const distinctEntity1 = get('SELECT COUNT(DISTINCT entity1_mbid) AS c FROM relations');
    const artCount = get('SELECT COUNT(*) AS c FROM artists');

    console.log('\nSummary:');
    console.log(`  Relations: ${relTotal.toLocaleString()}`);
    console.log(`    member of band (${RELATION_TYPE.MEMBER}):              ${relMember.toLocaleString()}`);
    console.log(`    supporting musician (${RELATION_TYPE.SUPPORTING}):         ${relSupporting.toLocaleString()}`);
    console.log(`    instrumental supporting (${RELATION_TYPE.INSTRUMENTAL_SUPPORTING}):     ${relInstrumental.toLocaleString()}`);
    console.log(`    vocal supporting (${RELATION_TYPE.VOCAL_SUPPORTING}):            ${relVocal.toLocaleString()}`);
    console.log(`    performance name / alias (${RELATION_TYPE.PERFORMANCE_NAME}):    ${relAlias.toLocaleString()}`);
    console.log(`    with lead vocals attribute:        ${leadCount.toLocaleString()}`);
    console.log(`  Distinct entity0 (contributors): ${distinctEntity0.toLocaleString()}`);
    console.log(`  Distinct entity1 (targets):      ${distinctEntity1.toLocaleString()}`);
    console.log(`  Artists in DB: ${artCount.toLocaleString()}`);
}

function main(): void {
    if (!existsSync(RAW_DB_PATH)) {
        console.error(`Source DB not found: ${RAW_DB_PATH}`);
        console.error('Run `pnpm load-raw <dump-dir>` first');
        process.exit(1);
    }

    if (!existsSync(SCHEMA_PATH)) {
        console.error(`Schema not found: ${SCHEMA_PATH}`);
        process.exit(1);
    }

    ensureRawIndexes();

    if (existsSync(FINAL_DB_PATH)) {
        unlinkSync(FINAL_DB_PATH);
        console.log(`Removed existing ${FINAL_DB_PATH}`);
    }

    const db = new Database(FINAL_DB_PATH);

    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');
    db.pragma('temp_store = MEMORY');

    try {
        applySchema(db);
        db.exec(`ATTACH DATABASE '${RAW_DB_PATH}' AS raw`);

        const startTime = Date.now();

        const relCount = insertRelations(db);

        console.log(`  ${relCount.toLocaleString()} rows`);

        const artCount = insertArtists(db);

        console.log(`  ${artCount.toLocaleString()} rows`);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\nDone in ${elapsed}s`);

        printSummary(db);
    } finally {
        db.close();
    }
}

main();
