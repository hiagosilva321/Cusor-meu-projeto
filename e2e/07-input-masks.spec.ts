import { test, expect } from '@playwright/test';
import { goToCheckoutStep2 } from './helpers/checkout';

test.describe('Máscaras de input', () => {
  test.beforeEach(async ({ page }) => {
    await goToCheckoutStep2(page);
  });

  test('WhatsApp: aplica máscara (11) 99999-9999', async ({ page }) => {
    const input = page.locator('input[name="whatsapp"]');
    await input.fill('11999887766');
    const value = await input.inputValue();
    expect(value).toBe('(11) 99988-7766');
  });

  test('WhatsApp: limita a 15 caracteres formatados', async ({ page }) => {
    const input = page.locator('input[name="whatsapp"]');
    await input.fill('1199988776655443322');
    const value = await input.inputValue();
    // Máscara limita a 11 dígitos = (11) 99988-7766
    expect(value.length).toBeLessThanOrEqual(15);
  });

  test('CPF: aplica máscara 000.000.000-00', async ({ page }) => {
    const input = page.locator('input[name="cpf_cnpj"]');
    await input.fill('12345678901');
    const value = await input.inputValue();
    expect(value).toBe('123.456.789-01');
  });

  test('CNPJ: aplica máscara 00.000.000/0001-00', async ({ page }) => {
    const input = page.locator('input[name="cpf_cnpj"]');
    await input.fill('12345678000190');
    const value = await input.inputValue();
    expect(value).toBe('12.345.678/0001-90');
  });

  test('CEP: aplica máscara 00000-000 no step 3', async ({ page }) => {
    // Preenche step 2 e avança para step 3
    await page.fill('input[name="nome"]', 'Teste Máscaras');
    await page.fill('input[name="whatsapp"]', '11999887766');
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.waitForTimeout(500);

    const cepInput = page.locator('input[name="cep"]');
    await cepInput.fill('01001000');
    const value = await cepInput.inputValue();
    expect(value).toBe('01001-000');
  });
});
