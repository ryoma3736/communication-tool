/**
 * Instagram DM Webhook Handler
 *
 * Handles Instagram Direct Message webhook events from Meta's Instagram Messaging API.
 * Implements secure webhook verification, HMAC-SHA256 signature validation,
 * and comprehensive message type parsing.
 *
 * @module instagram-webhook
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { InstagramWebhookHandler } from './webhooks/instagram-webhook';
 *
 * const app = express();
 * const handler = new InstagramWebhookHandler({
 *   verifyToken: process.env.META_VERIFY_TOKEN!,
 *   appSecret: process.env.META_APP_SECRET!,
 * });
 *
 * // Webhook verification endpoint
 * app.get('/webhook/instagram', (req, res) => {
 *   const result = handler.verifyWebhook(req.query);
 *   if (result.success) {
 *     res.status(200).send(result.challenge);
 *   } else {
 *     res.status(403).send('Forbidden');
 *   }
 * });
 *
 * // Webhook event endpoint
 * app.post('/webhook/instagram', (req, res) => {
 *   if (!handler.verifySignature(req.headers, req.body)) {
 *     return res.status(401).send('Unauthorized');
 *   }
 *
 *   const messages = handler.parseWebhookEvent(req.body);
 *   // Process messages...
 *
 *   res.status(200).send('EVENT_RECEIVED');
 * });
 * ```
 *
 * @see https://developers.facebook.com/docs/messenger-platform/instagram
 * @see https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook
 */

import crypto from 'crypto';
import { Request } from 'express';
import {
  InstagramWebhookEvent,
  InstagramWebhookVerification,
  InstagramMessagingEntry,
  ParsedInstagramMessage,
  InstagramMessageType,
  InstagramSender,
  InstagramMessage,
  InstagramMessagingWindow,
} from '../types/instagram';
import { ChannelType } from '../types/channel';
import { ContentType, MessageAttachment } from '../types/message';

/**
 * Instagram webhook handler configuration
 */
export interface InstagramWebhookConfig {
  /** Webhook verification token (must match Meta App configuration) */
  verifyToken: string;
  /** Meta App Secret (for HMAC-SHA256 signature verification) */
  appSecret: string;
  /** Instagram account ID (optional, for validation) */
  instagramAccountId?: string;
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  /** Whether verification succeeded */
  success: boolean;
  /** Challenge string to return (if success) */
  challenge?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Instagram DM Webhook Handler
 *
 * Handles Instagram Direct Message webhook events with proper security validation.
 *
 * Key features:
 * - GET webhook verification (hub.verify_token validation)
 * - POST event handling with HMAC-SHA256 signature verification
 * - Support for all Instagram message types (text, image, video, story replies, mentions)
 * - 24-hour messaging window awareness
 * - Sender metadata extraction (@username, profile picture)
 */
export class InstagramWebhookHandler {
  private config: InstagramWebhookConfig;

  /**
   * Create a new Instagram webhook handler
   *
   * @param config - Webhook configuration
   */
  constructor(config: InstagramWebhookConfig) {
    this.config = config;
  }

  /**
   * Verify webhook subscription request (GET /webhook/instagram)
   *
   * Meta sends a GET request with verification token and challenge
   * to verify webhook endpoint ownership.
   *
   * @param query - Query parameters from GET request
   * @returns Verification result
   *
   * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
   */
  verifyWebhook(query: any): WebhookVerificationResult {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    // Check if mode and token are present
    if (mode !== 'subscribe') {
      return {
        success: false,
        error: 'Invalid hub.mode (expected "subscribe")',
      };
    }

    // Verify token matches configured verify token
    if (token !== this.config.verifyToken) {
      return {
        success: false,
        error: 'Invalid verification token',
      };
    }

    // Return challenge to complete verification
    return {
      success: true,
      challenge,
    };
  }

  /**
   * Verify HMAC-SHA256 signature from X-Hub-Signature-256 header
   *
   * Meta signs webhook requests with HMAC-SHA256 using app secret.
   * This prevents unauthorized webhook calls.
   *
   * @param headers - HTTP headers from request
   * @param body - Raw request body (string or Buffer)
   * @returns Whether signature is valid
   *
   * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
   */
  verifySignature(
    headers: Record<string, string | string[] | undefined>,
    body: string | Buffer
  ): boolean {
    const signature =
      headers['x-hub-signature-256'] || headers['X-Hub-Signature-256'];

    if (!signature || typeof signature !== 'string') {
      return false;
    }

    // Compute expected signature
    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', this.config.appSecret)
        .update(body)
        .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      // timingSafeEqual throws if buffer lengths differ
      return false;
    }
  }

