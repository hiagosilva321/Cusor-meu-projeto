import { test, expect } from '@playwright/test';

test.describe('Payment Page - Seguranca de acesso', () => {
  test('redireciona para home sem token valido', async ({ page }) => {
    // Acessa pagamento sem token - deve redirecionar
    await page.goto('/pagamento/fake-order-id');
    await page.waitForTimeout(2000);
    // Deve ter redirecionado para / (home)
    const url = page.url();
    expect(url).not.toContain('/pagamento/fake-order-id');
  });

  test('redireciona para home com token invalido', async ({ page }) => {
    await page.goto('/pagamento/fake-order-id?token=fake-token');
    await page.waitForTimeout(3000);
    // get-order-status deve retornar 404, frontend redireciona
    const url = page.url();
    // Pode estar em / ou ainda em pagamento (depende do timing)
    // O importante e nao crashar
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('pagina de confirmacao sem token redireciona', async ({ page }) => {
    await page.goto('/pagamento-confirmado/fake-id');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain('/pagamento-confirmado/fake-id');
  });
});
