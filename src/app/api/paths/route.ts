import type { NextRequest } from 'next/server';
import { getRepo } from '@/lib/db';
import { isValidMbid } from '@/lib/db/mbid';
import { MAX_DEPTH } from '@/lib/db/sqlite-repo';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<Response> {
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    if (!from || !to) {
        return Response.json({ error: 'missing_param' }, { status: 400 });
    }

    if (!isValidMbid(from) || !isValidMbid(to)) {
        return Response.json({ error: 'invalid_mbid' }, { status: 400 });
    }

    try {
        const repo = getRepo();
        const result = await repo.findPath(from, to);

        if (!result) {
            return Response.json(
                { error: 'no_path', depthSearched: MAX_DEPTH },
                { status: 404 },
            );
        }
        return Response.json(result);
    } catch (e) {
        console.error(e);
        return Response.json({ error: 'internal' }, { status: 500 });
    }
}
