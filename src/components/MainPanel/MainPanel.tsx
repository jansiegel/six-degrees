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

const CSS_CLASSES = {
    panelLayoutSearch: [
        'flex',
        'flex-col',
        'items-center',
        'w-full',
        'md:w-4/5',
        'gap-1',
        'min-h-[calc(100dvh-3.5rem)]',
    ],
    panelLayoutResult: [
        'flex',
        'flex-col',
        'items-center',
        'w-full',
        'md:w-4/5',
        'gap-1',
    ],
};

export const MainPanel = () => {
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const deferredOutcome = useDeferredValue(outcome);
    const isFirstRender = useRef(true);

    const handleResult = useCallback(
        (path: PathResult | null, displayNames: [string, string], frontmen: [Frontman | null, Frontman | null]) => {
            setOutcome({ path, displayNames, frontmen });
        },
        [],
    );
    const handleReset = useCallback(() => setOutcome(null), []);

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
                <ResultPanel
                    outcome={deferredOutcome}
                    onReset={handleReset}
                    className={clsx(CSS_CLASSES.panelLayoutResult)}
                />
            </ViewTransition>
        );
    }

    return (
        <ViewTransition>
            <ArtistsSearchPanel onResult={handleResult} className={clsx(CSS_CLASSES.panelLayoutSearch)} />
        </ViewTransition>
    );
};
