import { test, expect } from '@playwright/test';

test.describe('Admin - Acesso e seguranca', () => {
  test('pagina de login carrega', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    // Deve exibir formulario de login
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('exibe campo de senha', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('login com credenciais invalidas mostra erro', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'naoexiste@teste.com');
    await page.fill('input[type="password"]', 'senhaerrada123');
    await page.getByRole('button', { name: /Entrar|Login/i }).click();
    await page.waitForTimeout(3000);
    // Deve continuar na pagina de login (nao redirecionar)
    const url = page.url();
    expect(url).toContain('/admin');
    expect(url).not.toContain('/dashboard');
  });

  test('dashboard redireciona para login sem sessao', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForTimeout(3000);
    // Sem sessao, deve redirecionar para /admin (login)
    const url = page.url();
    expect(url).toMatch(/\/admin$/);
  });

  test('paginas admin protegidas redirecionam sem sessao', async ({ page }) => {
    const protectedPages = [
      '/admin/pedidos',
      '/admin/catalogo',
      '/admin/whatsapp',
      '/admin/configuracoes',
    ];
    for (const path of protectedPages) {
      await page.goto(path);
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toMatch(/\/admin$/);
    }
  });
});
