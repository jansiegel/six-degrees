export type Artist = {
    mbid: string;
    name: string;
    type: number | null;
    disambiguation: string | null;
};

export type PathEdge = {
    fromMbid: string;
    toMbid: string;
    contributorMbid: string;
    relationType: number;
    isLeadVocals: boolean;
    attributes: string[];
};

export type PathResult = {
    depth: number;
    nodes: Artist[];
    edges: PathEdge[];
};
