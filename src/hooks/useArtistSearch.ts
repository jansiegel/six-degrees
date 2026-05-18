import { useQuery } from '@tanstack/react-query';
import type { Artist } from '@/lib/db/types';

export function useArtistSearch(query: string, limit: number = 5) {
    return useQuery({
        queryKey: ['searchArtist', query, limit],
        queryFn: async () => {
            const res = await fetch(
                `/api/artists?q=${encodeURIComponent(query)}&limit=${limit}`
            );

            if (!res.ok) {
                throw new Error(`Search failed: ${res.status}`);
            }

            const artistResults = (await res.json()) as Artist[];

            return artistResults;
        },
        enabled: query.length > 0,
        retry: false,
    });
}
