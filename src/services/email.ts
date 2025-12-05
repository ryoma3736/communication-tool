import { APIGatewayProxyEvent } from 'aws-lambda';
import { UnifiedMessage } from '../types/message';
import { ChannelType } from '../types/channel';

export class EmailWebhookHandler {
  async parseEvent(event: APIGatewayProxyEvent): Promise<Partial<UnifiedMessage>[]> {
    const body = JSON.parse(event.body || '{}');
    const messages: Partial<UnifiedMessage>[] = [];

    // SendGrid Inbound Parse format
    if (body.from && body.to && (body.text || body.html)) {
      messages.push({
        channel: ChannelType.EMAIL,
        content: body.text || this.stripHtml(body.html),
        contentType: 'text',
        senderId: body.from,
        senderName: this.extractName(body.from),
        timestamp: new Date().toISOString(),
        externalMessageId: body.headers?.['Message-ID'],
        metadata: {
          subject: body.subject,
          to: body.to,
          cc: body.cc,
          html: body.html,
          attachments: body.attachments
        },
        identifierType: 'email',
        identifierValue: this.extractEmail(body.from)
      } as any);
    }

    return messages;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private extractName(fromField: string): string {
    const match = fromField.match(/^([^<]+)</);
    return match ? match[1].trim() : fromField;
  }

  private extractEmail(fromField: string): string {
    const match = fromField.match(/<([^>]+)>/);
    return match ? match[1] : fromField;
  }
}
