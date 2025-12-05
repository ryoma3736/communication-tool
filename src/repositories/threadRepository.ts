import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Thread, ThreadStatus } from '../types/customer';
import { ChannelType } from '../types/channel';

export class ThreadRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const ddbClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = process.env.THREADS_TABLE || 'lark-hub-threads';
  }

  async getById(threadId: string): Promise<Thread | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { thread_id: threadId }
    }));

    return result.Item ? this.mapToThread(result.Item) : null;
  }

  async findActiveByCustomerAndChannel(customerId: string, channel: ChannelType): Promise<Thread | null> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'customer-index',
      KeyConditionExpression: 'customer_id = :cid',
      FilterExpression: 'channel = :channel AND #status <> :closed',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':cid': customerId,
        ':channel': channel,
        ':closed': 'closed'
      },
      ScanIndexForward: false,
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) return null;
    return this.mapToThread(result.Items[0]);
  }

  async findByStatus(status: ThreadStatus, limit: number): Promise<Thread[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      ScanIndexForward: false,
      Limit: limit
    }));

    return (result.Items || []).map(item => this.mapToThread(item));
  }

  async save(thread: Thread): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        thread_id: thread.threadId,
        customer_id: thread.customerId,
        channel: thread.channel,
        external_conversation_id: thread.externalConversationId,
        status: thread.status,
        assigned_to: thread.assignedTo,
        assigned_to_name: thread.assignedToName,
        lark_group_id: thread.larkGroupId,
        lark_message_id: thread.larkMessageId,
        subject: thread.subject,
        last_message_at: thread.lastMessageAt,
        last_message_preview: thread.lastMessagePreview,
        unread_count: thread.unreadCount,
        metadata: thread.metadata,
        created_at: thread.createdAt,
        updated_at: thread.updatedAt
      }
    }));
  }

  private mapToThread(item: Record<string, any>): Thread {
    return {
      threadId: item.thread_id,
      customerId: item.customer_id,
      channel: item.channel,
      externalConversationId: item.external_conversation_id,
      status: item.status,
      assignedTo: item.assigned_to,
      assignedToName: item.assigned_to_name,
      larkGroupId: item.lark_group_id,
      larkMessageId: item.lark_message_id,
      subject: item.subject,
      lastMessageAt: item.last_message_at,
      lastMessagePreview: item.last_message_preview,
      unreadCount: item.unread_count || 0,
      metadata: item.metadata,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
  }
}
