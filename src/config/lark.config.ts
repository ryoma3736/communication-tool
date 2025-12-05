export const larkConfig = {
  appId: process.env.LARK_APP_ID || '',
  appSecret: process.env.LARK_APP_SECRET || '',
  verificationToken: process.env.LARK_VERIFICATION_TOKEN || '',
  encryptKey: process.env.LARK_ENCRYPT_KEY || '',
  
  // Default notification settings
  defaultGroupId: process.env.LARK_DEFAULT_GROUP_ID || '',
  
  // Event subscriptions
  eventSubscriptions: [
    'im.message.receive_v1',
    'card.action.trigger'
  ],
  
  // Required permissions
  permissions: [
    'im:message',
    'im:message:send_as_bot',
    'im:message.group_at_msg',
    'contact:user.base:readonly',
    'bitable:app'
  ],
  
  // Card action callback URL
  cardCallbackUrl: process.env.LARK_CARD_CALLBACK_URL || ''
};

export const channelNotificationGroups: Record<string, string> = {
  line: process.env.LARK_GROUP_LINE || '',
  sms: process.env.LARK_GROUP_SMS || '',
  whatsapp: process.env.LARK_GROUP_WHATSAPP || '',
  email: process.env.LARK_GROUP_EMAIL || '',
  webchat: process.env.LARK_GROUP_WEBCHAT || '',
  facebook: process.env.LARK_GROUP_FACEBOOK || '',
  instagram: process.env.LARK_GROUP_INSTAGRAM || '',
  linkedin: process.env.LARK_GROUP_LINKEDIN || ''
};
