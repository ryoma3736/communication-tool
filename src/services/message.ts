import { UnifiedMessage } from '../types/message';
import { MessageRepository } from '../repositories/messageRepository';

export class MessageService {
  private repository: MessageRepository;

  constructor() {
    this.repository = new MessageRepository();
  }

  async store(message: UnifiedMessage): Promise<void> {
    await this.repository.save(message);
  }

  async getById(messageId: string): Promise<UnifiedMessage | null> {
    return this.repository.getById(messageId);
  }

  async getThreadHistory(threadId: string, limit: number = 50): Promise<UnifiedMessage[]> {
    return this.repository.findByThreadId(threadId, limit);
  }

  async updateStatus(messageId: string, status: UnifiedMessage['status']): Promise<void> {
    const message = await this.getById(messageId);
    if (!message) throw new Error('Message not found');

    message.status = status;
    await this.repository.save(message);
  }
}
