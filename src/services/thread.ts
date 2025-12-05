import { v4 as uuidv4 } from 'uuid';
import { Thread, ThreadStatus } from '../types/customer';
import { ChannelType } from '../types/channel';
import { UnifiedMessage } from '../types/message';
import { ThreadRepository } from '../repositories/threadRepository';

export interface CreateThreadInput {
  customerId: string;
  channel: ChannelType;
  externalConversationId?: string;
  subject?: string;
}

export class ThreadService {
  private repository: ThreadRepository;

  constructor() {
    this.repository = new ThreadRepository();
  }

  async getById(threadId: string): Promise<Thread | null> {
    return this.repository.getById(threadId);
  }

  async getActiveThread(customerId: string, channel: ChannelType): Promise<Thread | null> {
    return this.repository.findActiveByCustomerAndChannel(customerId, channel);
  }

  async create(input: CreateThreadInput): Promise<Thread> {
    const now = new Date().toISOString();
    const thread: Thread = {
      threadId: uuidv4(),
      customerId: input.customerId,
      channel: input.channel,
      externalConversationId: input.externalConversationId,
      status: 'open',
      subject: input.subject,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await this.repository.save(thread);
    return thread;
  }

  async updateStatus(threadId: string, status: ThreadStatus): Promise<void> {
    const thread = await this.getById(threadId);
    if (!thread) throw new Error('Thread not found');

    thread.status = status;
    thread.updatedAt = new Date().toISOString();
    await this.repository.save(thread);
  }

  async assign(threadId: string, assigneeId: string, assigneeName: string): Promise<void> {
    const thread = await this.getById(threadId);
    if (!thread) throw new Error('Thread not found');

    thread.assignedTo = assigneeId;
    thread.assignedToName = assigneeName;
    thread.updatedAt = new Date().toISOString();
    await this.repository.save(thread);
  }

  async updateLastMessage(threadId: string, message: UnifiedMessage): Promise<void> {
    const thread = await this.getById(threadId);
    if (!thread) throw new Error('Thread not found');

    thread.lastMessageAt = message.timestamp;
    thread.lastMessagePreview = message.content.substring(0, 100);
    if (message.direction === 'inbound') {
      thread.unreadCount += 1;
    }
    thread.updatedAt = new Date().toISOString();
    await this.repository.save(thread);
  }

  async markAsRead(threadId: string): Promise<void> {
    const thread = await this.getById(threadId);
    if (!thread) throw new Error('Thread not found');

    thread.unreadCount = 0;
    thread.updatedAt = new Date().toISOString();
    await this.repository.save(thread);
  }

  async setLarkInfo(threadId: string, groupId: string, messageId: string): Promise<void> {
    const thread = await this.getById(threadId);
    if (!thread) throw new Error('Thread not found');

    thread.larkGroupId = groupId;
    thread.larkMessageId = messageId;
    thread.updatedAt = new Date().toISOString();
    await this.repository.save(thread);
  }

  async getByStatus(status: ThreadStatus, limit: number = 50): Promise<Thread[]> {
    return this.repository.findByStatus(status, limit);
  }
}
