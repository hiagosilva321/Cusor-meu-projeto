require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createPixCharge } = require('./routes/create-pix-charge');
const { fastsoftWebhook } = require('./routes/fastsoft-webhook');
const { createAdmin } = require('./routes/create-admin');
const { ceoLogin, ceoLogout, ceoStatus, ceoAuthOptions, ceoChangePassword } = require('./routes/ceo-auth');
const { ceoDashboard } = require('./routes/ceo-dashboard');
const { syncOrderPayment } = require('./routes/sync-order-payment');

const app = express();
const PORT = process.env.PORT || 3001;

// Credenciais (cookies CEO) — origin reflect para o browser aceitar Set-Cookie no mesmo site
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.post('/api/create-pix-charge', createPixCharge);
app.get('/api/orders/:orderId/sync-payment', syncOrderPayment);
app.post('/api/fastsoft-webhook', fastsoftWebhook);
app.post('/api/create-admin', createAdmin);

app.get('/api/ceo-auth/options', ceoAuthOptions);
app.get('/api/ceo-auth/status', ceoStatus);
app.post('/api/ceo-auth/login', ceoLogin);
app.post('/api/ceo-auth/logout', ceoLogout);
app.post('/api/ceo-auth/change-password', ceoChangePassword);
app.get('/api/ceo-dashboard', ceoDashboard);

app.listen(PORT, () => {
  console.log(`CaçambaJá API rodando na porta ${PORT}`);
});
