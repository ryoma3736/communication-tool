import { UnifiedMessage, SendResult } from '../types/message';
import { Customer, Thread } from '../types/customer';
import { CHANNEL_COLORS, CHANNEL_ICONS } from '../types/channel';
import { LarkClient } from '../lark/client';
import { buildMessageCard } from '../lark/cards/messageCard';

export class LarkNotificationService {
  private client: LarkClient;
  private defaultGroupId: string;

  constructor() {
    this.client = new LarkClient();
    this.defaultGroupId = process.env.LARK_DEFAULT_GROUP_ID || '';
  }

  async sendMessageNotification(message: UnifiedMessage, customer: Customer, thread: Thread): Promise<void> {
    const groupId = thread.larkGroupId || this.defaultGroupId;
    if (!groupId) {
      console.warn('No Lark group configured for notifications');
      return;
    }

    const card = buildMessageCard({
      message,
      customer,
      thread,
      channelIcon: CHANNEL_ICONS[message.channel],
      channelColor: CHANNEL_COLORS[message.channel]
    });

    const result = await this.client.sendInteractiveCard(groupId, card);
    
    if (result.messageId && !thread.larkMessageId) {
      // Store Lark message ID in thread for later updates
      const { ThreadService } = await import('./thread');
      const threadService = new ThreadService();
      await threadService.setLarkInfo(thread.threadId, groupId, result.messageId);
    }
  }

  async updateMessageStatus(thread: Thread, result: SendResult): Promise<void> {
    if (!thread.larkMessageId) return;

    const statusEmoji = result.success ? '✅' : '❌';
    const statusText = result.success ? '送信完了' : `送信失敗: ${result.error}`;

    await this.client.updateCard(thread.larkMessageId, {
      elements: [{
        tag: 'note',
        elements: [{ tag: 'plain_text', content: `${statusEmoji} ${statusText}` }]
      }]
    });
  }

  async sendAlert(groupId: string, title: string, content: string, isUrgent: boolean = false): Promise<void> {
    const card = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: title },
        template: isUrgent ? 'red' : 'blue'
      },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content } }
      ]
    };

    await this.client.sendInteractiveCard(groupId, card);
  }
}
