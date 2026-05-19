import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';
import { BASE_PATH, dismissDropdowns } from './helpers';

test.describe('SearchBar dropdown — suggestions and selection (mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('dropdown opens after typing in both inputs (debounced)', async ({ page }) => {
        await page.goto(BASE_PATH);

        const firstInput = page.getByLabel(/first artist/i);
        const secondInput = page.getByLabel(/second artist/i);

        await firstInput.pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i })).toBeVisible({ timeout: 1_000 });

        await secondInput.pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i }).nth(1)).toBeVisible({ timeout: 1_000 });
    });

    test('selecting a suggestion fills the input with the artist name', async ({ page }) => {
        await page.goto(BASE_PATH);

        const firstInput = page.getByLabel(/first artist/i);

        await firstInput.pressSequentially('queens of the stone', { delay: 30 });
        await page.getByRole('button', { name: /queens of the stone age/i }).first().click();

        await expect(firstInput).toHaveValue('Queens of the Stone Age');
    });

    test('submit with both inputs typed (no dropdown selection) passes their values to results', async ({ page }) => {
        await page.goto(BASE_PATH);

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
        await page.goto(BASE_PATH);

        await page.getByLabel(/first artist/i).pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i })).toBeVisible({ timeout: 1_000 });

        await dismissDropdowns(page);

        await page.getByRole('button', { name: /find the connection/i }).click();

        await expect(page.getByRole('button', { name: /check another/i })).toBeVisible({ timeout: 1_000 });
        await expect(page.getByText(/queens of the stone age/i).first()).toBeVisible();
        await expect(page.getByText(/david bowie/i).first()).toBeVisible();
    });
});

test.describe('SearchBar dropdown — direction relative to viewport (mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('opens downward when input is near the top of the viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 1000 });
        await page.goto(BASE_PATH);

        const firstInput = page.getByLabel(/first artist/i);

        await firstInput.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await firstInput.pressSequentially('queens of the stone', { delay: 30 });

        const suggestion = page.getByRole('button', { name: /queens of the stone age/i });

        await expect(suggestion).toBeVisible({ timeout: 1_000 });

        const inputBox = await firstInput.boundingBox();
        const suggestionBox = await suggestion.boundingBox();

        expect(inputBox).not.toBeNull();
        expect(suggestionBox).not.toBeNull();
        expect(suggestionBox!.y).toBeGreaterThan(inputBox!.y);
    });

    test('opens upward when input is near the bottom of the viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 600 });
        await page.goto(BASE_PATH);

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
