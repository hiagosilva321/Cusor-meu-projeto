const VISITOR_ID_KEY = 'cacamba_visitor_id';
const ASSIGNED_NUMBER_ID_KEY = 'cacamba_assigned_whatsapp_number_id';
const ASSIGNED_REFERRAL_SOURCE_KEY = 'cacamba_assigned_whatsapp_referral_source';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStorage(key: string, storage: Storage | undefined) {
  if (!storage) return '';

  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeStorage(key: string, value: string, storage: Storage | undefined) {
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
}

function removeStorage(key: string, storage: Storage | undefined) {
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
}

function readCookie(key: string) {
  if (!isBrowser()) return '';

  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${key}=`));

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
}

function writeCookie(key: string, value: string) {
  if (!isBrowser()) return;

  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function removeCookie(key: string) {
  if (!isBrowser()) return;

  document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
}

function readStickyValue(key: string) {
  if (!isBrowser()) return '';

  return (
    readStorage(key, window.localStorage)
    || readStorage(key, window.sessionStorage)
    || readCookie(key)
    || ''
  );
}

function writeStickyValue(key: string, value: string) {
  if (!isBrowser() || !value) return;

  writeStorage(key, value, window.localStorage);
  writeStorage(key, value, window.sessionStorage);
  writeCookie(key, value);
}

function clearStickyValue(key: string) {
  if (!isBrowser()) return;

  removeStorage(key, window.localStorage);
  removeStorage(key, window.sessionStorage);
  removeCookie(key);
}

export function toReferralSource(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildCheckoutUrl(referralSource?: string | null) {
  if (!referralSource) return '/checkout';

  const params = new URLSearchParams({ ref: referralSource });
  return `/checkout?${params.toString()}`;
}

export function getOrCreateVisitorId() {
  const existing = readStickyValue(VISITOR_ID_KEY);
  if (existing) {
    writeStickyValue(VISITOR_ID_KEY, existing);
    return existing;
  }

  const created = crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

  writeStickyValue(VISITOR_ID_KEY, created);
  return created;
}

export function getStoredAssignedNumberId() {
  return readStickyValue(ASSIGNED_NUMBER_ID_KEY);
}

export function getStoredReferralSource() {
  return readStickyValue(ASSIGNED_REFERRAL_SOURCE_KEY);
}

export function persistAssignedWhatsApp(numberId: string, referralSource?: string | null) {
  if (numberId) {
    writeStickyValue(ASSIGNED_NUMBER_ID_KEY, numberId);
  }

  if (referralSource) {
    writeStickyValue(ASSIGNED_REFERRAL_SOURCE_KEY, referralSource);
  }
}

export function persistReferralSource(referralSource?: string | null) {
  if (!referralSource) return;
  writeStickyValue(ASSIGNED_REFERRAL_SOURCE_KEY, referralSource);
}

export function clearAssignedWhatsApp() {
  clearStickyValue(ASSIGNED_NUMBER_ID_KEY);
  clearStickyValue(ASSIGNED_REFERRAL_SOURCE_KEY);
}

export function clearStoredAssignedNumberId() {
  clearStickyValue(ASSIGNED_NUMBER_ID_KEY);
}

export function clearStoredReferralSource() {
  clearStickyValue(ASSIGNED_REFERRAL_SOURCE_KEY);
}
