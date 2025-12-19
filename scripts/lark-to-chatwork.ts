/**
 * Lark → Chatwork 返信連携
 * Larkから入力したメッセージをChatworkに送信
 */
import axios from 'axios';
import * as readline from 'readline';

// Chatwork設定
const CHATWORK_TOKEN = 'f3bfef996cf569e4c5f4df71ae386407';
const CHATWORK_ROOMS = [
  { id: '378883309', name: '【AIチーム】メイカヒット' },
];

async function sendToChatwork(roomId: string, message: string) {
  const response = await axios.post(
    `https://api.chatwork.com/v2/rooms/${roomId}/messages`,
    `body=${encodeURIComponent(message)}`,
    {
      headers: {
        'X-ChatWorkToken': CHATWORK_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data;
}

async function main() {
  console.log('=== Lark → Chatwork 返信テスト ===\n');
  console.log('送信先: 【AIチーム】メイカヒット\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('📝 送信するメッセージを入力: ', async (message) => {
    if (!message.trim()) {
      console.log('❌ メッセージが空です');
      rl.close();
      return;
    }

    try {
      console.log('\n📤 Chatwork に送信中...');
      await sendToChatwork(CHATWORK_ROOMS[0].id, message);
      console.log('✅ 送信成功！\n');
      console.log('👀 Chatwork の【AIチーム】メイカヒットを確認して！');
    } catch (err: any) {
      console.log('❌ 送信失敗:', err.message);
    }

    rl.close();
  });
}

main();
