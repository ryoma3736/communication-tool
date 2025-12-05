import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LarkNotificationService } from '../services/larkNotification';

const larkService = new LarkNotificationService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Lark URL verification
    if (body.type === 'url_verification') {
      return {
        statusCode: 200,
        body: JSON.stringify({ challenge: body.challenge })
      };
    }

    // Handle different Lark event types
    const eventType = body.header?.event_type;

    switch (eventType) {
      case 'im.message.receive_v1':
        // Handle incoming message (for bot mentions, etc.)
        console.log('Received Lark message:', body.event?.message);
        break;

      case 'card.action.trigger':
        // Card action handled by outbound handler
        break;

      default:
        console.log('Unknown Lark event:', eventType);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Lark handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
