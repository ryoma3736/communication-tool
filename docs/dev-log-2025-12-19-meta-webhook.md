# 開発ログ: Meta Webhook設定作業 (2025-12-19)

## 概要

Facebook Messenger / Instagram DM → Lark 通知連携のWebhook設定作業を実施。

## 実施内容

### 1. 実装済みコードの確認

以下のファイルが既に実装済みであることを確認：

| ファイル | 内容 |
|---------|------|
| `src/bridges/messenger-to-lark.ts` | Messenger→Lark転送 + Interactive Card |
| `src/bridges/instagram-to-lark.ts` | Instagram→Lark転送 |
| `src/servers/meta-lark-bridge.ts` | 統合Expressサーバー |
| `src/webhooks/messenger-webhook.ts` | Webhook受信 |
| `src/webhooks/instagram-webhook.ts` | Instagram Webhook受信 |
| `src/meta/client.ts` | Graph APIクライアント |
| `src/auth/meta-auth.ts` | OAuth認証 |
| `src/utils/messenger-profile.ts` | プロフィール取得 |
| `src/config/meta-bridge.config.ts` | 設定 |

### 2. GitHub Issue整理

実装済みのIssueをクローズ：
- #30: OAuth認証フロー ✅
- #31: Messenger Webhook受信 ✅
- #32: Messenger → Lark 転送 ✅
- #33: Instagram DM Webhook受信 ✅
- #34: Instagram DM → Lark 転送 ✅
- #35: 統合ブリッジサーバー ✅

### 3. Webhook検証サーバー作成

Meta Developer Consoleでの検証用に簡易サーバーを作成：

```
scripts/webhook-verify-server.ts
```

- ポート: 3003
- 検証トークン: `communication_tool_verify_2024`
- エンドポイント: `/webhook/meta`

### 4. Meta Developer Console設定

#### 完了した項目
- [x] Webhook URL検証成功
  - URL: `https://icicled-bryleigh-semimoderately.ngrok-free.dev/webhook/meta`
  - トークン: `communication_tool_verify_2024`

#### 未完了（要対応）
- [ ] Facebookページの作成・連携
- [ ] PAGE_ACCESS_TOKENの取得
- [ ] messagesイベントの購読

### 5. 環境変数設定

`.env` に以下を設定済み：
```
META_VERIFY_TOKEN=communication_tool_verify_2024
```

未設定（要対応）：
```
META_APP_ID=
META_APP_SECRET=
META_PAGE_ACCESS_TOKEN=
META_PAGE_ID=
```

## 重要な発見

### Facebook Messenger APIの制約

| 種類 | API対応 | 備考 |
|------|---------|------|
| ページMessenger | ✅ あり | ビジネス用（顧客対応） |
| 個人Messenger | ❌ なし | プライバシー保護でAPI非公開 |

**結論**: 個人のMessengerメッセージを自動転送する方法は公式にはない。
ビジネスページへのメッセージのみ転送可能。

## 次のステップ（引き継ぎ）

### 必須
1. Facebookページを作成
2. Meta Developer Consoleでページを連携
3. PAGE_ACCESS_TOKENを取得して.envに設定
4. messagesイベントを購読

### テスト
1. Facebookページにメッセージ送信
2. Webhook受信確認（ngrokログ）
3. Lark転送確認

### 本番デプロイ
1. AWS SAMでデプロイ: `npm run deploy:staging`
2. ngrok URLをAWS API Gateway URLに置き換え
3. Meta Developer Consoleで本番URLに変更

## ファイル変更一覧

### 新規作成
- `scripts/webhook-verify-server.ts` - Webhook検証用サーバー
- `docs/dev-log-2025-12-19-meta-webhook.md` - この開発ログ

### 変更
- `.env` - META_VERIFY_TOKEN追加

## 参考リンク

- [Meta Developer Console](https://developers.facebook.com/)
- [Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform/)
- [Webhook Setup Guide](https://developers.facebook.com/docs/messenger-platform/webhooks)
