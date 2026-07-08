# estate-notify-ai

不動産管理会社向けマルチチャネル通知システム。  
メール・LINEから届く問い合わせを Supabase に保存し、Claude でカテゴリ分類して Slack へ通知します。  
クレームなど緊急問い合わせは営業部長の LINE へ 5 分以内に Push 通知します。

## デモURL

管理画面デモ: https://estate-notify-ai.vercel.app/

## このプロジェクトでできること

- LINE / メールから届いた問い合わせを Supabase に保存
- Claude で問い合わせカテゴリを自動分類（賃貸 / 売買 / 内見 / クレーム）
- Slack へカテゴリ別に通知
- クレーム・緊急時は営業部長の LINE へ Push 通知
- 管理画面で問い合わせ状況（分類結果・緊急フラグ・通知ステータス）を確認できる

## 本番公開状況

- Vercelにデプロイ済み（GitHub `main` ブランチと連携し、pushで自動デプロイ）
- Supabaseの実データを管理画面で表示確認済み

### 運用上の制限・調整

- Vercel Hobbyプランでは Cron の実行間隔が1日1回までのため、`vercel.json` の Cron設定は `0 0 * * *`（1日1回）に調整済み
- 教材・ローカル検証では手動で `/api/cron/classify` を実行し、Claude分類・Slack通知・LINE Pushの実送信を確認済み
- 本番環境では、意図しない通知の重複送信を避けるため `/api/cron/classify` を不用意に手動実行しない運用としている

### セキュリティ・プライバシーへの配慮

- `.env.local` はGit管理対象外（`.gitignore` の `.env*` パターンで除外）
- APIキー・トークン・Secretの実値はVercelの Environment Variables で管理し、リポジトリには含めない
- 管理画面ではLINEの `sender_id`（内部ユーザーID）をそのまま表示せず、「LINEユーザー」という汎用表示に置き換えている
- `LINE_MANAGER_USER_ID` は個人のLINE User IDに紐づくため、本番環境（Vercel）には設定しない方針
- `LINE_MANAGER_USER_ID` 未設定時はLINE Pushのみスキップし、Slack通知が成功していれば問い合わせ全体は `notified` として正常完了する

## 技術スタック

| 役割 | 技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| データベース | Supabase (PostgreSQL) |
| サーバーレス | Vercel Functions |
| 定期処理 | Vercel Cron |
| 分類 AI | Claude API (Anthropic) |
| 通知 (チーム) | Slack Web API |
| 通知 (個人) | LINE Messaging API |

## セットアップ手順

### 1. リポジトリのクローンと依存パッケージのインストール

```bash
git clone https://github.com/your-org/estate-notify-ai.git
cd estate-notify-ai
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて全項目を入力してください（下記「環境変数一覧」参照）。

### 3. Supabase マイグレーションの実行

[Supabase ダッシュボード](https://supabase.com/dashboard) → SQL Editor を開き、以下のファイルを実行してください。

```
supabase/migrations/001_create_inquiry_queue.sql
```

### 4. ローカル開発サーバーの起動

```bash
npm run dev
```

`http://localhost:3000` で起動します。

### 5. Vercel へのデプロイ

```bash
npx vercel --prod
```

Vercel のダッシュボードで環境変数を設定し、`.env.local` の値をすべて登録してください。

---

## 環境変数一覧

| 変数名 | 説明 | 公開範囲 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | クライアント可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | クライアント可 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー | **サーバーのみ** |
| `ANTHROPIC_API_KEY` | Anthropic API キー | **サーバーのみ** |
| `SLACK_BOT_TOKEN` | Slack Bot トークン (`xoxb-...`) | **サーバーのみ** |
| `SLACK_CHANNEL_RENTAL` | Slack #賃貸 チャンネル ID | **サーバーのみ** |
| `SLACK_CHANNEL_SALE` | Slack #売買 チャンネル ID | **サーバーのみ** |
| `SLACK_CHANNEL_PREVIEW` | Slack #内見 チャンネル ID | **サーバーのみ** |
| `SLACK_CHANNEL_COMPLAINT` | Slack #クレーム チャンネル ID | **サーバーのみ** |
| `LINE_CHANNEL_SECRET` | LINE Webhook 署名検証シークレット | **サーバーのみ** |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE メッセージ送信トークン | **サーバーのみ** |
| `LINE_MANAGER_USER_ID` | 営業部長の LINE User ID | **サーバーのみ** |
| `CRON_SECRET` | Cron エンドポイント保護トークン | **サーバーのみ** |
| `INTERNAL_API_SECRET` | メール受信 API の Bearer 認証トークン | **サーバーのみ** |

### セキュリティ上の注意

> **警告: 以下のルールを必ず守ってください**

- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用の秘密鍵です。**絶対に公開しないでください。**
- `SUPABASE_SERVICE_ROLE_KEY` には `NEXT_PUBLIC_` プレフィックスを付けてはいけません（付けるとブラウザに露出します）。
- 以下のキーはすべてサーバー専用です。クライアントコード・フロントエンドでは使用しないでください。
  - `ANTHROPIC_API_KEY`
  - `SLACK_BOT_TOKEN`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `CRON_SECRET`
  - `INTERNAL_API_SECRET`
- `.env.local` は `.gitignore` の `.env*` パターンにより Git 管理から除外されています。`git add` や `git commit` で誤って含めないよう注意してください。
- **スクリーンショット・画面共有・チャットへの貼り付け時にも API キーが映り込まないよう注意してください。**

---

## API エンドポイント

| メソッド | パス | 用途 | 認証 |
|---|---|---|---|
| POST | `/api/webhook/line` | LINE Webhook 受信 | LINE 署名検証 |
| POST | `/api/inquiry/email` | メール問い合わせ受信 | Bearer トークン |
| GET | `/api/cron/classify` | pending 問い合わせの分類バッチ | `CRON_SECRET` |

### Windows PowerShellから日本語を含むリクエストを送る場合の注意

Windows PowerShellで `curl.exe` に日本語を含むJSON文字列を直接渡すと、コンソールのコードページの影響で本文が `?` に文字化けする場合があります（検証時に実際に発生）。

回避方法として、`Invoke-RestMethod` を使い、送信するJSON文字列を `[System.Text.Encoding]::UTF8.GetBytes()` でUTF-8のバイト配列に変換してから `-Body` に渡してください。

```powershell
$jsonBody  = $bodyObject | ConvertTo-Json -Compress
$utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
Invoke-RestMethod -Uri "..." -Method Post -ContentType "application/json; charset=utf-8" -Body $utf8Bytes
```

---

## カテゴリ分類仕様

Claude が受信メッセージを以下の 4 カテゴリに分類します。

| カテゴリ | Slack 通知先 | 追加アクション |
|---|---|---|
| 賃貸 | `#賃貸` | なし |
| 売買 | `#売買` | なし |
| 内見 | `#内見` | なし |
| クレーム | `#クレーム` | 営業部長の LINE へ Push 通知 |

### 緊急候補の判定フロー（誤検知対策）

1. Webhook 受信時に本文中のキーワード（「クレーム」「至急」「苦情」等）を確認
2. キーワードあり → 「緊急候補」フラグを立てて保存
3. Claude 分類で **「クレーム」と判定された場合のみ** LINE Push 通知
4. 「クレームではありません」など否定文は誤検知しない設計

---

## Cron 設定について

`vercel.json` の現在の設定は **1 分間隔** です（教材用）。

```json
{ "schedule": "* * * * *" }
```

> **本番運用では** コストや Vercel プランに応じて 5 分間隔 (`*/5 * * * *`) への変更を推奨します。  
> Vercel の Hobby プランでは Cron の最小間隔は 1 日 1 回のため、Pro プラン以上が必要です。

### 認証仕様（CRON_SECRET）

- 認証は `Authorization: Bearer <CRON_SECRET>` ヘッダーで行う
- `CRON_SECRET` が未設定の場合: **500 (Server misconfiguration)** を返す
- トークンが一致しない場合: **401 (Unauthorized)** を返す
- 比較は完全一致（trimなし）。前後の空白や大文字小文字の違いも区別される

---

## 分類精度テスト結果

`data/test-inquiries.csv` の 22 件を使って Claude 分類の精度を検証しました。

```bash
npm run test:classify
```

### テストデータ概要

| 項目 | 内容 |
|---|---|
| データ総数 | 22 件 |
| 精度計算対象 | 21 件 |
| 観察ケース（対象外） | 1 件（No.21: 無関係メッセージ） |

| カテゴリ | 件数 |
|---|---|
| 賃貸 | 11 件 |
| 売買 | 4 件 |
| 内見 | 4 件 |
| クレーム | 2 件 |
| 無関係（観察） | 1 件 |

### プロンプト改善前（初回）

| 指標 | 結果 |
|---|---|
| カテゴリ分類正解率 | 81.0%（17/21） |
| 緊急判定正解率 | 81.0%（17/21） |
| 誤分類数 | 4 件 |

**誤分類の原因:** 軽微な設備不具合（エアコン故障・電球切れ）、鍵紛失、騒音相談を「クレーム / is_urgent=true」と過剰判定していた。

### 改善内容（`src/lib/claude/classify.ts` プロンプト修正）

- 「クレーム」の定義を **強い不満・抗議・怒り・対応遅れへの怒りが文面から明確に読み取れる場合のみ** に限定
- 以下は強い不満・抗議表現がなければ「賃貸」に分類するよう明示
  - 設備の不具合報告（エアコン・電球・水回りなど）
  - 鍵の紛失
  - 騒音の相談（初回・穏やかな表現）

### プロンプト改善後

| 指標 | 結果 |
|---|---|
| カテゴリ分類正解率 | **100.0%（21/21）** |
| 緊急判定正解率 | **100.0%（21/21）** |
| 誤分類数 | **0 件** |

