import { useQuery } from '@tanstack/react-query';
import type { Frontman } from '@/lib/db/types';

export function useFrontman(mbid: string | null) {
    return useQuery({
        queryKey: ['frontman', mbid],
        queryFn: async () => {
            const res = await fetch(`/api/artists/${mbid}/frontman`);

            if (!res.ok) {
                throw new Error(`Fetch failed: ${res.status}`);
            }

            return (await res.json()) as Frontman | null;
        },
        enabled: !!mbid,
        retry: false,
        staleTime: Infinity,
    });
}
