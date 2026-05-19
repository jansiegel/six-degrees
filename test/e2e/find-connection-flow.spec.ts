import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';
import { BASE_PATH } from './helpers';

test.describe('Find connection flow (mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('default submit (no typing) returns a path between QOTSA and David Bowie', async ({ page }) => {
        await page.goto(BASE_PATH);

        await expect(page.getByRole('button', { name: /find the connection/i })).toBeEnabled();
        await page.getByRole('button', { name: /find the connection/i }).click();

        await expect(page.getByRole('button', { name: /check another/i })).toBeVisible({ timeout: 1_000 });
        await expect(page.getByText(/queens of the stone age/i).first()).toBeVisible();
        await expect(page.getByText(/david bowie/i).first()).toBeVisible();
    });

    test('check-another resets to the search panel', async ({ page }) => {
        await page.goto(BASE_PATH);
        await page.getByRole('button', { name: /find the connection/i }).click();
        await page.getByRole('button', { name: /check another/i }).click();

        await expect(page.getByRole('button', { name: /find the connection/i })).toBeVisible();
    });
});
