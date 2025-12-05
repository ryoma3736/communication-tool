import axios from 'axios';
import { Thread } from '../types/customer';
import { SendResult } from '../types/message';

export class LinkedInClient {
  private accessToken: string;
  private apiVersion = 'v2';

  constructor() {
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN || '';
  }

  async sendMessage(thread: Thread, content: string): Promise<SendResult> {
    try {
      const recipientUrn = thread.metadata?.recipientUrn || thread.externalConversationId;
      if (!recipientUrn) {
        return { success: false, error: 'No recipient URN', timestamp: new Date().toISOString() };
      }

      const url = `https://api.linkedin.com/${this.apiVersion}/messages`;
      
      const payload = {
        recipients: [recipientUrn],
        subject: 'Message from support',
        body: content
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      return {
        success: true,
        externalMessageId: response.data.id,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('LinkedIn send error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getProfile(urn: string): Promise<any> {
    try {
      const url = `https://api.linkedin.com/${this.apiVersion}/people/${urn}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('LinkedIn get profile error:', error);
      return null;
    }
  }
}
