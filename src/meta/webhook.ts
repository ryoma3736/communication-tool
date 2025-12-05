import { APIGatewayProxyEvent } from 'aws-lambda';
import crypto from 'crypto';
import { UnifiedMessage } from '../types/message';
import { ChannelType } from '../types/channel';

export class MetaWebhookHandler {
  verifySignature(event: APIGatewayProxyEvent): boolean {
    const signature = event.headers['X-Hub-Signature-256'] || event.headers['x-hub-signature-256'];
    if (!signature) return false;

    const appSecret = process.env.META_APP_SECRET || '';
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(event.body || '')
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  async parseEvent(event: APIGatewayProxyEvent): Promise<Partial<UnifiedMessage>[]> {
    const body = JSON.parse(event.body || '{}');
    const messages: Partial<UnifiedMessage>[] = [];

    if (!body.entry) return messages;

    for (const entry of body.entry) {
      for (const messaging of entry.messaging || []) {
        if (!messaging.message) continue;

        const channel = body.object === 'instagram' ? ChannelType.INSTAGRAM : ChannelType.FACEBOOK;
        const identifierType = channel === ChannelType.INSTAGRAM ? 'ig_igsid' : 'fb_psid';

        messages.push({
          channel,
          content: messaging.message.text || '',
          contentType: messaging.message.attachments ? 'image' : 'text',
          senderId: messaging.sender.id,
          timestamp: new Date(messaging.timestamp).toISOString(),
          externalMessageId: messaging.message.mid,
          attachments: this.parseAttachments(messaging.message.attachments),
          metadata: {
            recipientPsid: messaging.sender.id,
            pageId: entry.id
          },
          identifierType,
          identifierValue: messaging.sender.id
        } as any);
      }
    }

    return messages;
  }

  private parseAttachments(attachments?: any[]): any[] {
    if (!attachments) return [];
    return attachments.map(a => ({
      type: a.type,
      url: a.payload?.url || ''
    }));
  }
}
