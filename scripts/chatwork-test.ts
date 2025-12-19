/**
 * Chatwork API テスト
 */
import axios from 'axios';

const API_TOKEN = 'f3bfef996cf569e4c5f4df71ae386407';

const chatworkApi = axios.create({
  baseURL: 'https://api.chatwork.com/v2',
  headers: {
    'X-ChatWorkToken': API_TOKEN,
  },
});

async function getRooms() {
  const response = await chatworkApi.get('/rooms');
  return response.data;
}

async function sendMessage(roomId: string, message: string) {
  const response = await chatworkApi.post(`/rooms/${roomId}/messages`, null, {
    params: { body: message },
  });
  return response.data;
}

async function main() {
  console.log('=== Chatwork API テスト ===\n');

  // ルーム一覧取得
  console.log('📋 ルーム一覧:');
  const rooms = await getRooms();

  rooms.slice(0, 10).forEach((room: any, i: number) => {
    console.log(`  ${i + 1}. ${room.name}`);
    console.log(`     room_id: ${room.room_id}`);
    console.log(`     type: ${room.type}`);
    console.log('');
  });

  if (rooms.length > 10) {
    console.log(`  ... 他 ${rooms.length - 10} 件\n`);
  }
}

main().catch(err => {
  console.error('エラー:', err.response?.data || err.message);
});
