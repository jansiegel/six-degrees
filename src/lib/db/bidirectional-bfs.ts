type Args = {
    fromMbid: string;
    toMbid: string;
    maxDepth: number;
    neighborsOf: (mbid: string) => string[];
};

type Result = {
    path: string[];
    depth: number;
};

export function bidirectionalBfs({ fromMbid, toMbid, maxDepth, neighborsOf }: Args): Result | null {
    if (fromMbid === toMbid) {
        return { path: [fromMbid], depth: 0 };
    }

    const parentFrom = new Map<string, string | null>([[fromMbid, null]]);
    const parentTo = new Map<string, string | null>([[toMbid, null]]);

    let frontierFrom = new Set<string>([fromMbid]);
    let frontierTo = new Set<string>([toMbid]);
    let depthFrom = 0;
    let depthTo = 0;

    while (frontierFrom.size > 0 && frontierTo.size > 0 && depthFrom + depthTo < maxDepth) {
        const expandFromSide = frontierFrom.size <= frontierTo.size;

        if (expandFromSide) {
            const result = expand(frontierFrom, parentFrom, parentTo, neighborsOf);

            if (result.meetingNode !== null) {
                return reconstruct(result.meetingNode, parentFrom, parentTo);
            }

            frontierFrom = result.nextFrontier;
            depthFrom += 1;
        } else {
            const result = expand(frontierTo, parentTo, parentFrom, neighborsOf);

            if (result.meetingNode !== null) {
                return reconstruct(result.meetingNode, parentFrom, parentTo);
            }

            frontierTo = result.nextFrontier;
            depthTo += 1;
        }
    }

    return null;
}

type ExpandResult = {
    nextFrontier: Set<string>;
    meetingNode: string | null;
};

function expand(
    frontier: Set<string>,
    parentSelf: Map<string, string | null>,
    parentOther: Map<string, string | null>,
    neighborsOf: (mbid: string) => string[],
): ExpandResult {
    const nextFrontier = new Set<string>();

    for (const node of frontier) {
        for (const neighbor of neighborsOf(node)) {
            if (parentSelf.has(neighbor)) {
                continue;
            }

            parentSelf.set(neighbor, node);

            if (parentOther.has(neighbor)) {
                return { nextFrontier, meetingNode: neighbor };
            }

            nextFrontier.add(neighbor);
        }
    }

    return { nextFrontier, meetingNode: null };
}

function reconstruct(
    meetingNode: string,
    parentFrom: Map<string, string | null>,
    parentTo: Map<string, string | null>,
): Result {
    const leftSide: string[] = [];

    let cursor: string | null | undefined = meetingNode;

    while (cursor !== null && cursor !== undefined) {
        leftSide.push(cursor);
        cursor = parentFrom.get(cursor) ?? null;
    }
    leftSide.reverse();

    const rightSide: string[] = [];

    cursor = parentTo.get(meetingNode) ?? null;

    while (cursor !== null && cursor !== undefined) {
        rightSide.push(cursor);
        cursor = parentTo.get(cursor) ?? null;
    }

    const path = [...leftSide, ...rightSide];

    return { path, depth: path.length - 1 };
}
