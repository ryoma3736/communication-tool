import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { InboundService } from '../services/inbound';
import { TwilioWebhookHandler } from '../twilio/webhook';
import { MetaWebhookHandler } from '../meta/webhook';
import { LinkedInWebhookHandler } from '../linkedin/webhook';
import { EmailWebhookHandler } from '../services/email';

const inboundService = new InboundService();
const twilioHandler = new TwilioWebhookHandler();
const metaHandler = new MetaWebhookHandler();
const linkedInHandler = new LinkedInWebhookHandler();
const emailHandler = new EmailWebhookHandler();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Inbound webhook received:', JSON.stringify(event.path));

  try {
    const path = event.path;
    let normalizedMessages;

    if (path.includes('/twilio')) {
      if (!twilioHandler.verifySignature(event)) {
        return { statusCode: 401, body: 'Invalid signature' };
      }
      normalizedMessages = await twilioHandler.parseEvent(event);
    } else if (path.includes('/meta')) {
      // Meta webhook verification
      if (event.httpMethod === 'GET') {
        const params = event.queryStringParameters || {};
        if (params['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
          return { statusCode: 200, body: params['hub.challenge'] || '' };
        }
        return { statusCode: 403, body: 'Verification failed' };
      }
      if (!metaHandler.verifySignature(event)) {
        return { statusCode: 401, body: 'Invalid signature' };
      }
      normalizedMessages = await metaHandler.parseEvent(event);
    } else if (path.includes('/linkedin')) {
      normalizedMessages = await linkedInHandler.parseEvent(event);
    } else if (path.includes('/email')) {
      normalizedMessages = await emailHandler.parseEvent(event);
    } else {
      return { statusCode: 404, body: 'Unknown webhook endpoint' };
    }

    // Process each message
    for (const message of normalizedMessages) {
      if ((message as any).identifierType && (message as any).identifierValue) {
        await inboundService.processMessage(message as any);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, processed: normalizedMessages.length })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
