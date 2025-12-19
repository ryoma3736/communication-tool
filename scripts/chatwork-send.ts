/**
 * Chatwork テストメッセージ送信
 */
import axios from 'axios';

const API_TOKEN = 'f3bfef996cf569e4c5f4df71ae386407';
const ROOMS = [
  { id: '378883309', name: '【AIチーム】メイカヒット' },
  { id: '289171237', name: '【L.&N.｜LISA& NA】全体連絡用' },
];

async function main() {
  console.log('=== Chatwork テスト送信 ===\n');

  for (const room of ROOMS) {
    try {
      const message = '🌸 Lark Message Hub テスト通知！\n\nChatwork連携テストです。\nこれが見えたら設定成功！';

      const response = await axios.post(
        `https://api.chatwork.com/v2/rooms/${room.id}/messages`,
        `body=${encodeURIComponent(message)}`,
        {
          headers: {
            'X-ChatWorkToken': API_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      console.log(`✅ ${room.name} - 送信成功！`);
    } catch (err: any) {
      console.log(`❌ ${room.name} - 失敗: ${err.response?.data || err.message}`);
    }
  }

  console.log('\n👀 Chatworkを確認して！');
}

main();
