import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest): NextResponse {
    if (process.env.NODE_ENV !== 'production') {
        return NextResponse.next();
    }

    const secFetchSite = request.headers.get('sec-fetch-site');

    if (secFetchSite !== 'same-origin') {
        return new NextResponse(null, { status: 403 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
