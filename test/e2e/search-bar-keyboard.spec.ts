import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';
import { BASE_PATH, scrollInputToTop } from './helpers';

test.describe('SearchBar keyboard navigation — dropdown below input (mocked API)', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        await page.setViewportSize({ width: 1280, height: 1000 });
        await page.goto(BASE_PATH);
    });

    test('ArrowDown from input moves focus to the first suggestion', async ({ page }) => {
        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(firstInput);
        await firstInput.pressSequentially('david bow', { delay: 30 });

        const suggestion = page.getByRole('button', { name: /david bowie english/i });

        await expect(suggestion).toBeVisible({ timeout: 1_000 });

        await firstInput.press('ArrowDown');

        await expect(suggestion).toBeFocused();
    });

    test('ArrowDown / ArrowUp cycle through suggestions', async ({ page }) => {
        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(firstInput);
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

        await scrollInputToTop(firstInput);
        await firstInput.pressSequentially('queens of the stone', { delay: 30 });
        await expect(page.getByRole('button', { name: /queens of the stone age/i })).toBeVisible({ timeout: 1_000 });

        await firstInput.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(firstInput).toHaveValue('Queens of the Stone Age');
    });

    test('Escape from inside the dropdown returns focus to the input and closes it', async ({ page }) => {
        const firstInput = page.getByLabel(/first artist/i);

        await scrollInputToTop(firstInput);
        await firstInput.pressSequentially('david bow', { delay: 30 });
        await expect(page.getByRole('button', { name: /david bowie english/i })).toBeVisible({ timeout: 1_000 });

        await firstInput.press('ArrowDown');
        await page.keyboard.press('Escape');

        await expect(firstInput).toBeFocused();
        await expect(page.getByRole('button', { name: /david bowie english/i })).not.toBeVisible();
    });
});
