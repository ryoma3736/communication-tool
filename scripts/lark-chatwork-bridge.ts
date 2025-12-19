/**
 * Lark 統合ブリッジサーバー
 *
 * - Lark → Chatwork 転送
 * - Lark → Gmail 送信 (mail:宛先 本文)
 */
import express from 'express';
import axios from 'axios';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json());

// Chatwork設定
const CHATWORK_TOKEN = 'f3bfef996cf569e4c5f4df71ae386407';
const CHATWORK_ROOM_ID = '378883309'; // 【AIチーム】メイカヒット

// Gmail設定
const GMAIL_USER = 'ryoma@samurai-tech1.com';
const GMAIL_PASSWORD = 'ptmtpwmfexfdarth';

// Gmail送信用トランスポート
const gmailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASSWORD },
});

async function sendEmail(to: string, body: string) {
  await gmailTransport.sendMail({
    from: GMAIL_USER,
    to,
    subject: 'Larkからのメッセージ',
    text: body,
  });
}

async function sendToChatwork(message: string) {
  // メッセージ本文のみ送信（プレフィックスなし）
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
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Lark-Chatwork Bridge' });
});

// Lark Event Webhook
app.post('/webhook/lark', async (req, res) => {
  const body = req.body;

  console.log('\n📥 Lark Event received:', JSON.stringify(body, null, 2));

  // URL検証
  if (body.type === 'url_verification') {
    console.log('✅ URL verification');
    return res.json({ challenge: body.challenge });
  }

  // Event Callback (v2.0)
  if (body.schema === '2.0' && body.header?.event_type === 'im.message.receive_v1') {
    const event = body.event;
    const message = event?.message;

    if (message) {
      const content = JSON.parse(message.content || '{}');
      let text = content.text || '';
      const senderType = event.sender?.sender_type || '';

      // Botからのメッセージは無視（無限ループ防止）
      if (senderType === 'app') {
        console.log('⏭️ Bot message, skipping');
        return res.json({ success: true });
      }

      // メンションのプレースホルダーを実際の名前に置換
      const mentions = message.mentions || [];
      for (const mention of mentions) {
        if (mention.key && mention.name) {
          text = text.replace(mention.key, `@${mention.name}`);
        }
      }

      // @zen-tsuchiへのメンションを除去（Bot自身へのメンション）
      text = text.replace(/@zen-tsuchi\s*/g, '').trim();

      // 空のメッセージはスキップ
      if (!text) {
        console.log('⏭️ Empty message after cleanup, skipping');
        return res.json({ success: true });
      }

      // mail:宛先 本文 形式でメール送信
      const emailMatch = text.match(/^mail:(\S+)\s+(.+)$/s);
      if (emailMatch) {
        const [, to, body] = emailMatch;
        console.log(`📧 Sending email to: ${to}`);
        try {
          await sendEmail(to, body);
          console.log('✅ Email sent!');
        } catch (err: any) {
          console.error('❌ Email error:', err.message);
        }
        return res.json({ success: true });
      }

      // それ以外はChatworkに転送
      console.log(`📤 Forwarding to Chatwork: "${text}"`);

      try {
        await sendToChatwork(text);
        console.log('✅ Sent to Chatwork!');
      } catch (err: any) {
        console.error('❌ Chatwork error:', err.message);
      }
    }

    return res.json({ success: true });
  }

  // Legacy format
  if (body.event?.message) {
    const msg = body.event.message;
    const content = JSON.parse(msg.content || '{}');
    const text = content.text || '';

    if (text && body.event.sender?.sender_type !== 'app') {
      console.log(`📤 Forwarding: "${text}"`);
      try {
        await sendToChatwork(text);
        console.log('✅ Sent!');
      } catch (err: any) {
        console.error('❌ Error:', err.message);
      }
    }
  }

  res.json({ success: true });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Lark ↔ Chatwork Bridge Server                         ║
╠═══════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                             ║
║                                                           ║
║  Endpoints:                                               ║
║  - GET  /health        Health check                       ║
║  - POST /webhook/lark  Lark event receiver                ║
║                                                           ║
║  Next steps:                                              ║
║  1. Run: ngrok http ${PORT}                                   ║
║  2. Copy the https URL                                    ║
║  3. Set in Lark Developer Console → Events & Callbacks    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
