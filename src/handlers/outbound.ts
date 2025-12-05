import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OutboundService } from '../services/outbound';
import { LarkWebhookHandler } from '../lark/webhooks/cardAction';

const outboundService = new OutboundService();
const larkHandler = new LarkWebhookHandler();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Outbound/Lark webhook received');

  try {
    const body = JSON.parse(event.body || '{}');

    // Lark event verification
    if (body.type === 'url_verification') {
      return {
        statusCode: 200,
        body: JSON.stringify({ challenge: body.challenge })
      };
    }

    // Parse Lark event
    const action = larkHandler.parseAction(body);

    if (action.type === 'reply') {
      const result = await outboundService.sendReply({
        threadId: action.threadId,
        content: action.content || '',
        contentType: 'text',
        operatorId: action.operatorId,
        operatorName: action.operatorName
      });

      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    }

    if (action.type === 'status_change' && action.newStatus) {
      await outboundService.updateThreadStatus(action.threadId, action.newStatus as any);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    }

    if (action.type === 'assign' && action.assigneeId && action.assigneeName) {
      await outboundService.assignThread(action.threadId, action.assigneeId, action.assigneeName);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error processing outbound:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
