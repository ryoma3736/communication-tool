/**
 * Gmail → Lark 通知連携
 * Gmailの新着メールをLarkに転送
 */
import Imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import axios from 'axios';

// Gmail設定
const GMAIL_USER = 'ryoma@samurai-tech1.com';
const GMAIL_PASSWORD = 'ptmtpwmfexfdarth';

// Lark設定
const LARK_APP_ID = 'cli_a9b80f6ee5b8de1a';
const LARK_APP_SECRET = 'OUjASJ0OudWBegVlZYbfIdnEI3WjiJSv';
const LARK_CHAT_ID = 'oc_65dcbe37993c4aac352e30dad727f5c5';

async function getLarkToken(): Promise<string> {
  const response = await axios.post(
    'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }
  );
  return response.data.tenant_access_token;
}

async function sendToLark(token: string, from: string, subject: string, preview: string) {
  const cardContent = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📧 Gmail: 新着メール' },
      template: 'green',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**差出人**: ${from}` },
      },
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**件名**: ${subject}` },
      },
      {
        tag: 'hr',
      },
      {
        tag: 'div',
        text: { tag: 'lark_md', content: preview.substring(0, 500) + (preview.length > 500 ? '...' : '') },
      },
      {
        tag: 'hr',
      },
      {
        tag: 'note',
        elements: [{ tag: 'plain_text', content: `Gmail から転送 | ${new Date().toLocaleString('ja-JP')}` }],
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

async function main() {
  console.log('=== Gmail → Lark 連携テスト ===\n');

  const config = {
    imap: {
      user: GMAIL_USER,
      password: GMAIL_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    },
  };

  console.log('📥 Gmail に接続中...');

  try {
    const connection = await Imap.connect(config);
    console.log('✅ 接続成功！\n');

    await connection.openBox('INBOX');

    // 最新5件の未読メールを取得
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false,
    };

    let messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length === 0) {
      // 未読がなければ最新5件を取得
      const allCriteria = ['ALL'];
      messages = await connection.search(allCriteria, fetchOptions);
      messages = messages.slice(-5);
    }

    console.log(`📋 メール ${messages.length} 件取得\n`);

    const larkToken = await getLarkToken();

    for (const message of messages.slice(-3)) {
      const all = message.parts.find((part: any) => part.which === '');
      if (!all) continue;

      const parsed = await simpleParser(all.body);

      const from = parsed.from?.text || '不明';
      const subject = parsed.subject || '(件名なし)';
      const text = parsed.text || '(本文なし)';
      const date = parsed.date?.toLocaleString('ja-JP') || '';

      console.log(`  📧 ${date}`);
      console.log(`     From: ${from}`);
      console.log(`     Subject: ${subject}`);
      console.log('');

      // 最後の1件だけLarkに送信
      if (message === messages[messages.length - 1]) {
        console.log('  → Lark に転送中...');
        await sendToLark(larkToken, from, subject, text);
        console.log('  ✅ Lark に送信完了！\n');
      }
    }

    connection.end();
    console.log('👀 Lark の「全通知」グループを確認して！');

  } catch (err: any) {
    console.error('❌ エラー:', err.message);
  }
}

main();
