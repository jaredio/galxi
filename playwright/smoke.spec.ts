import { expect, test, Page } from '@playwright/test';

const STORAGE_KEY = 'galxi-graph-data';

const waitForAutosave = async (page: Page) => {
  await page.waitForTimeout(1600);
};

test.describe('Galxi canvas smoke', () => {
  test('creates and persists a node', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);

    await page.getByRole('button', { name: /^Node$/ }).click();

    const panel = page.locator('.node-editor');
    await panel.getByLabel('Label').fill('Playwright Node');
    await panel.getByRole('button', { name: 'Continue' }).click();
    await panel.getByRole('button', { name: 'Create Node' }).click();
    await panel.waitFor({ state: 'detached' });

    await waitForAutosave(page);

    const saved = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Playwright Node' })])
    );

    await page.reload();
    await expect(
      page.locator('text.node-label', { hasText: 'Playwright Node' }).first()
    ).toBeVisible();

    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  });
});

