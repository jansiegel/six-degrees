import 'server-only';
import type { ArtistsRepo } from './repo';
import { SqliteRepo } from './sqlite-repo';
import { D1Repo } from './d1-repo';

type Backend = 'sqlite' | 'd1';

const globalForRepo = globalThis as unknown as { repo?: ArtistsRepo };

export function getRepo(): ArtistsRepo {
    if (globalForRepo.repo) {
        return globalForRepo.repo;
    }

    const backend = (process.env.DB_BACKEND ?? 'sqlite') as Backend;

    if (backend === 'd1') {
        globalForRepo.repo = createD1Repo();
    } else if (backend === 'sqlite') {
        globalForRepo.repo = createSqliteRepo();
    } else {
        throw new Error(`Unknown DB_BACKEND: ${backend}. Expected 'sqlite' or 'd1'.`);
    }

    return globalForRepo.repo;
}

function createSqliteRepo(): SqliteRepo {
    const dbPath = process.env.DB_PATH;

    if (!dbPath) {
        throw new Error('DB_PATH missing (required when DB_BACKEND=sqlite)');
    }

    return new SqliteRepo(dbPath);
}

function createD1Repo(): D1Repo {
    const accountId = process.env.CF_ACCOUNT_ID;
    const databaseId = process.env.CF_D1_DATABASE_ID;
    const apiToken = process.env.CF_D1_API_TOKEN;

    if (!accountId || !databaseId || !apiToken) {
        throw new Error(
            'CF_ACCOUNT_ID, CF_D1_DATABASE_ID and CF_D1_API_TOKEN are all required when DB_BACKEND=d1',
        );
    }

    return new D1Repo({ accountId, databaseId, apiToken });
}
