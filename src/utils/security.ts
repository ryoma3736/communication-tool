import crypto from 'crypto';

export class SecurityUtils {
  static verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
    const sortedParams = Object.keys(params).sort().map(key => key + params[key]).join('');
    const data = url + sortedParams;
    const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
    return signature === expected;
  }

  static verifyMetaSignature(appSecret: string, payload: string, signature: string): boolean {
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  static maskPII(text: string): string {
    text = text.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g, '[PHONE]');
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    return text;
  }

  static generateCorrelationId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(8).toString('hex');
    return 'corr_' + timestamp + '_' + random;
  }

  static hashIdentifier(identifier: string): string {
    return crypto.createHash('sha256').update(identifier).digest('hex');
  }
}
