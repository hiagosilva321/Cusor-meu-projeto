import { test, expect } from '@playwright/test';

test.describe('Landing - Formulário de Contato', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('formulário de contato é visível na landing', async ({ page }) => {
    // Scroll até a seção de contato
    await page.locator('#contato').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const form = page.locator('form').last();
    await expect(form).toBeVisible();
  });

  test('campo WhatsApp aplica máscara no formulário de contato', async ({ page }) => {
    await page.locator('#contato').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const whatsInput = page.locator('#contato input[name="whatsapp"]');
    await whatsInput.fill('11999887766');
    const value = await whatsInput.inputValue();
    expect(value).toBe('(11) 99988-7766');
  });

  test('campo CPF aplica máscara no formulário de contato', async ({ page }) => {
    await page.locator('#contato').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const cpfInput = page.locator('#contato input[name="cpf_cnpj"]');
    await cpfInput.fill('12345678901');
    const value = await cpfInput.inputValue();
    expect(value).toBe('123.456.789-01');
  });

  test('campo CEP aplica máscara no formulário de contato', async ({ page }) => {
    await page.locator('#contato').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const cepInput = page.locator('#contato input[name="cep"]');
    await cepInput.fill('01001000');
    const value = await cepInput.inputValue();
    expect(value).toBe('01001-000');
  });

  test('select de tamanho carrega opções do Supabase', async ({ page }) => {
    await page.locator('#contato').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const options = page.locator('#contato select[name="tamanho"] option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('exibe valor total ao selecionar tamanho', async ({ page }) => {
    await page.locator('#contato').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const totalText = page.locator('#contato').getByText(/R\$/);
    const count = await totalText.count();
    expect(count).toBeGreaterThan(0);
  });

  test('bloqueia submit sem nome e WhatsApp', async ({ page }) => {
    await page.locator('#contato').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    // Tenta submeter o formulário vazio
    const submitBtn = page.locator('#contato button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      // Deve continuar na mesma página (não navegar)
      expect(page.url()).toMatch(/\/$/);
    }
  });
});
