/**
 * Loads selected MusicBrainz TSV dump files into a local intermediate SQLite
 * (`mb-raw.sqlite`). Subsequent filter/transform scripts read from there.
 *
 * Usage: pnpm load-raw <path-to-mbdump-dir>
 *   e.g. pnpm load-raw ~/mb-data/mbdump
 *
 * Output: ./mb-raw.sqlite (next to this script)
 *
 * Tables loaded here are only the ones needed for `memberships` and `artists`.
 * URL- and country-related tables are loaded by separate scripts.
 */

import Database from 'better-sqlite3';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';

const RAW_DB_PATH = './mb-raw.sqlite';
const BATCH_SIZE = 50_000;

function parseArgs(): { dumpDir: string } {
    const arg = process.argv[2];

    if (!arg) {
        console.error('Usage: pnpm load-raw <path-to-mbdump-dir>');
        console.error('  e.g. pnpm load-raw ~/mb-data/mbdump');
        process.exit(1);
    }

    const dumpDir = resolve(arg.replace(/^~/, process.env.HOME ?? ''));

    if (!existsSync(dumpDir)) {
        console.error(`Directory does not exist: ${dumpDir}`);
        process.exit(1);
    }
    if (!statSync(dumpDir).isDirectory()) {
        console.error(`Not a directory: ${dumpDir}`);
        process.exit(1);
    }

    return { dumpDir };
}

type Column = { name: string; type: string };
type TableSpec = { file: string; columns: Column[] };

const TABLES: TableSpec[] = [
    {
        file: 'artist',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY' },
            { name: 'gid', type: 'TEXT' },
            { name: 'name', type: 'TEXT' },
            { name: 'sort_name', type: 'TEXT' },
            { name: 'begin_year', type: 'INTEGER' },
            { name: 'begin_month', type: 'INTEGER' },
            { name: 'begin_day', type: 'INTEGER' },
            { name: 'end_year', type: 'INTEGER' },
            { name: 'end_month', type: 'INTEGER' },
            { name: 'end_day', type: 'INTEGER' },
            { name: 'type', type: 'INTEGER' },
            { name: 'area', type: 'INTEGER' },
            { name: 'gender', type: 'INTEGER' },
            { name: 'comment', type: 'TEXT' },
            { name: 'edits_pending', type: 'INTEGER' },
            { name: 'last_updated', type: 'TEXT' },
            { name: 'ended', type: 'INTEGER' },
            { name: 'begin_area', type: 'INTEGER' },
            { name: 'end_area', type: 'INTEGER' },
        ],
    },
    {
        file: 'link_type',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY' },
            { name: 'parent', type: 'INTEGER' },
            { name: 'child_order', type: 'INTEGER' },
            { name: 'gid', type: 'TEXT' },
            { name: 'entity_type0', type: 'TEXT' },
            { name: 'entity_type1', type: 'TEXT' },
            { name: 'name', type: 'TEXT' },
            { name: 'description', type: 'TEXT' },
            { name: 'link_phrase', type: 'TEXT' },
            { name: 'reverse_link_phrase', type: 'TEXT' },
            { name: 'long_link_phrase', type: 'TEXT' },
            { name: 'last_updated', type: 'TEXT' },
            { name: 'is_deprecated', type: 'INTEGER' },
            { name: 'has_dates', type: 'INTEGER' },
            { name: 'entity0_cardinality', type: 'INTEGER' },
            { name: 'entity1_cardinality', type: 'INTEGER' },
        ],
    },
    {
        file: 'link',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY' },
            { name: 'link_type', type: 'INTEGER' },
            { name: 'begin_year', type: 'INTEGER' },
            { name: 'begin_month', type: 'INTEGER' },
            { name: 'begin_day', type: 'INTEGER' },
            { name: 'end_year', type: 'INTEGER' },
            { name: 'end_month', type: 'INTEGER' },
            { name: 'end_day', type: 'INTEGER' },
            { name: 'attribute_count', type: 'INTEGER' },
            { name: 'created', type: 'TEXT' },
            { name: 'ended', type: 'INTEGER' },
        ],
    },
    {
        file: 'link_attribute',
        columns: [
            { name: 'link', type: 'INTEGER' },
            { name: 'attribute_type', type: 'INTEGER' },
            { name: 'created', type: 'TEXT' },
        ],
    },
    {
        file: 'link_attribute_type',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY' },
            { name: 'parent', type: 'INTEGER' },
            { name: 'root', type: 'INTEGER' },
            { name: 'child_order', type: 'INTEGER' },
            { name: 'gid', type: 'TEXT' },
            { name: 'name', type: 'TEXT' },
            { name: 'description', type: 'TEXT' },
            { name: 'last_updated', type: 'TEXT' },
        ],
    },
    {
        file: 'l_artist_artist',
        columns: [
            { name: 'id', type: 'INTEGER PRIMARY KEY' },
            { name: 'link', type: 'INTEGER' },
            { name: 'entity0', type: 'INTEGER' },
            { name: 'entity1', type: 'INTEGER' },
            { name: 'edits_pending', type: 'INTEGER' },
            { name: 'last_updated', type: 'TEXT' },
            { name: 'link_order', type: 'INTEGER' },
            { name: 'entity0_credit', type: 'TEXT' },
            { name: 'entity1_credit', type: 'TEXT' },
        ],
    },
];

