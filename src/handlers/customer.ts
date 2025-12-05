import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CustomerService } from '../services/customer';
import { ThreadService } from '../services/thread';

const customerService = new CustomerService();
const threadService = new ThreadService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const pathParams = event.pathParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    switch (method) {
      case 'GET':
        if (pathParams.customerId) {
          const customer = await customerService.getById(pathParams.customerId);
          if (!customer) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Customer not found' }) };
          }
          return { statusCode: 200, body: JSON.stringify(customer) };
        }
        break;

      case 'PUT':
        if (pathParams.customerId) {
          const updated = await customerService.update(pathParams.customerId, body);
          return { statusCode: 200, body: JSON.stringify(updated) };
        }
        break;

      case 'POST':
        if (event.path.includes('/vip')) {
          await customerService.setVip(pathParams.customerId!, body.isVip);
          return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }
        if (event.path.includes('/tag')) {
          await customerService.addTag(pathParams.customerId!, body.tag);
          return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }
        break;
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  } catch (error) {
    console.error('Customer handler error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
