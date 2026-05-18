'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDoubleDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Outcome } from '../MainPanel';
import { Button } from '@/components/Button/Button';
import { buildPathEntries } from './buildPathEntries';
import type { BandRole } from './buildPathEntries';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
    outcome: Outcome;
    onReset: () => void;
    className?: string;
};

const BLOCK_CLASSES = [
    'text-center',
    'p-1',
    'w-full',
    'text-page-bg',
];

const BOOKEND_CLASSES = [
    ...BLOCK_CLASSES,
    'bg-poster-bg-orange',
    'text-poster-font',
    'font-(family-name:--font-young-serif,serif)',
    'leading-tight',
];

const ENTRY_CLASSES = [
    ...BLOCK_CLASSES,
    'bg-poster-light-bg',
    'px-1',
];

const BOOKEND_HEADING_CLASSES = [
    'uppercase',
];

const ENTRY_HEADING_CLASSES = [
    'text-3xl',
    'font-extrabold',
    'py-3',
    'uppercase',
];

const BAND_ROLE_ITEM_CLASSES = [
    'flex-1',
    'text-center',
    'border',
    'border-solid',
    'border-page-bg/30',
    'p-1',
    'leading-tight',
    'transition-colors',
];

const BAND_ROLES_LIST_CLASSES = [
    'flex',
    'flex-row',
    'gap-1',
];

const CHEVRON_CLASSES = [
    'h-6',
    'w-6',
    'text-poster-light-bg',
];

const PANEL_TEXT_CLASSES = [
    'font-(family-name:--font-dm-sans,sans-serif)',
];

const RESET_WRAPPER_CLASSES = [
    'mt-12',
    'w-1/2',
];

type BandRoleItemProps = {
    bandRole: BandRole;
    isHovered: boolean;
    onHover: (artistName: string | null) => void;
};

const BandRoleItem = ({ bandRole, isHovered, onHover }: BandRoleItemProps) => (
    <li
        onMouseEnter={() => onHover(bandRole.name)}
        onMouseLeave={() => onHover(null)}
        className={clsx(BAND_ROLE_ITEM_CLASSES, isHovered && 'bg-poster-bg-orange/10')}
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

    const entries = useMemo(
        () => path !== null ? buildPathEntries(path, frontmen) : [],
        [path, frontmen],
    );

    return (
        <div className={clsx(className, PANEL_TEXT_CLASSES)}>
            <div className={clsx(BOOKEND_CLASSES)}>
                <h1 className={clsx(styles.bookend, BOOKEND_HEADING_CLASSES)}>
                    the six degrees of<br />{displayNames[0]}
                </h1>
            </div>
            {path === null ? (
                <div className={clsx(ENTRY_CLASSES)}>
                    <h2 className={clsx(ENTRY_HEADING_CLASSES)}>No connection found within 7 hops.</h2>
                </div>
            ) : (
                entries.map((entry, index) => (
                    <Fragment key={entry.mbid}>
                        <div className={clsx(ENTRY_CLASSES)}>
                            <h2 className={clsx(ENTRY_HEADING_CLASSES)}>{entry.name}</h2>
                            <ul className={clsx(BAND_ROLES_LIST_CLASSES)}>
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
                        {index < entries.length - 1 && (
                            <ChevronDoubleDownIcon className={clsx(CHEVRON_CLASSES)} />
                        )}
                    </Fragment>
                ))
            )}
            <div className={clsx(BOOKEND_CLASSES)}>
                <h1 className={clsx(styles.bookend, BOOKEND_HEADING_CLASSES)}>
                    the six degrees of<br />{displayNames[1]}
                </h1>
            </div>
            <div className={clsx(RESET_WRAPPER_CLASSES)}>
                <Button type="button" onClick={onReset}>
                    Check another
                </Button>
            </div>
        </div>
    );
};
