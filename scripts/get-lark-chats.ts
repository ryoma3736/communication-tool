/**
 * Lark API でチャット一覧を取得
 */
import axios from 'axios';

const APP_ID = process.env.LARK_APP_ID || 'cli_a9b80f6ee5b8de1a';
const APP_SECRET = process.env.LARK_APP_SECRET || 'OUjASJ0OudWBegVlZYbfIdnEI3WjiJSv';

async function getTenantAccessToken(): Promise<string> {
  const response = await axios.post(
    'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
    {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    }
  );
  console.log('Token取得:', response.data.code === 0 ? '✅ 成功' : '❌ 失敗');
  return response.data.tenant_access_token;
}

async function getChats(token: string) {
  try {
    const response = await axios.get(
      'https://open.larksuite.com/open-apis/im/v1/chats',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.log('チャット取得エラー:', error.response?.data || error.message);
    return null;
  }
}

async function sendTestMessage(token: string, chatId: string) {
  try {
    const response = await axios.post(
      'https://open.larksuite.com/open-apis/im/v1/messages',
      {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text: '🌸 Lark Message Hub テスト通知です！' }),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          receive_id_type: 'chat_id',
        },
      }
    );
    console.log('メッセージ送信:', response.data.code === 0 ? '✅ 成功' : '❌ 失敗');
    return response.data;
  } catch (error: any) {
    console.log('送信エラー:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('=== Lark API テスト ===\n');

  // 1. トークン取得
  const token = await getTenantAccessToken();
  if (!token) {
    console.log('❌ トークン取得失敗');
    return;
  }

  // 2. チャット一覧取得
  console.log('\n📋 チャット一覧:');
  const chats = await getChats(token);
  if (chats?.data?.items) {
    chats.data.items.forEach((chat: any, i: number) => {
      console.log(`  ${i + 1}. ${chat.name || '(無題)'}`);
      console.log(`     chat_id: ${chat.chat_id}`);
    });
  } else {
    console.log('  チャットが見つからないか、Botがグループに追加されていません');
    console.log('  → Botをグループに追加してから再実行してください');
  }
}

main().catch(console.error);
