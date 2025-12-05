import { APIGatewayProxyEvent } from 'aws-lambda';
import { UnifiedMessage } from '../types/message';
import { ChannelType } from '../types/channel';

export class LinkedInWebhookHandler {
  async parseEvent(event: APIGatewayProxyEvent): Promise<Partial<UnifiedMessage>[]> {
    const body = JSON.parse(event.body || '{}');
    const messages: Partial<UnifiedMessage>[] = [];

    // LinkedIn webhook format
    if (body.eventType === 'MESSAGE_RECEIVED') {
      messages.push({
        channel: ChannelType.LINKEDIN,
        content: body.message?.text || '',
        contentType: 'text',
        senderId: body.sender?.urn || '',
        senderName: body.sender?.name,
        timestamp: new Date(body.timestamp || Date.now()).toISOString(),
        externalMessageId: body.messageId,
        metadata: {
          recipientUrn: body.sender?.urn,
          conversationId: body.conversationId
        },
        identifierType: 'linkedin_urn',
        identifierValue: body.sender?.urn || ''
      } as any);
    }

    return messages;
  }
}
