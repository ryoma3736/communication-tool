/**
 * Lark テストメッセージ送信
 */
import axios from 'axios';

const APP_ID = 'cli_a9b80f6ee5b8de1a';
const APP_SECRET = 'OUjASJ0OudWBegVlZYbfIdnEI3WjiJSv';
const CHAT_ID = 'oc_65dcbe37993c4aac352e30dad727f5c5';

async function getTenantAccessToken(): Promise<string> {
  const response = await axios.post(
    'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: APP_ID, app_secret: APP_SECRET }
  );
  return response.data.tenant_access_token;
}

async function sendMessage(token: string) {
  const response = await axios.post(
    'https://open.larksuite.com/open-apis/im/v1/messages',
    {
      receive_id: CHAT_ID,
      msg_type: 'text',
      content: JSON.stringify({
        text: '🌸 Lark Message Hub テスト通知！\n\nこれが見えたら設定成功です！'
      }),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: { receive_id_type: 'chat_id' },
    }
  );
  return response.data;
}

async function main() {
  console.log('=== テストメッセージ送信 ===\n');

  const token = await getTenantAccessToken();
  console.log('Token取得: ✅');

  const result = await sendMessage(token);

  if (result.code === 0) {
    console.log('メッセージ送信: ✅ 成功！');
    console.log('\n👀 Larkの「全通知」グループを確認して！');
  } else {
    console.log('メッセージ送信: ❌ 失敗');
    console.log(result);
  }
}

main().catch(console.error);
