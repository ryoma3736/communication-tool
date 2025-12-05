/**
 * Twilio Conversations Types
 *
 * TypeScript type definitions for Twilio Conversations events and payloads
 */

/**
 * Supported channel types for Twilio Conversations
 */
export type ChannelType = 'line' | 'webchat' | 'sms' | 'whatsapp';

/**
 * Twilio Conversation Event Types
 */
export enum TwilioEventType {
  // Conversation Events
  OnConversationAdded = 'onConversationAdded',
  OnConversationRemoved = 'onConversationRemoved',
  OnConversationUpdated = 'onConversationUpdated',
  OnConversationStateUpdated = 'onConversationStateUpdated',

  // Message Events
  OnMessageAdded = 'onMessageAdded',
  OnMessageUpdated = 'onMessageUpdated',
  OnMessageRemoved = 'onMessageRemoved',

  // Participant Events
  OnParticipantAdded = 'onParticipantAdded',
  OnParticipantRemoved = 'onParticipantRemoved',
  OnParticipantUpdated = 'onParticipantUpdated',

  // Delivery Events
  OnDeliveryUpdated = 'onDeliveryUpdated',

  // Typing Events
  OnTypingStarted = 'onTypingStarted',
  OnTypingEnded = 'onTypingEnded',
}

/**
 * Base webhook event structure
 */
export interface TwilioWebhookEvent {
  EventType: string;
  AccountSid: string;
  InstanceSid?: string;
  Attributes?: string;
  DateCreated?: string;
}

/**
 * Message webhook event
 */
export interface TwilioMessageEvent extends TwilioWebhookEvent {
  EventType: TwilioEventType.OnMessageAdded;
  ConversationSid: string;
  MessageSid: string;
  ParticipantSid: string;
  Author: string;
  Body: string;
  Media?: string;
  Index: string;
  Attributes: string;
  DateCreated: string;
}

/**
 * Conversation webhook event
 */
export interface TwilioConversationEvent extends TwilioWebhookEvent {
  EventType:
    | TwilioEventType.OnConversationAdded
    | TwilioEventType.OnConversationRemoved
    | TwilioEventType.OnConversationUpdated;
  ConversationSid: string;
  ChatServiceSid: string;
  FriendlyName?: string;
  UniqueName?: string;
  State?: 'active' | 'inactive' | 'closed';
}

/**
 * Participant webhook event
 */
export interface TwilioParticipantEvent extends TwilioWebhookEvent {
  EventType:
    | TwilioEventType.OnParticipantAdded
    | TwilioEventType.OnParticipantRemoved
    | TwilioEventType.OnParticipantUpdated;
  ConversationSid: string;
  ParticipantSid: string;
  Identity?: string;
  MessagingBinding?: string;
  RoleSid?: string;
}

/**
 * Delivery status update event
 */
export interface TwilioDeliveryEvent extends TwilioWebhookEvent {
  EventType: TwilioEventType.OnDeliveryUpdated;
  ConversationSid: string;
  MessageSid: string;
  ParticipantSid: string;
  Status: 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
  ErrorCode?: string;
}

/**
 * Typing indicator event
 */
export interface TwilioTypingEvent extends TwilioWebhookEvent {
  EventType: TwilioEventType.OnTypingStarted | TwilioEventType.OnTypingEnded;
  ConversationSid: string;
  ParticipantSid: string;
}

/**
 * Union type for all webhook events
 */
export type TwilioEvent =
  | TwilioMessageEvent
  | TwilioConversationEvent
  | TwilioParticipantEvent
  | TwilioDeliveryEvent
  | TwilioTypingEvent;

/**
 * Messaging binding for different channels
 */
export interface MessagingBinding {
  type: ChannelType;
  address: string;
  proxyAddress?: string;
}

/**
 * LINE specific binding
 */
export interface LineBinding extends MessagingBinding {
  type: 'line';
  address: string; // LINE User ID
}

/**
 * WhatsApp specific binding
 */
export interface WhatsAppBinding extends MessagingBinding {
  type: 'whatsapp';
  address: string; // WhatsApp number in format: whatsapp:+1234567890
}

/**
 * SMS specific binding
 */
export interface SmsBinding extends MessagingBinding {
  type: 'sms';
  address: string; // Phone number in E.164 format
  proxyAddress: string; // Twilio phone number
}

/**
 * Webchat specific binding
 */
export interface WebchatBinding extends MessagingBinding {
  type: 'webchat';
  address: string; // User identifier (email, username, etc.)
}

/**
 * Message attributes structure
 */
export interface MessageAttributes {
  channelType: ChannelType;
  originalMessageId?: string;
  sourceUserId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Conversation attributes structure
 */
export interface ConversationAttributes {
  channelType: ChannelType;
  channelId?: string;
  sourceConversationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Participant attributes structure
 */
export interface ParticipantAttributes {
  channelType: ChannelType;
  displayName?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error response structure
 */
export interface TwilioError {
  code: number;
  message: string;
  moreInfo?: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * Channel handler interface
 */
export interface ChannelHandler {
  /**
   * Handle incoming message from this channel
   */
  handleIncomingMessage(event: TwilioMessageEvent): Promise<void>;

  /**
   * Send message to this channel
   */
  sendMessage(
    conversationSid: string,
    message: string,
    attributes?: MessageAttributes
  ): Promise<void>;

  /**
   * Handle participant joined event
   */
  handleParticipantJoined?(event: TwilioParticipantEvent): Promise<void>;

  /**
   * Handle participant left event
   */
  handleParticipantLeft?(event: TwilioParticipantEvent): Promise<void>;
}

/**
 * Twilio client configuration
 */
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  conversationsServiceSid: string;
  webhookAuthToken?: string;
  apiKeySid?: string;
  apiKeySecret?: string;
}

/**
 * Message sending options
 */
export interface SendMessageOptions {
  conversationSid: string;
  body: string;
  author?: string;
  attributes?: MessageAttributes;
  mediaUrl?: string;
  mediaSid?: string;
}

/**
 * Conversation creation options
 */
export interface CreateConversationOptions {
  friendlyName?: string;
  uniqueName?: string;
  attributes?: ConversationAttributes;
  timers?: {
    inactive?: string;
    closed?: string;
  };
}

/**
 * Participant creation options
 */
export interface AddParticipantOptions {
  conversationSid: string;
  identity?: string;
  messagingBinding?: MessagingBinding;
  attributes?: ParticipantAttributes;
  roleSid?: string;
}
