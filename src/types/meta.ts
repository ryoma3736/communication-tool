/**
 * Meta (Facebook/Instagram) API Type Definitions
 *
 * OAuth 2.0 authentication flow and token management types
 * for Facebook Graph API integration.
 *
 * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 */

/**
 * Access token exchange response from Meta Graph API
 */
export interface MetaTokenResponse {
  /** Access token string */
  access_token: string;
  /** Token type (always "bearer" for Meta) */
  token_type: string;
  /** Token expiration time in seconds */
  expires_in?: number;
}

/**
 * Long-lived token exchange response
 * Long-lived tokens expire in ~60 days
 */
export interface MetaLongLivedTokenResponse extends MetaTokenResponse {
  /** Token expiration time in seconds (typically 5184000 = 60 days) */
  expires_in: number;
}

/**
 * Token debug response from Meta Graph API
 * Used for validating and inspecting access tokens
 */
export interface MetaTokenDebugResponse {
  data: {
    /** App ID that the token belongs to */
    app_id: string;
    /** Type of token (USER, PAGE, etc.) */
    type: string;
    /** Application name */
    application: string;
    /** Unix timestamp when token expires (0 = never expires) */
    expires_at: number;
    /** Whether the token is valid */
    is_valid: boolean;
    /** Unix timestamp when token was issued */
    issued_at: number;
    /** Scopes granted to the token */
    scopes: string[];
    /** User ID the token belongs to */
    user_id: string;
  };
}

/**
 * Page access token response
 * Page tokens can be long-lived or never-expiring
 */
export interface MetaPageTokenResponse {
  /** Page access token */
  access_token: string;
  /** Page ID */
  id: string;
  /** Page name */
  name?: string;
  /** Token expiration (0 = never expires) */
  expires_in?: number;
}

/**
 * Instagram account information
 */
export interface MetaInstagramAccount {
  /** Instagram account ID */
  id: string;
  /** Instagram username */
  username: string;
  /** Instagram account type (BUSINESS, CREATOR) */
  account_type?: string;
}

/**
 * Meta OAuth configuration
 */
export interface MetaOAuthConfig {
  /** Meta App ID */
  appId: string;
  /** Meta App Secret */
  appSecret: string;
  /** Page Access Token (long-lived) */
  pageAccessToken: string;
  /** Facebook Page ID */
  pageId: string;
  /** Instagram Account ID */
  instagramId: string;
  /** Webhook verification token */
  verifyToken: string;
  /** Graph API version (default: v21.0) */
  apiVersion?: string;
}

/**
 * Token validation result
 */
export interface MetaTokenValidation {
  /** Whether the token is valid */
  isValid: boolean;
  /** Token expiration timestamp (Unix) */
  expiresAt?: number;
  /** Error message if validation failed */
  error?: string;
  /** Granted scopes */
  scopes?: string[];
}

/**
 * Meta API error response
 */
export interface MetaAPIError {
  error: {
    /** Error message */
    message: string;
    /** Error type */
    type: string;
    /** Error code */
    code: number;
    /** Error subcode */
    error_subcode?: number;
    /** Facebook trace ID for debugging */
    fbtrace_id?: string;
  };
}
