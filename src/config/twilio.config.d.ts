export declare const twilioConfig: {
    accountSid: string;
    authToken: string;
    conversationsServiceSid: string;
    webhooks: {
        preEvent: string;
        postEvent: string;
    };
    eventSubscriptions: string[];
    channels: {
        line: {
            channelId: string;
            channelSecret: string;
        };
        sms: {
            phoneNumber: string;
        };
        whatsapp: {
            phoneNumber: string;
        };
    };
};
