/**
 * Instagram Profile Cache Tests
 *
 * Tests profile fetching, caching logic, TTL expiration,
 * and error handling for Instagram Graph API integration.
 */

import axios from 'axios';
import {
  InstagramProfileCache,
  getInstagramProfile,
  prewarmProfileCache
} from '../../src/utils/instagram-profile';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InstagramProfileCache', () => {
  let cache: InstagramProfileCache;

  beforeEach(() => {
    cache = new InstagramProfileCache(3600000); // 1 hour TTL
    jest.clearAllMocks();
  });

  describe('Cache Operations', () => {
    it('should store and retrieve profile from cache', () => {
      // Arrange
      const profile = {
        id: 'igsid_123',
        username: 'testuser',
        profilePictureUrl: 'https://example.com/pic.jpg'
      };

      // Act
      cache.set('igsid_123', profile);
      const retrieved = cache.get('igsid_123');

      // Assert
      expect(retrieved).toEqual(profile);
    });

    it('should return undefined for non-existent cache entry', () => {
      // Act
      const result = cache.get('nonexistent');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should expire cache entries after TTL', () => {
      // Arrange
      const profile = {
        id: 'igsid_expire',
        username: 'expireuser'
      };

      // Short TTL: 100ms
      const shortCache = new InstagramProfileCache(100);
      shortCache.set('igsid_expire', profile);

      // Act - Retrieve immediately (should work)
      const immediate = shortCache.get('igsid_expire');
      expect(immediate).toEqual(profile);

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const expired = shortCache.get('igsid_expire');
          expect(expired).toBeUndefined();
          resolve();
        }, 150);
      });
    });

    it('should support custom TTL per entry', () => {
      // Arrange
      const profile = {
        id: 'igsid_custom',
        username: 'customuser'
      };

      // Act - Set with custom TTL (50ms)
      cache.set('igsid_custom', profile, 50);

      // Assert - Should exist immediately
      expect(cache.get('igsid_custom')).toEqual(profile);

      // Assert - Should expire after 100ms
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cache.get('igsid_custom')).toBeUndefined();
          resolve();
        }, 100);
      });
    });

    it('should clear specific cache entry', () => {
      // Arrange
      cache.set('user1', { id: 'user1', username: 'user1' });
      cache.set('user2', { id: 'user2', username: 'user2' });

      // Act
      cache.clear('user1');

      // Assert
      expect(cache.get('user1')).toBeUndefined();
      expect(cache.get('user2')).toBeDefined();
    });

    it('should clear all cache entries', () => {
      // Arrange
      cache.set('user1', { id: 'user1', username: 'user1' });
      cache.set('user2', { id: 'user2', username: 'user2' });

      // Act
      cache.clear();

      // Assert
      expect(cache.get('user1')).toBeUndefined();
      expect(cache.get('user2')).toBeUndefined();
    });
  });

  describe('Cache Statistics', () => {
    it('should report accurate cache stats', () => {
      // Arrange
      cache.set('user1', { id: 'user1', username: 'user1' });
      cache.set('user2', { id: 'user2', username: 'user2' });

      // Act
      const stats = cache.getStats();

      // Assert
      expect(stats.size).toBe(2);
      expect(stats.entries).toBe(2);
      expect(stats.expired).toBe(0);
    });

    it('should detect expired entries in stats', () => {
      // Arrange
      const shortCache = new InstagramProfileCache(50); // 50ms TTL
      shortCache.set('user1', { id: 'user1', username: 'user1' });
      shortCache.set('user2', { id: 'user2', username: 'user2' });

      // Act - Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stats = shortCache.getStats();
          expect(stats.expired).toBe(2);
          resolve();
        }, 100);
      });
    });
  });

  describe('Cache Cleanup', () => {
    it('should remove expired entries during cleanup', () => {
      // Arrange
      const shortCache = new InstagramProfileCache(50);
      shortCache.set('expire1', { id: 'expire1', username: 'expire1' });
      shortCache.set('expire2', { id: 'expire2', username: 'expire2' });

      // Act - Wait and cleanup
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const removed = shortCache.cleanup();

          // Assert
          expect(removed).toBe(2);
          expect(shortCache.getStats().size).toBe(0);
          resolve();
        }, 100);
      });
    });

    it('should keep valid entries during cleanup', () => {
      // Arrange
      cache.set('valid', { id: 'valid', username: 'valid' });

      // Act
      const removed = cache.cleanup();

      // Assert
      expect(removed).toBe(0);
      expect(cache.get('valid')).toBeDefined();
    });
  });
});

