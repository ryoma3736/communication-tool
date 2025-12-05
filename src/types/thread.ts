import { ChannelType } from './channel.js';

/**
 * Thread status
 */
export enum ThreadStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  WAITING = 'waiting',
  CLOSED = 'closed',
}

/**
 * Thread priority
 */
export enum ThreadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Conversation thread
 */
export interface Thread {
  id: string;
  customerId: string;
  channelType: ChannelType;
  status: ThreadStatus;
  priority: ThreadPriority;
  subject?: string;
  assignedTo?: string;
  tags?: string[];
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Thread creation input
 */
export interface CreateThreadInput {
  customerId: string;
  channelType: ChannelType;
  subject?: string;
  priority?: ThreadPriority;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Thread update input
 */
export interface UpdateThreadInput {
  id: string;
  status?: ThreadStatus;
  priority?: ThreadPriority;
  subject?: string;
  assignedTo?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
