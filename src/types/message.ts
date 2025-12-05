import { ChannelType } from './channel';

export type MessageDirection = 'inbound' | 'outbound';
export type ContentType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'sticker';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageAttachment {
  type: ContentType;
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface UnifiedMessage {
  messageId: string;
  threadId: string;
  customerId: string;
  channel: ChannelType;
  direction: MessageDirection;
  content: string;
  contentType: ContentType;
  attachments?: MessageAttachment[];
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  timestamp: string;
  status: MessageStatus;
  externalMessageId?: string;
  metadata?: Record<string, unknown>;
}

export interface OutboundMessageRequest {
  threadId: string;
  content: string;
  contentType?: ContentType;
  attachments?: MessageAttachment[];
  operatorId: string;
  operatorName: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  externalMessageId?: string;
  error?: string;
  timestamp: string;
}
