const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getSupabaseAdmin } = require('../lib/supabase');
const {
  createCeoToken,
  verifyCeoToken,
  getCeoClientIdFromRequest,
  setCeoAuthCookie,
  clearCeoAuthCookie,
  getCeoTokenFromRequest,
} = require('../lib/ceo-cookie');
const {
  getClientByCode,
  getClientById,
  verifyClientPassword,
  hashPasswordForStorage,
} = require('../lib/ceo-clients');

function safeStringEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function escapeEnvValue(val) {
  const s = String(val).replace(/\r?\n/g, '');
  if (!/[\s"'#=]/.test(s)) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function getEnvFilePath() {
  return path.join(__dirname, '..', '.env');
}

function updateCeoPasswordInEnv(newPassword) {
  const envPath = getEnvFilePath();
  const line = `CEO_PANEL_PASSWORD=${escapeEnvValue(newPassword)}`;
  let raw = '';
  if (fs.existsSync(envPath)) {
    raw = fs.readFileSync(envPath, 'utf8');
  }
  if (/^CEO_PANEL_PASSWORD=/m.test(raw)) {
    raw = raw.replace(/^CEO_PANEL_PASSWORD=.*$/m, line);
  } else {
    raw = raw.trimEnd() + (raw.trimEnd() ? '\n' : '') + line + '\n';
  }
  fs.writeFileSync(envPath, raw, 'utf8');
  process.env.CEO_PANEL_PASSWORD = newPassword;
}

async function ceoLogin(req, res) {
  try {
    const supabase = getSupabaseAdmin();
    const { clientCode, password } = req.body || {};
    const defaultCode = (process.env.DEFAULT_CLIENT_CODE || 'PEDIR').trim().toUpperCase();
    const code = String(clientCode ?? defaultCode)
      .trim()
      .toUpperCase();

    if (!code) {
      return res.status(400).json({ error: 'Indique o código do cliente (ex.: PEDIR).' });
    }

    const client = await getClientByCode(supabase, code);
    if (!client) {
      return res.status(401).json({ error: 'Código de cliente inválido ou inativo.' });
    }

    const gotPass = String(password ?? '').trim();
    if (!gotPass || !verifyClientPassword(client, gotPass)) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = createCeoToken(client.id);
    setCeoAuthCookie(res, token);
    return res.json({ ok: true, client: { name: client.name, code: client.code } });
  } catch (e) {
    console.error('ceoLogin', e);
    return res.status(500).json({ error: e.message || 'Erro no servidor.' });
  }
}

function ceoLogout(_req, res) {
  clearCeoAuthCookie(res);
  return res.json({ ok: true });
}

async function ceoStatus(req, res) {
  try {
    const token = getCeoTokenFromRequest(req);
    if (!token || !verifyCeoToken(token)) {
      return res.json({ ok: false });
    }
    const clientId = getCeoClientIdFromRequest(req);
    if (!clientId) {
      return res.json({ ok: false });
    }
    const supabase = getSupabaseAdmin();
    const client = await getClientById(supabase, clientId);
    if (!client || !client.active) {
      return res.json({ ok: false });
    }
    return res.json({
      ok: true,
      client: { id: client.id, name: client.name, code: client.code, slug: client.slug },
    });
  } catch (e) {
    console.error('ceoStatus', e);
    return res.json({ ok: false });
  }
}

function ceoAuthOptions(_req, res) {
  return res.json({
    loginRequired: false,
    clientCodeRequired: true,
    defaultClientCode: (process.env.DEFAULT_CLIENT_CODE || 'PEDIR').trim(),
  });
}

async function ceoChangePassword(req, res) {
  try {
    const token = getCeoTokenFromRequest(req);
    if (!token || !verifyCeoToken(token)) {
      return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });
    }
    const clientId = getCeoClientIdFromRequest(req);
    if (!clientId) {
      return res.status(401).json({ error: 'Sessão inválida.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Indique a senha atual e a nova senha.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }

    const supabase = getSupabaseAdmin();
    const client = await getClientById(supabase, clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    if (!verifyClientPassword(client, currentPassword)) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    let newHash;
    try {
      newHash = hashPasswordForStorage(String(newPassword));
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: 'API sem bcryptjs. Contacte o suporte técnico.' });
    }

    const { error: upErr } = await supabase.from('ceo_clients').update({ ceo_password_hash: newHash }).eq('id', clientId);
    if (upErr) {
      console.error(upErr);
      return res.status(500).json({ error: 'Erro ao gravar a nova senha.' });
    }

    /* Mantém compatível com login por env se ainda não existir hash no registo */
    updateCeoPasswordInEnv(String(newPassword));

    clearCeoAuthCookie(res);
    return res.json({ ok: true, message: 'Senha atualizada. Entre novamente com a nova senha.' });
  } catch (e) {
    console.error('ceoChangePassword', e);
    return res.status(500).json({ error: e.message || 'Erro ao gravar a nova senha.' });
  }
}

module.exports = { ceoLogin, ceoLogout, ceoStatus, ceoAuthOptions, ceoChangePassword };
