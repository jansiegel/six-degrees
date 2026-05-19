import type { Locator, Page } from '@playwright/test';

export const BASE_PATH = '/six-degrees';

export async function scrollInputToTop(input: Locator): Promise<void> {
    await input.evaluate((el) => el.scrollIntoView({ block: 'start' }));
}

export async function dismissDropdowns(page: Page): Promise<void> {
    await page.keyboard.press('Escape');
}
