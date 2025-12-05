import { v4 as uuidv4 } from 'uuid';
import { UnifiedMessage, MessageDirection } from '../types/message';
import { CustomerService } from './customer';
import { ThreadService } from './thread';
import { MessageService } from './message';
import { LarkNotificationService } from './larkNotification';

export class InboundService {
  private customerService: CustomerService;
  private threadService: ThreadService;
  private messageService: MessageService;
  private larkService: LarkNotificationService;

  constructor() {
    this.customerService = new CustomerService();
    this.threadService = new ThreadService();
    this.messageService = new MessageService();
    this.larkService = new LarkNotificationService();
  }

  async processMessage(rawMessage: Partial<UnifiedMessage> & { identifierType: string; identifierValue: string }): Promise<void> {
    console.log('Processing inbound message:', rawMessage.channel);

    // 1. Find or create customer
    let customer = await this.customerService.findByIdentifier(
      rawMessage.identifierType as any,
      rawMessage.identifierValue
    );

    if (!customer) {
      customer = await this.customerService.create({
        displayName: rawMessage.senderName || 'Unknown',
        identifier: {
          type: rawMessage.identifierType as any,
          value: rawMessage.identifierValue,
          channel: rawMessage.channel!,
          verified: true
        },
        avatarUrl: rawMessage.senderAvatar
      });
    }

    // 2. Find or create thread
    let thread = await this.threadService.getActiveThread(customer.customerId, rawMessage.channel!);

    if (!thread) {
      thread = await this.threadService.create({
        customerId: customer.customerId,
        channel: rawMessage.channel!,
        externalConversationId: rawMessage.externalMessageId
      });
    }

    // 3. Store message
    const message: UnifiedMessage = {
      messageId: uuidv4(),
      threadId: thread.threadId,
      customerId: customer.customerId,
      channel: rawMessage.channel!,
      direction: 'inbound' as MessageDirection,
      content: rawMessage.content || '',
      contentType: rawMessage.contentType || 'text',
      attachments: rawMessage.attachments,
      senderId: rawMessage.senderId || customer.customerId,
      senderName: rawMessage.senderName || customer.displayName,
      senderAvatar: rawMessage.senderAvatar || customer.avatarUrl,
      timestamp: rawMessage.timestamp || new Date().toISOString(),
      status: 'delivered',
      externalMessageId: rawMessage.externalMessageId,
      metadata: rawMessage.metadata
    };

    await this.messageService.store(message);

    // 4. Update thread
    await this.threadService.updateLastMessage(thread.threadId, message);

    // 5. Send Lark notification
    await this.larkService.sendMessageNotification(message, customer, thread);

    console.log('Inbound message processed successfully');
  }
}
