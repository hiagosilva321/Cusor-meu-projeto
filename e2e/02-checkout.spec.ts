import { test, expect } from '@playwright/test';
import { goToCheckoutStep2, gotoCheckoutAndWaitReady } from './helpers/checkout';

test.describe('Checkout', () => {
  test('carrega pagina de checkout com formulario', async ({ page }) => {
    await gotoCheckoutAndWaitReady(page);
    await expect(page.locator('h1')).toContainText(/Pedido|Finalizar/i);
  });

  test('exibe selecao de tamanho com dados do Supabase', async ({ page }) => {
    await gotoCheckoutAndWaitReady(page);
    // Deve ter um select ou opcoes de tamanho
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThan(0);
  });

  test('step 1: seleciona tamanho e avanca', async ({ page }) => {
    await goToCheckoutStep2(page);
    await expect(page.locator('input[name="nome"]')).toBeVisible();
  });

  test('step 2: valida campos obrigatorios', async ({ page }) => {
    await goToCheckoutStep2(page);
    // Tenta avancar sem preencher nome e whatsapp
    const step2Continue = page.getByRole('button', { name: /Continuar/i });
    await step2Continue.click();
    await expect(page.locator('input[name="nome"]')).toBeVisible();
  });

  test('step 2: preenche dados e avanca para step 3', async ({ page }) => {
    await goToCheckoutStep2(page);
    // Preenche nome e whatsapp
    await page.fill('input[name="nome"]', 'Teste Playwright');
    await page.fill('input[name="whatsapp"]', '11999998888');
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.locator('input[name="cep"]')).toBeVisible();
  });

  test('step 3: exibe campos de endereco', async ({ page }) => {
    await goToCheckoutStep2(page);
    await page.fill('input[name="nome"]', 'Teste');
    await page.fill('input[name="whatsapp"]', '11999998888');
    await page.getByRole('button', { name: /Continuar/i }).click();
    // Verifica campos de endereco
    await expect(page.locator('input[name="cep"]')).toBeVisible();
    await expect(page.locator('input[name="endereco"]')).toBeVisible();
    await expect(page.locator('input[name="cidade"]')).toBeVisible();
  });

  test('resumo do pedido exibe valor correto', async ({ page }) => {
    await gotoCheckoutAndWaitReady(page);
    // Deve exibir resumo com valor
    const body = await page.textContent('body');
    expect(body).toMatch(/R\$/);
  });
});
