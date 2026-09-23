import type { PathEdge, PathResult } from '@/lib/db/types';
import { RELATION_TYPE_LABELS, relabelAttribute } from '@/lib/db/relations';

export type BandRole = {
    name: string;
    role: string[];
};

export type PathNodeEntry = {
    mbid: string;
    name: string;
    from: BandRole | null;
    to: BandRole | null;
};

function buildBandRole(name: string, attributes: string[], relationType?: number): BandRole {
    if (attributes.length > 0) {
        return { name, role: attributes.map(relabelAttribute) };
    }

    if (relationType !== undefined) {
        const label = RELATION_TYPE_LABELS[relationType as keyof typeof RELATION_TYPE_LABELS];

        if (label) {
            return { name, role: [label] };
        }
    }

    return { name, role: [] };
}

function edgeKey(fromMbid: string, toMbid: string): string {
    return `${fromMbid}|${toMbid}`;
}

export function buildPathEntries(path: PathResult): PathNodeEntry[] {
    const edgesByDirection = new Map<string, PathEdge>();

    for (const edge of path.edges) {
        edgesByDirection.set(edgeKey(edge.fromMbid, edge.toMbid), edge);
    }

    return path.nodes
        .map((node, i): PathNodeEntry | null => {
            const isFirst = i === 0;
            const isLast = i === path.nodes.length - 1;
            const previousNode = path.nodes[i - 1];
            const nextNode = path.nodes[i + 1];

            if (node.type !== 1) {
                return null;
            }

            if (isFirst || isLast) {
                return {
                    mbid: node.mbid,
                    name: node.name,
                    from: null,
                    to: null,
                };
            }

            const incomingEdge = previousNode ? edgesByDirection.get(edgeKey(previousNode.mbid, node.mbid)) : undefined;
            const outgoingEdge = nextNode ? edgesByDirection.get(edgeKey(node.mbid, nextNode.mbid)) : undefined;

            const from: BandRole | null = previousNode && incomingEdge?.contributorMbid === node.mbid
                ? buildBandRole(previousNode.name, incomingEdge.attributes, incomingEdge.relationType)
                : null;
            const to: BandRole | null = nextNode && outgoingEdge?.contributorMbid === node.mbid
                ? buildBandRole(nextNode.name, outgoingEdge.attributes, outgoingEdge.relationType)
                : null;

            return {
                mbid: node.mbid,
                name: node.name,
                from,
                to,
            };
        })
        .filter((entry): entry is PathNodeEntry => entry !== null);
}
