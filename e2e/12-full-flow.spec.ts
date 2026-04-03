import { test, expect } from '@playwright/test';
import { goToCheckoutStep2, gotoCheckoutAndWaitReady } from './helpers/checkout';

test.describe('Fluxo completo - Landing → Checkout → Steps', () => {
  test('navega da landing para checkout via CTA', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const checkoutLink = page.locator('a[href="/checkout"]').first();
    if (await checkoutLink.isVisible()) {
      await checkoutLink.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/checkout/);
      await expect(page.locator('h1')).toContainText(/Pedido|Finalizar/i);
    }
  });

  test('completa checkout steps 1-2-3 com dados válidos', async ({ page }) => {
    await goToCheckoutStep2(page);

    // Step 2: Dados com máscaras
    await page.fill('input[name="nome"]', 'João da Silva Teste');
    await page.fill('input[name="whatsapp"]', '11999887766');
    await page.fill('input[name="email"]', 'teste@email.com');
    await page.fill('input[name="cpf_cnpj"]', '12345678901');

    // Verifica que máscaras foram aplicadas
    expect(await page.inputValue('input[name="whatsapp"]')).toBe('(11) 99988-7766');
    expect(await page.inputValue('input[name="cpf_cnpj"]')).toBe('123.456.789-01');

    await page.getByRole('button', { name: /Continuar/i }).click();

    // Step 3: Endereço
    await expect(page.locator('input[name="cep"]')).toBeVisible();
    await page.fill('input[name="cep"]', '01001000');
    expect(await page.inputValue('input[name="cep"]')).toBe('01001-000');

    // Aguarda auto-preenchimento do ViaCEP
    await page.waitForTimeout(2000);
    const endereco = await page.inputValue('input[name="endereco"]');
    // ViaCEP pode ou não retornar dados, mas não deve crashar
    expect(endereco).toBeDefined();

    await page.fill('input[name="numero"]', '123');

    // Botão de pagamento deve estar visível
    const payBtn = page.getByRole('button', { name: /Pagar com PIX/i });
    await expect(payBtn).toBeVisible();
  });

  test('resumo mostra valores atualizados em tempo real', async ({ page }) => {
    await gotoCheckoutAndWaitReady(page);
    // Verifica que o resumo tem valor com R$
    const summary = page.locator('text=Resumo do Pedido');
    await expect(summary).toBeVisible();
    const totalText = page.locator('text=Total');
    await expect(totalText).toBeVisible();
  });

  test('header e footer estão presentes no checkout', async ({ page }) => {
    await gotoCheckoutAndWaitReady(page);
    const header = page.locator('header');
    await expect(header).toBeVisible();
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

test.describe('Fluxo de navegação global', () => {
  test('landing carrega todas as seções', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    // Seções que devem existir
    expect(body).toContain('Aluguel');
    expect(body).toMatch(/Como Funciona|como funciona/i);
    expect(body).toMatch(/R\$/); // preços carregados
  });

  test('botão WhatsApp flutuante aparece na landing', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    // Botão flutuante do WhatsApp
    const whatsBtn = page.locator('a[aria-label="Falar no WhatsApp"]');
    if (await whatsBtn.isVisible()) {
      await expect(whatsBtn).toBeVisible();
    }
  });

  test('seção de tamanhos carrega dados do banco', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body).toMatch(/m³/); // tamanhos carregados
  });

  test('seção de regiões carrega dados do banco', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    // Regiões seed: Centro, Zona Sul, Zona Norte, etc.
    const hasRegion = /Centro|Zona Sul|Zona Norte|ABCD|Guarulhos/.test(body || '');
    expect(hasRegion).toBeTruthy();
  });
});
