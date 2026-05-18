import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { SearchBar } from '../SearchBar';
import type { Artist } from '@/lib/db/types';

const QOTSA: Artist = {
    mbid: 'b-qotsa',
    name: 'Queens of the Stone Age',
    type: 2,
    disambiguation: null,
};

const EAGLES: Artist = {
    mbid: 'b-eagles',
    name: 'Eagles of Death Metal',
    type: 2,
    disambiguation: null,
};

type HarnessProps = {
    initialValue?: string;
    suggestions?: Artist[];
    onSelect?: (artist: Artist) => void;
};

function SearchBarHarness({ initialValue = '', suggestions, onSelect }: HarnessProps) {
    const [value, setValue] = useState(initialValue);

    return (
        <SearchBar
            label="Artist:"
            value={value}
            onChange={setValue}
            onSelect={onSelect}
            suggestions={suggestions}
        />
    );
}

describe('SearchBar', () => {
    it('renders the label and input', () => {
        render(<SearchBarHarness />);

        expect(screen.getByLabelText(/artist/i)).toBeInTheDocument();
    });

    it('updates the value when user types', async () => {
        const user = userEvent.setup();

        render(<SearchBarHarness />);

        const input = screen.getByLabelText(/artist/i);

        await user.type(input, 'queens');

        expect(input).toHaveValue('queens');
    });

    it('selects the first suggestion when user presses Enter', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        render(<SearchBarHarness suggestions={[QOTSA, EAGLES]} onSelect={onSelect} />);

        const input = screen.getByLabelText(/artist/i);

        await user.type(input, 'q');
        await user.keyboard('{Enter}');

        expect(onSelect).toHaveBeenCalledWith(QOTSA);
    });

    it('hides suggestions after Escape', async () => {
        const user = userEvent.setup();

        render(<SearchBarHarness suggestions={[QOTSA]} />);

        const input = screen.getByLabelText(/artist/i);

        await user.type(input, 'q');
        expect(screen.queryByText('Queens of the Stone Age')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByText('Queens of the Stone Age')).not.toBeInTheDocument();
    });
});
