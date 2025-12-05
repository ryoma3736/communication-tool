import { ChannelType } from './channel';

export type ThreadStatus = 'open' | 'pending' | 'closed';
export type IdentifierType = 'line_id' | 'phone' | 'email' | 'fb_psid' | 'ig_igsid' | 'linkedin_urn' | 'webchat_id';

export interface CustomerIdentifier {
  type: IdentifierType;
  value: string;
  channel: ChannelType;
  verified: boolean;
}

export interface Customer {
  customerId: string;
  displayName: string;
  avatarUrl?: string;
  identifiers: CustomerIdentifier[];
  tags: string[];
  notes?: string;
  isVip: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  threadId: string;
  customerId: string;
  channel: ChannelType;
  externalConversationId?: string;
  status: ThreadStatus;
  assignedTo?: string;
  assignedToName?: string;
  larkGroupId?: string;
  larkMessageId?: string;
  subject?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
