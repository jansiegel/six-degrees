'use client';

import { useState, useMemo } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { SearchBar } from './SearchBar/SearchBar';
import { useArtistSearch } from '@/hooks/useArtistSearch';
import { useFrontman } from '@/hooks/useFrontman';
import { useFindPath } from '@/hooks/useFindPath';
import { useDebounce } from '@/hooks/useDebounce';
import type { Artist, Frontman, PathResult } from '@/lib/db/types';
import { Poster } from './Poster/Poster';
import { InteractiveLabel } from './InteractiveLabel/InteractiveLabel';
import { Button } from '@/components/Button/Button';

const SEARCH_BAR_ROW_CLASSES = [
    'flex',
    'flex-col',
    'md:flex-row',
    'w-full',
    'gap-1',
    'md:gap-1',
];

const SUBMIT_WRAPPER_CLASSES = [
    'flex-1',
    'flex',
    'items-center',
    'justify-center',
    'w-full',
];

const SPINNER_CLASSES = [
    'h-5',
    'w-5',
    'mr-2',
    'align-middle',
    'inline',
    'animate-spin',
];

type Props = {
    onResult: (
        path: PathResult | null,
        displayNames: [string, string],
        frontmen: [Frontman | null, Frontman | null],
    ) => void;
    className?: string;
};

const PLACEHOLDER_ARTISTS: [Artist, Artist] = [
    {
        mbid: '7dc8f5bd-9d0b-4087-9f73-dc164950bbd8',
        name: 'Queens of the Stone Age',
        type: 2,
        disambiguation: null,
    },
    {
        mbid: '5441c29d-3602-4898-b1a1-b77fa23b8e50',
        name: 'David Bowie',
        type: 1,
        disambiguation: 'English singer-songwriter',
    },
];

export const ArtistsSearchPanel = ({ onResult, className }: Props) => {
    type ArtistSlot = { input: string; selected: Artist | null };

    const [first, setFirst] = useState<ArtistSlot>({ input: '', selected: null });
    const [second, setSecond] = useState<ArtistSlot>({ input: '', selected: null });
    const [lastTouched, setLastTouched] = useState<0 | 1 | null>(null);

    const firstSearchResults = useArtistSearch(useDebounce(first.input, 500));
    const secondSearchResults = useArtistSearch(useDebounce(second.input, 500));

    const firstArtist = first.input === ''
        ? PLACEHOLDER_ARTISTS[0]
        : first.selected ?? firstSearchResults.data?.[0] ?? null;
    const secondArtist = second.input === ''
        ? PLACEHOLDER_ARTISTS[1]
        : second.selected ?? secondSearchResults.data?.[0] ?? null;

    const firstFrontmanSearchResult = useFrontman(firstArtist?.mbid ?? null);
    const secondFrontmanSearchResult = useFrontman(secondArtist?.mbid ?? null);

    const firstDisplayName = firstFrontmanSearchResult.data?.artist.name ?? firstArtist?.name ?? first.input;
    const secondDisplayName = secondFrontmanSearchResult.data?.artist.name ?? secondArtist?.name ?? second.input;
    const displayNames = useMemo<[string, string]>(
        () => [firstDisplayName, secondDisplayName],
        [firstDisplayName, secondDisplayName],
    );

    const frontmen = useMemo<[Frontman | null, Frontman | null]>(
        () => [firstFrontmanSearchResult.data ?? null, secondFrontmanSearchResult.data ?? null],
        [firstFrontmanSearchResult.data, secondFrontmanSearchResult.data],
    );

    const activeFrontmanSearchResult =
        lastTouched === 0 ? firstFrontmanSearchResult
        : lastTouched === 1 ? secondFrontmanSearchResult
        : null;
    const activeArtist = lastTouched === 0 ? firstArtist : lastTouched === 1 ? secondArtist : null;
    const posterName = activeFrontmanSearchResult?.isSuccess
        ? (activeFrontmanSearchResult.data?.artist.name ?? activeArtist?.name)
        : undefined;

    const pathSearch = useFindPath();

    const handleFirstChange = (v: string) => {
        setFirst({ input: v, selected: null });
    };
    const handleSecondChange = (v: string) => {
        setSecond({ input: v, selected: null });
    };
    const handleFirstSelect = (a: Artist) => {
        setFirst({ input: a.name, selected: a });
        setLastTouched(0);
    };
    const handleSecondSelect = (a: Artist) => {
        setSecond({ input: a.name, selected: a });
        setLastTouched(1);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!firstArtist || !secondArtist) {
            return;
        }
        if (!first.selected) {
            handleFirstSelect(firstArtist);
        }
        if (!second.selected) {
            handleSecondSelect(secondArtist);
        }

        pathSearch.mutate(
            { from: firstArtist.mbid, to: secondArtist.mbid },
            {
                onSuccess: (data) => {
                    onResult(data, displayNames, frontmen);
                },
            },
        );
    };

    return (
        <form onSubmit={handleSubmit} className={className}>
            <Poster>
                <InteractiveLabel injectedName={posterName} />
            </Poster>
            <div className={clsx(SEARCH_BAR_ROW_CLASSES)}>
                <SearchBar
                    label="First artist:"
                    value={first.input}
                    onChange={handleFirstChange}
                    onSelect={handleFirstSelect}
                    placeholder={`${PLACEHOLDER_ARTISTS[0].name}...`}
                    suggestions={firstSearchResults.data}
                />
                <SearchBar
                    label="Second artist:"
                    value={second.input}
                    onChange={handleSecondChange}
                    onSelect={handleSecondSelect}
                    placeholder={`${PLACEHOLDER_ARTISTS[1].name}...`}
                    suggestions={secondSearchResults.data}
                />
            </div>
            <div className={clsx(SUBMIT_WRAPPER_CLASSES)}>
                <Button type="submit" disabled={!firstArtist || !secondArtist || pathSearch.isPending}>
                    {pathSearch.isPending && <ArrowPathIcon className={clsx(SPINNER_CLASSES)} />}
                    {pathSearch.isPending ? 'Searching…' : 'Find the connection'}
                </Button>
            </div>
            {pathSearch.isError && <p>Error: {pathSearch.error.message}</p>}
        </form>
    );
};
