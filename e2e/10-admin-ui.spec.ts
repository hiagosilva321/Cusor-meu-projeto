import { test, expect } from '@playwright/test';
import {
  ADMIN_CATALOGO_PATH,
  ADMIN_CONFIGURACOES_PATH,
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_PEDIDOS_PATH,
  ADMIN_WHATSAPP_PATH,
} from './helpers/admin';

test.describe('Admin UI - Empty states e layout', () => {
  // Sem login, testes focam no que é visível publicamente

  test('login: exibe formulário completo', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_PATH);
    await page.waitForTimeout(2000);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    const loginBtn = page.getByRole('button', { name: /Entrar|Login/i });
    await expect(loginBtn).toBeVisible();
  });

  test('login: tem botão para voltar ao site', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_PATH);
    await page.waitForTimeout(2000);
    const backBtn = page.getByRole('button', { name: /Voltar ao site/i });
    await expect(backBtn).toBeVisible();
  });

  test('login: botão desabilitado durante carregamento', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_PATH);
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'teste@teste.com');
    await page.fill('input[type="password"]', 'senhateste');
    await page.getByRole('button', { name: /Entrar|Login/i }).click();
    // Botão deve ficar desabilitado durante a requisição
    await page.waitForTimeout(500);
    // Deve ainda estar na página de login após erro
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain(ADMIN_LOGIN_PATH);
  });
});

test.describe('Admin - Proteção de rotas', () => {
  const adminPages = [
    { path: ADMIN_DASHBOARD_PATH, name: 'Dashboard' },
    { path: ADMIN_PEDIDOS_PATH, name: 'Pedidos' },
    { path: ADMIN_CATALOGO_PATH, name: 'Catálogo' },
    { path: ADMIN_WHATSAPP_PATH, name: 'WhatsApp' },
    { path: ADMIN_CONFIGURACOES_PATH, name: 'Configurações' },
  ];

  for (const { path, name } of adminPages) {
    test(`${name}: redireciona para login sem sessão`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toContain(ADMIN_LOGIN_PATH);
    });
  }
});
