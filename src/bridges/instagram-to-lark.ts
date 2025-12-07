/**
 * Instagram DM to Lark Forwarding Bridge
 *
 * Forwards Instagram Direct Messages to Lark using Interactive Cards
 * with Instagram brand styling (purple theme). Handles all message types:
 * text, image, video, story replies, and reel shares.
 *
 * @module instagram-to-lark
 */

import { LarkClient, LarkSendResult } from '../lark/client';
import { ParsedInstagramMessage, InstagramMessageType } from '../types/instagram';
import { getInstagramProfile, InstagramProfileCache } from '../utils/instagram-profile';

/**
 * Lark configuration for Instagram forwarding
 */
export interface LarkConfig {
  /** Target Lark chat/group ID */
  chatId: string;
  /** Whether to use wide screen mode (default: true) */
  wideScreenMode?: boolean;
  /** Whether to include profile pictures (default: true) */
  includeProfilePicture?: boolean;
}

/**
 * Instagram to Lark forwarding result
 */
export interface ForwardResult {
  /** Whether forwarding succeeded */
  success: boolean;
  /** Lark message ID if successful */
  larkMessageId?: string;
  /** Error message if failed */
  error?: string;
  /** Timestamp of forwarding (ISO 8601) */
  timestamp: string;
}

/**
 * Forwards Instagram DM to Lark with Interactive Card format
 *
 * Creates a branded Instagram card with sender profile, message content,
 * and appropriate formatting based on message type (text, media, story, etc.).
 *
 * @param message - Parsed Instagram message
 * @param larkConfig - Lark destination configuration
 * @param profileCache - Optional profile cache instance
 * @returns Forward result with success status and Lark message ID
 *
 * @example
 * ```typescript
 * const result = await forwardInstagramToLark(message, {
 *   chatId: 'oc_xxxxx',
 *   wideScreenMode: true
 * });
 *
 * if (result.success) {
 *   console.log('Forwarded to Lark:', result.larkMessageId);
 * }
 * ```
 */
export async function forwardInstagramToLark(
  message: ParsedInstagramMessage,
  larkConfig: LarkConfig,
  profileCache?: InstagramProfileCache
): Promise<ForwardResult> {
  const timestamp = new Date().toISOString();

  try {
    // Fetch sender profile with caching
    const profile = await getInstagramProfile(
      message.senderId,
      message.senderUsername,
      profileCache
    );

    // Build Instagram-branded Lark card
    const card = buildInstagramCard(message, profile, larkConfig);

    // Send to Lark
    const larkClient = new LarkClient();
    const result = await larkClient.sendInteractiveCard(larkConfig.chatId, card);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send to Lark',
        timestamp
      };
    }

    return {
      success: true,
      larkMessageId: result.messageId,
      timestamp
    };
  } catch (error) {
    console.error('[Instagram→Lark] Forwarding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp
    };
  }
}

/**
 * Builds Instagram-branded Lark Interactive Card
 *
 * @param message - Parsed Instagram message
 * @param profile - Sender's Instagram profile
 * @param config - Lark configuration
 * @returns Lark Interactive Card JSON
 */
function buildInstagramCard(
  message: ParsedInstagramMessage,
  profile: { username: string; profilePictureUrl?: string; name?: string },
  config: LarkConfig
): any {
  const username = profile.username || message.senderUsername || message.senderId;
  const displayName = profile.name || username;
  const timestamp = new Date(message.timestamp).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Card header with Instagram branding
  const header = {
    title: {
      tag: 'plain_text',
      content: `📸 Instagram DM - @${username}`
    },
    template: 'purple' // Instagram brand color
  };

  // Build card elements based on message type
  const elements: any[] = [];

  // Sender information
  elements.push({
    tag: 'div',
    fields: [
      {
        is_short: true,
        text: {
          tag: 'lark_md',
          content: `**送信者**: @${username}`
        }
      },
      {
        is_short: true,
        text: {
          tag: 'lark_md',
          content: `**受信時刻**: ${timestamp}`
        }
      }
    ]
  });

  // Profile picture (if available and enabled)
  if (config.includeProfilePicture !== false && profile.profilePictureUrl) {
    elements.push({
      tag: 'img',
      img_key: profile.profilePictureUrl,
      alt: {
        tag: 'plain_text',
        content: `@${username} のプロフィール画像`
      }
    });
  }

  elements.push({ tag: 'hr' });

  // Message content based on type
  elements.push(...buildMessageContent(message));

  elements.push({ tag: 'hr' });

  // Footer note
  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: `Instagram DM から転送 | Message ID: ${message.messageId.substring(0, 8)}...`
      }
    ]
  });

  return {
    config: {
      wide_screen_mode: config.wideScreenMode !== false
    },
    header,
    elements
  };
}

