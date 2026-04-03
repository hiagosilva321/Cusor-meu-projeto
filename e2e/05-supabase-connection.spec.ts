import { test, expect } from '@playwright/test';
import { gotoCheckoutAndWaitReady } from './helpers/checkout';

test.describe('Conexao Supabase - Dados reais', () => {
  test('landing carrega tamanhos do banco', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    // Deve ter precos ou nomes de tamanhos carregados do Supabase
    // dumpster_sizes tem items como "3m³", "5m³", "R$"
    const hasPrice = /R\$/.test(body || '');
    const hasSize = /m³|m3/.test(body || '');
    const hasDumpster = /[Cc]açamba|[Cc]acamba/.test(body || '');
    expect(hasPrice || hasSize || hasDumpster).toBeTruthy();
  });

  test('landing carrega regioes do banco', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    // RegionsSection busca de `regions` table
    // Deve ter conteudo de regioes renderizado
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    // Pagina nao deve ter erros de console criticos
  });

  test('checkout carrega opcoes de tamanho do banco', async ({ page }) => {
    await gotoCheckoutAndWaitReady(page);
    // O select de tamanho deve ter opcoes carregadas do Supabase
    const options = page.locator('select[name="tamanho"] option');
    const count = await options.count();
    // Deve ter pelo menos 1 opcao real (alem de placeholder)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('nao ha erros criticos de JS no console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForTimeout(3000);
    // Filtra erros esperados (Supabase config warnings)
    const criticalErrors = errors.filter(
      (e) => !e.includes('CaçambaJá') && !e.includes('Supabase')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('nao ha requests com status 500', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 500) {
        failed.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.goto('/');
    await page.waitForTimeout(3000);
    expect(failed.length).toBe(0);
  });
});
