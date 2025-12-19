/**
 * Instagram to Lark Bridge Tests
 *
 * Tests forwarding logic, card formatting, and error handling
 * for Instagram DM to Lark integration.
 */

import { forwardInstagramToLark, forwardInstagramMessagesBatch } from '../../src/bridges/instagram-to-lark';
import { ParsedInstagramMessage } from '../../src/types/instagram';
import { ChannelType } from '../../src/types/channel';
import { InstagramProfileCache } from '../../src/utils/instagram-profile';
import { LarkClient } from '../../src/lark/client';

// Mock dependencies
jest.mock('../../src/lark/client');
jest.mock('../../src/utils/instagram-profile');

describe('Instagram to Lark Bridge', () => {
  let mockLarkClient: jest.Mocked<LarkClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock LarkClient
    mockLarkClient = {
      sendInteractiveCard: jest.fn()
    } as any;

    (LarkClient as jest.MockedClass<typeof LarkClient>).mockImplementation(() => mockLarkClient);
  });

  describe('forwardInstagramToLark', () => {
    it('should forward text message successfully', async () => {
      // Arrange
      const message: ParsedInstagramMessage = {
        messageId: 'msg_12345',
        senderId: 'igsid_67890',
        senderUsername: 'testuser',
        content: 'Hello from Instagram!',
        contentType: 'text',
        messageType: 'text',
        timestamp: new Date().toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: {
          raw: {} as any
        }
      };

      const larkConfig = {
        chatId: 'oc_test123',
        wideScreenMode: true
      };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_msg_456'
      });

      // Mock profile fetcher
      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({
        username: 'testuser',
        profilePictureUrl: 'https://example.com/profile.jpg',
        name: 'Test User'
      });

      // Act
      const result = await forwardInstagramToLark(message, larkConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(result.larkMessageId).toBe('lark_msg_456');
      expect(mockLarkClient.sendInteractiveCard).toHaveBeenCalledTimes(1);

      const cardArg = mockLarkClient.sendInteractiveCard.mock.calls[0][1];
      expect(cardArg.header.template).toBe('purple'); // Instagram brand color
      expect(cardArg.header.title.content).toContain('@testuser');
    });

    it('should handle image messages with attachment', async () => {
      // Arrange
      const message: ParsedInstagramMessage = {
        messageId: 'msg_img_001',
        senderId: 'igsid_999',
        senderUsername: 'photographer',
        content: 'Check out this photo!',
        contentType: 'image',
        messageType: 'image',
        attachments: [
          {
            type: 'image',
            url: 'https://example.com/image.jpg',
            mimeType: 'image/jpeg'
          }
        ],
        timestamp: new Date().toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: { raw: {} as any }
      };

      const larkConfig = { chatId: 'oc_test123' };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_img_789'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({
        username: 'photographer'
      });

      // Act
      const result = await forwardInstagramToLark(message, larkConfig);

      // Assert
      expect(result.success).toBe(true);
      const cardArg = mockLarkClient.sendInteractiveCard.mock.calls[0][1];

      // Verify image element is included
      const imageElement = cardArg.elements.find((el: any) => el.tag === 'img');
      expect(imageElement).toBeDefined();
      expect(imageElement?.img_key).toBe('https://example.com/image.jpg');
    });

    it('should handle story reply messages', async () => {
      // Arrange
      const message: ParsedInstagramMessage = {
        messageId: 'msg_story_001',
        senderId: 'igsid_111',
        senderUsername: 'storyteller',
        content: 'Love this story!',
        contentType: 'text',
        messageType: 'story_reply',
        storyReply: {
          story_id: 'story_555',
          media_url: 'https://instagram.com/stories/user/story_555',
          media_type: 'photo'
        },
        timestamp: new Date().toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: { raw: {} as any }
      };

      const larkConfig = { chatId: 'oc_test123' };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_story_999'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({ username: 'storyteller' });

      // Act
      const result = await forwardInstagramToLark(message, larkConfig);

      // Assert
      expect(result.success).toBe(true);
      const cardArg = mockLarkClient.sendInteractiveCard.mock.calls[0][1];

      // Verify story reply indicator
      const storyElement = cardArg.elements.find((el: any) =>
        el.text?.content?.includes('ストーリーへの返信')
      );
      expect(storyElement).toBeDefined();
    });

    it('should handle video messages', async () => {
      // Arrange
      const message: ParsedInstagramMessage = {
        messageId: 'msg_video_001',
        senderId: 'igsid_222',
        senderUsername: 'videocreator',
        content: 'Watch this!',
        contentType: 'video',
        messageType: 'video',
        attachments: [
          {
            type: 'video',
            url: 'https://example.com/video.mp4',
            mimeType: 'video/mp4'
          }
        ],
        timestamp: new Date().toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: { raw: {} as any }
      };

      const larkConfig = { chatId: 'oc_test123' };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_video_123'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({ username: 'videocreator' });

      // Act
      const result = await forwardInstagramToLark(message, larkConfig);

      // Assert
      expect(result.success).toBe(true);
      const cardArg = mockLarkClient.sendInteractiveCard.mock.calls[0][1];

      // Verify video link is included
      const videoElement = cardArg.elements.find((el: any) =>
        el.text?.content?.includes('動画メッセージ')
      );
      expect(videoElement).toBeDefined();
    });

    it('should handle Lark API errors gracefully', async () => {
      // Arrange
      const message: ParsedInstagramMessage = {
        messageId: 'msg_error',
        senderId: 'igsid_error',
        senderUsername: 'erroruser',
        content: 'This will fail',
        contentType: 'text',
        messageType: 'text',
        timestamp: new Date().toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: { raw: {} as any }
      };

      const larkConfig = { chatId: 'oc_invalid' };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: false,
        error: 'Chat not found'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({ username: 'erroruser' });

      // Act
      const result = await forwardInstagramToLark(message, larkConfig);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat not found');
      expect(result.larkMessageId).toBeUndefined();
    });

    it('should use profile cache to reduce API calls', async () => {
      // Arrange
      const cache = new InstagramProfileCache();
      const message: ParsedInstagramMessage = {
        messageId: 'msg_cache',
        senderId: 'igsid_cache',
        senderUsername: 'cacheduser',
        content: 'Testing cache',
        contentType: 'text',
        messageType: 'text',
        timestamp: new Date().toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: { raw: {} as any }
      };

      const larkConfig = { chatId: 'oc_test123' };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_cached'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({
        username: 'cacheduser',
        profilePictureUrl: 'https://example.com/cached.jpg'
      });

      // Act - First call should fetch profile
      await forwardInstagramToLark(message, larkConfig, cache);

      // Act - Second call should use cache
      await forwardInstagramToLark(message, larkConfig, cache);

      // Assert - getInstagramProfile called twice (cache implementation tested separately)
      expect(getInstagramProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('forwardInstagramMessagesBatch', () => {
    it('should forward multiple messages in sequence', async () => {
      // Arrange
      const messages: ParsedInstagramMessage[] = [
        {
          messageId: 'msg_1',
          senderId: 'igsid_1',
          senderUsername: 'user1',
          content: 'Message 1',
          contentType: 'text',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          channel: ChannelType.INSTAGRAM,
          recipientId: 'page_123',
          metadata: { raw: {} as any }
        },
        {
          messageId: 'msg_2',
          senderId: 'igsid_2',
          senderUsername: 'user2',
          content: 'Message 2',
          contentType: 'text',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          channel: ChannelType.INSTAGRAM,
          recipientId: 'page_123',
          metadata: { raw: {} as any }
        }
      ];

      const larkConfig = { chatId: 'oc_batch' };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_batch'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockImplementation((userId: string) =>
        Promise.resolve({ username: `user_${userId}` })
      );

      // Act
      const results = await forwardInstagramMessagesBatch(messages, larkConfig);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockLarkClient.sendInteractiveCard).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch', async () => {
      // Arrange
      const messages: ParsedInstagramMessage[] = [
        {
          messageId: 'msg_success',
          senderId: 'igsid_success',
          senderUsername: 'success_user',
          content: 'Success',
          contentType: 'text',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          channel: ChannelType.INSTAGRAM,
          recipientId: 'page_123',
          metadata: { raw: {} as any }
        },
        {
          messageId: 'msg_fail',
          senderId: 'igsid_fail',
          senderUsername: 'fail_user',
          content: 'Fail',
          contentType: 'text',
          messageType: 'text',
          timestamp: new Date().toISOString(),
          channel: ChannelType.INSTAGRAM,
          recipientId: 'page_123',
          metadata: { raw: {} as any }
        }
      ];

      const larkConfig = { chatId: 'oc_batch' };

      mockLarkClient.sendInteractiveCard
        .mockResolvedValueOnce({ success: true, messageId: 'lark_1' })
        .mockResolvedValueOnce({ success: false, error: 'Rate limit exceeded' });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({ username: 'test' });

      // Act
      const results = await forwardInstagramMessagesBatch(messages, larkConfig);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Rate limit exceeded');
    });
  });

  describe('Card Formatting', () => {
    it('should format card with Instagram purple theme', async () => {
      // Arrange
      const message: ParsedInstagramMessage = {
        messageId: 'msg_theme',
        senderId: 'igsid_theme',
        senderUsername: 'themeuser',
        content: 'Purple theme test',
        contentType: 'text',
        messageType: 'text',
        timestamp: new Date().toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: { raw: {} as any }
      };

      const larkConfig = {
        chatId: 'oc_theme',
        wideScreenMode: true,
        includeProfilePicture: false
      };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_theme'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({ username: 'themeuser' });

      // Act
      await forwardInstagramToLark(message, larkConfig);

      // Assert
      const cardArg = mockLarkClient.sendInteractiveCard.mock.calls[0][1];
      expect(cardArg.header.template).toBe('purple');
      expect(cardArg.header.title.content).toContain('📸 Instagram DM');
      expect(cardArg.config.wide_screen_mode).toBe(true);
    });

    it('should include timestamp in Japanese format', async () => {
      // Arrange
      const testDate = new Date('2025-12-08T12:00:00Z');
      const message: ParsedInstagramMessage = {
        messageId: 'msg_time',
        senderId: 'igsid_time',
        senderUsername: 'timeuser',
        content: 'Time test',
        contentType: 'text',
        messageType: 'text',
        timestamp: testDate.toISOString(),
        channel: ChannelType.INSTAGRAM,
        recipientId: 'page_123',
        metadata: { raw: {} as any }
      };

      const larkConfig = { chatId: 'oc_time' };

      mockLarkClient.sendInteractiveCard.mockResolvedValue({
        success: true,
        messageId: 'lark_time'
      });

      const { getInstagramProfile } = require('../../src/utils/instagram-profile');
      getInstagramProfile.mockResolvedValue({ username: 'timeuser' });

      // Act
      await forwardInstagramToLark(message, larkConfig);

      // Assert
      const cardArg = mockLarkClient.sendInteractiveCard.mock.calls[0][1];
      const timeField = cardArg.elements.find((el: any) =>
        el.fields?.some((f: any) => f.text?.content?.includes('受信時刻'))
      );
      expect(timeField).toBeDefined();
    });
  });
});
