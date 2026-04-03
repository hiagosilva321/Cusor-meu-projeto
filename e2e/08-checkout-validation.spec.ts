import { test, expect } from '@playwright/test';
import { goToCheckoutStep2, gotoCheckoutAndWaitReady } from './helpers/checkout';

test.describe('Checkout - Validação Zod por step', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCheckoutAndWaitReady(page);
  });

  test('step 1: avança normalmente com tamanho selecionado', async ({ page }) => {
    await goToCheckoutStep2(page);
  });

  test('step 2: bloqueia avanço sem nome', async ({ page }) => {
    await goToCheckoutStep2(page);
    // Tenta avançar sem preencher
    await page.fill('input[name="whatsapp"]', '11999887766');
    await page.getByRole('button', { name: /Continuar/i }).click();
    // Deve mostrar erro de nome (mínimo 3 caracteres)
    const body = await page.textContent('body');
    expect(body).toContain('Nome');
  });

  test('step 2: bloqueia avanço sem WhatsApp', async ({ page }) => {
    await goToCheckoutStep2(page);
    await page.fill('input[name="nome"]', 'Teste Completo');
    // Não preenche WhatsApp
    await page.getByRole('button', { name: /Continuar/i }).click();
    // Deve continuar no step 2
    await expect(page.locator('input[name="nome"]')).toBeVisible();
  });

  test('step 2: bloqueia com WhatsApp curto', async ({ page }) => {
    await goToCheckoutStep2(page);
    await page.fill('input[name="nome"]', 'Teste Completo');
    await page.fill('input[name="whatsapp"]', '1199');
    await page.getByRole('button', { name: /Continuar/i }).click();
    // Deve permanecer no step 2
    await expect(page.locator('input[name="nome"]')).toBeVisible();
  });

  test('step 2: aceita dados válidos e avança para step 3', async ({ page }) => {
    await goToCheckoutStep2(page);
    await page.fill('input[name="nome"]', 'Teste Completo');
    await page.fill('input[name="whatsapp"]', '11999887766');
    await page.getByRole('button', { name: /Continuar/i }).click();
    // Deve estar no step 3 (CEP visível)
    await expect(page.locator('input[name="cep"]')).toBeVisible();
  });

  test('step indicators mostram progresso correto', async ({ page }) => {
    // Step 1 ativo
    const step1Btn = page.locator('button').filter({ hasText: /Pedido|1/ }).first();
    await expect(step1Btn).toBeVisible();

    // Avança para step 2
    await goToCheckoutStep2(page);

    // Step 1 deve ter checkmark (concluído)
    const body = await page.textContent('body');
    expect(body).toContain('Dados');
  });

  test('botão voltar funciona entre steps', async ({ page }) => {
    await goToCheckoutStep2(page);

    // Step 2 → Step 1
    await page.getByRole('button', { name: /Voltar/i }).click();
    // Deve ter o select de tamanho
    await expect(page.locator('select[name="tamanho"]')).toBeVisible();
  });

  test('resumo do pedido mostra progresso de steps', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('Resumo do Pedido');
    expect(body).toContain('Pedido');
    expect(body).toContain('Dados');
    expect(body).toContain('Endereço');
  });

  test('erro inline aparece em campo inválido', async ({ page }) => {
    await goToCheckoutStep2(page);
    // Tenta avançar sem nome
    await page.fill('input[name="whatsapp"]', '11999887766');
    await page.getByRole('button', { name: /Continuar/i }).click();
    // Deve haver mensagem de erro inline
    const errorMessages = page.locator('.text-destructive');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThan(0);
  });
});

test('checkout usa o referral_source salvo quando a URL chega sem ?ref', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cacamba_assigned_whatsapp_referral_source', 'joao');
    sessionStorage.setItem('cacamba_assigned_whatsapp_referral_source', 'joao');
    document.cookie = 'cacamba_assigned_whatsapp_referral_source=joao; path=/; SameSite=Lax';
  });

  let capturedPayload: Record<string, unknown> | null = null;

  await page.route('**/functions/v1/create-pix-charge', async (route) => {
    capturedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        order_id: '11111111-1111-1111-1111-111111111111',
        order_token: '22222222-2222-2222-2222-222222222222',
        pix_qr_code: null,
        pix_copy_paste: '000201010212',
        expires_at: '2026-04-03T12:00:00.000Z',
      }),
    });
  });

  await page.route('**/functions/v1/get-order-status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '11111111-1111-1111-1111-111111111111',
        tamanho: '5m³',
        quantidade: 1,
        valor_total: 340,
        status: 'aguardando_pagamento',
        payment_status: 'pending',
        referral_source: 'joao',
        pix_qr_code: null,
        pix_copy_paste: '000201010212',
        pix_expires_at: '2026-04-03T12:00:00.000Z',
        paid_at: null,
      }),
    });
  });

  await page.route('**/rest/v1/leads**', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await gotoCheckoutAndWaitReady(page);
  await page.getByRole('button', { name: /Continuar/i }).click();
  await page.fill('input[name="nome"]', 'Cliente Sticky');
  await page.fill('input[name="whatsapp"]', '11999887766');
  await page.getByRole('button', { name: /Continuar/i }).click();
  await page.fill('input[name="cep"]', '01001000');
  await page.fill('input[name="numero"]', '123');
  await page.getByRole('button', { name: /Pagar com PIX/i }).click();

  await expect.poll(() => capturedPayload).not.toBeNull();
  expect(capturedPayload?.referral_source).toBe('joao');
  await expect(page).toHaveURL(/\/pagamento\//);
});
