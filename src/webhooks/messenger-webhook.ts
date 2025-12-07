/**
 * Facebook Messenger Webhook Handler
 *
 * Handles incoming webhook events from Facebook Messenger Platform.
 * Implements security validation (HMAC-SHA256), event parsing, and message extraction.
 *
 * @module webhooks/messenger-webhook
 * @see https://developers.facebook.com/docs/messenger-platform/webhooks
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { MessengerWebhookHandler } from './webhooks/messenger-webhook';
 *
 * const app = express();
 * const handler = new MessengerWebhookHandler({
 *   appSecret: process.env.META_APP_SECRET!,
 *   verifyToken: process.env.META_VERIFY_TOKEN!,
 *   pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN!,
 *   pageId: process.env.META_PAGE_ID!
 * });
 *
 * // Webhook verification (GET /webhook/messenger)
 * app.get('/webhook/messenger', (req, res) => {
 *   const result = handler.handleVerification(req.query);
 *   if (result.success) {
 *     res.status(200).send(result.challenge);
 *   } else {
 *     res.status(403).send('Forbidden');
 *   }
 * });
 *
 * // Webhook events (POST /webhook/messenger)
 * app.post('/webhook/messenger', express.json(), async (req, res) => {
 *   const validation = handler.validateSignature(req.headers, req.body);
 *   if (!validation.isValid) {
 *     return res.status(401).json({ error: 'Invalid signature' });
 *   }
 *
 *   const messages = handler.parseWebhookEvent(req.body);
 *   // Process messages...
 *
 *   res.status(200).send('EVENT_RECEIVED');
 * });
 * ```
 */

import crypto from 'crypto';
import {
  MessengerWebhookEvent,
  MessengerWebhookVerification,
  MessengerWebhookConfig,
  MessengerWebhookValidation,
  ParsedMessengerMessage,
  MessengerMessagingEvent,
  MessengerSender,
} from '../types/messenger';

/**
 * Facebook Messenger Webhook Handler
 *
 * Provides methods for:
 * - Webhook verification (GET request)
 * - Signature validation (HMAC-SHA256)
 * - Event parsing and message extraction
 * - Profile information enrichment
 */
export class MessengerWebhookHandler {
  private config: MessengerWebhookConfig;

  /**
   * Creates a new MessengerWebhookHandler instance
   *
   * @param config - Messenger webhook configuration
   */
  constructor(config: MessengerWebhookConfig) {
    this.config = config;
  }

