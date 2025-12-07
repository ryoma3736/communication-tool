/**
 * Tests for Messenger → Lark Bridge
 */

import { forwardMessengerToLark, forwardMessengerBatchToLark } from '../../src/bridges/messenger-to-lark';
import { LarkClient } from '../../src/lark/client';
import { getMessengerProfile } from '../../src/utils/messenger-profile';
import { UnifiedMessage } from '../../src/types/message';
import { Customer, Thread } from '../../src/types/customer';
import { ChannelType } from '../../src/types/channel';

// Mock dependencies
jest.mock('../../src/lark/client');
jest.mock('../../src/utils/messenger-profile');

describe('Messenger to Lark Bridge', () => {
  const mockMessage: UnifiedMessage = {
    messageId: 'msg_123',
    threadId: 'thread_123',
    customerId: 'customer_123',
    channel: ChannelType.FACEBOOK,
    direction: 'inbound',
    content: 'Hello from Messenger!',
    contentType: 'text',
    senderId: '1234567890',
    senderName: 'Test User',
    timestamp: '2025-12-08T00:00:00.000Z',
    status: 'delivered'
  };

  const mockCustomer: Customer = {
    customerId: 'customer_123',
    displayName: 'Test Customer',
    identifiers: [{ type: 'fb_psid', value: '1234567890', channel: ChannelType.FACEBOOK, verified: true }],
    tags: [],
    isVip: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-12-08T00:00:00.000Z'
  };

  const mockThread: Thread = {
    threadId: 'thread_123',
    customerId: 'customer_123',
    channel: ChannelType.FACEBOOK,
    status: 'open',
    unreadCount: 0,
    createdAt: '2025-12-08T00:00:00.000Z',
    updatedAt: '2025-12-08T00:00:00.000Z',
    externalConversationId: '1234567890'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LARK_GROUP_FACEBOOK = 'oc_test_group';
    process.env.LARK_DEFAULT_GROUP_ID = 'oc_test_group';
  });

  describe('forwardMessengerToLark', () => {
    it('should forward text message successfully', async () => {
      const mockLarkSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'lark_msg_123'
      });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      (getMessengerProfile as jest.Mock).mockResolvedValue({
        psid: '1234567890',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        profilePic: 'https://example.com/pic.jpg'
      });

      const result = await forwardMessengerToLark(
        {
          message: mockMessage,
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        { chatId: 'oc_test_group' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('lark_msg_123');
      expect(mockLarkSend).toHaveBeenCalledTimes(1);
      expect(getMessengerProfile).toHaveBeenCalledWith('1234567890');

      // Verify card structure
      const cardArg = mockLarkSend.mock.calls[0][1];
      expect(cardArg.header.title.content).toContain('Facebook Messenger');
      expect(cardArg.elements).toBeDefined();
    });

    it('should handle message with attachments', async () => {
      const mockLarkSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'lark_msg_124'
      });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      (getMessengerProfile as jest.Mock).mockResolvedValue({
        psid: '1234567890',
        name: 'Jane Doe'
      });

      const messageWithAttachments: UnifiedMessage = {
        ...mockMessage,
        attachments: [
          {
            type: 'image',
            url: 'https://example.com/image.jpg',
            filename: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 102400
          },
          {
            type: 'file',
            url: 'https://example.com/document.pdf',
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            size: 512000
          }
        ]
      };

      const result = await forwardMessengerToLark(
        {
          message: messageWithAttachments,
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        { chatId: 'oc_test_group' }
      );

      expect(result.success).toBe(true);

      const cardArg = mockLarkSend.mock.calls[0][1];
      const cardContent = JSON.stringify(cardArg);
      expect(cardContent).toContain('添付ファイル');
      expect(cardContent).toContain('photo.jpg');
      expect(cardContent).toContain('document.pdf');
    });

    it('should handle VIP customer', async () => {
      const mockLarkSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'lark_msg_125'
      });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      (getMessengerProfile as jest.Mock).mockResolvedValue({
        psid: '1234567890',
        name: 'VIP User'
      });

      const vipCustomer: Customer = {
        ...mockCustomer,
        isVip: true
      };

      const result = await forwardMessengerToLark(
        {
          message: mockMessage,
          customer: vipCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        { chatId: 'oc_test_group' }
      );

      expect(result.success).toBe(true);

      const cardArg = mockLarkSend.mock.calls[0][1];
      expect(cardArg.header.title.content).toContain('⭐ VIP');
    });

    it('should handle profile fetch failure gracefully', async () => {
      const mockLarkSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'lark_msg_126'
      });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      (getMessengerProfile as jest.Mock).mockResolvedValue(null);

      const result = await forwardMessengerToLark(
        {
          message: mockMessage,
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        { chatId: 'oc_test_group' }
      );

      expect(result.success).toBe(true);

      const cardArg = mockLarkSend.mock.calls[0][1];
      const cardContent = JSON.stringify(cardArg);
      expect(cardContent).toContain('Test Customer'); // Falls back to customer.displayName
    });

    it('should return error when Lark chat ID is not configured', async () => {
      delete process.env.LARK_GROUP_FACEBOOK;

      const result = await forwardMessengerToLark({
        message: mockMessage,
        customer: mockCustomer,
        thread: mockThread,
        senderPsid: '1234567890'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No Lark chat ID configured');
    });

    it('should handle Lark send failure', async () => {
      const mockLarkSend = jest.fn().mockResolvedValue({
        success: false,
        error: 'Lark API error'
      });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      (getMessengerProfile as jest.Mock).mockResolvedValue({
        psid: '1234567890',
        name: 'Test User'
      });

      const result = await forwardMessengerToLark(
        {
          message: mockMessage,
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        { chatId: 'oc_test_group' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lark API error');
    });

    it('should skip profile fetch when disabled', async () => {
      const mockLarkSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'lark_msg_127'
      });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      const result = await forwardMessengerToLark(
        {
          message: mockMessage,
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        { chatId: 'oc_test_group', includeSenderProfile: false }
      );

      expect(result.success).toBe(true);
      expect(getMessengerProfile).not.toHaveBeenCalled();
    });
  });

  describe('forwardMessengerBatchToLark', () => {
    it('should forward multiple messages', async () => {
      const mockLarkSend = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'lark_msg_batch'
      });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      (getMessengerProfile as jest.Mock).mockResolvedValue({
        psid: '1234567890',
        name: 'Batch User'
      });

      const messages = [
        {
          message: { ...mockMessage, messageId: 'msg_1' },
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        {
          message: { ...mockMessage, messageId: 'msg_2' },
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        {
          message: { ...mockMessage, messageId: 'msg_3' },
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        }
      ];

      const results = await forwardMessengerBatchToLark(messages, { chatId: 'oc_test_group' });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockLarkSend).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch', async () => {
      const mockLarkSend = jest
        .fn()
        .mockResolvedValueOnce({ success: true, messageId: 'msg_1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg_3' });

      (LarkClient as jest.Mock).mockImplementation(() => ({
        sendInteractiveCard: mockLarkSend
      }));

      (getMessengerProfile as jest.Mock).mockResolvedValue({
        psid: '1234567890',
        name: 'Test User'
      });

      const messages = [
        {
          message: { ...mockMessage, messageId: 'msg_1' },
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        {
          message: { ...mockMessage, messageId: 'msg_2' },
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        },
        {
          message: { ...mockMessage, messageId: 'msg_3' },
          customer: mockCustomer,
          thread: mockThread,
          senderPsid: '1234567890'
        }
      ];

      const results = await forwardMessengerBatchToLark(messages, { chatId: 'oc_test_group' });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});
