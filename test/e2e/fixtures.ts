import type { Page } from '@playwright/test';
import type { Artist, Frontman, PathResult } from '@/lib/db/types';

const QOTSA: Artist = {
    mbid: '7dc8f5bd-9d0b-4087-9f73-dc164950bbd8',
    name: 'Queens of the Stone Age',
    type: 2,
    disambiguation: null,
};

const BOWIE: Artist = {
    mbid: '5441c29d-3602-4898-b1a1-b77fa23b8e50',
    name: 'David Bowie',
    type: 1,
    disambiguation: 'English singer-songwriter',
};

const BOWIE_BAND: Artist = {
    mbid: '11111111-1111-1111-1111-111111111111',
    name: 'David Bowie Band',
    type: 2,
    disambiguation: null,
};

const JOSH_HOMME: Artist = {
    mbid: '22222222-2222-2222-2222-222222222222',
    name: 'Josh Homme',
    type: 1,
    disambiguation: null,
};

const QOTSA_FRONTMAN: Frontman = {
    artist: JOSH_HOMME,
    attributes: ['original'],
};

const DEFAULT_PATH: PathResult = {
    depth: 2,
    nodes: [QOTSA, JOSH_HOMME, BOWIE],
    edges: [
        { fromMbid: QOTSA.mbid, toMbid: JOSH_HOMME.mbid, contributorMbid: JOSH_HOMME.mbid, relationType: 103, isLeadVocals: true, attributes: [] },
        { fromMbid: JOSH_HOMME.mbid, toMbid: BOWIE.mbid, contributorMbid: JOSH_HOMME.mbid, relationType: 104, isLeadVocals: false, attributes: ['guitar'] },
    ],
};

function matchPrefix(query: string, candidates: Artist[]): Artist[] {
    const lower = query.toLowerCase();

    return candidates.filter((a) => a.name.toLowerCase().startsWith(lower));
}

export async function setupApiMocks(page: Page): Promise<void> {
    await page.route('**/api/artists?*', async (route) => {
        const url = new URL(route.request().url());
        const q = url.searchParams.get('q') ?? '';
        const results = matchPrefix(q, [QOTSA, BOWIE, BOWIE_BAND]);

        await route.fulfill({ json: results });
    });

    await page.route('**/api/artists/*/frontman', async (route) => {
        const url = new URL(route.request().url());
        const mbid = url.pathname.split('/').at(-2);

        if (mbid === QOTSA.mbid) {
            await route.fulfill({ json: QOTSA_FRONTMAN });
            return;
        }

        await route.fulfill({ json: null });
    });

    await page.route('**/api/paths?*', async (route) => {
        await route.fulfill({ json: DEFAULT_PATH });
    });
}
