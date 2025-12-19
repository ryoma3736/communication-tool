/**
 * Instagram Messaging API Type Definitions
 *
 * Type definitions for Instagram Direct Messages webhook events
 * and message formats used by Meta's Instagram Messaging API.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/instagram
 * @see https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook
 *
 * @module instagram
 */

import { ChannelType } from './channel';
import { ContentType, MessageAttachment } from './message';

/**
 * Instagram webhook event object type
 */
export type InstagramObjectType = 'instagram';

/**
 * Instagram message type
 */
export type InstagramMessageType =
  | 'text'           // Regular text message
  | 'image'          // Image attachment
  | 'video'          // Video attachment
  | 'audio'          // Audio/voice message
  | 'file'           // File attachment
  | 'story_reply'    // Reply to Instagram Story
  | 'story_mention'  // Mention in Instagram Story
  | 'reel_share'     // Shared reel
  | 'like'           // Like/heart emoji
  | 'unsupported';   // Unsupported message type

/**
 * Instagram account type
 * Only Professional accounts (Business or Creator) can use Messaging API
 */
export type InstagramAccountType = 'BUSINESS' | 'CREATOR' | 'PERSONAL';

/**
 * Instagram sender information
 */
export interface InstagramSender {
  /** Instagram-scoped ID (IGSID) */
  id: string;
  /** Instagram username (e.g., @username) */
  username?: string;
  /** Profile picture URL */
  profile_pic?: string;
  /** Display name */
  name?: string;
}

/**
 * Instagram story mention metadata
 */
export interface InstagramStoryMention {
  /** Story ID */
  story_id: string;
  /** Mentioned user ID */
  mentioned_user_id?: string;
  /** Story media URL */
  media_url?: string;
}

/**
 * Instagram story reply metadata
 */
export interface InstagramStoryReply {
  /** Story ID being replied to */
  story_id: string;
  /** Story media URL */
  media_url?: string;
  /** Story media type (photo/video) */
  media_type?: 'photo' | 'video';
}

/**
 * Instagram message attachment
 */
export interface InstagramAttachment {
  /** Attachment type */
  type: 'image' | 'video' | 'audio' | 'file' | 'fallback';
  /** Attachment payload */
  payload: {
    /** Media URL */
    url?: string;
    /** Story ID (for story replies/mentions) */
    story_id?: string;
    /** Product ID (for product shares) */
    product_id?: string;
    /** Title (for fallback attachments) */
    title?: string;
  };
}

/**
 * Instagram message data
 */
export interface InstagramMessage {
  /** Message ID (MID) */
  mid: string;
  /** Message text content */
  text?: string;
  /** Message attachments */
  attachments?: InstagramAttachment[];
  /** Quick reply payload */
  quick_reply?: {
    payload: string;
  };
  /** Story reply metadata */
  reply_to?: {
    story: InstagramStoryReply;
  };
  /** Is this message deleted */
  is_deleted?: boolean;
  /** Is this an echo (sent by page) */
  is_echo?: boolean;
}

/**
 * Instagram messaging entry
 */
export interface InstagramMessagingEntry {
  /** Instagram sender */
  sender: InstagramSender;
  /** Instagram recipient (page) */
  recipient: {
    id: string;
  };
  /** Timestamp (Unix milliseconds) */
  timestamp: number;
  /** Message data */
  message?: InstagramMessage;
  /** Postback data (button clicks) */
  postback?: {
    title: string;
    payload: string;
    mid?: string;
  };
  /** Read receipt */
  read?: {
    mid: string;
  };
  /** Delivery receipt */
  delivery?: {
    mids: string[];
    watermark: number;
  };
  /** Reaction */
  reaction?: {
    mid: string;
    action: 'react' | 'unreact';
    reaction?: string;
    emoji?: string;
  };
}

/**
 * Instagram webhook entry
 */
export interface InstagramWebhookEntry {
  /** Instagram account ID */
  id: string;
  /** Entry timestamp (Unix milliseconds) */
  time: number;
  /** Messaging events */
  messaging: InstagramMessagingEntry[];
  /** Changes (for other event types) */
  changes?: Array<{
    field: string;
    value: any;
  }>;
}

/**
 * Instagram webhook event payload
 */
export interface InstagramWebhookEvent {
  /** Object type (always "instagram") */
  object: InstagramObjectType;
  /** Webhook entries */
  entry: InstagramWebhookEntry[];
}

/**
 * Instagram webhook verification request (GET)
 */
export interface InstagramWebhookVerification {
  /** Verification mode */
  'hub.mode': 'subscribe';
  /** Verification token */
  'hub.verify_token': string;
  /** Challenge string to echo back */
  'hub.challenge': string;
}

/**
 * Parsed Instagram message for internal processing
 */
export interface ParsedInstagramMessage {
  /** Unique message ID */
  messageId: string;
  /** Instagram-scoped sender ID (IGSID) */
  senderId: string;
  /** Sender username (@username) */
  senderUsername?: string;
  /** Sender profile picture */
  senderAvatar?: string;
  /** Sender display name */
  senderName?: string;
  /** Instagram account ID (page/business account) */
  recipientId: string;
  /** Message content */
  content: string;
  /** Content type */
  contentType: ContentType;
  /** Message type */
  messageType: InstagramMessageType;
  /** Attachments */
  attachments?: MessageAttachment[];
  /** Timestamp (ISO 8601) */
  timestamp: string;
  /** Channel type */
  channel: ChannelType.INSTAGRAM;
  /** Story reply metadata */
  storyReply?: InstagramStoryReply;
  /** Story mention metadata */
  storyMention?: InstagramStoryMention;
  /** Raw metadata */
  metadata: {
    /** Raw messaging entry */
    raw: InstagramMessagingEntry;
    /** Is echo message */
    isEcho?: boolean;
    /** Is deleted message */
    isDeleted?: boolean;
  };
}

/**
 * Instagram API error response
 */
export interface InstagramAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Instagram message send request
 */
export interface InstagramSendMessageRequest {
  /** Recipient Instagram-scoped ID */
  recipient: {
    id: string;
  };
  /** Message content */
  message: {
    /** Text content */
    text?: string;
    /** Attachment */
    attachment?: {
      type: 'image' | 'video' | 'audio' | 'file' | 'template';
      payload: {
        url?: string;
        is_reusable?: boolean;
      };
    };
    /** Quick replies */
    quick_replies?: Array<{
      content_type: 'text';
      title: string;
      payload: string;
    }>;
  };
  /** Messaging type (RESPONSE, UPDATE, MESSAGE_TAG) */
  messaging_type?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  /** Message tag (for messaging outside 24-hour window) */
  tag?: string;
}

/**
 * Instagram message send response
 */
export interface InstagramSendMessageResponse {
  /** Recipient ID */
  recipient_id: string;
  /** Message ID */
  message_id: string;
}

/**
 * Instagram 24-hour messaging window policy
 */
export interface InstagramMessagingWindow {
  /** Window duration in hours */
  durationHours: 24;
  /** Whether message is within window */
  isWithinWindow: boolean;
  /** Window expiration time (ISO 8601) */
  expiresAt?: string;
  /** Available message tags (if outside window) */
  availableTags?: string[];
}
