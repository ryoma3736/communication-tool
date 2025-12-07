# Meta-Lark Bridge Server Setup Guide

## Overview

The Meta-Lark Bridge Server is a unified webhook server that receives messages from both Facebook Messenger and Instagram DM, and forwards them to a Lark chat group.

## Architecture

```
┌─────────────────┐
│ Facebook        │──┐
│ Messenger       │  │
└─────────────────┘  │
                     │
                     ├──> POST /webhook/meta ──> Meta-Lark Bridge ──> Lark Chat
                     │
┌─────────────────┐  │
│ Instagram DM    │──┘
└─────────────────┘
```

## Prerequisites

1. **Meta App** (Facebook Developer Portal)
   - App ID and App Secret
   - Page Access Token
   - Webhook verification token

2. **Lark App**
   - App ID and App Secret
   - Chat ID for notifications

3. **ngrok** (for local development)
   ```bash
   npm install -g ngrok
   ```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
META_BRIDGE_PORT=3003

# Meta Configuration
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_PAGE_ACCESS_TOKEN=your_page_access_token
META_VERIFY_TOKEN=your_custom_verify_token

# Lark Configuration
LARK_APP_ID=your_lark_app_id
LARK_APP_SECRET=your_lark_app_secret
LARK_CHAT_ID=your_lark_chat_id
# or use default group
LARK_DEFAULT_GROUP_ID=your_default_group_id
```

## Installation

```bash
# Install dependencies
npm install

# Install ts-node-dev for development (if not already installed)
npm install -D ts-node-dev
```

## Running the Server

### Development Mode (Auto-restart on file changes)

```bash
npm run meta-bridge:dev
```

### Production Mode

```bash
npm run meta-bridge
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║     Meta → Lark Bridge Server                             ║
╠═══════════════════════════════════════════════════════════╣
║  Status: 🟢 RUNNING                                        ║
║  Server: http://localhost:3003                            ║
║                                                           ║
║  Endpoints:                                               ║
║  - GET  /health        Health check                       ║
║  - GET  /webhook/meta  Meta webhook verification          ║
║  - POST /webhook/meta  Meta events (Messenger + Instagram)║
║                                                           ║
║  Platforms:                                               ║
║  - 📨 Facebook Messenger                                  ║
║  - 📷 Instagram DM                                        ║
║  - 💬 Lark Chat ID: oc_xxxxx...                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Setup Meta Webhook

### 1. Expose Local Server (Development)

```bash
# In a new terminal
ngrok http 3003
```

Copy the `https://` URL (e.g., `https://abc123.ngrok.io`)

### 2. Configure Meta Webhook

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your app
3. Navigate to **Webhooks** → **Add Callback URL**
4. Enter:
   - **Callback URL**: `https://abc123.ngrok.io/webhook/meta`
   - **Verify Token**: Your `META_VERIFY_TOKEN` value
5. Click **Verify and Save**

### 3. Subscribe to Events

For **Messenger**:
- Subscribe to `messages` field
- Subscribe to `messaging_postbacks` field (optional)

For **Instagram**:
- Subscribe to `messages` field
- Subscribe to `messaging_postbacks` field (optional)

## Testing

### Health Check

```bash
curl http://localhost:3003/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "Meta-Lark Bridge",
  "messenger": "connected",
  "instagram": "connected",
  "timestamp": "2025-12-08T12:00:00.000Z"
}
```

### Send Test Message

1. **Facebook Messenger**: Send a message to your Facebook Page
2. **Instagram**: Send a DM to your Instagram Business Account

The message should appear in your Lark chat with platform context:

**Facebook Messenger**:
```
**[Facebook Messenger]**
送信者ID: 1234567890
時刻: 2025-12-08T12:00:00.000Z

Hello from Messenger!
```

**Instagram DM**:
```
**[Instagram DM]**
送信者ID: 9876543210
時刻: 2025-12-08T12:00:00.000Z

Hello from Instagram!
```

## Webhook Verification

The server automatically handles Meta's webhook verification:

```bash
GET /webhook/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

Returns the challenge string if the verify token matches.

## Message Flow

1. User sends message on Facebook/Instagram
2. Meta sends POST request to `/webhook/meta`
3. Server detects platform (`object` field: `page` or `instagram`)
4. Message is formatted with platform context
5. Message is forwarded to Lark chat
6. Server logs success/failure

## Troubleshooting

### Webhook Verification Fails

- Check that `META_VERIFY_TOKEN` matches the token in Meta Developer Console
- Ensure ngrok is running and URL is correct
- Check server logs for verification attempts

### Messages Not Forwarding to Lark

- Verify `LARK_CHAT_ID` is correct
- Check Lark app has `im:message` and `im:message:send_as_bot` permissions
- Check server logs for Lark API errors

### Configuration Validation Errors

The server validates all required environment variables on startup:

```
❌ Configuration validation failed:
   - META_VERIFY_TOKEN is required
   - LARK_APP_ID and LARK_APP_SECRET are required
   - META_PAGE_ACCESS_TOKEN is required
```

Ensure all required variables are set in `.env`.

## Production Deployment

### Deploy to AWS Lambda

```bash
# Build TypeScript
npm run build

# Deploy using SAM
sam deploy --config-env production
```

### Environment Variables (Production)

Set the same environment variables in your production environment:
- AWS Lambda: Use AWS Secrets Manager or Parameter Store
- Heroku: Use `heroku config:set`
- Docker: Use environment file or Kubernetes secrets

## Graceful Shutdown

The server handles SIGTERM and SIGINT signals:

```bash
# Stop with Ctrl+C
# Server will close gracefully within 10 seconds
```

## Security Considerations

1. **Always use HTTPS**: Meta requires HTTPS for webhooks
2. **Keep secrets secure**: Never commit `.env` to version control
3. **Verify webhook signatures**: Meta signs requests (implement if needed)
4. **Rate limiting**: Consider adding rate limiting for production

## Related Files

- **Server**: `src/servers/meta-lark-bridge.ts`
- **Config**: `src/config/meta-bridge.config.ts`
- **Lark Client**: `src/lark/client.ts`
- **Meta Webhook Handler**: `src/meta/webhook.ts`

## Support

For issues or questions, refer to:
- [Meta Webhooks Documentation](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Lark Bot Development](https://open.larksuite.com/document/home/develop-a-bot-in-5-minutes/create-an-app)
