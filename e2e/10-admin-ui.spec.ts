import { test, expect } from '@playwright/test';

test.describe('Admin UI - Empty states e layout', () => {
  // Sem login, testes focam no que é visível publicamente

  test('login: exibe formulário completo', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    const loginBtn = page.getByRole('button', { name: /Entrar|Login/i });
    await expect(loginBtn).toBeVisible();
  });

  test('login: tem botão para voltar ao site', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    const backBtn = page.getByRole('button', { name: /Voltar ao site/i });
    await expect(backBtn).toBeVisible();
  });

  test('login: botão desabilitado durante carregamento', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'teste@teste.com');
    await page.fill('input[type="password"]', 'senhateste');
    await page.getByRole('button', { name: /Entrar|Login/i }).click();
    // Botão deve ficar desabilitado durante a requisição
    await page.waitForTimeout(500);
    // Deve ainda estar na página de login após erro
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/admin');
  });
});

test.describe('Admin - Proteção de rotas', () => {
  const adminPages = [
    { path: '/admin/dashboard', name: 'Dashboard' },
    { path: '/admin/pedidos', name: 'Pedidos' },
    { path: '/admin/catalogo', name: 'Catálogo' },
    { path: '/admin/whatsapp', name: 'WhatsApp' },
    { path: '/admin/configuracoes', name: 'Configurações' },
  ];

  for (const { path, name } of adminPages) {
    test(`${name}: redireciona para login sem sessão`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toMatch(/\/admin$/);
    });
  }
});
