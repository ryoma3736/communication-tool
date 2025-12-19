/**
 * Google Apps Script: Gmail → Lark 自動転送
 *
 * 使い方:
 * 1. https://script.google.com で新しいプロジェクト作成
 * 2. このコードをコピペ
 * 3. LARK_WEBHOOK_URL を設定（下記参照）
 * 4. 「トリガー」で checkNewEmails を5分ごとに実行設定
 */

// Lark Webhook URL（Incoming Webhookを使用）
const LARK_WEBHOOK_URL = 'YOUR_LARK_WEBHOOK_URL_HERE';

// 最後にチェックした時間を保存するキー
const LAST_CHECK_KEY = 'lastCheckTime';

function checkNewEmails() {
  const props = PropertiesService.getScriptProperties();
  let lastCheck = props.getProperty(LAST_CHECK_KEY);

  if (!lastCheck) {
    // 初回は1時間前から
    lastCheck = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  }

  const lastCheckDate = new Date(lastCheck);
  const now = new Date();

  // 未読メールを検索
  const threads = GmailApp.search('is:unread after:' + Math.floor(lastCheckDate.getTime() / 1000));

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      const messageDate = message.getDate();

      // 前回チェック以降の新しいメールのみ
      if (messageDate > lastCheckDate) {
        const from = message.getFrom();
        const subject = message.getSubject();
        const body = message.getPlainBody().substring(0, 500);

        sendToLark(from, subject, body);
      }
    }
  }

  // チェック時間を更新
  props.setProperty(LAST_CHECK_KEY, now.toISOString());
}

function sendToLark(from, subject, body) {
  const card = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '📧 Gmail: 新着メール' },
        template: 'green'
      },
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: '**差出人**: ' + from }
        },
        {
          tag: 'div',
          text: { tag: 'lark_md', content: '**件名**: ' + subject }
        },
        { tag: 'hr' },
        {
          tag: 'div',
          text: { tag: 'lark_md', content: body + (body.length >= 500 ? '...' : '') }
        },
        { tag: 'hr' },
        {
          tag: 'note',
          elements: [{ tag: 'plain_text', content: 'Gmail自動転送 | ' + new Date().toLocaleString('ja-JP') }]
        }
      ]
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(card)
  };

  try {
    UrlFetchApp.fetch(LARK_WEBHOOK_URL, options);
    Logger.log('Sent to Lark: ' + subject);
  } catch (e) {
    Logger.log('Error: ' + e.message);
  }
}

// テスト用
function testSend() {
  sendToLark('test@example.com', 'テストメール', 'これはテストです。');
}
