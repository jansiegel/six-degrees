const UMAMI_SRC = 'https://cloud.umami.is/script.js';

export function Analytics() {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const enabled = process.env.NODE_ENV === 'production' && Boolean(websiteId);

    if (!enabled) {
        return null;
    }

    return (
        <script
            defer
            src={UMAMI_SRC}
            data-website-id={websiteId}
        />
    );
}
