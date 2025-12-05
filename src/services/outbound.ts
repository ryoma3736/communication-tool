import { v4 as uuidv4 } from 'uuid';
import { UnifiedMessage, OutboundMessageRequest, SendResult } from '../types/message';
import { ThreadStatus, Thread } from '../types/customer';
import { ChannelType, CHANNEL_PROVIDERS } from '../types/channel';
import { ThreadService } from './thread';
import { MessageService } from './message';
import { TwilioClient } from '../twilio/client';
import { MetaClient } from '../meta/client';
import { LinkedInClient } from '../linkedin/client';
import { LarkNotificationService } from './larkNotification';

export class OutboundService {
  private threadService: ThreadService;
  private messageService: MessageService;
  private twilioClient: TwilioClient;
  private metaClient: MetaClient;
  private linkedInClient: LinkedInClient;
  private larkService: LarkNotificationService;

  constructor() {
    this.threadService = new ThreadService();
    this.messageService = new MessageService();
    this.twilioClient = new TwilioClient();
    this.metaClient = new MetaClient();
    this.linkedInClient = new LinkedInClient();
    this.larkService = new LarkNotificationService();
  }

  async sendReply(request: OutboundMessageRequest): Promise<SendResult> {
    console.log('Sending reply to thread:', request.threadId);

    // 1. Get thread info
    const thread = await this.threadService.getById(request.threadId);
    if (!thread) {
      return { success: false, error: 'Thread not found', timestamp: new Date().toISOString() };
    }

    // 2. Route to appropriate channel
    const provider = CHANNEL_PROVIDERS[thread.channel];
    let sendResult: SendResult;

    try {
      switch (provider) {
        case 'twilio':
          sendResult = await this.twilioClient.sendMessage(thread, request.content, request.attachments);
          break;
        case 'meta':
          sendResult = await this.metaClient.sendMessage(thread, request.content, request.attachments);
          break;
        case 'linkedin':
          sendResult = await this.linkedInClient.sendMessage(thread, request.content);
          break;
        default:
          sendResult = { success: false, error: 'Unsupported channel', timestamp: new Date().toISOString() };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      sendResult = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }

    // 3. Store outbound message
    if (sendResult.success) {
      const message: UnifiedMessage = {
        messageId: uuidv4(),
        threadId: thread.threadId,
        customerId: thread.customerId,
        channel: thread.channel,
        direction: 'outbound',
        content: request.content,
        contentType: request.contentType || 'text',
        attachments: request.attachments,
        senderId: request.operatorId,
        senderName: request.operatorName,
        timestamp: new Date().toISOString(),
        status: 'sent',
        externalMessageId: sendResult.externalMessageId
      };

      await this.messageService.store(message);
      await this.threadService.updateLastMessage(thread.threadId, message);
    }

    // 4. Update Lark card with result
    await this.larkService.updateMessageStatus(thread, sendResult);

    return sendResult;
  }

  async updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
    await this.threadService.updateStatus(threadId, status);
  }

  async assignThread(threadId: string, assigneeId: string, assigneeName: string): Promise<void> {
    await this.threadService.assign(threadId, assigneeId, assigneeName);
  }
}