  /**
   * Parse Instagram webhook event payload
   *
   * Extracts and normalizes Instagram Direct Messages from webhook event.
   * Handles multiple message types:
   * - Text messages
   * - Image/Video attachments
   * - Story replies
   * - Story mentions
   * - Reactions
   *
   * @param event - Instagram webhook event payload
   * @returns Array of parsed messages
   */
  parseWebhookEvent(event: InstagramWebhookEvent): ParsedInstagramMessage[] {
    const messages: ParsedInstagramMessage[] = [];

    // Validate object type
    if (event.object !== 'instagram') {
      console.warn(
        `[InstagramWebhook] Invalid object type: ${event.object} (expected "instagram")`
      );
      return messages;
    }

    // Process each entry
    for (const entry of event.entry) {
      // Validate Instagram account ID (if configured)
      if (
        this.config.instagramAccountId &&
        entry.id !== this.config.instagramAccountId
      ) {
        console.warn(
          `[InstagramWebhook] Entry ID ${entry.id} does not match configured account ${this.config.instagramAccountId}`
        );
        continue;
      }

      // Process each messaging event
      for (const messaging of entry.messaging) {
        const parsedMessage = this.parseMessagingEntry(messaging, entry.id);
        if (parsedMessage) {
          messages.push(parsedMessage);
        }
      }
    }

    return messages;
  }

  /**
   * Parse individual messaging entry
   *
   * @param messaging - Instagram messaging entry
   * @param recipientId - Instagram account ID (recipient)
   * @returns Parsed message or null if not processable
   */
  private parseMessagingEntry(
    messaging: InstagramMessagingEntry,
    recipientId: string
  ): ParsedInstagramMessage | null {
    // Only process message events (ignore read receipts, delivery receipts, etc.)
    if (!messaging.message) {
      return null;
    }

    const message = messaging.message;

    // Skip echo messages (sent by the page itself)
    if (message.is_echo) {
      return null;
    }

    // Skip deleted messages
    if (message.is_deleted) {
      return null;
    }

    // Determine message type
    const messageType = this.determineMessageType(message);

    // Parse content and attachments
    const { content, contentType, attachments } = this.parseMessageContent(
      message,
      messageType
    );

    // Extract sender information
    const sender = messaging.sender;

    // Build parsed message
    const parsedMessage: ParsedInstagramMessage = {
      messageId: message.mid,
      senderId: sender.id,
      senderUsername: sender.username,
      senderAvatar: sender.profile_pic,
      senderName: sender.name,
      recipientId,
      content,
      contentType,
      messageType,
      attachments,
      timestamp: new Date(messaging.timestamp).toISOString(),
      channel: ChannelType.INSTAGRAM,
      metadata: {
        raw: messaging,
        isEcho: message.is_echo,
        isDeleted: message.is_deleted,
      },
    };

    // Add story reply metadata
    if (message.reply_to?.story) {
      parsedMessage.storyReply = {
        story_id: message.reply_to.story.story_id,
        media_url: message.reply_to.story.media_url,
        media_type: message.reply_to.story.media_type,
      };
    }

    return parsedMessage;
  }

  /**
   * Determine Instagram message type
   *
   * @param message - Instagram message data
   * @returns Message type
   */
  private determineMessageType(message: InstagramMessage): InstagramMessageType {
    // Story reply
    if (message.reply_to?.story) {
      return 'story_reply';
    }

    // Text message
    if (message.text && !message.attachments) {
      // Check for like/heart emoji
      if (message.text === '❤️' || message.text === '♥️') {
        return 'like';
      }
      return 'text';
    }

    // Attachments
    if (message.attachments && message.attachments.length > 0) {
      const firstAttachment = message.attachments[0];

      // Check attachment type
      switch (firstAttachment.type) {
        case 'image':
          return 'image';
        case 'video':
          return 'video';
        case 'audio':
          return 'audio';
        case 'file':
          return 'file';
        default:
          return 'unsupported';
      }
    }

    // Quick reply
    if (message.quick_reply) {
      return 'text';
    }

    return 'unsupported';
  }

  /**
   * Parse message content and attachments
   *
   * @param message - Instagram message data
   * @param messageType - Determined message type
   * @returns Content, content type, and attachments
   */
  private parseMessageContent(
    message: InstagramMessage,
    messageType: InstagramMessageType
  ): {
    content: string;
    contentType: ContentType;
    attachments?: MessageAttachment[];
  } {
    let content = message.text || '';
    let contentType: ContentType = 'text';
    let attachments: MessageAttachment[] | undefined;

    // Handle story replies
    if (message.reply_to?.story) {
      content = message.text || '[Story Reply]';
      contentType = 'text';
    }

    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      attachments = message.attachments.map((attachment) => ({
        type: this.mapAttachmentType(attachment.type),
        url: attachment.payload.url || '',
        filename: undefined,
        mimeType: undefined,
      }));

      // Set primary content type
      const firstAttachment = message.attachments[0];
      contentType = this.mapAttachmentType(firstAttachment.type);

      // If no text, use attachment type as content
      if (!content) {
        content = `[${firstAttachment.type}]`;
      }
    }

