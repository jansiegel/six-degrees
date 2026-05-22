type SearchSubmitted = {
    name: 'search_submitted';
    data: {
        artist_a_name: string;
        artist_a_mbid: string;
        artist_b_name: string;
        artist_b_mbid: string;
    };
};

export type TrackedEvent = SearchSubmitted;

declare global {
    interface Window {
        umami?: {
            track: (name: string, data?: Record<string, unknown>) => void;
        };
    }
}

export function trackEvent(event: TrackedEvent): void {
    if (typeof window === 'undefined') {
        return;
    }

    const umami = window.umami;

    if (!umami) {
        return;
    }

    try {
        umami.track(event.name, event.data);
    } catch {
        // Tracking must never break the calling flow.
    }
}
