import { test, expect } from '@playwright/test';
import {
  ADMIN_CATALOGO_PATH,
  ADMIN_CONFIGURACOES_PATH,
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_PEDIDOS_PATH,
  ADMIN_WHATSAPP_PATH,
} from './helpers/admin';

test.describe('Admin - Acesso e seguranca', () => {
  test('pagina de login carrega', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_PATH);
    await page.waitForTimeout(2000);
    // Deve exibir formulario de login
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('exibe campo de senha', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_PATH);
    await page.waitForTimeout(1000);
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('login nao expõe email padrao e marca noindex', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_PATH);
    await page.waitForTimeout(1000);
    await expect(page.locator('input[type="email"]')).toHaveValue('');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
  });

  test('login com credenciais invalidas mostra erro', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_PATH);
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'naoexiste@teste.com');
    await page.fill('input[type="password"]', 'senhaerrada123');
    await page.getByRole('button', { name: /Entrar|Login/i }).click();
    await page.waitForTimeout(3000);
    // Deve continuar na pagina de login (nao redirecionar)
    const url = page.url();
    expect(url).toContain(ADMIN_LOGIN_PATH);
    expect(url).not.toContain('/dashboard');
  });

  test('dashboard redireciona para login sem sessao', async ({ page }) => {
    await page.goto(ADMIN_DASHBOARD_PATH);
    await page.waitForTimeout(3000);
    // Sem sessao, deve redirecionar para a rota privada de login
    const url = page.url();
    expect(url).toContain(ADMIN_LOGIN_PATH);
  });

  test('paginas admin protegidas redirecionam sem sessao', async ({ page }) => {
    const protectedPages = [
      ADMIN_PEDIDOS_PATH,
      ADMIN_CATALOGO_PATH,
      ADMIN_WHATSAPP_PATH,
      ADMIN_CONFIGURACOES_PATH,
    ];
    for (const path of protectedPages) {
      await page.goto(path);
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain(ADMIN_LOGIN_PATH);
    }
  });

  test('rota legada /admin nao expõe o painel', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page).not.toHaveURL(new RegExp(`${ADMIN_LOGIN_PATH}$`));
  });
});
