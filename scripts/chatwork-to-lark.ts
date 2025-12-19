/**
 * Chatwork → Lark 通知連携
 * Chatworkの新着メッセージをLarkに転送
 */
import axios from 'axios';

// Chatwork設定
const CHATWORK_TOKEN = 'f3bfef996cf569e4c5f4df71ae386407';
const CHATWORK_ROOMS = [
  { id: '378883309', name: '【AIチーム】メイカヒット' },
];

// Lark設定
const LARK_APP_ID = 'cli_a9b80f6ee5b8de1a';
const LARK_APP_SECRET = 'OUjASJ0OudWBegVlZYbfIdnEI3WjiJSv';
const LARK_CHAT_ID = 'oc_65dcbe37993c4aac352e30dad727f5c5';

// 最後に取得したメッセージID（本番ではDBに保存）
let lastMessageIds: { [roomId: string]: string } = {};

async function getLarkToken(): Promise<string> {
  const response = await axios.post(
    'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }
  );
  return response.data.tenant_access_token;
}

async function sendToLark(token: string, roomName: string, senderName: string, message: string) {
  const cardContent = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: `💬 Chatwork: ${roomName}` },
      template: 'blue',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**送信者**: ${senderName}` },
      },
      {
        tag: 'div',
        text: { tag: 'lark_md', content: message },
      },
      {
        tag: 'hr',
      },
      {
        tag: 'note',
        elements: [{ tag: 'plain_text', content: `Chatwork から転送 | ${new Date().toLocaleString('ja-JP')}` }],
      },
    ],
  };

  await axios.post(
    'https://open.larksuite.com/open-apis/im/v1/messages',
    {
      receive_id: LARK_CHAT_ID,
      msg_type: 'interactive',
      content: JSON.stringify(cardContent),
    },
    {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      params: { receive_id_type: 'chat_id' },
    }
  );
}

async function getChatworkMessages(roomId: string) {
  const response = await axios.get(
    `https://api.chatwork.com/v2/rooms/${roomId}/messages`,
    {
      headers: { 'X-ChatWorkToken': CHATWORK_TOKEN },
      params: { force: 1 }, // 既読でも取得
    }
  );
  return response.data || [];
}

async function main() {
  console.log('=== Chatwork → Lark 連携テスト ===\n');

  const larkToken = await getLarkToken();
  console.log('Lark Token: ✅\n');

  for (const room of CHATWORK_ROOMS) {
    console.log(`📥 ${room.name} のメッセージ取得中...`);

    const messages = await getChatworkMessages(room.id);

    if (messages.length === 0) {
      console.log('  メッセージなし\n');
      continue;
    }

    // 削除済み・空メッセージを除外
    const validMessages = messages.filter((msg: any) =>
      msg.body && !msg.body.includes('[deleted]') && msg.body.trim() !== ''
    );

    // 最新5件を表示
    const recentMessages = validMessages.slice(-5);
    console.log(`  有効なメッセージ ${recentMessages.length} 件:\n`);

    for (const msg of recentMessages) {
      const senderName = msg.account?.name || '不明';
      const body = msg.body || '';
      const time = new Date(msg.send_time * 1000).toLocaleString('ja-JP');

      console.log(`  [${time}] ${senderName}: ${body.substring(0, 50)}...`);
    }

    // 最新メッセージをLarkに転送
    const latestMsg = recentMessages[recentMessages.length - 1];
    if (latestMsg) {
      console.log('\n  → Lark に転送中...');

      await sendToLark(
        larkToken,
        room.name,
        latestMsg.account?.name || '不明',
        latestMsg.body || '(本文なし)'
      );

      console.log('  ✅ Lark に送信完了！\n');
    }
  }

  console.log('👀 Lark の「全通知」グループを確認して！');
}

main().catch(err => {
  console.error('エラー:', err.response?.data || err.message);
});
