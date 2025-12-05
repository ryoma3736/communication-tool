import axios from 'axios';
import { Thread } from '../types/customer';
import { MessageAttachment, SendResult } from '../types/message';

export class MetaClient {
  private accessToken: string;
  private apiVersion = 'v18.0';

  constructor() {
    this.accessToken = process.env.META_PAGE_ACCESS_TOKEN || '';
  }

  async sendMessage(thread: Thread, content: string, attachments?: MessageAttachment[]): Promise<SendResult> {
    try {
      const recipientId = thread.metadata?.recipientPsid || thread.externalConversationId;
      if (!recipientId) {
        return { success: false, error: 'No recipient ID', timestamp: new Date().toISOString() };
      }

      const url = `https://graph.facebook.com/${this.apiVersion}/me/messages`;
      
      const payload: any = {
        recipient: { id: recipientId },
        message: { text: content }
      };

      // Handle attachments
      if (attachments?.length) {
        payload.message = {
          attachment: {
            type: attachments[0].type === 'image' ? 'image' : 'file',
            payload: { url: attachments[0].url, is_reusable: true }
          }
        };
      }

      const response = await axios.post(url, payload, {
        params: { access_token: this.accessToken }
      });

      return {
        success: true,
        externalMessageId: response.data.message_id,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Meta send error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getUserProfile(psid: string): Promise<any> {
    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${psid}`;
      const response = await axios.get(url, {
        params: {
          fields: 'first_name,last_name,profile_pic',
          access_token: this.accessToken
        }
      });
      return response.data;
    } catch (error) {
      console.error('Meta get profile error:', error);
      return null;
    }
  }
}
