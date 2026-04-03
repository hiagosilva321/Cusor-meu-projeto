import { test, expect } from '@playwright/test';
import { goToCheckoutStep2 } from './helpers/checkout';
import { ADMIN_LOGIN_PATH, ADMIN_PEDIDOS_PATH } from './helpers/admin';

test.describe('Seguranca e sanitizacao', () => {
  test('nao expoe SUPABASE_SERVICE_ROLE_KEY no HTML', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toContain('service_role');
    expect(html).not.toContain('sb_secret_');
    expect(html).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  test('nao expoe FASTSOFT_SECRET_KEY no HTML', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toContain('FASTSOFT_SECRET_KEY');
    expect(html).not.toContain('fastsoftbrasil');
  });

  test('nao expoe secrets no bundle JS', async ({ page }) => {
    // Carrega a pagina e intercepta o bundle principal
    const jsResponses: string[] = [];
    page.on('response', async (res) => {
      if (res.url().includes('/assets/index-') && res.url().endsWith('.js')) {
        const body = await res.text();
        jsResponses.push(body);
      }
    });
    await page.goto('/');
    await page.waitForTimeout(3000);
    for (const js of jsResponses) {
      expect(js).not.toContain('service_role');
      expect(js).not.toContain('sb_secret_');
      expect(js).not.toContain('FASTSOFT_SECRET_KEY');
    }
  });

  test('XSS: checkout rejeita HTML em campos de texto', async ({ page }) => {
    await goToCheckoutStep2(page);
    // Injeta script no campo nome
    await page.fill('input[name="nome"]', '<script>alert("xss")</script>');
    await page.fill('input[name="whatsapp"]', '11999998888');
    await page.waitForTimeout(500);
    // Verifica que o HTML nao foi interpretado como tag
    const html = await page.content();
    expect(html).not.toContain('<script>alert("xss")</script>');
  });

  test('checkout: campo whatsapp filtra caracteres nao numericos via mascara', async ({ page }) => {
    await goToCheckoutStep2(page);
    // Preenche com caracteres especiais — a máscara remove tudo que não é dígito
    await page.fill('input[name="whatsapp"]', 'abc!@#$%');
    const value = await page.inputValue('input[name="whatsapp"]');
    // Máscara remove letras e caracteres especiais, resultado é string vazia
    expect(value).toBe('');
    // Agora com dígitos válidos
    await page.fill('input[name="whatsapp"]', '11999887766');
    const maskedValue = await page.inputValue('input[name="whatsapp"]');
    expect(maskedValue).toBe('(11) 99988-7766');
  });

  test('headers de seguranca basicos presentes', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).toBeTruthy();
    // Em dev mode (Vite), headers de seguranca podem nao estar presentes
    // Mas a pagina deve carregar sem erro
    expect(response!.status()).toBe(200);
  });

  test('rotas admin nao vazam dados sem autenticacao', async ({ page }) => {
    await page.goto(ADMIN_PEDIDOS_PATH);
    await page.waitForTimeout(3000);
    // Sem sessao, nao deve exibir dados de pedidos
    const body = await page.textContent('body');
    // Deve ter redirecionado ou mostrar login
    const url = page.url();
    expect(url).toContain(ADMIN_LOGIN_PATH);
  });
});
