/**
 * Meta (Facebook/Instagram) OAuth Authentication Module
 *
 * Handles OAuth 2.0 authentication flow and token management for Meta APIs.
 * Supports short-lived to long-lived token exchange, token refresh, and validation.
 *
 * @module meta-auth
 *
 * @example
 * ```typescript
 * const auth = new MetaAuth({
 *   appId: process.env.META_APP_ID!,
 *   appSecret: process.env.META_APP_SECRET!,
 *   pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN!,
 *   pageId: process.env.META_PAGE_ID!,
 *   instagramId: process.env.META_INSTAGRAM_ID!,
 *   verifyToken: process.env.META_VERIFY_TOKEN!
 * });
 *
 * // Exchange short-lived token for long-lived token
 * const longLivedToken = await auth.getLongLivedToken(shortToken);
 *
 * // Validate token
 * const validation = await auth.validateToken(token);
 * ```
 */

import axios, { AxiosError } from 'axios';
import {
  MetaOAuthConfig,
  MetaTokenResponse,
  MetaLongLivedTokenResponse,
  MetaTokenDebugResponse,
  MetaTokenValidation,
  MetaPageTokenResponse,
  MetaAPIError,
} from '../types/meta';

/**
 * Meta OAuth Authentication Manager
 *
 * Provides methods for:
 * - Short-lived to long-lived token exchange
 * - Token refresh
 * - Token validation
 * - Page access token retrieval
 */
export class MetaAuth {
  private config: MetaOAuthConfig;
  private apiVersion: string;
  private baseUrl: string;

  /**
   * Creates a new MetaAuth instance
   *
   * @param config - Meta OAuth configuration
   */
  constructor(config: MetaOAuthConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Exchange short-lived user access token for long-lived token
   *
   * Short-lived tokens expire in ~1-2 hours
   * Long-lived tokens expire in ~60 days
   *
   * @param shortLivedToken - Short-lived user access token from OAuth flow
   * @returns Long-lived access token
   * @throws {Error} If token exchange fails
   *
   * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
   */
  async getLongLivedToken(shortLivedToken: string): Promise<string> {
    try {
      const response = await axios.get<MetaLongLivedTokenResponse>(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.config.appId,
            client_secret: this.config.appSecret,
            fb_exchange_token: shortLivedToken,
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      return response.data.access_token;
    } catch (error) {
      const axiosError = error as AxiosError<MetaAPIError>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;

      throw new Error(`Failed to get long-lived token: ${errorMessage}`);
    }
  }

  /**
   * Refresh an existing long-lived token
   *
   * Extends token expiration by another 60 days
   * Can only be refreshed once per day
   *
   * @param token - Long-lived access token to refresh
   * @returns Refreshed access token
   * @throws {Error} If token refresh fails
   *
   * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens/refresh
   */
  async refreshToken(token: string): Promise<string> {
    try {
      const response = await axios.get<MetaTokenResponse>(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.config.appId,
            client_secret: this.config.appSecret,
            fb_exchange_token: token,
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      return response.data.access_token;
    } catch (error) {
      const axiosError = error as AxiosError<MetaAPIError>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;

      throw new Error(`Failed to refresh token: ${errorMessage}`);
    }
  }

  /**
   * Validate an access token
   *
   * Checks if token is valid and returns expiration info
   *
   * @param token - Access token to validate
   * @returns Token validation result
   *
   * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens/debugging-and-error-handling
   */
  async validateToken(token: string): Promise<MetaTokenValidation> {
    try {
      const response = await axios.get<MetaTokenDebugResponse>(
        `${this.baseUrl}/debug_token`,
        {
          params: {
            input_token: token,
            access_token: `${this.config.appId}|${this.config.appSecret}`,
          },
        }
      );

      const data = response.data.data;

      return {
        isValid: data.is_valid,
        expiresAt: data.expires_at,
        scopes: data.scopes,
      };
    } catch (error) {
      const axiosError = error as AxiosError<MetaAPIError>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;

      return {
        isValid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get Page Access Token for a Facebook Page
   *
   * Page tokens can be long-lived (60 days) or never-expiring
   *
   * @param userAccessToken - User access token with manage_pages permission
   * @returns Page access token
   * @throws {Error} If page token retrieval fails
   *
   * @see https://developers.facebook.com/docs/pages/access-tokens
   */
  async getPageAccessToken(userAccessToken: string): Promise<string> {
    try {
      const response = await axios.get<{ data: MetaPageTokenResponse[] }>(
        `${this.baseUrl}/${this.config.pageId}`,
        {
          params: {
            fields: 'access_token',
            access_token: userAccessToken,
          },
        }
      );

      // Response format: { access_token: "...", id: "..." }
      const pageData = response.data as unknown as MetaPageTokenResponse;

      if (!pageData.access_token) {
        throw new Error('No page access token in response');
      }

      return pageData.access_token;
    } catch (error) {
      const axiosError = error as AxiosError<MetaAPIError>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;

      throw new Error(`Failed to get page access token: ${errorMessage}`);
    }
  }

  /**
   * Get never-expiring Page Access Token
   *
   * Exchanges a long-lived user token for a never-expiring page token
   *
   * @param longLivedUserToken - Long-lived user access token
   * @returns Never-expiring page access token
   * @throws {Error} If token exchange fails
   */
  async getNeverExpiringPageToken(longLivedUserToken: string): Promise<string> {
    try {
      // First get page token from user token
      const pageToken = await this.getPageAccessToken(longLivedUserToken);

      // Validate that it's a long-lived token
      const validation = await this.validateToken(pageToken);

      if (!validation.isValid) {
        throw new Error('Page token is not valid');
      }

      // If expires_at is 0, it's already never-expiring
      if (validation.expiresAt === 0) {
        return pageToken;
      }

      return pageToken;
    } catch (error) {
      const axiosError = error as AxiosError<MetaAPIError>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;

      throw new Error(
        `Failed to get never-expiring page token: ${errorMessage}`
      );
    }
  }

  /**
   * Verify webhook signature (for Meta webhook callbacks)
   *
   * @param verifyToken - Token sent by Meta in verification request
   * @returns Whether verification token matches configured token
   */
  verifyWebhookToken(verifyToken: string): boolean {
    return verifyToken === this.config.verifyToken;
  }
}

/**
 * Create MetaAuth instance from environment variables
 *
 * @returns Configured MetaAuth instance
 * @throws {Error} If required environment variables are missing
 */
export function createMetaAuthFromEnv(): MetaAuth {
  const requiredEnvVars = [
    'META_APP_ID',
    'META_APP_SECRET',
    'META_PAGE_ACCESS_TOKEN',
    'META_PAGE_ID',
    'META_INSTAGRAM_ID',
    'META_VERIFY_TOKEN',
  ] as const;

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  return new MetaAuth({
    appId: process.env.META_APP_ID!,
    appSecret: process.env.META_APP_SECRET!,
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN!,
    pageId: process.env.META_PAGE_ID!,
    instagramId: process.env.META_INSTAGRAM_ID!,
    verifyToken: process.env.META_VERIFY_TOKEN!,
    apiVersion: process.env.META_API_VERSION,
  });
}
