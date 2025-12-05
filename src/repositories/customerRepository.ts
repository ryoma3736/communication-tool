import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Customer, IdentifierType } from '../types/customer';

export class CustomerRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const ddbClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = process.env.CUSTOMERS_TABLE || 'lark-hub-customers';
  }

  async getById(customerId: string): Promise<Customer | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { customer_id: customerId }
    }));

    return result.Item ? this.mapToCustomer(result.Item) : null;
  }

  async findByIdentifier(type: IdentifierType, value: string): Promise<Customer | null> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'identifier-index',
      KeyConditionExpression: 'identifier_type = :type AND identifier_value = :value',
      ExpressionAttributeValues: {
        ':type': type,
        ':value': value
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) return null;
    return this.mapToCustomer(result.Items[0]);
  }

  async save(customer: Customer): Promise<void> {
    // Save main record
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        customer_id: customer.customerId,
        display_name: customer.displayName,
        avatar_url: customer.avatarUrl,
        identifiers: customer.identifiers,
        tags: customer.tags,
        notes: customer.notes,
        is_vip: customer.isVip,
        metadata: customer.metadata,
        created_at: customer.createdAt,
        updated_at: customer.updatedAt,
        // GSI attributes for each identifier
        identifier_type: customer.identifiers[0]?.type,
        identifier_value: customer.identifiers[0]?.value
      }
    }));

    // Save additional identifier index records if needed
    for (let i = 1; i < customer.identifiers.length; i++) {
      const id = customer.identifiers[i];
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          customer_id: `${customer.customerId}#${id.type}#${id.value}`,
          identifier_type: id.type,
          identifier_value: id.value,
          primary_customer_id: customer.customerId
        }
      }));
    }
  }

  private mapToCustomer(item: Record<string, any>): Customer {
    return {
      customerId: item.customer_id,
      displayName: item.display_name,
      avatarUrl: item.avatar_url,
      identifiers: item.identifiers || [],
      tags: item.tags || [],
      notes: item.notes,
      isVip: item.is_vip || false,
      metadata: item.metadata,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
  }
}
