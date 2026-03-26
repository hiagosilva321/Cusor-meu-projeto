const crypto = require('crypto');

const COOKIE_NAME = 'ceo_auth';

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    let v = part.slice(idx + 1).trim();
    try {
      v = decodeURIComponent(v);
    } catch {
      /* ignore */
    }
    out[k] = v;
  }
  return out;
}

function signingKey() {
  const s = process.env.CEO_PANEL_SECRET || process.env.CEO_PANEL_PASSWORD;
  if (!s) throw new Error('CEO_PANEL_PASSWORD (ou CEO_PANEL_SECRET) é obrigatório');
  return crypto.createHash('sha256').update(`ceo_panel_v1|${s}`).digest();
}

function canonicalPayloadV3(exp, clientId) {
  return JSON.stringify({ cid: String(clientId), exp, v: 3 });
}

function createCeoToken(clientId) {
  if (!clientId) throw new Error('clientId obrigatório no token CEO');
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const payload = canonicalPayloadV3(exp, clientId);
  const sig = crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

function parseAndVerifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payloadStr;
  try {
    payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  let obj;
  try {
    obj = JSON.parse(payloadStr);
  } catch {
    return null;
  }
  if (obj.v !== 3 || typeof obj.exp !== 'number' || !obj.cid) return null;
  const canonical = canonicalPayloadV3(obj.exp, obj.cid);
  const expectedSig = crypto.createHmac('sha256', signingKey()).update(canonical).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  if (obj.exp < Math.floor(Date.now() / 1000)) return null;
  return { clientId: String(obj.cid) };
}

function verifyCeoToken(token) {
  return Boolean(parseAndVerifyToken(token));
}

function getCeoClientIdFromRequest(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  const parsed = parseAndVerifyToken(token);
  return parsed?.clientId || null;
}

function isSecureCookie() {
  return process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
}

function cookieDomainAttr() {
  const d = (process.env.CEO_COOKIE_DOMAIN || '').trim().replace(/^\./, '');
  return d || null;
}

function setCeoAuthCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 3600}`,
  ];
  const dom = cookieDomainAttr();
  if (dom) parts.push(`Domain=${dom}`);
  if (isSecureCookie()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearCeoAuthCookie(res) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  const dom = cookieDomainAttr();
  if (dom) parts.push(`Domain=${dom}`);
  if (isSecureCookie()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function getCeoTokenFromRequest(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

module.exports = {
  COOKIE_NAME,
  parseCookies,
  createCeoToken,
  verifyCeoToken,
  parseAndVerifyToken,
  getCeoClientIdFromRequest,
  setCeoAuthCookie,
  clearCeoAuthCookie,
  getCeoTokenFromRequest,
};
