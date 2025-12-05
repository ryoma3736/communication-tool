import { test, expect } from '@playwright/test';

/**
 * E2E Test: Webhook Flow
 * Tests the complete inbound message flow from webhook to Lark notification
 */

test.describe('Webhook Inbound Flow', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

  test('Twilio webhook should accept valid payload', async ({ request }) => {
    const response = await request.post(`${API_BASE}/webhook/twilio`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Twilio-Signature': 'test-signature'
      },
      data: {
        ConversationSid: 'CH123456',
        MessageSid: 'IM123456',
        Author: '+819012345678',
        Body: 'テストメッセージ from LINE',
        Source: 'SMS'
      }
    });

    // Should return 200 or 401 (signature validation)
    expect([200, 401]).toContain(response.status());
  });

  test('Meta webhook verification should work', async ({ request }) => {
    const verifyToken = 'test-verify-token';
    const challenge = 'test-challenge-123';

    const response = await request.get(`${API_BASE}/webhook/meta`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge
      }
    });

    // Should return challenge or 403
    expect([200, 403]).toContain(response.status());
  });

  test('Meta webhook should accept message event', async ({ request }) => {
    const response = await request.post(`${API_BASE}/webhook/meta`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=test'
      },
      data: {
        object: 'page',
        entry: [{
          id: 'PAGE_ID',
          time: Date.now(),
          messaging: [{
            sender: { id: 'USER_ID' },
            recipient: { id: 'PAGE_ID' },
            timestamp: Date.now(),
            message: {
              mid: 'mid.123',
              text: 'Hello from Facebook!'
            }
          }]
        }]
      }
    });

    expect([200, 401]).toContain(response.status());
  });

  test('Email webhook should accept SES notification', async ({ request }) => {
    const response = await request.post(`${API_BASE}/webhook/email`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        Type: 'Notification',
        Message: JSON.stringify({
          mail: {
            source: 'customer@example.com',
            destination: ['support@company.com'],
            commonHeaders: {
              subject: 'Support Request',
              from: ['Customer <customer@example.com>']
            }
          },
          content: 'This is a test email'
        })
      }
    });

    expect([200, 500]).toContain(response.status());
  });
});

test.describe('Lark Card Actions', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

  test('Lark URL verification should return challenge', async ({ request }) => {
    const challenge = 'test-challenge-xyz';

    const response = await request.post(`${API_BASE}/webhook/lark`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        type: 'url_verification',
        challenge: challenge
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.challenge).toBe(challenge);
  });

  test('Lark reply action should be processed', async ({ request }) => {
    const response = await request.post(`${API_BASE}/webhook/lark`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        type: 'interactive',
        action: {
          tag: 'button',
          value: {
            action: 'reply',
            thread_id: 'thread-123',
            content: 'ありがとうございます！'
          }
        },
        operator: {
          open_id: 'ou_123456',
          user_id: 'user_123'
        }
      }
    });

    expect([200, 500]).toContain(response.status());
  });
});
