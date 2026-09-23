import type { Artist, PathResult } from './types';

export interface ArtistsRepo {
    searchByName(query: string, limit: number): Promise<Artist[]>;
    findPath(fromMbid: string, toMbid: string): Promise<PathResult | null>;
}
