/**
 * Meta-Lark Bridge Configuration
 *
 * Unified configuration for Meta (Facebook Messenger + Instagram) to Lark bridge server
 */

export interface MetaBridgeConfig {
  /** Server port */
  port: number;
  /** Meta webhook verification token */
  verifyToken: string;
  /** Lark configuration */
  lark: {
    appId: string;
    appSecret: string;
    chatId: string;
  };
  /** Meta platform configuration */
  meta: {
    appId: string;
    appSecret: string;
    pageToken: string;
  };
}

/**
 * Load configuration from environment variables
 */
export const metaBridgeConfig: MetaBridgeConfig = {
  port: parseInt(process.env.META_BRIDGE_PORT || '3003', 10),
  verifyToken: process.env.META_VERIFY_TOKEN || '',
  lark: {
    appId: process.env.LARK_APP_ID || '',
    appSecret: process.env.LARK_APP_SECRET || '',
    chatId: process.env.LARK_CHAT_ID || process.env.LARK_DEFAULT_GROUP_ID || '',
  },
  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    pageToken: process.env.META_PAGE_ACCESS_TOKEN || '',
  },
};

/**
 * Validate required configuration
 */
export function validateMetaBridgeConfig(config: MetaBridgeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.verifyToken) {
    errors.push('META_VERIFY_TOKEN is required');
  }

  if (!config.lark.appId || !config.lark.appSecret) {
    errors.push('LARK_APP_ID and LARK_APP_SECRET are required');
  }

  if (!config.lark.chatId) {
    errors.push('LARK_CHAT_ID or LARK_DEFAULT_GROUP_ID is required');
  }

  if (!config.meta.appId || !config.meta.appSecret) {
    errors.push('META_APP_ID and META_APP_SECRET are required');
  }

  if (!config.meta.pageToken) {
    errors.push('META_PAGE_ACCESS_TOKEN is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