  /**
   * Handle webhook verification request (GET /webhook/messenger)
   *
   * Facebook sends a GET request to verify the webhook endpoint.
   * Must respond with the challenge parameter if verify_token matches.
   *
   * @param query - Query parameters from GET request
   * @returns Verification result with challenge to echo back
   *
   * @see https://developers.facebook.com/docs/messenger-platform/webhooks#verification-requests
   *
   * @example
   * ```typescript
   * app.get('/webhook/messenger', (req, res) => {
   *   const result = handler.handleVerification(req.query);
   *   if (result.success) {
   *     res.status(200).send(result.challenge);
   *   } else {
   *     res.status(403).send('Forbidden');
   *   }
   * });
   * ```
   */
  handleVerification(query: Record<string, string | string[] | undefined>): {
    success: boolean;
    challenge?: string;
    error?: string;
  } {
    const mode = query['hub.mode'] as string;
    const token = query['hub.verify_token'] as string;
    const challenge = query['hub.challenge'] as string;

    // Verify mode is "subscribe"
    if (mode !== 'subscribe') {
      return {
        success: false,
        error: 'Invalid hub.mode (expected "subscribe")',
      };
    }

    // Verify token matches configured token
    if (!token || token !== this.config.verifyToken) {
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
   * Validate webhook signature using HMAC-SHA256
   *
   * Facebook signs all webhook requests with X-Hub-Signature-256 header.
   * This method validates the signature to ensure the request is authentic.
   *
   * @param headers - HTTP request headers
   * @param body - Raw request body (must be string or Buffer)
   * @returns Validation result
   *
   * @see https://developers.facebook.com/docs/messenger-platform/webhooks#security
   *
   * @example
   * ```typescript
   * const validation = handler.validateSignature(req.headers, req.body);
   * if (!validation.isValid) {
   *   return res.status(401).json({ error: validation.error });
   * }
   * ```
   */
  validateSignature(
    headers: Record<string, string | string[] | undefined>,
    body: string | Buffer | object
  ): MessengerWebhookValidation {
    // Get signature from header (try both lowercase and original case)
    const signature =
      (headers['x-hub-signature-256'] as string) ||
      (headers['X-Hub-Signature-256'] as string);

    if (!signature) {
      return {
        isValid: false,
        error: 'Missing X-Hub-Signature-256 header',
      };
    }

    // Convert body to string if it's an object
    const bodyString = typeof body === 'object' && !(body instanceof Buffer)
      ? JSON.stringify(body)
      : body.toString();

    try {
      // Compute expected signature using HMAC-SHA256
      const expectedSignature =
        'sha256=' +
        crypto
          .createHmac('sha256', this.config.appSecret)
          .update(bodyString, 'utf8')
          .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        return {
          isValid: false,
          error: 'Signature mismatch',
          algorithm: 'sha256',
        };
      }

      return {
        isValid: true,
        algorithm: 'sha256',
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Signature validation error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Parse webhook event and extract messages
   *
   * Processes the webhook event and extracts all messages, postbacks, and other events.
   * Handles multiple message types: text, attachments, reactions, postbacks, etc.
   *
   * @param event - Webhook event from Messenger Platform
   * @returns Array of parsed messages
   *
   * @example
   * ```typescript
   * const messages = handler.parseWebhookEvent(req.body);
   * messages.forEach(msg => {
   *   console.log(`Received from ${msg.senderId}: ${msg.text}`);
   * });
   * ```
   */
  parseWebhookEvent(event: MessengerWebhookEvent): ParsedMessengerMessage[] {
    const messages: ParsedMessengerMessage[] = [];

    // Validate event structure
    if (!event.entry || !Array.isArray(event.entry)) {
      return messages;
    }

    // Process each entry (one per page)
    for (const entry of event.entry) {
      // Process messaging events
      if (entry.messaging && Array.isArray(entry.messaging)) {
        for (const messagingEvent of entry.messaging) {
          const parsed = this.parseMessagingEvent(messagingEvent);
          if (parsed) {
            messages.push(parsed);
          }
        }
      }

      // Process standby events (if page is in standby mode)
      if (entry.standby && Array.isArray(entry.standby)) {
        for (const standbyEvent of entry.standby) {
          const parsed = this.parseMessagingEvent(standbyEvent);
          if (parsed) {
            messages.push(parsed);
          }
        }
      }
    }

    return messages;
  }

  /**
   * Parse individual messaging event
   *
   * @param event - Messaging event
   * @returns Parsed message or null if event type is not supported
   */
  private parseMessagingEvent(
    event: MessengerMessagingEvent
  ): ParsedMessengerMessage | null {
    const { sender, recipient, timestamp } = event;

    // Handle message events
    if (event.message) {
      return {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: event.message.mid,
        text: event.message.text,
        attachments: this.parseAttachments(event.message.attachments),
        timestamp: new Date(timestamp),
        eventType: 'message',
        quickReplyPayload: event.message.quick_reply?.payload,
      };
    }

    // Handle postback events (button clicks)
    if (event.postback) {
      return {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: `postback_${timestamp}`,
        timestamp: new Date(timestamp),
        eventType: 'postback',
        postbackPayload: event.postback.payload,
        text: event.postback.title,
      };
    }

    // Handle reaction events
    if (event.reaction) {
      return {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: event.reaction.mid,
        timestamp: new Date(timestamp),
        eventType: 'reaction',
        reaction: {
          emoji: event.reaction.emoji || event.reaction.reaction,
          action: event.reaction.action,
          targetMessageId: event.reaction.mid,
        },
      };
    }

    // Handle read events
    if (event.read) {
      return {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: `read_${timestamp}`,
        timestamp: new Date(timestamp),
        eventType: 'read',
      };
    }

    // Handle delivery events
    if (event.delivery) {
      return {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: `delivery_${timestamp}`,
        timestamp: new Date(timestamp),
        eventType: 'delivery',
      };
    }

    // Handle opt-in events
    if (event.optin) {
      return {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: `optin_${timestamp}`,
        timestamp: new Date(timestamp),
        eventType: 'optin',
      };
    }

    // Handle referral events
    if (event.referral) {
      return {
        senderId: sender.id,
        recipientId: recipient.id,
        messageId: `referral_${timestamp}`,
        timestamp: new Date(timestamp),
        eventType: 'referral',
      };
    }

    // Unknown event type - return null
    return null;
  }

  /**
   * Parse message attachments
   *
   * @param attachments - Array of attachments from message
   * @returns Parsed attachments
   */
  private parseAttachments(
    attachments?: Array<{
      type: string;
      payload: {
        url?: string;
        coordinates?: { lat: number; long: number };
        title?: string;
      };
    }>
  ): ParsedMessengerMessage['attachments'] {
    if (!attachments || !Array.isArray(attachments)) {
      return [];
    }

    return attachments.map((attachment) => ({
      type: attachment.type,
      url: attachment.payload.url,
      coordinates: attachment.payload.coordinates,
      title: attachment.payload.title,
    }));
  }

  /**
   * Enrich message with sender profile information
   *
   * Fetches sender's profile information from Messenger Profile API.
   * Requires user profile permission scope.
   *
   * @param message - Parsed message
   * @returns Message with sender profile information
   *
   * @see https://developers.facebook.com/docs/messenger-platform/identity/user-profile
   *
   * @example
   * ```typescript
   * const enrichedMessage = await handler.enrichWithProfile(message);
   * console.log(`Name: ${enrichedMessage.senderProfile?.firstName}`);
   * ```
   */
  async enrichWithProfile(
    message: ParsedMessengerMessage
  ): Promise<ParsedMessengerMessage> {
    try {
      const profile = await this.fetchUserProfile(message.senderId);
      return {
        ...message,
        senderProfile: profile,
      };
    } catch (error) {
      // If profile fetch fails, return message without profile
      console.error(
        `Failed to fetch profile for ${message.senderId}:`,
        (error as Error).message
      );
      return message;
    }
  }

  /**
   * Fetch user profile from Messenger Profile API
   *
   * @param psid - Page-scoped ID (PSID) of the user
   * @returns User profile information
   *
   * @throws {Error} If profile fetch fails
   */
  private async fetchUserProfile(psid: string): Promise<{
    firstName?: string;
    lastName?: string;
    profilePic?: string;
  }> {
    const url = `https://graph.facebook.com/v21.0/${psid}`;
    const params = new URLSearchParams({
      fields: 'first_name,last_name,profile_pic',
      access_token: this.config.pageAccessToken,
    });

    const response = await fetch(`${url}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch user profile: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as MessengerSender;

    return {
      firstName: data.first_name,
      lastName: data.last_name,
      profilePic: data.profile_pic,
    };
  }

  /**
   * Validate webhook event structure
   *
   * Checks if the webhook event has the expected structure.
   *
   * @param event - Webhook event to validate
   * @returns Whether the event is valid
   */
  isValidWebhookEvent(event: unknown): event is MessengerWebhookEvent {
    if (typeof event !== 'object' || event === null) {
      return false;
    }

    const e = event as Record<string, unknown>;

    // Check object type
    if (e.object !== 'page') {
      return false;
    }

    // Check entry array exists
    if (!Array.isArray(e.entry)) {
      return false;
    }

    return true;
  }
}

/**
 * Create MessengerWebhookHandler from environment variables
 *
 * @returns Configured MessengerWebhookHandler instance
 * @throws {Error} If required environment variables are missing
 *
 * @example
 * ```typescript
 * const handler = createMessengerWebhookHandlerFromEnv();
 * ```
 */
export function createMessengerWebhookHandlerFromEnv(): MessengerWebhookHandler {
  const requiredEnvVars = [
    'META_APP_SECRET',
    'META_VERIFY_TOKEN',
    'META_PAGE_ACCESS_TOKEN',
    'META_PAGE_ID',
  ] as const;

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  return new MessengerWebhookHandler({
    appSecret: process.env.META_APP_SECRET!,
    verifyToken: process.env.META_VERIFY_TOKEN!,
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN!,
    pageId: process.env.META_PAGE_ID!,
  });
}

/**
 * Express middleware for webhook signature validation
 *
 * @param handler - MessengerWebhookHandler instance
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const handler = createMessengerWebhookHandlerFromEnv();
 * app.post('/webhook/messenger', validateSignatureMiddleware(handler), (req, res) => {
 *   // Signature is already validated
 *   const messages = handler.parseWebhookEvent(req.body);
 *   res.status(200).send('EVENT_RECEIVED');
 * });
 * ```
 */
export function validateSignatureMiddleware(handler: MessengerWebhookHandler) {
  return (req: any, res: any, next: any) => {
    const validation = handler.validateSignature(req.headers, req.body);

    if (!validation.isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: validation.error,
      });
    }

    next();
  };
}
