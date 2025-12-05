export enum ChannelType {
  LINE = 'line',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  WEBCHAT = 'webchat',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin'
}

export const CHANNEL_COLORS: Record<ChannelType, string> = {
  [ChannelType.LINE]: '#06C755',
  [ChannelType.SMS]: '#FF6B6B',
  [ChannelType.WHATSAPP]: '#25D366',
  [ChannelType.EMAIL]: '#EA4335',
  [ChannelType.WEBCHAT]: '#4A90D9',
  [ChannelType.FACEBOOK]: '#1877F2',
  [ChannelType.INSTAGRAM]: '#E4405F',
  [ChannelType.LINKEDIN]: '#0A66C2'
};

export const CHANNEL_ICONS: Record<ChannelType, string> = {
  [ChannelType.LINE]: '💚',
  [ChannelType.SMS]: '📱',
  [ChannelType.WHATSAPP]: '📲',
  [ChannelType.EMAIL]: '📧',
  [ChannelType.WEBCHAT]: '💬',
  [ChannelType.FACEBOOK]: '👤',
  [ChannelType.INSTAGRAM]: '📸',
  [ChannelType.LINKEDIN]: '💼'
};

export type ChannelProvider = 'twilio' | 'meta' | 'linkedin' | 'direct';

export const CHANNEL_PROVIDERS: Record<ChannelType, ChannelProvider> = {
  [ChannelType.LINE]: 'twilio',
  [ChannelType.SMS]: 'twilio',
  [ChannelType.WHATSAPP]: 'twilio',
  [ChannelType.WEBCHAT]: 'twilio',
  [ChannelType.EMAIL]: 'direct',
  [ChannelType.FACEBOOK]: 'meta',
  [ChannelType.INSTAGRAM]: 'meta',
  [ChannelType.LINKEDIN]: 'linkedin'
};
