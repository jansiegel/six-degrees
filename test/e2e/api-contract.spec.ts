import { test, expect } from '@playwright/test';
import { BASE_PATH } from './helpers';

test.describe('API contract (real backend)', () => {
    test('GET /api/paths rejects invalid mbid with 400', async ({ request }) => {
        const response = await request.get(`${BASE_PATH}/api/paths?from=not-a-uuid&to=also-not`);

        expect(response.status()).toBe(400);
        const body = await response.json();

        expect(body.error).toBe('invalid_mbid');
    });

    test('GET /api/artists requires q parameter', async ({ request }) => {
        const response = await request.get(`${BASE_PATH}/api/artists`);

        expect(response.status()).toBe(400);
        const body = await response.json();

        expect(body.error).toBe('missing_query');
    });

    test('GET /api/artists returns prefix matches', async ({ request }) => {
        const response = await request.get(`${BASE_PATH}/api/artists?q=queens`);

        expect(response.ok()).toBe(true);
        const body = await response.json();

        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
    });
});
