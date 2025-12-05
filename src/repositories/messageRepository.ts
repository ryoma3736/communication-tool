import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { UnifiedMessage } from '../types/message';

export class MessageRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const ddbClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = process.env.MESSAGES_TABLE || 'lark-hub-messages';
  }

  async getById(messageId: string): Promise<UnifiedMessage | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { message_id: messageId }
    }));
    return result.Item ? this.mapToMessage(result.Item) : null;
  }

  async findByThreadId(threadId: string, limit: number = 50): Promise<UnifiedMessage[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'thread-index',
      KeyConditionExpression: 'thread_id = :tid',
      ExpressionAttributeValues: { ':tid': threadId },
      ScanIndexForward: false,
      Limit: limit
    }));
    return (result.Items || []).map(item => this.mapToMessage(item));
  }

  async save(message: UnifiedMessage): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        message_id: message.messageId,
        thread_id: message.threadId,
        customer_id: message.customerId,
        channel: message.channel,
        direction: message.direction,
        content: message.content,
        content_type: message.contentType,
        attachments: message.attachments,
        sender_id: message.senderId,
        sender_name: message.senderName,
        sender_avatar: message.senderAvatar,
        timestamp: message.timestamp,
        status: message.status,
        external_message_id: message.externalMessageId,
        metadata: message.metadata
      }
    }));
  }

  private mapToMessage(item: Record<string, any>): UnifiedMessage {
    return {
      messageId: item.message_id,
      threadId: item.thread_id,
      customerId: item.customer_id,
      channel: item.channel,
      direction: item.direction,
      content: item.content,
      contentType: item.content_type,
      attachments: item.attachments,
      senderId: item.sender_id,
      senderName: item.sender_name,
      senderAvatar: item.sender_avatar,
      timestamp: item.timestamp,
      status: item.status,
      externalMessageId: item.external_message_id,
      metadata: item.metadata
    };
  }
}
