/**
 * Instagram Profile Fetcher with Caching
 *
 * Fetches Instagram user profiles via Graph API with intelligent caching
 * to minimize API calls. Caches profiles in-memory with TTL support.
 *
 * @module instagram-profile
 */

import axios from 'axios';

/**
 * Instagram profile information
 */
export interface InstagramProfile {
  /** Instagram user ID (IGSID) */
  id: string;
  /** Instagram username (@handle) */
  username: string;
  /** Profile picture URL */
  profilePictureUrl?: string;
  /** Full name (if available) */
  name?: string;
  /** Account type (BUSINESS, CREATOR, PERSONAL) */
  accountType?: string;
  /** Follower count (if available via Business Discovery) */
  followersCount?: number;
}

/**
 * Cached profile entry with expiration
 */
interface CachedProfile {
  /** Profile data */
  profile: InstagramProfile;
  /** Cache timestamp (Unix milliseconds) */
  cachedAt: number;
  /** TTL in milliseconds */
  ttl: number;
}

/**
 * Instagram Profile Cache
 *
 * In-memory cache for Instagram profiles with TTL support.
 * Reduces API calls by caching profile data for configurable duration.
 *
 * @example
 * ```typescript
 * const cache = new InstagramProfileCache(3600000); // 1 hour TTL
 * const profile = await cache.get('12345');
 * cache.set('12345', profileData);
 * ```
 */
export class InstagramProfileCache {
  private cache: Map<string, CachedProfile>;
  private defaultTtl: number;

