export const RELATION_TYPE = {
    MEMBER: 103,
    SUPPORTING: 104,
    INSTRUMENTAL_SUPPORTING: 105,
    VOCAL_SUPPORTING: 107,
    PERFORMANCE_NAME: 108,
} as const;

export type RelationType = typeof RELATION_TYPE[keyof typeof RELATION_TYPE];

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
    [RELATION_TYPE.MEMBER]: 'member',
    [RELATION_TYPE.SUPPORTING]: 'supporting artist',
    [RELATION_TYPE.INSTRUMENTAL_SUPPORTING]: 'instrumental supporting artist',
    [RELATION_TYPE.VOCAL_SUPPORTING]: 'vocal supporting artist',
    [RELATION_TYPE.PERFORMANCE_NAME]: 'alias',
};

export const ATTRIBUTE_LABELS: Record<string, string> = {
    additional: 'additional member',
    original: 'original member',
};

export function relabelAttribute(attribute: string): string {
    return ATTRIBUTE_LABELS[attribute] ?? attribute;
}