describe('getInstagramProfile', () => {
  let cache: InstagramProfileCache;

  beforeEach(() => {
    cache = new InstagramProfileCache();
    jest.clearAllMocks();
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test_token';
    process.env.META_API_VERSION = 'v21.0';
  });

  afterEach(() => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.META_API_VERSION;
  });

  it('should fetch profile from Graph API when not cached', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValue({
      data: {
        id: 'igsid_graph',
        username: 'graphuser',
        profile_picture_url: 'https://example.com/graph.jpg',
        name: 'Graph User',
        account_type: 'BUSINESS'
      }
    });

    // Act
    const profile = await getInstagramProfile('igsid_graph', undefined, cache);

    // Assert
    expect(profile.username).toBe('graphuser');
    expect(profile.profilePictureUrl).toBe('https://example.com/graph.jpg');
    expect(profile.name).toBe('Graph User');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/igsid_graph',
      expect.objectContaining({
        params: {
          fields: 'id,username,name,profile_picture_url,account_type',
          access_token: 'test_token'
        }
      })
    );
  });

  it('should use cached profile on second call', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValue({
      data: {
        id: 'igsid_cached',
        username: 'cacheduser',
        profile_picture_url: 'https://example.com/cached.jpg'
      }
    });

    // Act - First call fetches from API
    await getInstagramProfile('igsid_cached', undefined, cache);

    // Second call uses cache
    const profile = await getInstagramProfile('igsid_cached', undefined, cache);

    // Assert - API called only once
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(profile.username).toBe('cacheduser');
  });

  it('should use username hint as fallback on API error', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    // Act
    const profile = await getInstagramProfile('igsid_error', 'fallbackuser', cache);

    // Assert
    expect(profile.username).toBe('fallbackuser');
    expect(profile.profilePictureUrl).toBeUndefined();
  });

  it('should fallback to user ID when no username hint provided', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    // Act
    const profile = await getInstagramProfile('igsid_nohint', undefined, cache);

    // Assert
    expect(profile.username).toBe('igsid_nohint');
  });

  it('should handle 404 errors gracefully', async () => {
    // Arrange
    const error = {
      isAxiosError: true,
      response: {
        status: 404,
        data: { error: { message: 'User not found' } }
      }
    };

    mockedAxios.get.mockRejectedValue(error);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    // Act
    const profile = await getInstagramProfile('igsid_404', 'notfound', cache);

    // Assert
    expect(profile.username).toBe('notfound'); // Fallback
  });

  it('should handle authentication errors', async () => {
    // Arrange
    const error = {
      isAxiosError: true,
      response: {
        status: 401,
        data: { error: { message: 'Invalid access token' } }
      }
    };

    mockedAxios.get.mockRejectedValue(error);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    // Act
    const profile = await getInstagramProfile('igsid_auth', 'authfail', cache);

    // Assert
    expect(profile.username).toBe('authfail');
  });

  it('should cache fallback profiles with short TTL', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    // Act
    await getInstagramProfile('igsid_fallback', 'fallback', cache);

    // Assert - Fallback should be cached
    const cached = cache.get('igsid_fallback');
    expect(cached).toBeDefined();
    expect(cached?.username).toBe('fallback');
  });

  it('should work without cache parameter (creates temporary cache)', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValue({
      data: {
        id: 'igsid_nocache',
        username: 'nocacheuser'
      }
    });

    // Act - No cache parameter
    const profile = await getInstagramProfile('igsid_nocache');

    // Assert
    expect(profile.username).toBe('nocacheuser');
  });

  it('should handle missing access token', async () => {
    // Arrange
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.META_PAGE_ACCESS_TOKEN;

    // Act
    const profile = await getInstagramProfile('igsid_notoken', 'notoken', cache);

    // Assert - Should fallback without calling API
    expect(profile.username).toBe('notoken');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});

describe('prewarmProfileCache', () => {
  let cache: InstagramProfileCache;

  beforeEach(() => {
    cache = new InstagramProfileCache();
    jest.clearAllMocks();
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test_token';
  });

  afterEach(() => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
  });

  it('should pre-warm cache with multiple profiles', async () => {
    // Arrange
    mockedAxios.get.mockImplementation((url) => {
      const userId = url.split('/').pop()?.split('?')[0];
      return Promise.resolve({
        data: {
          id: userId,
          username: `user_${userId}`
        }
      });
    });

    const userIds = ['user1', 'user2', 'user3'];

    // Act
    const cached = await prewarmProfileCache(userIds, cache);

    // Assert
    expect(cached).toBe(3);
    expect(cache.get('user1')).toBeDefined();
    expect(cache.get('user2')).toBeDefined();
    expect(cache.get('user3')).toBeDefined();
  });

  it('should handle partial failures during pre-warming', async () => {
    // Arrange
    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 'user1', username: 'user1' } })
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce({ data: { id: 'user3', username: 'user3' } });

    const userIds = ['user1', 'user2', 'user3'];

    // Act
    const cached = await prewarmProfileCache(userIds, cache);

    // Assert - All 3 cached (user2 has fallback)
    expect(cached).toBe(3); // user1 and user3 from API, user2 from fallback
  });

  it('should return 0 for empty user ID array', async () => {
    // Act
    const cached = await prewarmProfileCache([], cache);

    // Assert
    expect(cached).toBe(0);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
