import { UnifiedMessage } from '../../types/message';
import { Customer, Thread } from '../../types/customer';

interface MessageCardParams {
  message: UnifiedMessage;
  customer: Customer;
  thread: Thread;
  channelIcon: string;
  channelColor: string;
}

export function buildMessageCard(params: MessageCardParams): any {
  const { message, customer, thread, channelIcon, channelColor } = params;
  const isVip = customer.isVip ? ' ⭐ VIP' : '';
  const timestamp = new Date(message.timestamp).toLocaleString('ja-JP');
  const channelName = message.channel.toUpperCase();

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: channelIcon + ' ' + customer.displayName + isVip },
      template: getHeaderColor(channelColor)
    },
    elements: [
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: '**チャネル:** ' + channelName } },
          { is_short: true, text: { tag: 'lark_md', content: '**受信時刻:** ' + timestamp } }
        ]
      },
      { tag: 'hr' },
      { tag: 'div', text: { tag: 'lark_md', content: message.content } },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          { tag: 'button', text: { tag: 'plain_text', content: '💬 返信' }, type: 'primary', value: JSON.stringify({ action: 'reply', threadId: thread.threadId }) },
          { tag: 'button', text: { tag: 'plain_text', content: '👤 担当者割当' }, type: 'default', value: JSON.stringify({ action: 'assign', threadId: thread.threadId }) },
          { tag: 'button', text: { tag: 'plain_text', content: '✅ 完了' }, type: 'default', value: JSON.stringify({ action: 'close', threadId: thread.threadId }) }
        ]
      },
      { tag: 'note', elements: [{ tag: 'plain_text', content: 'Thread: ' + thread.threadId.substring(0, 8) + '... | Status: ' + thread.status }] }
    ]
  };
}

function getHeaderColor(hexColor: string): string {
  const colorMap: Record<string, string> = {
    '#06C755': 'green', '#FF6B6B': 'red', '#25D366': 'green', '#EA4335': 'red',
    '#4A90D9': 'blue', '#1877F2': 'blue', '#E4405F': 'carmine', '#0A66C2': 'blue'
  };
  return colorMap[hexColor] || 'blue';
}
