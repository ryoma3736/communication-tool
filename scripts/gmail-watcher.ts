/**
 * Gmail 常時監視 → Lark 転送
 * シンプル版：バックグラウンドで動かすだけ
 */
import Imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import axios from 'axios';

const GMAIL_USER = 'ryoma@samurai-tech1.com';
const GMAIL_PASSWORD = 'ptmtpwmfexfdarth';
const LARK_APP_ID = 'cli_a9b80f6ee5b8de1a';
const LARK_APP_SECRET = 'OUjASJ0OudWBegVlZYbfIdnEI3WjiJSv';
const LARK_CHAT_ID = 'oc_65dcbe37993c4aac352e30dad727f5c5';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5分

let lastCheckTime = new Date();

async function getLarkToken(): Promise<string> {
  const res = await axios.post(
    'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }
  );
  return res.data.tenant_access_token;
}

async function sendToLark(token: string, from: string, subject: string, preview: string) {
  const card = {
    config: { wide_screen_mode: true },
    header: { title: { tag: 'plain_text', content: '📧 Gmail: 新着メール' }, template: 'green' },
    elements: [
      { tag: 'div', text: { tag: 'lark_md', content: `**差出人**: ${from}` } },
      { tag: 'div', text: { tag: 'lark_md', content: `**件名**: ${subject}` } },
      { tag: 'hr' },
      { tag: 'div', text: { tag: 'lark_md', content: preview.substring(0, 300) } },
    ],
  };

  await axios.post(
    'https://open.larksuite.com/open-apis/im/v1/messages',
    { receive_id: LARK_CHAT_ID, msg_type: 'interactive', content: JSON.stringify(card) },
    { headers: { Authorization: `Bearer ${token}` }, params: { receive_id_type: 'chat_id' } }
  );
}

async function checkEmails() {
  const config = {
    imap: {
      user: GMAIL_USER,
      password: GMAIL_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  try {
    const connection = await Imap.connect(config);
    await connection.openBox('INBOX');

    // 最後のチェック以降の未読メール
    const since = lastCheckTime.toISOString().split('T')[0];
    const messages = await connection.search(['UNSEEN', ['SINCE', since]], {
      bodies: [''],
      markSeen: false,
    });

    if (messages.length > 0) {
      const token = await getLarkToken();

      for (const msg of messages) {
        const all = msg.parts.find((p: any) => p.which === '');
        if (!all) continue;

        const parsed = await simpleParser(all.body);
        const msgDate = parsed.date || new Date();

        if (msgDate > lastCheckTime) {
          const from = parsed.from?.text || '不明';
          const subject = parsed.subject || '(件名なし)';
          const text = parsed.text || '';

          console.log(`📧 新着: ${subject}`);
          await sendToLark(token, from, subject, text);
          console.log(`✅ Lark に送信完了`);
        }
      }
    }

    connection.end();
    lastCheckTime = new Date();
  } catch (err: any) {
    console.error('❌ エラー:', err.message);
  }
}

console.log(`
╔══════════════════════════════════════╗
║   Gmail → Lark 常時監視 開始         ║
║   ${CHECK_INTERVAL / 60000}分ごとにチェック              ║
║   Ctrl+C で停止                      ║
╚══════════════════════════════════════╝
`);

// 初回チェック
checkEmails();

// 定期チェック
setInterval(checkEmails, CHECK_INTERVAL);
