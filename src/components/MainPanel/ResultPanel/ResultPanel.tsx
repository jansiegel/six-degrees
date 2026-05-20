'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDoubleDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Outcome } from '../MainPanel';
import { Button } from '@/components/Button/Button';
import { buildPathEntries } from './buildPathEntries';
import type { BandRole } from './buildPathEntries';
import { MAX_DEPTH } from '@/lib/db/max-depth';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
    outcome: Outcome;
    onReset: () => void;
    className?: string;
};

const CSS_CLASSES = {
    bookend: [
        'text-center',
        'p-1',
        'w-full',
        'text-page-bg',
        'bg-poster-bg-orange',
        'text-poster-font',
        'font-(family-name:--font-young-serif,serif)',
        'leading-tight',
    ],
    entry: [
        'text-center',
        'p-1',
        'w-full',
        'text-page-bg',
        'bg-poster-light-bg',
        'px-1',
    ],
    bookendHeading: [
        'uppercase',
    ],
    entryHeading: [
        'text-3xl',
        'font-extrabold',
        'py-3',
        'uppercase',
    ],
    bandRoleItem: [
        'flex-1',
        'text-center',
        'border',
        'border-solid',
        'border-page-bg/30',
        'p-1',
        'leading-tight',
        'transition-colors',
    ],
    bandRolesList: [
        'flex',
        'flex-row',
        'gap-1',
    ],
    chevron: [
        'h-6',
        'w-6',
        'text-poster-light-bg',
    ],
    panelText: [
        'font-(family-name:--font-dm-sans,sans-serif)',
    ],
    resetWrapper: [
        'mt-12',
        'w-1/2',
    ],
};

type BandRoleItemProps = {
    bandRole: BandRole;
    isHovered: boolean;
    onHover: (artistName: string | null) => void;
};

const BandRoleItem = ({ bandRole, isHovered, onHover }: BandRoleItemProps) => (
    <li
        onMouseEnter={() => onHover(bandRole.name)}
        onMouseLeave={() => onHover(null)}
        className={clsx(CSS_CLASSES.bandRoleItem, isHovered && 'bg-poster-bg-orange/10')}
    >
        <strong>{bandRole.name}</strong>
        {bandRole.role.length > 0 && (
            <>
                <br />({bandRole.role.join(', ')})
            </>
        )}
    </li>
);

export const ResultPanel = ({ outcome, onReset, className }: ResultPanelProps) => {
    const { path, displayNames, frontmen } = outcome;
    const [hoveredArtistName, setHoveredArtistName] = useState<string | null>(null);

    const entries = useMemo(() => (path !== null ? buildPathEntries(path, frontmen) : []), [path, frontmen]);

    return (
        <div className={clsx(className, CSS_CLASSES.panelText)}>
            <div className={clsx(CSS_CLASSES.bookend)}>
                <h1 className={clsx(styles.bookend, CSS_CLASSES.bookendHeading)}>
                    the six degrees of
                    <br />
                    {displayNames[0]}
                </h1>
            </div>
            {path === null ? (
                <div className={clsx(CSS_CLASSES.entry)}>
                    <h2 className={clsx(CSS_CLASSES.entryHeading)}>No connection found within {MAX_DEPTH} hops.</h2>
                </div>
            ) : (
                entries.map((entry, index) => (
                    <Fragment key={entry.mbid}>
                        <div className={clsx(CSS_CLASSES.entry)}>
                            <h2 className={clsx(CSS_CLASSES.entryHeading)}>{entry.name}</h2>
                            <ul className={clsx(CSS_CLASSES.bandRolesList)}>
                                {entry.from && (
                                    <BandRoleItem
                                        bandRole={entry.from}
                                        isHovered={hoveredArtistName === entry.from.name}
                                        onHover={setHoveredArtistName}
                                    />
                                )}
                                {entry.to && (
                                    <BandRoleItem
                                        bandRole={entry.to}
                                        isHovered={hoveredArtistName === entry.to.name}
                                        onHover={setHoveredArtistName}
                                    />
                                )}
                            </ul>
                        </div>
                        {index < entries.length - 1 && <ChevronDoubleDownIcon className={clsx(CSS_CLASSES.chevron)} />}
                    </Fragment>
                ))
            )}
            <div className={clsx(CSS_CLASSES.bookend)}>
                <h1 className={clsx(styles.bookend, CSS_CLASSES.bookendHeading)}>
                    the six degrees of
                    <br />
                    {displayNames[1]}
                </h1>
            </div>
            <div className={clsx(CSS_CLASSES.resetWrapper)}>
                <Button type="button" onClick={onReset}>
                    Check another
                </Button>
            </div>
        </div>
    );
};
