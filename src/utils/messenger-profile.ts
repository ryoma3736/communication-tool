/**
 * Messenger Profile Utility
 *
 * Fetches and caches Facebook Messenger user profiles using Graph API.
 * Implements in-memory LRU cache to minimize API calls and improve performance.
 *
 * @module utils/messenger-profile
 */

import axios from 'axios';

/**
 * Messenger user profile data from Graph API
 */
export interface MessengerProfile {
  /** User's Page-Scoped ID (PSID) */
  psid: string;
  /** Full name (first_name + last_name) */
  name: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Profile picture URL */
  profilePic?: string;
  /** Locale (e.g., 'en_US', 'ja_JP') */
  locale?: string;
  /** Timezone offset from UTC */
  timezone?: number;
  /** Gender */
  gender?: string;
}

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  profile: MessengerProfile;
  timestamp: number;
}

/**
 * Profile cache with LRU eviction
 */
class ProfileCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 1000, ttlMinutes = 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Gets profile from cache if valid
   */
  get(psid: string): MessengerProfile | null {
    const entry = this.cache.get(psid);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(psid);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(psid);
    this.cache.set(psid, entry);

    return entry.profile;
  }

  /**
   * Sets profile in cache
   */
  set(psid: string, profile: MessengerProfile): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(psid, {
      profile,
      timestamp: Date.now()
    });
  }

  /**
   * Clears entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttlMs / (60 * 1000)
    };
  }
}

/**
 * Global profile cache instance
 */
const profileCache = new ProfileCache();

/**
 * Meta Graph API configuration
 */
const getGraphAPIConfig = () => ({
  accessToken: process.env.META_PAGE_ACCESS_TOKEN || '',
  apiVersion: process.env.META_API_VERSION || 'v18.0',
  fields: 'first_name,last_name,profile_pic,locale,timezone,gender'
});

/**
 * Fetches Messenger user profile from Graph API
 *
 * @param psid - User's Page-Scoped ID
 * @param useCache - Whether to use cache (default: true)
 * @returns User profile or null if failed
 *
 * @example
 * ```typescript
 * const profile = await getMessengerProfile('1234567890');
 * if (profile) {
 *   console.log(`User: ${profile.name}`);
 * }
 * ```
 */
export async function getMessengerProfile(
  psid: string,
  useCache = true
): Promise<MessengerProfile | null> {
  if (!psid) {
    console.warn('getMessengerProfile: PSID is required');
    return null;
  }

  // Check cache first
  if (useCache) {
    const cached = profileCache.get(psid);
    if (cached) {
      console.log(`✅ Profile cache HIT: ${psid}`);
      return cached;
    }
  }

  const config = getGraphAPIConfig();
  if (!config.accessToken) {
    console.error('getMessengerProfile: META_PAGE_ACCESS_TOKEN not configured');
    return null;
  }

  try {
    console.log(`🔍 Fetching profile from Graph API: ${psid}`);

    const url = `https://graph.facebook.com/${config.apiVersion}/${psid}`;
    const response = await axios.get(url, {
      params: {
        fields: config.fields,
        access_token: config.accessToken
      },
      timeout: 5000
    });

    const data = response.data;
    const profile: MessengerProfile = {
      psid,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown User',
      firstName: data.first_name,
      lastName: data.last_name,
      profilePic: data.profile_pic,
      locale: data.locale,
      timezone: data.timezone,
      gender: data.gender
    };

    // Cache the result
    if (useCache) {
      profileCache.set(psid, profile);
    }

    console.log(`✅ Profile fetched: ${profile.name}`);
    return profile;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Graph API error:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message,
        code: error.response?.data?.error?.code
      });
    } else {
      console.error('Unexpected error fetching profile:', error);
    }
    return null;
  }
}

/**
 * Fetches multiple user profiles in batch
 *
 * @param psids - Array of PSIDs
 * @param useCache - Whether to use cache
 * @returns Map of PSID to profile (nulls for failed fetches)
 *
 * @example
 * ```typescript
 * const profiles = await getMessengerProfilesBatch(['psid1', 'psid2']);
 * profiles.forEach((profile, psid) => {
 *   if (profile) console.log(`${psid}: ${profile.name}`);
 * });
 * ```
 */
export async function getMessengerProfilesBatch(
  psids: string[],
  useCache = true
): Promise<Map<string, MessengerProfile | null>> {
  const results = new Map<string, MessengerProfile | null>();

  // Fetch in parallel with rate limiting
  const batchSize = 10;
  for (let i = 0; i < psids.length; i += batchSize) {
    const batch = psids.slice(i, i + batchSize);
    const promises = batch.map(psid => getMessengerProfile(psid, useCache));
    const profiles = await Promise.all(promises);

    batch.forEach((psid, index) => {
      results.set(psid, profiles[index]);
    });

    // Wait between batches to avoid rate limiting
    if (i + batchSize < psids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Preloads profiles into cache
 *
 * @param psids - Array of PSIDs to preload
 * @returns Number of successfully cached profiles
 */
export async function preloadMessengerProfiles(psids: string[]): Promise<number> {
  console.log(`🔄 Preloading ${psids.length} profiles...`);

  const results = await getMessengerProfilesBatch(psids, true); // Use cache=true to populate cache
  const successCount = Array.from(results.values()).filter(p => p !== null).length;

  console.log(`✅ Preloaded ${successCount}/${psids.length} profiles`);
  return successCount;
}

/**
 * Clears the profile cache
 */
export function clearProfileCache(): void {
  profileCache.clear();
  console.log('🗑️ Profile cache cleared');
}

/**
 * Gets cache statistics
 */
export function getProfileCacheStats(): { size: number; maxSize: number; ttlMinutes: number } {
  return profileCache.getStats();
}

/**
 * Validates if a PSID format is correct
 *
 * @param psid - PSID to validate
 * @returns True if valid format
 */
export function isValidPSID(psid: string): boolean {
  // PSIDs are typically 16-17 digit numeric strings
  return /^\d{15,20}$/.test(psid);
}
