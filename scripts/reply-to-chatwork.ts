/**
 * Lark → Chatwork 返信テスト
 */
import axios from 'axios';

const CHATWORK_TOKEN = 'f3bfef996cf569e4c5f4df71ae386407';
const CHATWORK_ROOM_ID = '378883309'; // 【AIチーム】メイカヒット

const message = process.argv[2] || '🌸 Lark Message Hub からのテスト返信です！';

async function main() {
  console.log('=== Lark → Chatwork 返信 ===\n');
  console.log(`📤 送信先: 【AIチーム】メイカヒット`);
  console.log(`📝 メッセージ: ${message}\n`);

  try {
    await axios.post(
      `https://api.chatwork.com/v2/rooms/${CHATWORK_ROOM_ID}/messages`,
      `body=${encodeURIComponent(message)}`,
      {
        headers: {
          'X-ChatWorkToken': CHATWORK_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('✅ Chatwork に送信成功！');
    console.log('\n👀 Chatwork を確認して！');
  } catch (err: any) {
    console.log('❌ 送信失敗:', err.response?.data || err.message);
  }
}

main();