  /**
   * Creates a new profile cache
   *
   * @param defaultTtl - Default TTL in milliseconds (default: 1 hour)
   */
  constructor(defaultTtl: number = 3600000) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }

  /**
   * Gets cached profile if valid
   *
   * @param userId - Instagram user ID
   * @returns Cached profile or undefined if not found/expired
   */
  get(userId: string): InstagramProfile | undefined {
    const cached = this.cache.get(userId);
    if (!cached) return undefined;

    const now = Date.now();
    if (now - cached.cachedAt > cached.ttl) {
      // Expired, remove from cache
      this.cache.delete(userId);
      return undefined;
    }

    return cached.profile;
  }

  /**
   * Stores profile in cache
   *
   * @param userId - Instagram user ID
   * @param profile - Profile data
   * @param ttl - Optional custom TTL (default: instance default)
   */
  set(userId: string, profile: InstagramProfile, ttl?: number): void {
    this.cache.set(userId, {
      profile,
      cachedAt: Date.now(),
      ttl: ttl || this.defaultTtl
    });
  }

  /**
   * Clears cache (or specific user)
   *
   * @param userId - Optional user ID to clear (clears all if not provided)
   */
  clear(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Gets cache statistics
   *
   * @returns Cache stats (size, hit rate, etc.)
   */
  getStats(): {
    size: number;
    entries: number;
    expired: number;
  } {
    const now = Date.now();
    let expired = 0;

    for (const [, cached] of this.cache.entries()) {
      if (now - cached.cachedAt > cached.ttl) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      entries: this.cache.size - expired,
      expired
    };
  }

  /**
   * Removes expired entries
   *
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [userId, cached] of this.cache.entries()) {
      if (now - cached.cachedAt > cached.ttl) {
        this.cache.delete(userId);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * Instagram Graph API client for profile fetching
 */
class InstagramGraphAPI {
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || '';
    this.apiVersion = process.env.META_API_VERSION || 'v21.0';
  }

  /**
   * Fetches Instagram profile via Graph API
   *
   * @param userId - Instagram-scoped user ID (IGSID)
   * @returns Profile data
   * @throws Error if API call fails
   */
  async fetchProfile(userId: string): Promise<InstagramProfile> {
    if (!this.accessToken) {
      throw new Error('Instagram access token not configured (INSTAGRAM_ACCESS_TOKEN or META_PAGE_ACCESS_TOKEN)');
    }

    try {
      // Instagram Graph API endpoint
      // GET /{ig-user-id}?fields=id,username,name,profile_picture_url,account_type
      const url = `https://graph.facebook.com/${this.apiVersion}/${userId}`;
      const response = await axios.get(url, {
        params: {
          fields: 'id,username,name,profile_picture_url,account_type',
          access_token: this.accessToken
        }
      });

      const data = response.data;

      return {
        id: data.id,
        username: data.username,
        profilePictureUrl: data.profile_picture_url,
        name: data.name,
        accountType: data.account_type
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;

        // Handle specific error cases
        if (status === 400) {
          throw new Error(`Invalid Instagram user ID: ${userId}`);
        } else if (status === 401 || status === 403) {
          throw new Error(`Instagram API authentication error: ${message}`);
        } else if (status === 404) {
          throw new Error(`Instagram user not found: ${userId}`);
        }

        throw new Error(`Instagram Graph API error: ${message}`);
      }

      throw error;
    }
  }

  /**
   * Fetches Instagram username only (lightweight)
   *
   * @param userId - Instagram-scoped user ID
   * @returns Username string
   */
  async fetchUsername(userId: string): Promise<string> {
    if (!this.accessToken) {
      return userId; // Fallback to user ID
    }

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${userId}`;
      const response = await axios.get(url, {
        params: {
          fields: 'username',
          access_token: this.accessToken
        }
      });

      return response.data.username || userId;
    } catch (error) {
      console.warn('[Instagram Profile] Username fetch failed:', error);
      return userId; // Fallback to user ID
    }
  }
}

/**
 * Gets Instagram profile with caching
 *
 * Fetches profile from cache if available, otherwise calls Graph API
 * and stores result in cache for future use.
 *
 * @param userId - Instagram-scoped user ID (IGSID)
 * @param usernameHint - Optional username hint (if already known)
 * @param cache - Optional cache instance (creates new if not provided)
 * @returns Profile data with username and picture URL
 *
 * @example
 * ```typescript
 * // With cache instance
 * const cache = new InstagramProfileCache();
 * const profile = await getInstagramProfile('12345', '@john', cache);
 *
 * // Without cache (creates temporary)
 * const profile = await getInstagramProfile('12345');
 * ```
 */
export async function getInstagramProfile(
  userId: string,
  usernameHint?: string,
  cache?: InstagramProfileCache
): Promise<{ username: string; profilePictureUrl?: string; name?: string }> {
  // Use cache if provided, otherwise create temporary
  const profileCache = cache || new InstagramProfileCache();

  // Check cache first
  const cached = profileCache.get(userId);
  if (cached) {
    return {
      username: cached.username,
      profilePictureUrl: cached.profilePictureUrl,
      name: cached.name
    };
  }

  // Fetch from API
  const api = new InstagramGraphAPI();

  try {
    const profile = await api.fetchProfile(userId);

    // Store in cache
    profileCache.set(userId, profile);

    return {
      username: profile.username,
      profilePictureUrl: profile.profilePictureUrl,
      name: profile.name
    };
  } catch (error) {
    console.warn(`[Instagram Profile] Failed to fetch profile for ${userId}:`, error);

    // Fallback to username hint or user ID
    const fallbackProfile: InstagramProfile = {
      id: userId,
      username: usernameHint || userId
    };

    // Cache fallback with shorter TTL (5 minutes)
    profileCache.set(userId, fallbackProfile, 300000);

    return {
      username: fallbackProfile.username
    };
  }
}

/**
 * Pre-warms cache with multiple profiles in batch
 *
 * Useful for pre-loading profiles before processing a batch of messages.
 *
 * @param userIds - Array of Instagram user IDs to pre-load
 * @param cache - Cache instance to populate
 * @returns Number of profiles successfully cached
 *
 * @example
 * ```typescript
 * const cache = new InstagramProfileCache();
 * const cached = await prewarmProfileCache(['id1', 'id2', 'id3'], cache);
 * console.log(`Pre-cached ${cached} profiles`);
 * ```
 */
export async function prewarmProfileCache(
  userIds: string[],
  cache: InstagramProfileCache
): Promise<number> {
  let successCount = 0;

  for (const userId of userIds) {
    try {
      await getInstagramProfile(userId, undefined, cache);
      successCount++;

      // Rate limiting: wait 50ms between API calls
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.warn(`[Profile Prewarm] Failed for ${userId}:`, error);
    }
  }

  return successCount;
}
