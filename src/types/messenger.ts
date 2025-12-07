/**
 * Facebook Messenger Webhook Type Definitions
 *
 * Complete type definitions for Messenger Platform Webhook events.
 * Covers all message types, attachment formats, and webhook structures.
 *
 * @module types/messenger
 * @see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events
 *
 * @example
 * ```typescript
 * import { MessengerWebhookEvent, MessengerMessage } from './types/messenger';
 *
 * function handleWebhook(event: MessengerWebhookEvent) {
 *   event.entry.forEach(entry => {
 *     entry.messaging?.forEach(message => {
 *       console.log('Received message:', message.message?.text);
 *     });
 *   });
 * }
 * ```
 */

/**
 * Messenger User Profile Information
 */
export interface MessengerUser {
  /** Page-scoped ID (PSID) for the sender */
  id: string;
}

/**
 * Messenger Sender Information with extended profile
 */
export interface MessengerSender extends MessengerUser {
  /** User's first name (requires user profile permission) */
  first_name?: string;
  /** User's last name (requires user profile permission) */
  last_name?: string;
  /** User's profile picture URL (requires user profile permission) */
  profile_pic?: string;
  /** User's locale (e.g., "en_US") */
  locale?: string;
  /** User's timezone offset from UTC */
  timezone?: number;
  /** User's gender */
  gender?: string;
}

/**
 * Text Message Content
 */
export interface MessengerTextMessage {
  /** Unique message ID */
  mid: string;
  /** Text content of the message */
  text: string;
  /** Optional quick reply payload (if user clicked quick reply) */
  quick_reply?: {
    payload: string;
  };
}

/**
 * Attachment Payload Types
 */
export interface MessengerAttachmentPayload {
  /** URL of the attachment (for image, video, audio, file) */
  url?: string;
  /** Coordinates (for location attachments) */
  coordinates?: {
    lat: number;
    long: number;
  };
  /** Title (for location attachments) */
  title?: string;
  /** Template type (for template attachments) */
  template_type?: 'button' | 'generic' | 'receipt' | 'media';
  /** Sticker ID (for sticker attachments) */
  sticker_id?: number;
}

/**
 * Message Attachment
 */
export interface MessengerAttachment {
  /** Attachment type */
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'template' | 'fallback';
  /** Attachment payload */
  payload: MessengerAttachmentPayload;
}

/**
 * Complete Message Object
 */
export interface MessengerMessage {
  /** Unique message ID */
  mid: string;
  /** Text content (if text message) */
  text?: string;
  /** Attachments (images, videos, files, etc.) */
  attachments?: MessengerAttachment[];
  /** Quick reply payload (if user clicked quick reply button) */
  quick_reply?: {
    payload: string;
  };
  /** Reply to message ID (if this is a reply) */
  reply_to?: {
    mid: string;
  };
  /** Message metadata */
  metadata?: string;
  /** Sticker ID (if sticker message) */
  sticker_id?: number;
}

/**
 * Postback Event (when user clicks button)
 */
export interface MessengerPostback {
  /** Postback title */
  title: string;
  /** Postback payload */
  payload: string;
  /** Referral information (if from ad or m.me link) */
  referral?: {
    ref: string;
    source: string;
    type: string;
  };
}

/**
 * Message Read Event
 */
export interface MessengerRead {
  /** Watermark timestamp - all messages before this were read */
  watermark: number;
}

/**
 * Message Delivered Event
 */
export interface MessengerDelivery {
  /** Array of delivered message IDs */
  mids?: string[];
  /** Watermark timestamp - all messages before this were delivered */
  watermark: number;
}

/**
 * Opt-in Event (when user opts in via checkbox plugin or customer matching)
 */
export interface MessengerOptin {
  /** Data-ref parameter from checkbox plugin */
  ref?: string;
  /** User ref from customer matching */
  user_ref?: string;
  /** Type of opt-in (e.g., "notification_messages") */
  type?: string;
  /** Notification messages frequency */
  notification_messages_frequency?: string;
  /** Notification messages status */
  notification_messages_status?: string;
  /** Token frequency */
  token_expiry_timestamp?: number;
  /** Payload */
  payload?: string;
}

/**
 * Referral Event (when user comes from ad or m.me link)
 */
export interface MessengerReferral {
  /** Referral source (e.g., "SHORTLINK", "ADS") */
  source: string;
  /** Referral type (e.g., "OPEN_THREAD") */
  type: string;
  /** Referral ref parameter */
  ref?: string;
  /** Ad ID (if from ad) */
  ad_id?: string;
}

/**
 * Account Linking Event
 */
export interface MessengerAccountLinking {
  /** Account linking status ("linked" or "unlinked") */
  status: 'linked' | 'unlinked';
  /** Authorization code (if status is "linked") */
  authorization_code?: string;
}