    return { content, contentType, attachments };
  }

  /**
   * Map Instagram attachment type to internal ContentType
   *
   * @param instagramType - Instagram attachment type
   * @returns Internal content type
   */
  private mapAttachmentType(
    instagramType: 'image' | 'video' | 'audio' | 'file' | 'fallback'
  ): ContentType {
    switch (instagramType) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'audio':
        return 'audio';
      case 'file':
        return 'file';
      case 'fallback':
      default:
        return 'text';
    }
  }

  /**
   * Check if message is within 24-hour messaging window
   *
   * Instagram restricts messaging to 24 hours after user's last message.
   * Outside this window, businesses can only send messages with specific tags.
   *
   * @param lastUserMessageTime - Timestamp of last user message (ISO 8601)
   * @returns Messaging window status
   *
   * @see https://developers.facebook.com/docs/messenger-platform/instagram/features/ice-breakers
   */
  checkMessagingWindow(lastUserMessageTime: string): InstagramMessagingWindow {
    const lastMessageDate = new Date(lastUserMessageTime);
    const now = new Date();
    const hoursSinceLastMessage =
      (now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60);

    const isWithinWindow = hoursSinceLastMessage < 24;
    const expiresAt = isWithinWindow
      ? new Date(lastMessageDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    return {
      durationHours: 24,
      isWithinWindow,
      expiresAt,
      availableTags: isWithinWindow
        ? undefined
        : [
            'CONFIRMED_EVENT_UPDATE',
            'POST_PURCHASE_UPDATE',
            'ACCOUNT_UPDATE',
          ],
    };
  }

  /**
   * Extract sender username from Instagram sender object
   *
   * @param sender - Instagram sender information
   * @returns Formatted username (@username) or sender ID
   */
  extractSenderUsername(sender: InstagramSender): string {
    if (sender.username) {
      return sender.username.startsWith('@')
        ? sender.username
        : `@${sender.username}`;
    }
    return sender.id;
  }

  /**
   * Validate Instagram Professional Account requirement
   *
   * Instagram Messaging API requires a Professional Account (Business or Creator).
   * Personal accounts cannot use the API.
   *
   * @param accountType - Instagram account type
   * @returns Whether account can use Messaging API
   */
  validateProfessionalAccount(accountType: string): boolean {
    return accountType === 'BUSINESS' || accountType === 'CREATOR';
  }
}

/**
 * Create Instagram webhook handler from environment variables
 *
 * @returns Configured Instagram webhook handler
 * @throws {Error} If required environment variables are missing
 */
export function createInstagramWebhookHandler(): InstagramWebhookHandler {
  const verifyToken = process.env.META_VERIFY_TOKEN;
  const appSecret = process.env.META_APP_SECRET;
  const instagramAccountId = process.env.META_INSTAGRAM_ID;

  if (!verifyToken) {
    throw new Error('Missing required environment variable: META_VERIFY_TOKEN');
  }

  if (!appSecret) {
    throw new Error('Missing required environment variable: META_APP_SECRET');
  }

  return new InstagramWebhookHandler({
    verifyToken,
    appSecret,
    instagramAccountId,
  });
}

/**
 * Express.js middleware for Instagram webhook handling
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { instagramWebhookMiddleware } from './webhooks/instagram-webhook';
 *
 * const app = express();
 * app.use('/webhook/instagram', instagramWebhookMiddleware());
 * ```
 */
export function instagramWebhookMiddleware() {
  const handler = createInstagramWebhookHandler();

  return (req: Request, res: any) => {
    // GET: Webhook verification
    if (req.method === 'GET') {
      const result = handler.verifyWebhook(req.query);
      if (result.success) {
        return res.status(200).send(result.challenge);
      } else {
        console.error(
          `[InstagramWebhook] Verification failed: ${result.error}`
        );
        return res.status(403).send('Forbidden');
      }
    }

    // POST: Webhook event
    if (req.method === 'POST') {
      // Verify signature
      const rawBody = req.body;
      if (!handler.verifySignature(req.headers, rawBody)) {
        console.error('[InstagramWebhook] Invalid signature');
        return res.status(401).send('Unauthorized');
      }

      try {
        // Parse webhook event
        const event: InstagramWebhookEvent =
          typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        const messages = handler.parseWebhookEvent(event);

        console.log(
          `[InstagramWebhook] Received ${messages.length} messages`,
          JSON.stringify(messages, null, 2)
        );

        // TODO: Process messages (save to database, forward to handlers, etc.)

        // Acknowledge receipt
        return res.status(200).send('EVENT_RECEIVED');
      } catch (error) {
        console.error('[InstagramWebhook] Error parsing event:', error);
        return res.status(500).send('Internal Server Error');
      }
    }

    // Unsupported method
    return res.status(405).send('Method Not Allowed');
  };
}
