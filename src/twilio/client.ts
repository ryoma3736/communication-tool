import Twilio from 'twilio';
import { Thread } from '../types/customer';
import { MessageAttachment, SendResult } from '../types/message';

export class TwilioClient {
  private client: Twilio.Twilio;
  private conversationsServiceSid: string;

  constructor() {
    this.client = Twilio(
      process.env.TWILIO_ACCOUNT_SID || '',
      process.env.TWILIO_AUTH_TOKEN || ''
    );
    this.conversationsServiceSid = process.env.TWILIO_CONVERSATIONS_SERVICE_SID || '';
  }

  async sendMessage(thread: Thread, content: string, attachments?: MessageAttachment[]): Promise<SendResult> {
    try {
      const conversationSid = thread.externalConversationId;
      if (!conversationSid) {
        return { success: false, error: 'No conversation ID', timestamp: new Date().toISOString() };
      }

      const messageData: any = { body: content };
      
      // Add media if attachments present
      if (attachments?.length) {
        messageData.mediaSid = attachments.map(a => a.url);
      }

      const message = await this.client.conversations.v1
        .services(this.conversationsServiceSid)
        .conversations(conversationSid)
        .messages
        .create(messageData);

      return {
        success: true,
        externalMessageId: message.sid,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Twilio send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getConversation(conversationSid: string): Promise<any> {
    return this.client.conversations.v1
      .services(this.conversationsServiceSid)
      .conversations(conversationSid)
      .fetch();
  }

  async getParticipants(conversationSid: string): Promise<any[]> {
    const participants = await this.client.conversations.v1
      .services(this.conversationsServiceSid)
      .conversations(conversationSid)
      .participants
      .list();
    return participants;
  }
}
