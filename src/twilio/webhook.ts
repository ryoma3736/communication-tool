import { APIGatewayProxyEvent } from 'aws-lambda';
import crypto from 'crypto';
import { UnifiedMessage } from '../types/message';
import { ChannelType } from '../types/channel';

export class TwilioWebhookHandler {
  verifySignature(event: APIGatewayProxyEvent): boolean {
    const signature = event.headers['X-Twilio-Signature'] || event.headers['x-twilio-signature'];
    if (!signature) return false;

    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const url = `https://${event.headers.Host}${event.path}`;
    const params = new URLSearchParams(event.body || '');
    
    // Sort params and create string
    const sortedParams = Array.from(params.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}${v}`)
      .join('');
    
    const data = url + sortedParams;
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(data)
      .digest('base64');

    return signature === expectedSignature;
  }

  async parseEvent(event: APIGatewayProxyEvent): Promise<Partial<UnifiedMessage>[]> {
    const body = new URLSearchParams(event.body || '');
    const messages: Partial<UnifiedMessage>[] = [];

    const eventType = body.get('EventType');
    
    if (eventType === 'onMessageAdded') {
      const channel = this.detectChannel(body.get('Source') || '');
      
      messages.push({
        channel,
        content: body.get('Body') || '',
        contentType: body.get('MediaContentType0') ? 'image' : 'text',
        senderId: body.get('Author') || '',
        senderName: body.get('ParticipantSid') || undefined,
        timestamp: body.get('DateCreated') || new Date().toISOString(),
        externalMessageId: body.get('MessageSid') || '',
        attachments: this.parseMedia(body),
        metadata: {
          conversationSid: body.get('ConversationSid'),
          participantSid: body.get('ParticipantSid'),
          attributes: body.get('Attributes')
        },
        identifierType: this.getIdentifierType(channel),
        identifierValue: body.get('Author') || ''
      } as any);
    }

    return messages;
  }

  private detectChannel(source: string): ChannelType {
    const sourceMap: Record<string, ChannelType> = {
      'line': ChannelType.LINE,
      'sms': ChannelType.SMS,
      'whatsapp': ChannelType.WHATSAPP,
      'chat': ChannelType.WEBCHAT
    };
    return sourceMap[source.toLowerCase()] || ChannelType.WEBCHAT;
  }

  private getIdentifierType(channel: ChannelType): string {
    const map: Record<ChannelType, string> = {
      [ChannelType.LINE]: 'line_id',
      [ChannelType.SMS]: 'phone',
      [ChannelType.WHATSAPP]: 'phone',
      [ChannelType.WEBCHAT]: 'webchat_id',
      [ChannelType.EMAIL]: 'email',
      [ChannelType.FACEBOOK]: 'fb_psid',
      [ChannelType.INSTAGRAM]: 'ig_igsid',
      [ChannelType.LINKEDIN]: 'linkedin_urn'
    };
    return map[channel];
  }

  private parseMedia(body: URLSearchParams): any[] {
    const attachments = [];
    let i = 0;
    while (body.get(`MediaContentType${i}`)) {
      attachments.push({
        type: body.get(`MediaContentType${i}`)?.startsWith('image') ? 'image' : 'file',
        url: body.get(`MediaUrl${i}`) || '',
        mimeType: body.get(`MediaContentType${i}`)
      });
      i++;
    }
    return attachments;
  }
}
