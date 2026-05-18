import 'server-only';
import type { ArtistsRepo } from './repo';
import { SqliteRepo } from './sqlite-repo';

const globalForRepo = globalThis as unknown as { repo?: ArtistsRepo };

export function getRepo(): ArtistsRepo {
    if (globalForRepo.repo) {
        return globalForRepo.repo;
    }

    const dbPath = process.env.DB_PATH;

    if (!dbPath) {
        throw new Error('DB_PATH missing');
    }

    globalForRepo.repo = new SqliteRepo(dbPath);

    return globalForRepo.repo;
}
