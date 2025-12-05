export interface LarkAction {
  type: 'reply' | 'assign' | 'status_change' | 'customer_info' | 'unknown';
  threadId: string;
  customerId?: string;
  content?: string;
  operatorId: string;
  operatorName: string;
  newStatus?: string;
  assigneeId?: string;
  assigneeName?: string;
}

export class LarkWebhookHandler {
  parseAction(body: any): LarkAction {
    const action = body.action || {};
    const value = action.value ? JSON.parse(action.value) : {};
    const operator = body.operator || {};

    const baseAction: LarkAction = {
      type: 'unknown',
      threadId: value.threadId || '',
      customerId: value.customerId,
      operatorId: operator.user_id || '',
      operatorName: operator.name || 'Unknown'
    };

    switch (value.action) {
      case 'reply':
        return {
          ...baseAction,
          type: 'reply',
          content: action.input_value || action.form_value?.reply_content || ''
        };
      case 'assign':
        return {
          ...baseAction,
          type: 'assign',
          assigneeId: action.selected_value || '',
          assigneeName: action.selected_text || ''
        };
      case 'close':
        return {
          ...baseAction,
          type: 'status_change',
          newStatus: 'closed'
        };
      case 'pending':
        return {
          ...baseAction,
          type: 'status_change',
          newStatus: 'pending'
        };
      case 'customer_info':
        return {
          ...baseAction,
          type: 'customer_info'
        };
      default:
        return baseAction;
    }
  }

  verifySignature(body: any, signature: string, timestamp: string): boolean {
    // Implement Lark signature verification
    const secret = process.env.LARK_VERIFICATION_TOKEN || '';
    if (!secret) return true; // Skip if no secret configured
    
    // Lark uses a different verification method - implement as needed
    return true;
  }
}