async function detectColumnCount(tsvPath: string): Promise<number> {
    const stream = createReadStream(tsvPath, { encoding: 'utf8' });
    const rl = createInterface({ input: stream });

    for await (const line of rl) {
        rl.close();
        stream.destroy();
        return line.split('\t').length;
    }
    return 0;
}

function formatMb(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function loadTable(db: Database.Database, spec: TableSpec, dumpDir: string): Promise<number> {
    const tsvPath = join(dumpDir, spec.file);
    const fileSize = statSync(tsvPath).size;

    console.log(`\n  ${spec.file} (${formatMb(fileSize)})`);

    const actualColCount = await detectColumnCount(tsvPath);

    if (actualColCount !== spec.columns.length) {
        throw new Error(
            `Column count mismatch in '${spec.file}': spec expects ${spec.columns.length}, ` +
            `dump has ${actualColCount}. Adjust TABLES schema in load-raw.ts.`,
        );
    }

    const columnDefs = spec.columns.map((c) => `${c.name} ${c.type}`).join(', ');
    const columnNames = spec.columns.map((c) => c.name).join(', ');
    const placeholders = spec.columns.map(() => '?').join(', ');

    db.exec(`DROP TABLE IF EXISTS ${spec.file}`);
    db.exec(`CREATE TABLE ${spec.file} (${columnDefs})`);

    const insertStmt = db.prepare(`INSERT INTO ${spec.file} (${columnNames}) VALUES (${placeholders})`);
    const insertBatch = db.transaction((rows: unknown[][]) => {
        for (const row of rows) {
            insertStmt.run(...row);
        }
    });

    const stream = createReadStream(tsvPath);
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    let batch: unknown[][] = [];
    let total = 0;
    let bytesRead = 0;
    const startTime = Date.now();

    let lastLogTime = startTime;

    const printProgress = (final: boolean) => {
        const now = Date.now();
        const elapsedS = (now - startTime) / 1000;
        const pct = Math.min(100, Math.round((bytesRead / fileSize) * 100));
        const rate = total > 0 ? Math.round(total / elapsedS) : 0;
        const msg = `    ${pct}% | ${total.toLocaleString()} rows | ${rate.toLocaleString()} rows/s | ${elapsedS.toFixed(1)}s`;

        process.stdout.write(`\r${msg}${final ? '\n' : ''}`);
    };

    for await (const line of rl) {
        bytesRead += Buffer.byteLength(line, 'utf8') + 1; // +1 for newline
        const values = line.split('\t').map((v) => (v === '\\N' ? null : v));

        batch.push(values);

        if (batch.length >= BATCH_SIZE) {
            insertBatch(batch);
            total += batch.length;
            batch = [];

            const now = Date.now();

            if (now - lastLogTime > 250) {
                printProgress(false);
                lastLogTime = now;
            }
        }
    }

    if (batch.length > 0) {
        insertBatch(batch);
        total += batch.length;
    }

    printProgress(true);
    return total;
}

async function main(): Promise<void> {
    const { dumpDir } = parseArgs();

    console.log(`Loading raw MB dump into ${RAW_DB_PATH}`);
    console.log(`Source dir: ${dumpDir}\n`);

    const db = new Database(RAW_DB_PATH);

    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF'); // ETL is one-time, durability is not required
    db.pragma('temp_store = MEMORY');

    const startTime = Date.now();

    let totalRows = 0;

    try {
        for (const spec of TABLES) {
            totalRows += await loadTable(db, spec, dumpDir);
        }
    } finally {
        db.close();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\nDone. ${totalRows.toLocaleString()} rows loaded in ${elapsed}s`);
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
