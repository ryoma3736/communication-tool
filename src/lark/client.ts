import * as lark from '@larksuiteoapi/node-sdk';

export interface LarkSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class LarkClient {
  private client: lark.Client;

  constructor() {
    this.client = new lark.Client({
      appId: process.env.LARK_APP_ID || '',
      appSecret: process.env.LARK_APP_SECRET || '',
      disableTokenCache: false
    });
  }

  async sendTextMessage(chatId: string, text: string): Promise<LarkSendResult> {
    try {
      const res = await this.client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          msg_type: 'text',
          content: JSON.stringify({ text })
        }
      });
      return { success: true, messageId: res.data?.message_id };
    } catch (error) {
      console.error('Lark send text error:', error);
      return { success: false, error: String(error) };
    }
  }

  async sendInteractiveCard(chatId: string, card: any): Promise<LarkSendResult> {
    try {
      const res = await this.client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: chatId,
          msg_type: 'interactive',
          content: JSON.stringify({ card })
        }
      });
      return { success: true, messageId: res.data?.message_id };
    } catch (error) {
      console.error('Lark send card error:', error);
      return { success: false, error: String(error) };
    }
  }

  async updateCard(messageId: string, card: any): Promise<LarkSendResult> {
    try {
      await this.client.im.message.patch({
        path: { message_id: messageId },
        data: { content: JSON.stringify({ card }) }
      });
      return { success: true, messageId };
    } catch (error) {
      console.error('Lark update card error:', error);
      return { success: false, error: String(error) };
    }
  }

  async replyMessage(messageId: string, text: string): Promise<LarkSendResult> {
    try {
      const res = await this.client.im.message.reply({
        path: { message_id: messageId },
        data: {
          msg_type: 'text',
          content: JSON.stringify({ text })
        }
      });
      return { success: true, messageId: res.data?.message_id };
    } catch (error) {
      console.error('Lark reply error:', error);
      return { success: false, error: String(error) };
    }
  }

  async getUserInfo(userId: string): Promise<any> {
    try {
      const res = await this.client.contact.user.get({
        path: { user_id: userId },
        params: { user_id_type: 'user_id' }
      });
      return res.data?.user;
    } catch (error) {
      console.error('Lark get user error:', error);
      return null;
    }
  }
}
