import { describe, it, expect } from 'vitest';
import { bidirectionalBfs } from '../bidirectional-bfs';

function makeGraph(adjacency: Record<string, string[]>): (mbid: string) => Promise<string[]> {
    return async (mbid: string) => adjacency[mbid] ?? [];
}

describe('bidirectionalBfs', () => {
    it('returns a zero-length path when from === to', async () => {
        const result = await bidirectionalBfs({
            fromMbid: 'a',
            toMbid: 'a',
            maxDepth: 7,
            neighborsOf: makeGraph({}),
        });

        expect(result).toEqual({ path: ['a'], depth: 0 });
    });

    it('finds a direct (depth 1) connection', async () => {
        const neighborsOf = makeGraph({
            a: ['b'],
            b: ['a'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'b', maxDepth: 7, neighborsOf });

        expect(result).toEqual({ path: ['a', 'b'], depth: 1 });
    });

    it('finds a two-hop path through a shared neighbor', async () => {
        const neighborsOf = makeGraph({
            a: ['m'],
            m: ['a', 'b'],
            b: ['m'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'b', maxDepth: 7, neighborsOf });

        expect(result).toEqual({ path: ['a', 'm', 'b'], depth: 2 });
    });

    it('returns null when the components are disconnected', async () => {
        const neighborsOf = makeGraph({
            a: ['x'],
            x: ['a'],
            b: ['y'],
            y: ['b'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'b', maxDepth: 7, neighborsOf });

        expect(result).toBeNull();
    });

    it('handles cycles without infinite looping', async () => {
        const neighborsOf = makeGraph({
            a: ['b', 'c'],
            b: ['a', 'c', 'd'],
            c: ['a', 'b', 'd'],
            d: ['b', 'c'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'd', maxDepth: 7, neighborsOf });

        expect(result?.depth).toBe(2);
        expect(result?.path[0]).toBe('a');
        expect(result?.path.at(-1)).toBe('d');
    });

    it('returns the shortest path when multiple paths exist', async () => {
        const neighborsOf = makeGraph({
            a: ['short', 'long1'],
            short: ['a', 'b'],
            long1: ['a', 'long2'],
            long2: ['long1', 'long3'],
            long3: ['long2', 'b'],
            b: ['short', 'long3'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'b', maxDepth: 7, neighborsOf });

        expect(result?.depth).toBe(2);
    });

    it('returns null when the shortest path exceeds maxDepth', async () => {
        const neighborsOf = makeGraph({
            a: ['n1'],
            n1: ['a', 'n2'],
            n2: ['n1', 'n3'],
            n3: ['n2', 'b'],
            b: ['n3'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'b', maxDepth: 2, neighborsOf });

        expect(result).toBeNull();
    });

    it('finds a path right at the maxDepth limit', async () => {
        const neighborsOf = makeGraph({
            a: ['x'],
            x: ['a', 'y'],
            y: ['x', 'b'],
            b: ['y'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'b', maxDepth: 3, neighborsOf });

        expect(result?.depth).toBe(3);
        expect(result?.path).toEqual(['a', 'x', 'y', 'b']);
    });

    it('returns a path whose length matches depth', async () => {
        const neighborsOf = makeGraph({
            a: ['b'],
            b: ['a', 'c'],
            c: ['b', 'd'],
            d: ['c'],
        });
        const result = await bidirectionalBfs({ fromMbid: 'a', toMbid: 'd', maxDepth: 7, neighborsOf });

        expect(result).not.toBeNull();
        expect(result!.path.length - 1).toBe(result!.depth);
    });
});
