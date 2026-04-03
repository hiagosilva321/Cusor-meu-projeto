import { test, expect } from '@playwright/test';

test.describe('Página 404 - Português', () => {
  test('exibe mensagem em português', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe');
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    expect(body).toContain('404');
    expect(body).toContain('não encontrada');
  });

  test('mostra o caminho da rota tentada', async ({ page }) => {
    await page.goto('/rota-inexistente-teste');
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    expect(body).toContain('/rota-inexistente-teste');
  });

  test('tem botão para voltar ao início', async ({ page }) => {
    await page.goto('/pagina-inexistente');
    await page.waitForTimeout(1000);
    const backBtn = page.getByRole('link', { name: /início/i });
    await expect(backBtn).toBeVisible();
  });

  test('botão voltar navega para home', async ({ page }) => {
    await page.goto('/pagina-inexistente');
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: /início/i }).click();
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/\/$/);
  });

  test('não exibe texto em inglês', async ({ page }) => {
    await page.goto('/not-found-test');
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    expect(body).not.toContain('Page not found');
    expect(body).not.toContain('Return to Home');
  });
});
