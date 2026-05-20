import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { Artist } from '@/lib/db/types';

type Props = {
    suggestions: Artist[];
    onSelect: (artist: Artist) => void;
    onReturnFocus: () => void;
    onDismiss: () => void;
    direction: 'below' | 'above';
};

const CSS_CLASSES = {
    list: [
        'absolute',
        'left-0',
        'right-0',
        'z-10',
        'p-2',
        'menu',
        'rounded-none',
        'bg-poster-light-bg',
        'text-page-bg',
        'border-poster-shadow',
        'border',
        'shadow-[0.5em_0.5em_0_0_color-mix(in_srgb,var(--color-page-bg)_30%,transparent)]',
    ],
    directionBelow: [
        'top-full',
        'mt-1',
    ],
    directionAbove: [
        'bottom-full',
        'mb-1',
    ],
    disambiguation: [
        'text-xs',
        'opacity-60',
    ],
};

export const SuggestionsList = ({ suggestions, onSelect, onReturnFocus, onDismiss, direction }: Props) => {
    const ulRef = useRef<HTMLUListElement>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const lastIndex = suggestions.length - 1;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const parent = ulRef.current?.parentElement;

            if (parent?.contains(e.target as Node)) {
                return;
            }
            onDismiss();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onDismiss]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onReturnFocus();
            onDismiss();
            return;
        }
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
            return;
        }
        e.preventDefault();

        if (direction === 'below') {
            if (e.key === 'ArrowDown') {
                buttonRefs.current[index + 1]?.focus();
            } else if (index === 0) {
                onReturnFocus();
            } else {
                buttonRefs.current[index - 1]?.focus();
            }
        } else {
            if (e.key === 'ArrowUp') {
                buttonRefs.current[index - 1]?.focus();
            } else if (index === lastIndex) {
                onReturnFocus();
            } else {
                buttonRefs.current[index + 1]?.focus();
            }
        }
    };

    return (
        <ul
            ref={ulRef}
            className={clsx(
                CSS_CLASSES.list,
                direction === 'below' ? CSS_CLASSES.directionBelow : CSS_CLASSES.directionAbove,
            )}
        >
            {suggestions.map((artist, index) => (
                <li key={artist.mbid}>
                    <button
                        ref={(el) => {
                            buttonRefs.current[index] = el;
                        }}
                        type="button"
                        onClick={() => onSelect(artist)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                    >
                        <span>{artist.name}</span>
                        {artist.disambiguation && (
                            <span className={clsx(CSS_CLASSES.disambiguation)}>{artist.disambiguation}</span>
                        )}
                    </button>
                </li>
            ))}
        </ul>
    );
};
