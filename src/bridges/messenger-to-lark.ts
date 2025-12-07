/**
 * Messenger → Lark Bridge
 *
 * Forwards Facebook Messenger messages to Lark with rich Interactive Cards.
 * Supports multiple content types and integrates sender profile information.
 *
 * @module bridges/messenger-to-lark
 */

import { LarkClient, LarkSendResult } from '../lark/client';
import { UnifiedMessage, MessageAttachment } from '../types/message';
import { Customer, Thread } from '../types/customer';
import { getMessengerProfile, MessengerProfile } from '../utils/messenger-profile';
import { larkConfig, channelNotificationGroups } from '../config/lark.config';

/**
 * Lark notification configuration for Messenger
 */
export interface LarkConfig {
  /** Lark chat/group ID to send messages to */
  chatId: string;
  /** Whether to include sender profile information */
  includeSenderProfile?: boolean;
  /** Whether to include message attachments */
  includeAttachments?: boolean;
}

/**
 * Messenger message with extended metadata
 */
export interface MessengerMessage {
  /** Unified message object */
  message: UnifiedMessage;
  /** Customer information */
  customer: Customer;
  /** Thread information */
  thread: Thread;
  /** Sender PSID (Page-Scoped ID) */
  senderPsid: string;
}

/**
 * Builds Lark Interactive Card for Messenger message
 *
 * @param message - Messenger message data
 * @param profile - Sender profile information
 * @returns Lark card object
 */
function buildMessengerCard(message: MessengerMessage, profile: MessengerProfile | null): any {
  const { message: msg, customer, thread } = message;
  const timestamp = new Date(msg.timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const senderName = profile?.name || customer.displayName || 'Unknown Sender';
  const isVip = customer.isVip ? ' ⭐ VIP' : '';

  // Build card elements
  const elements: any[] = [
    {
      tag: 'div',
      fields: [
        {
          is_short: true,
          text: { tag: 'lark_md', content: `**送信者**: ${senderName}${isVip}` }
        },
        {
          is_short: true,
          text: { tag: 'lark_md', content: `**受信時刻**: ${timestamp}` }
        }
      ]
    },
    { tag: 'hr' }
  ];

  // Add message content
  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: msg.content || '(No text content)'
    }
  });

  // Add attachments section
  if (msg.attachments && msg.attachments.length > 0) {
    elements.push({ tag: 'hr' });
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: '**📎 添付ファイル:**'
      }
    });

    msg.attachments.forEach((attachment: MessageAttachment) => {
      const attachmentInfo = formatAttachment(attachment);
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: attachmentInfo
        }
      });
    });
  }

  // Add action buttons
  elements.push({ tag: 'hr' });
  elements.push({
    tag: 'action',
    actions: [
      {
        tag: 'button',
        text: { tag: 'plain_text', content: '💬 返信' },
        type: 'primary',
        value: JSON.stringify({
          action: 'reply',
          threadId: thread.threadId,
          channel: 'messenger'
        })
      },
      {
        tag: 'button',
        text: { tag: 'plain_text', content: '👤 担当者割当' },
        type: 'default',
        value: JSON.stringify({
          action: 'assign',
          threadId: thread.threadId
        })
      },
      {
        tag: 'button',
        text: { tag: 'plain_text', content: '✅ 完了' },
        type: 'default',
        value: JSON.stringify({
          action: 'close',
          threadId: thread.threadId
        })
      }
    ]
  });

  // Add footer note
  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: `Messenger から転送 | Thread: ${thread.threadId.substring(0, 8)}... | Status: ${thread.status}`
      }
    ]
  });

  return {
    config: { wide_screen_mode: true },
    header: {
      title: {
        tag: 'plain_text',
        content: `💬 Facebook Messenger${isVip}`
      },
      template: 'blue'
    },
    elements
  };
}

/**
 * Formats attachment information for display
 *
 * @param attachment - Message attachment
 * @returns Formatted markdown string
 */
function formatAttachment(attachment: MessageAttachment): string {
  const typeEmoji: Record<string, string> = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    file: '📄',
    location: '📍',
    sticker: '🎨'
  };

  const emoji = typeEmoji[attachment.type] || '📎';
  const filename = attachment.filename || `${attachment.type} file`;
  const size = attachment.size ? ` (${formatFileSize(attachment.size)})` : '';

  return `${emoji} [${filename}](${attachment.url})${size}`;
}

/**
 * Formats file size in human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted size string
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Forwards Messenger message to Lark with Interactive Card
 *
 * @param messengerMessage - Messenger message data
 * @param larkConfigOverride - Optional Lark configuration override
 * @returns Send result with success status
 *
 * @example
 * ```typescript
 * const result = await forwardMessengerToLark(
 *   {
 *     message: unifiedMessage,
 *     customer: customerData,
 *     thread: threadData,
 *     senderPsid: '1234567890'
 *   },
 *   { chatId: 'oc_xxxxx' }
 * );
 *
 * if (result.success) {
 *   console.log('Forwarded to Lark:', result.messageId);
 * }
 * ```
 */
export async function forwardMessengerToLark(
  messengerMessage: MessengerMessage,
  larkConfigOverride?: Partial<LarkConfig>
): Promise<LarkSendResult> {
  const config: LarkConfig = {
    chatId: larkConfigOverride?.chatId || channelNotificationGroups.facebook || larkConfig.defaultGroupId,
    includeSenderProfile: larkConfigOverride?.includeSenderProfile ?? true,
    includeAttachments: larkConfigOverride?.includeAttachments ?? true
  };

  if (!config.chatId) {
    return {
      success: false,
      error: 'No Lark chat ID configured for Messenger notifications'
    };
  }

  try {
    const larkClient = new LarkClient();

    // Fetch sender profile if enabled
    let profile: MessengerProfile | null = null;
    if (config.includeSenderProfile) {
      profile = await getMessengerProfile(messengerMessage.senderPsid);
    }

    // Build Interactive Card
    const card = buildMessengerCard(messengerMessage, profile);

    // Send to Lark
    const result = await larkClient.sendInteractiveCard(config.chatId, card);

    if (result.success) {
      console.log(`✅ Messenger message forwarded to Lark: ${result.messageId}`);
    } else {
      console.error(`❌ Failed to forward Messenger message: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('Unexpected error in forwardMessengerToLark:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Batch forwards multiple Messenger messages to Lark
 *
 * @param messages - Array of Messenger messages
 * @param larkConfigOverride - Optional Lark configuration
 * @returns Array of send results
 */
export async function forwardMessengerBatchToLark(
  messages: MessengerMessage[],
  larkConfigOverride?: Partial<LarkConfig>
): Promise<LarkSendResult[]> {
  const results: LarkSendResult[] = [];

  for (const message of messages) {
    const result = await forwardMessengerToLark(message, larkConfigOverride);
    results.push(result);

    // Rate limiting: wait 100ms between messages
    if (messages.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`📊 Batch forward completed: ${successCount}/${messages.length} succeeded`);

  return results;
}
