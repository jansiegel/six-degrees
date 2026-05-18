import type { NextRequest } from 'next/server';
import { getRepo } from '@/lib/db';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function parseLimit(raw: string | null): number {
    if (raw === null) {
        return DEFAULT_LIMIT;
    }

    const parsed = Number(raw);

    if (!Number.isFinite(parsed)) {
        return DEFAULT_LIMIT;
    }

    return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
}

export async function GET(request: NextRequest): Promise<Response> {
    const query = request.nextUrl.searchParams.get('q');

    if (!query) {
        return Response.json({ error: 'missing_query' }, { status: 400 });
    }

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

    try {
        const repo = getRepo();
        const artists = await repo.searchByName(query, limit);

        return Response.json(artists);
    } catch (e) {
        console.error(e);
        return Response.json({ error: 'search_failed' }, { status: 500 });
    }
}
