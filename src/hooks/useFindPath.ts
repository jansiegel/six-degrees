import { useMutation } from '@tanstack/react-query';
import type { PathResult } from '@/lib/db/types';

type Variables = { from: string; to: string };

export function useFindPath() {
    return useMutation<PathResult | null, Error, Variables>({
        mutationFn: async ({ from, to }) => {
            const params = new URLSearchParams({ from, to });
            const res = await fetch(`/api/paths?${params.toString()}`);

            if (res.status === 404) {
                return null;
            }

            if (!res.ok) {
                throw new Error(`Path search failed: ${res.status}`);
            }

            return res.json() as Promise<PathResult>;
        },
        retry: false,
    });
}