### 特殊ケースの確認

**No.21 無関係メッセージ（観察ケース）**

> 本文: 「今日は天気がいいですね。」  
> Claude 判定: `賃貸 / is_urgent=false`  
> ※ 4 カテゴリ限定のためいずれかに強制分類される。誤分類は設計上の制約であり異常ではない。

**No.22 否定文テスト**

> 本文: 「クレームではないのですが、家賃の請求書に誤りがあるようです。至急ではありませんが確認をお願いします。」  
> Claude 判定: `賃貸 / is_urgent=false` ✓  
> 否定表現（「クレームではない」「至急ではない」）を正しく解釈し、クレーム・緊急扱いしないことを確認。

### 型チェック

```bash
npx tsc --noEmit
# エラー 0 件
```

---

## Slack通知の動作確認

Slack Bot経由での通知の実送信を確認済みです。

テスト段階では `SLACK_CHANNEL_RENTAL` / `SLACK_CHANNEL_SALE` / `SLACK_CHANNEL_PREVIEW` / `SLACK_CHANNEL_COMPLAINT` の4つをすべて同一チャンネルIDに設定しても動作します（カテゴリごとに参照する環境変数が異なるだけで、値の重複に技術的な制約はありません）。本番運用ではカテゴリ別に分けることを推奨します。

---

## LINE連携の動作確認

### Webhook受信テスト（ngrok使用）

ローカル開発サーバーを ngrok で一時的に公開し、LINE公式アカウントからのWebhook受信を確認しました。

1. `ngrok http 3000` でローカルサーバーを一時公開（例: `https://xxxx.ngrok-free.dev`）
2. LINE Developersコンソールの Webhook URL に `https://xxxx.ngrok-free.dev/api/webhook/line` を設定
3. LINE公式アカウントへ実際にメッセージを送信し、`inquiry_queue` に `source=line` として正しく保存されることを確認
4. 受信イベントの `source.userId` から送信者のLINE User IDを取得できることを確認（`LINE_MANAGER_USER_ID` の設定に使用。ngrok URLは一時的なものなので実際の値はここには記載しません）

### LINE Push通知の実送信確認

クレーム・緊急判定時にLINE Push通知が実際に送信されることを確認しました。

**テストケース（クレーム相当の問い合わせ）**

| 項目 | 結果 |
|---|---|
| category | クレーム |
| is_urgent | true |
| status | notified |

**Cron実行結果**

```json
{ "processed": 2, "notified": 2, "failed": 0 }
```

Claude分類 → Supabase更新 → Slackクレームチャンネル通知 → 営業部長へのLINE Push通知 → 完了ステータス更新、という一連のフローが正常に動作することを確認しました。

---

## 管理画面

### ローカル確認 URL

```
http://localhost:3000
```

```bash
npm run dev
```

### 表示内容

| 要素 | 説明 |
|---|---|
| 概要カード | 総問い合わせ数・未分類件数・通知済み件数・緊急件数を一覧表示 |
| 問い合わせ一覧 | 受信日時・受信元・送信者・カテゴリ・緊急フラグ・ステータス・本文プレビュー |
| カテゴリ色分け | 賃貸=青 / 売買=緑 / 内見=黄 / クレーム=赤 |
| ステータス色分け | pending=グレー / classified=紫 / notified=緑 / failed=赤 |
| 緊急フラグ | `is_urgent=true` の場合 🚨 アイコンで表示 |
| デモデータ表示 | Supabase 未接続時は自動でデモデータ 6 件を表示し「デモデータ表示中」バッジを付与 |

### 動作確認済み

- ローカル（`http://localhost:3000`）での表示を確認済み
- Supabase実データの表示を確認済み（テスト問い合わせがダッシュボードに正しく反映されることを確認済み）
- データ取得は `src/app/page.tsx` の Server Component 内で実行
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー側のみで使用し、クライアントには公開されない
- `npm run lint` : エラー 0 件・警告 0 件
- `npx tsc --noEmit` : エラー 0 件

---

## ディレクトリ構成

```
src/
├── app/
│   └── api/
│       ├── webhook/line/route.ts     # LINE Webhook 受信
│       ├── inquiry/email/route.ts    # メール問い合わせ受信
│       └── cron/classify/route.ts   # 定期分類バッチ
└── lib/
    ├── supabase/
    │   ├── client.ts                 # Supabase クライアント
    │   └── queries.ts                # DB 操作関数
    ├── claude/classify.ts            # Claude 分類ロジック
    ├── slack/notify.ts               # Slack 通知
    ├── line/
    │   ├── verify.ts                 # 署名検証
    │   └── push.ts                   # LINE Push 通知
    └── types.ts                      # 共通型定義
supabase/migrations/
    └── 001_create_inquiry_queue.sql  # テーブル定義
data/
    └── test-inquiries.csv            # 分類精度テスト用 22 件
scripts/
    └── test-classify.ts              # 精度確認スクリプト
```
