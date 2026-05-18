import { test, expect, type Page, type Locator } from '@playwright/test';
import { setupApiMocks } from './fixtures';

async function scrollInputToTop(page: Page, input: Locator): Promise<void> {
    await input.evaluate((el) => el.scrollIntoView({ block: 'start' }));
}

async function dismissDropdowns(page: Page): Promise<void> {
    await page.keyboard.press('Escape');
}

test.describe('Find connection flow (mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('default submit (no typing) returns a path between QOTSA and David Bowie', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('button', { name: /find the connection/i })).toBeEnabled();
        await page.getByRole('button', { name: /find the connection/i }).click();

        await expect(page.getByRole('button', { name: /check another/i })).toBeVisible({ timeout: 1_000 });
        await expect(page.getByText(/queens of the stone age/i).first()).toBeVisible();
        await expect(page.getByText(/david bowie/i).first()).toBeVisible();
    });

    test('check-another resets to the search panel', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /find the connection/i }).click();
        await page.getByRole('button', { name: /check another/i }).click();

        await expect(page.getByRole('button', { name: /find the connection/i })).toBeVisible();
    });
});

test.describe('SearchBar dropdown (mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('dropdown opens after typing in both inputs (debounced)', async ({ page }) => {
        await page.goto('/');

        const firstInput = page.getByLabel(/first artist/i);
        const secondInput = page.getByLabel(/second artist/i);

        await firstInput.pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i })).toBeVisible({ timeout: 1_000 });

        await secondInput.pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i }).nth(1)).toBeVisible({ timeout: 1_000 });
    });

    test('selecting a suggestion fills the input with the artist name', async ({ page }) => {
        await page.goto('/');

        const firstInput = page.getByLabel(/first artist/i);

        await firstInput.pressSequentially('queens of the stone', { delay: 30 });
        await page.getByRole('button', { name: /queens of the stone age/i }).first().click();

        await expect(firstInput).toHaveValue('Queens of the Stone Age');
    });

    test('submit with both inputs typed (no dropdown selection) passes their values to results', async ({ page }) => {
        await page.goto('/');

        await page.getByLabel(/first artist/i).pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i })).toBeVisible({ timeout: 1_000 });

        await page.getByLabel(/second artist/i).pressSequentially('david bowie', { delay: 30 });
        await expect(page.getByRole('button', { name: /david bowie english/i })).toBeVisible({ timeout: 1_000 });

        await dismissDropdowns(page);
        await expect(page.getByRole('button', { name: /david bowie english/i })).not.toBeVisible();

        await page.getByRole('button', { name: /find the connection/i }).click();

        await expect(page.getByRole('button', { name: /check another/i })).toBeVisible({ timeout: 1_000 });
        await expect(page.getByText(/queens of the stone age/i).first()).toBeVisible();
        await expect(page.getByText(/david bowie/i).first()).toBeVisible();
    });

    test('submit with one input typed and one default passes both values to results', async ({ page }) => {
        await page.goto('/');

        await page.getByLabel(/first artist/i).pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i })).toBeVisible({ timeout: 1_000 });

        await dismissDropdowns(page);

        await page.getByRole('button', { name: /find the connection/i }).click();

        await expect(page.getByRole('button', { name: /check another/i })).toBeVisible({ timeout: 1_000 });
        await expect(page.getByText(/queens of the stone age/i).first()).toBeVisible();
        await expect(page.getByText(/david bowie/i).first()).toBeVisible();
    });
});

test.describe('SearchBar dropdown direction (mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('dropdown opens downward when input is near the top of the viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 1000 });
        await page.goto('/');

        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(page, firstInput);
        await firstInput.pressSequentially('queens of the stone', { delay: 30 });

        const suggestion = page.getByRole('button', { name: /queens of the stone age/i });

        await expect(suggestion).toBeVisible({ timeout: 1_000 });

        const inputBox = await firstInput.boundingBox();
        const suggestionBox = await suggestion.boundingBox();

        expect(inputBox).not.toBeNull();
        expect(suggestionBox).not.toBeNull();
        expect(suggestionBox!.y).toBeGreaterThan(inputBox!.y);
    });

    test('dropdown opens upward when input is near the bottom of the viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 600 });
        await page.goto('/');

        const firstInput = page.getByLabel(/first artist/i);

        await firstInput.evaluate((el) => el.scrollIntoView({ block: 'end' }));
        await firstInput.pressSequentially('queens of the stone', { delay: 30 });

        const suggestion = page.getByRole('button', { name: /queens of the stone age/i });

        await expect(suggestion).toBeVisible({ timeout: 1_000 });

        const inputBox = await firstInput.boundingBox();
        const suggestionBox = await suggestion.boundingBox();

        expect(inputBox).not.toBeNull();
        expect(suggestionBox).not.toBeNull();
        expect(suggestionBox!.y).toBeLessThan(inputBox!.y);
    });
});

test.describe('SearchBar keyboard navigation (dropdown below input, mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        await page.setViewportSize({ width: 1280, height: 1000 });
        await page.goto('/');
    });

    test('ArrowDown from input moves focus to the first suggestion', async ({ page }) => {
        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(page, firstInput);
        await firstInput.pressSequentially('david bow', { delay: 30 });

        const suggestion = page.getByRole('button', { name: /david bowie english/i });

        await expect(suggestion).toBeVisible({ timeout: 1_000 });

        await firstInput.press('ArrowDown');

        await expect(suggestion).toBeFocused();
    });

    test('ArrowDown / ArrowUp cycle through suggestions', async ({ page }) => {
        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(page, firstInput);
        await firstInput.pressSequentially('david bow', { delay: 30 });
        await expect(page.getByRole('button', { name: /david bowie english/i })).toBeVisible({ timeout: 1_000 });

        await firstInput.press('ArrowDown');
        await expect(page.getByRole('button', { name: /david bowie english/i })).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('button', { name: /david bowie band/i })).toBeFocused();

        await page.keyboard.press('ArrowUp');
        await expect(page.getByRole('button', { name: /david bowie english/i })).toBeFocused();
    });

    test('Enter on a focused suggestion selects it and fills the input', async ({ page }) => {
        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(page, firstInput);
        await firstInput.pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i })).toBeVisible({ timeout: 1_000 });

        await firstInput.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(firstInput).toHaveValue('Queens of the Stone Age');
    });

    test('Escape from inside the dropdown returns focus to the input and closes it', async ({ page }) => {
        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(page, firstInput);
        await firstInput.pressSequentially('david bow', { delay: 30 });
        await expect(page.getByRole('button', { name: /david bowie english/i })).toBeVisible({ timeout: 1_000 });

        await firstInput.press('ArrowDown');
        await page.keyboard.press('Escape');

        await expect(firstInput).toBeFocused();
        await expect(page.getByRole('button', { name: /david bowie english/i })).not.toBeVisible();
    });
});

test.describe('API contract (real backend)', () => {
    test('GET /api/paths rejects invalid mbid with 400', async ({ request }) => {
        const response = await request.get('/api/paths?from=not-a-uuid&to=also-not');

        expect(response.status()).toBe(400);
        const body = await response.json();

        expect(body.error).toBe('invalid_mbid');
    });

    test('GET /api/artists requires q parameter', async ({ request }) => {
        const response = await request.get('/api/artists');

        expect(response.status()).toBe(400);
        const body = await response.json();

        expect(body.error).toBe('missing_query');
    });

    test('GET /api/artists returns prefix matches', async ({ request }) => {
        const response = await request.get('/api/artists?q=queens');

        expect(response.ok()).toBe(true);
        const body = await response.json();

        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
    });
});
