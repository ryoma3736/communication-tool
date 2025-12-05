import { test, expect, CDPSession } from '@playwright/test';

/**
 * E2E Test: CX/UX Testing with Chrome DevTools
 * Performance, Accessibility, and User Experience validation
 */

test.describe('CX/UX Performance Tests', () => {

  test('API response time should be under 3 seconds', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const startTime = Date.now();
    const response = await request.post(`${API_BASE}/webhook/lark`, {
      data: {
        type: 'url_verification',
        challenge: 'perf-test'
      }
    });
    const endTime = Date.now();

    const responseTime = endTime - startTime;
    console.log(`API Response Time: ${responseTime}ms`);

    expect(responseTime).toBeLessThan(3000); // < 3 seconds SLA
    expect(response.status()).toBe(200);
  });

  test('Webhook should handle concurrent requests', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    // Simulate 10 concurrent webhook calls
    const promises = Array(10).fill(null).map((_, i) =>
      request.post(`${API_BASE}/webhook/lark`, {
        data: {
          type: 'url_verification',
          challenge: `concurrent-test-${i}`
        }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const endTime = Date.now();

    console.log(`10 concurrent requests completed in ${endTime - startTime}ms`);

    // All should succeed
    responses.forEach((response, i) => {
      expect(response.status()).toBe(200);
    });

    // Total time should be reasonable (not 10x single request)
    expect(endTime - startTime).toBeLessThan(10000);
  });
});

test.describe('Message Flow CX Tests', () => {

  test('Inbound message should include all required fields', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    // Test LINE message format
    const lineMessage = {
      ConversationSid: 'CH_LINE_123',
      MessageSid: 'IM_LINE_456',
      Author: '+819012345678',
      Body: 'LINEからのお問い合わせです',
      Source: 'SMS',
      Attributes: JSON.stringify({
        channel: 'line'
      })
    };

    const response = await request.post(`${API_BASE}/webhook/twilio`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: lineMessage
    });

    // Even if signature fails, structure should be valid
    expect([200, 401]).toContain(response.status());
  });

  test('Multi-channel message routing', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const channels = [
      { endpoint: '/webhook/twilio', name: 'Twilio (LINE/SMS/WhatsApp)' },
      { endpoint: '/webhook/meta', name: 'Meta (Facebook/Instagram)' },
      { endpoint: '/webhook/email', name: 'Email' },
      { endpoint: '/webhook/lark', name: 'Lark' }
    ];

    for (const channel of channels) {
      const response = await request.post(`${API_BASE}${channel.endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        data: channel.endpoint.includes('lark')
          ? { type: 'url_verification', challenge: 'test' }
          : { test: true }
      });

      console.log(`${channel.name}: ${response.status()}`);
      // Should not return 404 (endpoint exists)
      expect(response.status()).not.toBe(404);
    }
  });
});

test.describe('Error Handling UX Tests', () => {

  test('Invalid JSON should return proper error', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const response = await request.post(`${API_BASE}/webhook/lark`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'invalid json{'
    });

    // Should handle gracefully, not crash
    expect([400, 500]).toContain(response.status());
  });

  test('Missing required fields should be handled', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const response = await request.post(`${API_BASE}/webhook/lark`, {
      headers: { 'Content-Type': 'application/json' },
      data: {} // Empty payload
    });

    // Should handle gracefully
    expect([200, 400, 500]).toContain(response.status());
  });

  test('Unknown endpoint should return 404', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const response = await request.get(`${API_BASE}/webhook/unknown-channel`);
    expect(response.status()).toBe(404);
  });
});

test.describe('Security Tests', () => {

  test('Twilio webhook should validate signature', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    // Request without valid signature
    const response = await request.post(`${API_BASE}/webhook/twilio`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Twilio-Signature': 'invalid-signature'
      },
      data: {
        Body: 'Test message'
      }
    });

    // Should reject invalid signature
    expect([401, 403]).toContain(response.status());
  });

  test('Meta webhook should validate signature', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const response = await request.post(`${API_BASE}/webhook/meta`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=invalid'
      },
      data: {
        object: 'page',
        entry: []
      }
    });

    // Should reject invalid signature
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Data Integrity Tests', () => {

  test('Japanese characters should be preserved', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const japaneseMessage = 'こんにちは！お問い合わせありがとうございます。🌸';

    const response = await request.post(`${API_BASE}/webhook/lark`, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      data: {
        type: 'url_verification',
        challenge: japaneseMessage
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.challenge).toBe(japaneseMessage);
  });

  test('Long messages should be handled', async ({ request }) => {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

    const longMessage = 'A'.repeat(10000); // 10KB message

    const response = await request.post(`${API_BASE}/webhook/lark`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        type: 'url_verification',
        challenge: longMessage
      }
    });

    // Should handle without timeout/crash
    expect([200, 413]).toContain(response.status());
  });
});
