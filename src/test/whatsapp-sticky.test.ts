import { afterEach, describe, expect, it } from 'vitest';
import {
  buildCheckoutUrl,
  getOrCreateVisitorId,
  getStoredAssignedNumberId,
  getStoredReferralSource,
  persistAssignedWhatsApp,
} from '@/lib/whatsapp-sticky';

const COOKIE_KEYS = [
  'cacamba_visitor_id',
  'cacamba_assigned_whatsapp_number_id',
  'cacamba_assigned_whatsapp_referral_source',
];

function clearStickyState() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  for (const key of COOKIE_KEYS) {
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
  }
}

function createMockStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] || null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function installMockStorages() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: createMockStorage(),
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: createMockStorage(),
  });
}

describe('whatsapp sticky helper', () => {
  installMockStorages();

  afterEach(() => {
    clearStickyState();
  });

  it('persiste numero e referral nas camadas redundantes do navegador', () => {
    persistAssignedWhatsApp('numero-1', 'joao');

    expect(window.localStorage.getItem('cacamba_assigned_whatsapp_number_id')).toBe('numero-1');
    expect(window.sessionStorage.getItem('cacamba_assigned_whatsapp_number_id')).toBe('numero-1');
    expect(document.cookie).toContain('cacamba_assigned_whatsapp_number_id=numero-1');
    expect(getStoredAssignedNumberId()).toBe('numero-1');

    expect(window.localStorage.getItem('cacamba_assigned_whatsapp_referral_source')).toBe('joao');
    expect(window.sessionStorage.getItem('cacamba_assigned_whatsapp_referral_source')).toBe('joao');
    expect(document.cookie).toContain('cacamba_assigned_whatsapp_referral_source=joao');
    expect(getStoredReferralSource()).toBe('joao');
  });

  it('reidrata o visitor_id a partir da persistencia redundante', () => {
    window.sessionStorage.setItem('cacamba_visitor_id', 'visitor-fallback');

    const visitorId = getOrCreateVisitorId();

    expect(visitorId).toBe('visitor-fallback');
    expect(window.localStorage.getItem('cacamba_visitor_id')).toBe('visitor-fallback');
    expect(document.cookie).toContain('cacamba_visitor_id=visitor-fallback');
  });

  it('monta a URL de checkout com ref quando o atendimento esta definido', () => {
    expect(buildCheckoutUrl('joao')).toBe('/checkout?ref=joao');
    expect(buildCheckoutUrl(null)).toBe('/checkout');
  });
});
