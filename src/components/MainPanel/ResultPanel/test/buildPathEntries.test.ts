import { describe, it, expect } from 'vitest';
import { buildPathEntries } from '../buildPathEntries';
import type { Artist, Frontman, PathResult } from '@/lib/db/types';
import { RELATION_TYPE } from '@/lib/db/relations';

function band(mbid: string, name: string): Artist {
    return { mbid, name, type: 2, disambiguation: null };
}

function person(mbid: string, name: string): Artist {
    return { mbid, name, type: 1, disambiguation: null };
}

function frontman(artist: Artist, attributes: string[] = []): Frontman {
    return { artist, attributes };
}

describe('buildPathEntries', () => {
    it('skips endpoint bands and renders only intermediate person nodes', () => {
        const qotsa = band('b1', 'Queens of the Stone Age');
        const joshHomme = person('p1', 'Josh Homme');
        const bowie = band('b2', 'David Bowie');
        const path: PathResult = {
            depth: 2,
            nodes: [qotsa, joshHomme, bowie],
            edges: [
                { fromMbid: 'b1', toMbid: 'p1', contributorMbid: 'p1', relationType: RELATION_TYPE.MEMBER, isLeadVocals: true, attributes: [] },
                { fromMbid: 'p1', toMbid: 'b2', contributorMbid: 'p1', relationType: RELATION_TYPE.SUPPORTING, isLeadVocals: false, attributes: ['guitar'] },
            ],
        };

        const entries = buildPathEntries(path, [null, null]);

        expect(entries).toHaveLength(1);
        expect(entries[0].name).toBe('Josh Homme');
        expect(entries[0].from?.name).toBe('Queens of the Stone Age');
        expect(entries[0].to?.name).toBe('David Bowie');
        expect(entries[0].to?.role).toEqual(['guitar']);
    });

    it('prepends frontman card when first endpoint is a band', () => {
        const qotsa = band('b1', 'Queens of the Stone Age');
        const middle = person('p1', 'Mike Doe');
        const targetBand = band('b2', 'David Bowie');
        const path: PathResult = {
            depth: 2,
            nodes: [qotsa, middle, targetBand],
            edges: [
                { fromMbid: 'b1', toMbid: 'p1', contributorMbid: 'p1', relationType: RELATION_TYPE.MEMBER, isLeadVocals: false, attributes: [] },
                { fromMbid: 'p1', toMbid: 'b2', contributorMbid: 'p1', relationType: RELATION_TYPE.SUPPORTING, isLeadVocals: false, attributes: [] },
            ],
        };
        const joshHomme = person('p2', 'Josh Homme');

        const entries = buildPathEntries(path, [frontman(joshHomme, ['original']), null]);

        expect(entries[0].name).toBe('Josh Homme');
        expect(entries[0].from).toBeNull();
        expect(entries[0].to?.name).toBe('Queens of the Stone Age');
        expect(entries[0].to?.role).toEqual(['original member']);
    });

    it('omits the from-bullet when the intermediate person is not the contributor', () => {
        const start = band('b1', 'Band A');
        const personA = person('p1', 'Person A');
        const personB = person('p2', 'Person B');
        const end = band('b2', 'Band B');
        const path: PathResult = {
            depth: 3,
            nodes: [start, personA, personB, end],
            edges: [
                { fromMbid: 'b1', toMbid: 'p1', contributorMbid: 'p1', relationType: RELATION_TYPE.MEMBER, isLeadVocals: false, attributes: [] },
                { fromMbid: 'p1', toMbid: 'p2', contributorMbid: 'p1', relationType: RELATION_TYPE.SUPPORTING, isLeadVocals: false, attributes: [] },
                { fromMbid: 'p2', toMbid: 'b2', contributorMbid: 'p2', relationType: RELATION_TYPE.MEMBER, isLeadVocals: false, attributes: [] },
            ],
        };

        const entries = buildPathEntries(path, [null, null]);
        const middleEntry = entries.find((e) => e.name === 'Person B');

        expect(middleEntry?.from).toBeNull();
    });
});
