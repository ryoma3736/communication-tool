# Lark Message Hub - クイックスタートガイド

## 🚀 5分でセットアップ

### 前提条件

- Node.js 20.x 以上
- AWS CLI 設定済み
- AWS SAM CLI インストール済み
- 各サービスのアカウント準備済み

### Step 1: リポジトリクローン

```bash
git clone https://github.com/ryoma3736/communication-tool.git
cd communication-tool
```

### Step 2: 依存関係インストール

```bash
npm install
```

### Step 3: 環境変数設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して各APIキーを設定:

```bash
# 必須設定
LARK_APP_ID=cli_xxxxx
LARK_APP_SECRET=xxxxx
LARK_DEFAULT_GROUP_ID=oc_xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
```

### Step 4: ビルド

```bash
npm run build
```

### Step 5: ローカルテスト

```bash
npm test
```

### Step 6: AWS デプロイ

```bash
# SAM ビルド
sam build --template infrastructure/template.yaml

# 初回デプロイ（対話式）
sam deploy --guided

# 2回目以降
sam deploy
```

---

## 📱 サービス設定

### Lark App 設定

1. [Lark Developer Console](https://open.larksuite.com/) にログイン
2. 新しいアプリを作成
3. Bot 機能を有効化
4. Card Actions Webhook URL を設定:
   ```
   https://{API_GATEWAY_URL}/webhook/lark
   ```
5. 必要な権限を追加:
   - `im:message:send`
   - `im:chat:readonly`

### Twilio 設定

1. [Twilio Console](https://console.twilio.com/) にログイン
2. Conversations Service を作成
3. Webhook URL を設定:
   ```
   https://{API_GATEWAY_URL}/webhook/twilio
   ```
4. LINE/WhatsApp チャネルを接続

### Meta (Facebook/Instagram) 設定

1. [Meta Developer Portal](https://developers.facebook.com/) でアプリ作成
2. Webhook を設定:
   ```
   https://{API_GATEWAY_URL}/webhook/meta
   ```
3. Page Access Token を取得
4. アプリ審査を提出

---

## 🔧 開発コマンド

```bash
# ビルド
npm run build

# 開発モード（ファイル監視）
npm run watch

# テスト実行
npm test

# テスト（カバレッジ付き）
npm run test:coverage

# Lint
npm run lint

# 型チェック
npm run type-check
```

---

## 📁 プロジェクト構造

```
communication-tool/
├── src/
│   ├── handlers/          # Lambda ハンドラー
│   ├── services/          # ビジネスロジック
│   ├── repositories/      # データアクセス
│   ├── lark/              # Lark API クライアント
│   ├── twilio/            # Twilio 統合
│   ├── meta/              # Meta API 統合
│   ├── linkedin/          # LinkedIn 統合
│   └── types/             # 型定義
├── infrastructure/
│   └── template.yaml      # AWS SAM テンプレート
├── tests/                 # テストコード
├── docs/                  # ドキュメント
└── .github/workflows/     # CI/CD
```

---

## 🆘 トラブルシューティング

### ビルドエラー

```bash
# node_modules を削除して再インストール
rm -rf node_modules
npm install
```

### デプロイエラー

```bash
# SAM キャッシュをクリア
rm -rf .aws-sam
sam build --template infrastructure/template.yaml
```

### Webhook が届かない

1. API Gateway URL が正しいか確認
2. CloudWatch Logs でエラーを確認
3. 署名検証が正しいか確認

---

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/ryoma3736/communication-tool/issues)
- **ドキュメント**: [docs/REQUIREMENTS.md](./REQUIREMENTS.md)

---

🌸 Generated with [Claude Code](https://claude.com/claude-code)
