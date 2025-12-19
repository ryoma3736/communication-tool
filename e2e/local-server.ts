/**
 * Local Test Server for E2E Testing
 * Simulates API Gateway + Lambda for local testing
 */

import express from 'express';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Twilio Webhook
app.post('/webhook/twilio', (req, res) => {
  const signature = req.headers['x-twilio-signature'];

  // Simulate signature validation
  if (!signature || signature === 'invalid-signature') {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('[Twilio] Received:', req.body);

  res.json({
    success: true,
    processed: 1,
    channel: 'twilio'
  });
});

// Meta Webhook (Facebook/Instagram)
app.get('/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return res.send(challenge);
  }

  res.status(403).send('Verification failed');
});

app.post('/webhook/meta', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];

  // Simulate signature validation
  if (!signature || signature === 'sha256=invalid') {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('[Meta] Received:', JSON.stringify(req.body, null, 2));

  res.json({
    success: true,
    processed: req.body.entry?.length || 0,
    channel: 'meta'
  });
});

// LinkedIn Webhook
app.post('/webhook/linkedin', (req, res) => {
  console.log('[LinkedIn] Received:', req.body);

  res.json({
    success: true,
    channel: 'linkedin'
  });
});

// Email Webhook (SES)
app.post('/webhook/email', (req, res) => {
  console.log('[Email] Received:', req.body);

  res.json({
    success: true,
    channel: 'email'
  });
});

// Lark Webhook
app.post('/webhook/lark', (req, res) => {
  const body = req.body;

  // URL Verification
  if (body.type === 'url_verification') {
    return res.json({ challenge: body.challenge });
  }

  // Interactive Card Action
  if (body.type === 'interactive' || body.action) {
    console.log('[Lark] Card Action:', body);
    return res.json({ success: true });
  }

  // Event callback
  console.log('[Lark] Event:', body);
  res.json({ success: true });
});

// Customer API
app.get('/api/customers', (req, res) => {
  res.json({
    customers: [
      {
        id: 'cust-001',
        name: 'テスト顧客',
        channels: ['line', 'email'],
        lastContactAt: new Date().toISOString()
      }
    ],
    total: 1
  });
});

app.get('/api/customers/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'テスト顧客',
    channels: ['line'],
    threads: []
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Lark Message Hub - Local Test Server                   ║
╠════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                    ║
║                                                            ║
║  Endpoints:                                                ║
║  - POST /webhook/twilio   (LINE/SMS/WhatsApp/Webchat)      ║
║  - GET/POST /webhook/meta (Facebook/Instagram)             ║
║  - POST /webhook/linkedin                                  ║
║  - POST /webhook/email                                     ║
║  - POST /webhook/lark                                      ║
║  - GET /api/customers                                      ║
║                                                            ║
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
