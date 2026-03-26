const crypto = require('crypto');

let bcrypt = null;
try {
  bcrypt = require('bcryptjs');
} catch {
  /* bcryptjs opcional até npm install */
}

const PEDIR_FIXED_ID = '11111111-1111-1111-1111-111111111111';

function sha256ApiKey(plain) {
  return crypto.createHash('sha256').update(`cacamba_v1|${String(plain).trim()}`).digest('hex');
}

function getDefaultClientIdFromEnv() {
  return (process.env.DEFAULT_CLIENT_ID || PEDIR_FIXED_ID).trim();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 */
async function getClientByCode(sb, code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!c) return null;
  const { data, error } = await sb.from('ceo_clients').select('*').eq('code', c).eq('active', true).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 */
async function getClientByApiKey(sb, plainKey) {
  if (!plainKey || typeof plainKey !== 'string') return null;
  const hash = sha256ApiKey(plainKey.trim());
  const { data, error } = await sb.from('ceo_clients').select('*').eq('api_key_hash', hash).eq('active', true).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 */
async function getClientById(sb, id) {
  if (!id) return null;
  const { data, error } = await sb.from('ceo_clients').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

function verifyClientPassword(client, password) {
  const got = String(password ?? '').trim();
  if (!got) return false;
  if (client.ceo_password_hash && bcrypt) {
    return bcrypt.compareSync(got, client.ceo_password_hash);
  }
  const envPass = process.env.CEO_PANEL_PASSWORD;
  if (!envPass) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(String(envPass).trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hashPasswordForStorage(plain) {
  if (!bcrypt) {
    throw new Error('Instale bcryptjs na API: cd api && npm install bcryptjs');
  }
  return bcrypt.hashSync(String(plain), 10);
}

module.exports = {
  PEDIR_FIXED_ID,
  sha256ApiKey,
  getDefaultClientIdFromEnv,
  getClientByCode,
  getClientByApiKey,
  getClientById,
  verifyClientPassword,
  hashPasswordForStorage,
};
