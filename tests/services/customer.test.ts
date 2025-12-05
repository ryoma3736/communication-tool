import { CustomerService } from '../../src/services/customer';

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn(() => ({ send: jest.fn() })) },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  QueryCommand: jest.fn()
}));

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(() => {
    service = new CustomerService();
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const input = {
        displayName: 'Test Customer',
        identifier: { type: 'line_id' as const, value: 'U123', channel: 'line' as const, verified: true }
      };
      const customer = await service.create(input);
      expect(customer.displayName).toBe('Test Customer');
    });
  });
});
