import Script from 'next/script';

const UMAMI_SRC = 'https://cloud.umami.is/script.js';

export function Analytics() {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const enabled = process.env.NODE_ENV === 'production' && Boolean(websiteId);

    if (!enabled) {
        return null;
    }

    return (
        <Script
            src={UMAMI_SRC}
            strategy="afterInteractive"
            data-website-id={websiteId}
            defer
        />
    );
}
