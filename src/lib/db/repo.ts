import type { Artist, Frontman, PathResult } from './types';

export interface ArtistsRepo {
    searchByName(query: string, limit: number): Promise<Artist[]>;
    getFrontman(bandMbid: string): Promise<Frontman | null>;
    findPath(fromMbid: string, toMbid: string): Promise<PathResult | null>;
}
