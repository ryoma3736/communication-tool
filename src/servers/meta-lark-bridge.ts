#!/usr/bin/env node
/**
 * Meta-Lark Bridge Server
 *
 * Unified bridge server that handles both Facebook Messenger and Instagram DM webhooks,
 * forwarding messages to Lark for centralized communication management.
 *
 * Features:
 * - Single webhook endpoint for both Messenger and Instagram
 * - Automatic platform detection (Facebook Page vs Instagram)
 * - Message forwarding to Lark with platform context
 * - Webhook verification (Meta standard)
 * - Health check endpoint
 * - Graceful shutdown handling
 */

import express, { Request, Response } from 'express';
import * as crypto from 'crypto';
import { metaBridgeConfig, validateMetaBridgeConfig } from '../config/meta-bridge.config';
import { LarkClient } from '../lark/client';
import { MetaWebhookHandler } from '../meta/webhook';

const app = express();
app.use(express.json());

// Initialize clients
const larkClient = new LarkClient();
const metaWebhook = new MetaWebhookHandler();

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Meta-Lark Bridge',
    messenger: 'connected',
    instagram: 'connected',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Meta webhook verification (GET)
 * Used by Facebook to verify webhook endpoint during setup
 */
app.get('/webhook/meta', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === metaBridgeConfig.verifyToken) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * Unified Meta webhook endpoint (POST)
 * Handles both Facebook Messenger and Instagram DM events
 */
app.post('/webhook/meta', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const object = body.object;

    console.log('\n📥 Meta webhook received:', JSON.stringify(body, null, 2));

    // Respond quickly to Meta (required)
    res.sendStatus(200);

    // Process events asynchronously
    if (!body.entry) {
      console.log('⏭️ No entries, skipping');
      return;
    }

    for (const entry of body.entry) {
      // Handle Messenger (Page object)
      if (object === 'page') {
        await handleMessengerEntry(entry);
      }
      // Handle Instagram (Instagram object)
      else if (object === 'instagram') {
        await handleInstagramEntry(entry);
      } else {
        console.log(`⚠️ Unknown object type: ${object}`);
      }
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
  }
});

/**
 * Handle Facebook Messenger entry
 */
async function handleMessengerEntry(entry: any): Promise<void> {
  const messaging = entry.messaging || [];

  for (const event of messaging) {
    if (!event.message) continue;

    const senderId = event.sender.id;
    const messageText = event.message.text || '';
    const timestamp = new Date(event.timestamp).toISOString();

    console.log(`📨 Messenger message from ${senderId}: "${messageText}"`);

    // Forward to Lark
    const larkMessage = formatMessengerForLark(senderId, messageText, timestamp);
    await sendToLark(larkMessage);
  }
}

/**
 * Handle Instagram DM entry
 */
async function handleInstagramEntry(entry: any): Promise<void> {
  const messaging = entry.messaging || [];

  for (const event of messaging) {
    if (!event.message) continue;

    const senderId = event.sender.id;
    const messageText = event.message.text || '';
    const timestamp = new Date(event.timestamp).toISOString();

    console.log(`📷 Instagram DM from ${senderId}: "${messageText}"`);

    // Forward to Lark
    const larkMessage = formatInstagramForLark(senderId, messageText, timestamp);
    await sendToLark(larkMessage);
  }
}

/**
 * Format Messenger message for Lark
 */
function formatMessengerForLark(senderId: string, text: string, timestamp: string): string {
  return `**[Facebook Messenger]**
送信者ID: ${senderId}
時刻: ${timestamp}

${text}`;
}

/**
 * Format Instagram message for Lark
 */
function formatInstagramForLark(senderId: string, text: string, timestamp: string): string {
  return `**[Instagram DM]**
送信者ID: ${senderId}
時刻: ${timestamp}

${text}`;
}

/**
 * Send message to Lark
 */
async function sendToLark(message: string): Promise<void> {
  try {
    const result = await larkClient.sendTextMessage(metaBridgeConfig.lark.chatId, message);
    if (result.success) {
      console.log('✅ Forwarded to Lark');
    } else {
      console.error('❌ Lark send failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Lark error:', error);
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(server: any): void {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Start server
 */
function startServer(): void {
  // Validate configuration
  const validation = validateMetaBridgeConfig(metaBridgeConfig);
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach((error) => console.error(`   - ${error}`));
    process.exit(1);
  }

  const PORT = metaBridgeConfig.port;

  const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Meta → Lark Bridge Server                             ║
╠═══════════════════════════════════════════════════════════╣
║  Status: 🟢 RUNNING                                        ║
║  Server: http://localhost:${PORT}                             ║
║                                                           ║
║  Endpoints:                                               ║
║  - GET  /health        Health check                       ║
║  - GET  /webhook/meta  Meta webhook verification          ║
║  - POST /webhook/meta  Meta events (Messenger + Instagram)║
║                                                           ║
║  Platforms:                                               ║
║  - 📨 Facebook Messenger                                  ║
║  - 📷 Instagram DM                                        ║
║  - 💬 Lark Chat ID: ${metaBridgeConfig.lark.chatId.substring(0, 8)}...            ║
║                                                           ║
║  Next steps:                                              ║
║  1. Run: ngrok http ${PORT}                                   ║
║  2. Copy the https URL                                    ║
║  3. Set in Meta Developer Console → Webhooks              ║
║     - Subscribe to 'messages' events                      ║
║     - Use verify token: ${metaBridgeConfig.verifyToken.substring(0, 8)}...                ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  setupGracefulShutdown(server);
}

// Start server if running directly
if (require.main === module) {
  startServer();
}

export { app, startServer };
