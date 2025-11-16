import { expect, test, Page } from '@playwright/test';

const STORAGE_KEY = 'galxi-graph-data';
const FALLBACK_BASE_URL = 'http://127.0.0.1:4173/';

const waitForAutosave = async (page: Page) => {
  await page.waitForTimeout(1600);
};

const resolveAppUrl = (baseURL?: string) => {
  if (!baseURL) {
    return FALLBACK_BASE_URL;
  }
  return baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
};

test.describe('Galxi canvas smoke', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(resolveAppUrl(baseURL));
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  });

  test('creates and persists a node', async ({ page }) => {
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
  });
});

