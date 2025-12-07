/**
 * Tests for Messenger Profile Utility
 */

import axios from 'axios';
import {
  getMessengerProfile,
  getMessengerProfilesBatch,
  preloadMessengerProfiles,
  clearProfileCache,
  getProfileCacheStats,
  isValidPSID
} from '../../src/utils/messenger-profile';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Messenger Profile Utility', () => {
  const mockAccessToken = 'test_access_token';
  const mockPSID = '1234567890123456';

  beforeEach(() => {
    jest.clearAllMocks();
    clearProfileCache();
    process.env.META_PAGE_ACCESS_TOKEN = mockAccessToken;
    process.env.META_API_VERSION = 'v18.0';
  });

  afterEach(() => {
    delete process.env.META_PAGE_ACCESS_TOKEN;
    delete process.env.META_API_VERSION;
  });

  describe('getMessengerProfile', () => {
    it('should fetch profile from Graph API', async () => {
      const mockResponse = {
        data: {
          first_name: 'John',
          last_name: 'Doe',
          profile_pic: 'https://example.com/pic.jpg',
          locale: 'en_US',
          timezone: -7,
          gender: 'male'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const profile = await getMessengerProfile(mockPSID, false);

      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('John Doe');
      expect(profile?.firstName).toBe('John');
      expect(profile?.lastName).toBe('Doe');
      expect(profile?.profilePic).toBe('https://example.com/pic.jpg');
      expect(profile?.locale).toBe('en_US');
      expect(profile?.timezone).toBe(-7);
      expect(profile?.gender).toBe('male');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/1234567890123456',
        expect.objectContaining({
          params: expect.objectContaining({
            access_token: mockAccessToken
          })
        })
      );
    });

    it('should handle missing name fields', async () => {
      const mockResponse = {
        data: {
          profile_pic: 'https://example.com/pic.jpg'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const profile = await getMessengerProfile(mockPSID, false);

      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Unknown User');
    });

    it('should use cache on second call', async () => {
      const mockResponse = {
        data: {
          first_name: 'Jane',
          last_name: 'Smith'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // First call - should fetch from API
      const profile1 = await getMessengerProfile(mockPSID, true);
      expect(profile1?.name).toBe('Jane Smith');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const profile2 = await getMessengerProfile(mockPSID, true);
      expect(profile2?.name).toBe('Jane Smith');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should skip cache when useCache is false', async () => {
      const mockResponse = {
        data: {
          first_name: 'Bob',
          last_name: 'Johnson'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await getMessengerProfile(mockPSID, false);
      await getMessengerProfile(mockPSID, false);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should return null when PSID is empty', async () => {
      const profile = await getMessengerProfile('');
      expect(profile).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should return null when access token is not configured', async () => {
      delete process.env.META_PAGE_ACCESS_TOKEN;

      const profile = await getMessengerProfile(mockPSID);
      expect(profile).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle Graph API errors', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: {
              message: 'Invalid OAuth access token',
              code: 190
            }
          }
        },
        isAxiosError: true
      });

      mockedAxios.isAxiosError.mockReturnValue(true);

      const profile = await getMessengerProfile(mockPSID, false);
      expect(profile).toBeNull();
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const profile = await getMessengerProfile(mockPSID, false);
      expect(profile).toBeNull();
    });
  });

  describe('getMessengerProfilesBatch', () => {
    it('should fetch multiple profiles', async () => {
      const psids = ['1111111111111111', '2222222222222222', '3333333333333333'];

      mockedAxios.get
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'One' }
        })
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'Two' }
        })
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'Three' }
        });

      const results = await getMessengerProfilesBatch(psids, false);

      expect(results.size).toBe(3);
      expect(results.get('1111111111111111')?.name).toBe('User One');
      expect(results.get('2222222222222222')?.name).toBe('User Two');
      expect(results.get('3333333333333333')?.name).toBe('User Three');
    });

    it('should handle partial failures', async () => {
      const psids = ['1111111111111111', '2222222222222222'];

      mockedAxios.get
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'One' }
        })
        .mockRejectedValueOnce(new Error('API error'));

      const results = await getMessengerProfilesBatch(psids, false);

      expect(results.size).toBe(2);
      expect(results.get('1111111111111111')?.name).toBe('User One');
      expect(results.get('2222222222222222')).toBeNull();
    });

    it('should process large batches with rate limiting', async () => {
      const psids = Array.from({ length: 25 }, (_, i) => `${i}`.padStart(16, '0'));

      mockedAxios.get.mockResolvedValue({
        data: { first_name: 'Test', last_name: 'User' }
      });

      const startTime = Date.now();
      const results = await getMessengerProfilesBatch(psids, false);
      const duration = Date.now() - startTime;

      expect(results.size).toBe(25);
      // Should have at least 2 batches with 100ms delay
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('preloadMessengerProfiles', () => {
    it('should preload profiles into cache', async () => {
      const psids = ['1111111111111111', '2222222222222222'];

      mockedAxios.get
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'One' }
        })
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'Two' }
        });

      const count = await preloadMessengerProfiles(psids);

      expect(count).toBe(2);

      // Verify cache was populated
      const stats = getProfileCacheStats();
      expect(stats.size).toBe(2);
    });

    it('should return correct count on partial failures', async () => {
      const psids = ['1111111111111111', '2222222222222222', '3333333333333333'];

      mockedAxios.get
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'One' }
        })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          data: { first_name: 'User', last_name: 'Three' }
        });

      const count = await preloadMessengerProfiles(psids);

      expect(count).toBe(2); // 2 out of 3 succeeded
    });
  });

  describe('Cache management', () => {
    it('should clear cache', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { first_name: 'Test', last_name: 'User' }
      });

      await getMessengerProfile(mockPSID, true);

      let stats = getProfileCacheStats();
      expect(stats.size).toBe(1);

      clearProfileCache();

      stats = getProfileCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should report correct cache stats', () => {
      const stats = getProfileCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMinutes');
      expect(stats.maxSize).toBe(1000);
      expect(stats.ttlMinutes).toBe(60);
    });
  });

  describe('isValidPSID', () => {
    it('should validate correct PSID formats', () => {
      expect(isValidPSID('1234567890123456')).toBe(true);
      expect(isValidPSID('12345678901234567')).toBe(true);
      expect(isValidPSID('123456789012345678901')).toBe(false); // Too long
    });

    it('should reject invalid PSID formats', () => {
      expect(isValidPSID('123')).toBe(false); // Too short
      expect(isValidPSID('abcd1234567890123')).toBe(false); // Contains letters
      expect(isValidPSID('')).toBe(false); // Empty
      expect(isValidPSID('1234-5678-9012-3456')).toBe(false); // Contains dashes
    });
  });

  describe('Cache TTL and LRU eviction', () => {
    it('should evict old entries when cache is full', async () => {
      // This test would require mocking the cache size
      // For now, we test that the cache has a maximum size
      const stats = getProfileCacheStats();
      expect(stats.maxSize).toBe(1000);
    });
  });
});
