#!/usr/bin/env npx ts-node
/**
 * Simple Webhook Verification Server
 *
 * Meta Developer ConsoleでWebhook URLを検証するための簡易サーバー
 * 検証完了後、本番サーバー(meta-bridge)に切り替えてください
 */

import express from 'express';

const app = express();
const PORT = 3003;
const VERIFY_TOKEN = 'communication_tool_verify_2024';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Meta Webhook verification (GET)
app.get('/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📥 Webhook verification request received');
  console.log('   Mode:', mode);
  console.log('   Token:', token);
  console.log('   Challenge:', challenge);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Verification SUCCESS!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Verification FAILED');
    console.log(`   Expected token: ${VERIFY_TOKEN}`);
    console.log(`   Received token: ${token}`);
    res.sendStatus(403);
  }
});

// Webhook events (POST) - just log for now
app.use(express.json());
app.post('/webhook/meta', (req, res) => {
  console.log('📨 Webhook event received:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Webhook Verification Server                           ║
╠═══════════════════════════════════════════════════════════╣
║  Status: 🟢 RUNNING                                       ║
║  URL: http://localhost:${PORT}                               ║
║                                                           ║
║  Webhook URL: /webhook/meta                               ║
║  Verify Token: ${VERIFY_TOKEN}            ║
║                                                           ║
║  Next:                                                    ║
║  1. Run: ngrok http 3003                                  ║
║  2. Copy ngrok HTTPS URL                                  ║
║  3. Meta Console → Webhooks → コールバックURL:            ║
║     https://xxxx.ngrok.io/webhook/meta                    ║
║  4. トークンを認証: ${VERIFY_TOKEN}       ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