/**
 * Policy Enforcement Event
 */
export interface MessengerPolicyEnforcement {
  /** Action taken (e.g., "block", "unblock") */
  action: string;
  /** Reason for enforcement */
  reason: string;
}

/**
 * Reaction Event (when user reacts to a message)
 */
export interface MessengerReaction {
  /** Reaction type (emoji) */
  reaction?: 'smile' | 'angry' | 'sad' | 'wow' | 'love' | 'like' | 'dislike';
  /** Emoji unicode (for custom reactions) */
  emoji?: string;
  /** Action ("react" or "unreact") */
  action: 'react' | 'unreact';
  /** Message ID that was reacted to */
  mid: string;
}

/**
 * Messaging Event (core webhook payload)
 */
export interface MessengerMessagingEvent {
  /** Sender information */
  sender: MessengerUser;
  /** Recipient information (page) */
  recipient: MessengerUser;
  /** Timestamp of the event (milliseconds since epoch) */
  timestamp: number;

  /** Message object (if message event) */
  message?: MessengerMessage;
  /** Postback object (if postback event) */
  postback?: MessengerPostback;
  /** Read object (if read event) */
  read?: MessengerRead;
  /** Delivery object (if delivery event) */
  delivery?: MessengerDelivery;
  /** Opt-in object (if opt-in event) */
  optin?: MessengerOptin;
  /** Referral object (if referral event) */
  referral?: MessengerReferral;
  /** Account linking object (if account linking event) */
  account_linking?: MessengerAccountLinking;
  /** Policy enforcement object (if policy enforcement event) */
  policy_enforcement?: MessengerPolicyEnforcement;
  /** Reaction object (if reaction event) */
  reaction?: MessengerReaction;
}

/**
 * Standby Channel Event (when page is in standby mode)
 */
export interface MessengerStandbyEvent extends MessengerMessagingEvent {
  /** Indicates this is a standby event */
  _standby?: boolean;
}

/**
 * Webhook Entry (contains one or more messaging events)
 */
export interface MessengerWebhookEntry {
  /** Page ID */
  id: string;
  /** Time of the update (milliseconds since epoch) */
  time: number;
  /** Array of messaging events */
  messaging?: MessengerMessagingEvent[];
  /** Array of standby events */
  standby?: MessengerStandbyEvent[];
}

/**
 * Complete Webhook Event from Messenger Platform
 */
export interface MessengerWebhookEvent {
  /** Always "page" for Messenger webhooks */
  object: 'page';
  /** Array of entries (one per page) */
  entry: MessengerWebhookEntry[];
}

/**
 * Webhook Verification Request (GET request from Facebook)
 */
export interface MessengerWebhookVerification {
  /** Challenge string to echo back */
  'hub.challenge': string;
  /** Verification token to validate */
  'hub.verify_token': string;
  /** Mode (always "subscribe") */
  'hub.mode': 'subscribe';
}

/**
 * Parsed Message Information (simplified for internal use)
 */
export interface ParsedMessengerMessage {
  /** Page-scoped ID (PSID) of the sender */
  senderId: string;
  /** Page-scoped ID (PSID) of the recipient (page) */
  recipientId: string;
  /** Message ID */
  messageId: string;
  /** Message text content */
  text?: string;
  /** Attachments */
  attachments?: {
    type: string;
    url?: string;
    coordinates?: { lat: number; long: number };
    title?: string;
  }[];
  /** Timestamp */
  timestamp: Date;
  /** Event type */
  eventType: 'message' | 'postback' | 'read' | 'delivery' | 'optin' | 'referral' | 'reaction';
  /** Postback payload (if postback) */
  postbackPayload?: string;
  /** Quick reply payload (if quick reply) */
  quickReplyPayload?: string;
  /** Reaction (if reaction event) */
  reaction?: {
    emoji?: string;
    action: 'react' | 'unreact';
    targetMessageId: string;
  };
  /** Sender profile information */
  senderProfile?: {
    firstName?: string;
    lastName?: string;
    profilePic?: string;
  };
}

/**
 * Webhook Handler Configuration
 */
export interface MessengerWebhookConfig {
  /** Meta App Secret for signature verification */
  appSecret: string;
  /** Webhook verification token */
  verifyToken: string;
  /** Page Access Token for API calls */
  pageAccessToken: string;
  /** Page ID */
  pageId: string;
}

/**
 * Webhook Validation Result
 */
export interface MessengerWebhookValidation {
  /** Whether the webhook signature is valid */
  isValid: boolean;
  /** Error message (if validation failed) */
  error?: string;
  /** Signature algorithm used */
  algorithm?: 'sha256' | 'sha1';
}
