import { UnifiedMessage } from '../types/message';
import { Customer, Thread } from '../types/customer';
import { ChannelType } from '../types/channel';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export interface RuleCondition {
  type: 'channel' | 'keyword' | 'customer_attribute' | 'time';
  operator: 'equals' | 'contains' | 'in' | 'not_in';
  value: string | string[];
}

export interface RuleAction {
  type: 'notify' | 'assign' | 'tag' | 'priority' | 'auto_reply';
  params: Record<string, any>;
}

export class AutomationService {
  private rules: AutomationRule[] = [];

  constructor() {
    this.loadRules();
  }

  private loadRules(): void {
    // Load from DynamoDB or config
    this.rules = [
      {
        id: 'vip-notification',
        name: 'VIP Customer Notification',
        enabled: true,
        conditions: [
          { type: 'customer_attribute', operator: 'equals', value: 'vip:true' }
        ],
        actions: [
          { type: 'notify', params: { groupId: process.env.LARK_VIP_GROUP || '', mention: '@all' } },
          { type: 'priority', params: { level: 'high' } }
        ]
      },
      {
        id: 'urgent-keyword',
        name: 'Urgent Keyword Detection',
        enabled: true,
        conditions: [
          { type: 'keyword', operator: 'contains', value: ['urgent', '緊急', 'ASAP', 'クレーム'] }
        ],
        actions: [
          { type: 'priority', params: { level: 'high' } },
          { type: 'tag', params: { tag: 'urgent' } }
        ]
      }
    ];
  }

  async evaluate(message: UnifiedMessage, customer: Customer, thread: Thread): Promise<RuleAction[]> {
    const triggeredActions: RuleAction[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const conditionsMet = rule.conditions.every(condition => 
        this.evaluateCondition(condition, message, customer, thread)
      );

      if (conditionsMet) {
        triggeredActions.push(...rule.actions);
      }
    }

    return triggeredActions;
  }

  private evaluateCondition(
    condition: RuleCondition,
    message: UnifiedMessage,
    customer: Customer,
    thread: Thread
  ): boolean {
    switch (condition.type) {
      case 'channel':
        return this.matchValue(message.channel, condition);
      case 'keyword':
        return this.matchKeywords(message.content, condition);
      case 'customer_attribute':
        return this.matchCustomerAttribute(customer, condition);
      case 'time':
        return this.matchTime(condition);
      default:
        return false;
    }
  }

  private matchValue(value: string, condition: RuleCondition): boolean {
    const condValue = condition.value;
    switch (condition.operator) {
      case 'equals':
        return value === condValue;
      case 'in':
        return Array.isArray(condValue) && condValue.includes(value);
      case 'not_in':
        return Array.isArray(condValue) && !condValue.includes(value);
      default:
        return false;
    }
  }

  private matchKeywords(content: string, condition: RuleCondition): boolean {
    const keywords = Array.isArray(condition.value) ? condition.value : [condition.value];
    const lowerContent = content.toLowerCase();
    return keywords.some(kw => lowerContent.includes(kw.toLowerCase()));
  }

  private matchCustomerAttribute(customer: Customer, condition: RuleCondition): boolean {
    const [attr, val] = (condition.value as string).split(':');
    switch (attr) {
      case 'vip':
        return customer.isVip === (val === 'true');
      case 'tag':
        return customer.tags.includes(val);
      default:
        return false;
    }
  }

  private matchTime(condition: RuleCondition): boolean {
    // Business hours check
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Default business hours: Mon-Fri, 9-18
    const isBusinessHours = day >= 1 && day <= 5 && hour >= 9 && hour < 18;
    
    return condition.value === 'business_hours' ? isBusinessHours : !isBusinessHours;
  }
}
