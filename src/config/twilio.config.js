"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioConfig = void 0;
exports.twilioConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    conversationsServiceSid: process.env.TWILIO_CONVERSATIONS_SERVICE_SID || '',
    // Webhook URLs
    webhooks: {
        preEvent: process.env.TWILIO_PRE_EVENT_WEBHOOK || '',
        postEvent: process.env.TWILIO_POST_EVENT_WEBHOOK || ''
    },
    // Event subscriptions
    eventSubscriptions: [
        'onMessageAdded',
        'onConversationAdded',
        'onConversationStateUpdated',
        'onParticipantAdded'
    ],
    // Channel-specific settings
    channels: {
        line: {
            channelId: process.env.LINE_CHANNEL_ID || '',
            channelSecret: process.env.LINE_CHANNEL_SECRET || ''
        },
        sms: {
            phoneNumber: process.env.TWILIO_SMS_NUMBER || ''
        },
        whatsapp: {
            phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER || ''
        }
    }
};
//# sourceMappingURL=twilio.config.js.map