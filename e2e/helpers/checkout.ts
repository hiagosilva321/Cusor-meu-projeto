import { expect, type Page } from '@playwright/test';

export async function gotoCheckoutAndWaitReady(page: Page) {
  await page.goto('/checkout');
  const sizeOptions = page.locator('select[name="tamanho"] option');
  await expect.poll(async () => sizeOptions.count(), { timeout: 10000 }).toBeGreaterThan(0);
  await expect(page.locator('select[name="tamanho"]')).not.toBeDisabled();
}

export async function goToCheckoutStep2(page: Page) {
  await gotoCheckoutAndWaitReady(page);
  await page.getByRole('button', { name: /Continuar/i }).click();
  await expect(page.locator('input[name="nome"]')).toBeVisible();
}