/**
 * Builds message content elements based on message type
 *
 * Handles different Instagram message types:
 * - Text DM: Plain text content
 * - Image DM: Image with optional caption
 * - Video DM: Video URL with thumbnail
 * - Story reply: Story link with reply text
 * - Reel share: Reel link with optional message
 *
 * @param message - Parsed Instagram message
 * @returns Array of Lark card elements
 */
function buildMessageContent(message: ParsedInstagramMessage): any[] {
  const elements: any[] = [];

  switch (message.messageType) {
    case 'text':
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: message.content || '(本文なし)'
        }
      });
      break;

    case 'image':
      if (message.attachments && message.attachments.length > 0) {
        const imageUrl = message.attachments[0].url;
        elements.push({
          tag: 'img',
          img_key: imageUrl,
          alt: {
            tag: 'plain_text',
            content: '送信された画像'
          }
        });
        if (message.content) {
          elements.push({
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**キャプション**: ${message.content}`
            }
          });
        }
      }
      break;

    case 'video':
      if (message.attachments && message.attachments.length > 0) {
        const videoUrl = message.attachments[0].url;
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `🎥 **動画メッセージ**\n[動画を開く](${videoUrl})`
          }
        });
        if (message.content) {
          elements.push({
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**キャプション**: ${message.content}`
            }
          });
        }
      }
      break;

    case 'story_reply':
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `💬 **ストーリーへの返信**`
        }
      });
      if (message.storyReply?.media_url) {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `[ストーリーを見る](${message.storyReply.media_url})`
          }
        });
      }
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: message.content || '(メッセージなし)'
        }
      });
      break;

    case 'reel_share':
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `🎬 **リールをシェア**`
        }
      });
      // Reel URL would come from metadata
      if (message.metadata?.raw?.message?.attachments?.[0]?.payload?.url) {
        const reelUrl = message.metadata.raw.message.attachments[0].payload.url;
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `[リールを見る](${reelUrl})`
          }
        });
      }
      if (message.content) {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: message.content
          }
        });
      }
      break;

    case 'story_mention':
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `📣 **ストーリーでメンション**`
        }
      });
      if (message.storyMention?.media_url) {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `[ストーリーを見る](${message.storyMention.media_url})`
          }
        });
      }
      break;

    case 'like':
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '❤️ いいね'
        }
      });
      break;

    case 'unsupported':
    default:
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `⚠️ サポートされていないメッセージタイプ: ${message.messageType}`
        }
      });
      if (message.content) {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: message.content
          }
        });
      }
      break;
  }

  return elements;
}

/**
 * Forwards multiple Instagram messages in batch
 *
 * @param messages - Array of parsed Instagram messages
 * @param larkConfig - Lark destination configuration
 * @param profileCache - Optional shared profile cache
 * @returns Array of forward results
 *
 * @example
 * ```typescript
 * const cache = new InstagramProfileCache();
 * const results = await forwardInstagramMessagesBatch(messages, config, cache);
 * console.log(`Forwarded ${results.filter(r => r.success).length}/${results.length}`);
 * ```
 */
export async function forwardInstagramMessagesBatch(
  messages: ParsedInstagramMessage[],
  larkConfig: LarkConfig,
  profileCache?: InstagramProfileCache
): Promise<ForwardResult[]> {
  const results: ForwardResult[] = [];
  const cache = profileCache || new InstagramProfileCache();

  for (const message of messages) {
    const result = await forwardInstagramToLark(message, larkConfig, cache);
    results.push(result);

    // Rate limiting: wait 100ms between messages
    if (messages.indexOf(message) < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
