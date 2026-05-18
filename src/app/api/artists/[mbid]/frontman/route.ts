import type { NextRequest } from 'next/server';
import { getRepo } from '@/lib/db';
import { isValidMbid } from '@/lib/db/mbid';

export const runtime = 'nodejs';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ mbid: string }> },
): Promise<Response> {
    const { mbid } = await params;

    if (!isValidMbid(mbid)) {
        return Response.json({ error: 'invalid_mbid' }, { status: 400 });
    }

    try {
        const repo = getRepo();
        const frontman = await repo.getFrontman(mbid);

        return Response.json(frontman);
    } catch (e) {
        console.error(e);
        return Response.json({ error: 'frontman_lookup_failed' }, { status: 500 });
    }
}
