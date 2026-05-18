import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { useFrontman } from '../useFrontman';
import type { Frontman } from '@/lib/db/types';

const FRONTMAN_FIXTURE: Frontman = {
    artist: {
        mbid: 'p-homme',
        name: 'Josh Homme',
        type: 1,
        disambiguation: null,
    },
    attributes: ['original'],
};

const server = setupServer();

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFrontman', () => {
    it('returns frontman data for a valid mbid', async () => {
        server.use(
            http.get('/api/artists/b-qotsa/frontman', () => HttpResponse.json(FRONTMAN_FIXTURE)),
        );

        const { result } = renderHook(() => useFrontman('b-qotsa'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(result.current.data?.artist.name).toBe('Josh Homme');
        expect(result.current.data?.attributes).toEqual(['original']);
    });

    it('returns null when API returns null (band has no frontman)', async () => {
        server.use(
            http.get('/api/artists/b-bowie/frontman', () => HttpResponse.json(null)),
        );

        const { result } = renderHook(() => useFrontman('b-bowie'), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(result.current.data).toBeNull();
    });

    it('does not fetch when mbid is null', () => {
        const { result } = renderHook(() => useFrontman(null), { wrapper });

        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });
});
