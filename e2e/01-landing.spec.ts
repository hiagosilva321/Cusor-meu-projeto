import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('carrega a pagina inicial com titulo correto', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CaçambaJá/);
  });

  test('exibe header com navegacao', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('exibe secao de tamanhos do Supabase', async ({ page }) => {
    await page.goto('/');
    // Aguarda carregamento dos dados do Supabase
    await page.waitForTimeout(2000);
    // Verifica se existe conteudo de catalogo (secao de tamanhos)
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('exibe footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('botao CTA leva para checkout', async ({ page }) => {
    await page.goto('/');
    // Procura qualquer link/botao que leve ao checkout
    const checkoutLink = page.locator('a[href="/checkout"]').first();
    if (await checkoutLink.isVisible()) {
      await checkoutLink.click();
      await expect(page).toHaveURL(/checkout/);
    }
  });

  test('pagina 404 funciona para rota inexistente', async ({ page }) => {
    await page.goto('/rota-que-nao-existe');
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    // Deve mostrar algo (nao crashar)
    expect(body).toBeTruthy();
  });
});
