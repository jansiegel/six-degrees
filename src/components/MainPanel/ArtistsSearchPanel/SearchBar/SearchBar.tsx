'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Artist } from '@/lib/db/types';
import { SuggestionsList } from './SuggestionsList/SuggestionsList';

type DropdownDirection = 'below' | 'above';

type SearchBarProps = {
    label?: string;
    placeholder?: string;
    className?: string;
    value: string;
    onChange: (query: string) => void;
    onSelect?: (artist: Artist) => void;
    suggestions?: Artist[];
};

const CSS_CLASSES = {
    wrapper: [
        'flex',
        'flex-col',
        'items-center',
        'bg-poster-light-bg',
        'w-full',
        'md:w-1/2',
    ],
    label: [
        'text-base',
        'font-bold',
        'uppercase',
        'font-(family-name:--font-dm-sans, sans-serif)',
        'text-center',
        'text-page-bg',
        'mt-1',
    ],
    input: [
        'input',
        'w-full',
        'focus-within:outline-0',
        'bg-poster-light-bg',
        'text-page-bg',
        'rounded-none',
    ],
    inputWrapper: [
        'relative',
        'inline-block',
        'w-11/12',
        'my-3',
    ],
};

export const SearchBar = ({
    label,
    placeholder,
    value,
    onChange,
    onSelect,
    className,
    suggestions,
}: SearchBarProps) => {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isDismissed, setIsDismissed] = useState(true);
    const [dropdownDirection, setDropdownDirection] = useState<DropdownDirection>('below');

    const visibleSuggestions = !isDismissed && suggestions?.length ? suggestions : null;
    const hasResults = visibleSuggestions !== null;

    useLayoutEffect(() => {
        if (!hasResults || !inputRef.current) {
            return;
        }
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        setDropdownDirection(spaceBelow >= spaceAbove ? 'below' : 'above');
    }, [hasResults]);

    const focusInput = () => inputRef.current?.focus();
    const dismissDropdown = () => setIsDismissed(true);

    const selectArtist = (artist: Artist) => {
        setIsDismissed(true);
        onSelect?.(artist);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsDismissed(true);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (visibleSuggestions !== null) {
                selectArtist(visibleSuggestions[0]);
            } else {
                setIsDismissed(true);
            }
            return;
        }
        if (!hasResults) {
            return;
        }
        const enterKey = dropdownDirection === 'below' ? 'ArrowDown' : 'ArrowUp';

        if (e.key !== enterKey) {
            return;
        }
        e.preventDefault();
        const buttons = wrapperRef.current?.querySelectorAll<HTMLButtonElement>('button');

        if (!buttons?.length) {
            return;
        }
        const target = dropdownDirection === 'below' ? buttons[0] : buttons[buttons.length - 1];

        target.focus();
    };

    return (
        <div className={clsx(CSS_CLASSES.wrapper, className)}>
            <div className="flex w-full flex-col">
                {label && (
                    <label htmlFor={inputId} className={clsx(CSS_CLASSES.label)}>
                        {label}
                    </label>
                )}
                <div className="text-center">
                    <div ref={wrapperRef} className={clsx(CSS_CLASSES.inputWrapper)}>
                        <input
                            ref={inputRef}
                            id={inputId}
                            className={clsx(CSS_CLASSES.input)}
                            type="text"
                            name="artist-search"
                            value={value}
                            onChange={(e) => {
                                setIsDismissed(false);
                                onChange(e.target.value);
                            }}
                            onKeyDown={handleInputKeyDown}
                            placeholder={placeholder}
                        />
                        {visibleSuggestions !== null && (
                            <SuggestionsList
                                suggestions={visibleSuggestions}
                                onSelect={selectArtist}
                                onReturnFocus={focusInput}
                                onDismiss={dismissDropdown}
                                direction={dropdownDirection}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
