'use client';

import { useState, useDeferredValue, useCallback, useEffect, useRef, ViewTransition } from 'react';
import clsx from 'clsx';
import { ArtistsSearchPanel } from './ArtistsSearchPanel/ArtistsSearchPanel';
import { ResultPanel } from './ResultPanel/ResultPanel';
import type { Frontman, PathResult } from '@/lib/db/types';

export type Outcome = {
    path: PathResult | null;
    displayNames: [string, string];
    frontmen: [Frontman | null, Frontman | null];
};

const PANEL_LAYOUT_BASE_CLASSES = [
    'flex',
    'flex-col',
    'items-center',
    'w-full',
    'md:w-4/5',
    'gap-1',
];

const PANEL_LAYOUT_SEARCH_CLASSES = [
    ...PANEL_LAYOUT_BASE_CLASSES,
    'min-h-[calc(100dvh-3.5rem)]',
];

const PANEL_LAYOUT_RESULT_CLASSES = PANEL_LAYOUT_BASE_CLASSES;

export const MainPanel = () => {
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const deferredOutcome = useDeferredValue(outcome);

    const handleResult = useCallback(
        (
            path: PathResult | null,
            displayNames: [string, string],
            frontmen: [Frontman | null, Frontman | null],
        ) => {
            setOutcome({ path, displayNames, frontmen });
        },
        [],
    );

    const handleReset = useCallback(() => {
        setOutcome(null);
    }, []);

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    }, [deferredOutcome]);

    if (deferredOutcome !== null) {
        return (
            <ViewTransition>
                <ResultPanel outcome={deferredOutcome} onReset={handleReset} className={clsx(PANEL_LAYOUT_RESULT_CLASSES)} />
            </ViewTransition>
        );
    }

    return (
        <ViewTransition>
            <ArtistsSearchPanel onResult={handleResult} className={clsx(PANEL_LAYOUT_SEARCH_CLASSES)} />
        </ViewTransition>
    );
};
