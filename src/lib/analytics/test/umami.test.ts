import { describe, it, expect, vi, afterEach } from 'vitest';
import { trackEvent } from '../umami';

afterEach(() => {
    delete (window as { umami?: unknown }).umami;
});

describe('trackEvent', () => {
    it('is a no-op when window.umami is undefined', () => {
        expect(() => trackEvent({
            name: 'search_submitted',
            data: {
                artist_a_name: 'Radiohead',
                artist_a_mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
                artist_b_name: 'Thom Yorke',
                artist_b_mbid: 'a8fa58f8-d40a-4d6b-b4d0-39d8c7e10b34',
            },
        })).not.toThrow();
    });

    it('forwards the event to window.umami.track with name and data', () => {
        const track = vi.fn();

        (window as { umami?: { track: typeof track } }).umami = { track };

        trackEvent({
            name: 'search_submitted',
            data: {
                artist_a_name: 'Radiohead',
                artist_a_mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
                artist_b_name: 'Thom Yorke',
                artist_b_mbid: 'a8fa58f8-d40a-4d6b-b4d0-39d8c7e10b34',
            },
        });

        expect(track).toHaveBeenCalledTimes(1);
        expect(track).toHaveBeenCalledWith('search_submitted', {
            artist_a_name: 'Radiohead',
            artist_a_mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711',
            artist_b_name: 'Thom Yorke',
            artist_b_mbid: 'a8fa58f8-d40a-4d6b-b4d0-39d8c7e10b34',
        });
    });

    it('swallows errors thrown by window.umami.track', () => {
        (window as { umami?: { track: () => void } }).umami = {
            track: () => {
                throw new Error('umami exploded');
            },
        };

        expect(() => trackEvent({
            name: 'search_submitted',
            data: {
                artist_a_name: 'A',
                artist_a_mbid: 'a',
                artist_b_name: 'B',
                artist_b_mbid: 'b',
            },
        })).not.toThrow();
    });
});
