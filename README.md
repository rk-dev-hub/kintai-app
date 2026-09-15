# 勤怠管理アプリ

固定時間制・単一組織向けの勤怠管理アプリ。出退勤・休憩の打刻、打刻修正・休暇の
申請／承認、労働基準法に準拠した月次の労働時間・割増時間の集計、CSV / PDF 出力を行う。

接続情報はすべて環境変数化しており、リポジトリには**ダミー値のみ**を含む。ホスティング先ごとのデプロイ構成は含めず、導入先の環境に合わせて設定する（[本番環境の設定](#本番環境の設定) を参照）。

## ステータス

要件定義で決めた機能はすべて実装済み。対象外とした機能（フレックス・シフト管理など）は
[docs/00-overview.md](docs/00-overview.md) の「スコープ外」を参照。

| 機能   | 内容                                                                                     |
| ------ | ---------------------------------------------------------------------------------------- |
| 認証   | Auth.js v5 Credentials、JWT、初回パスワード変更の強制、簡易レート制限                    |
| ロール | 従業員 / 管理者。全 Server Action・Route Handler でロール＋本人確認                      |
| 打刻   | 出退勤・休憩の状態機械、日跨ぎ勤務、締め済み期間はブロック                               |
| 集計   | 日次サマリ→週40時間の壁→月次（時間外25/50%・深夜25%・法定休日35%・遅刻早退・有給みなし） |
| 申請   | 打刻修正・休暇（有給は失効が近い付与から FIFO 消化）・取消申請                           |
| 承認   | 承認待ち一覧、1件ずつ承認/却下（却下コメント必須・自己承認禁止）、監査ログ               |
| マスタ | 就業規則・勤務パターン・休日カレンダー（祝日取込＋手動上書き）・有給付与/調整            |
| 締め   | 事前チェック→締め→再オープン（理由必須）、範囲指定の再計算                               |
| 出力   | 日別 CSV・月次サマリ CSV（全員可）・勤務表 PDF。`CSV_ENCODING` 対応                      |
| テスト | 単体 100+ / 結合 25+（DB）/ E2E（Playwright）                                            |

仕様は [`docs/`](docs/) を参照。テスト方針と実装計画は [docs/07-tooling.md](docs/07-tooling.md) を参照。

| ドキュメント                                               | 内容                         |
| ---------------------------------------------------------- | ---------------------------- |
| [docs/00-overview.md](docs/00-overview.md)                 | 決定事項サマリ               |
| [docs/01-requirements.md](docs/01-requirements.md)         | 要件定義                     |
| [docs/02-architecture.md](docs/02-architecture.md)         | 技術選定・構成               |
| [docs/03-database.md](docs/03-database.md)                 | データモデル・ER             |
| [docs/04-aggregation-spec.md](docs/04-aggregation-spec.md) | 労働時間・割増計算の詳細仕様 |
| [docs/05-screens.md](docs/05-screens.md)                   | 画面一覧・遷移               |
| [docs/06-api-and-actions.md](docs/06-api-and-actions.md)   | Server Actions / API         |
| [docs/07-tooling.md](docs/07-tooling.md)                   | テスト方針・実装計画         |

## 技術スタック

Next.js 16 (App Router, Turbopack) / React 19 / TypeScript / Prisma 6 / PostgreSQL 16 /
Auth.js v5 (Credentials) / Tailwind CSS v4 + shadcn/ui / Vitest / Playwright

## セットアップ

起動方法は 2 通り。とりあえず触ってみたい場合は A、開発する場合は B。

### A. お試し起動（Docker だけで完結）

Node.js / pnpm のインストールは不要。Docker だけで PostgreSQL とアプリをまとめて起動する。

```bash
docker compose --profile app up   # 初回はイメージの作成と依存のインストールで数分かかる
```

`kintai-app` のログに `Ready` と出たら http://localhost:3000 を開く。

- 初回起動時だけ、マイグレーションと開発用データ（架空の従業員・標準マスタ・祝日）を自動で投入する。2 回目以降は既存データを残す。
- ログイン: 管理者 `admin@example.com` / `ChangeMe123!`、架空の従業員 `yamada@example.com` など / `Password123!`。初回ログイン時にパスワード変更を求められる。
- ソースはコンテナにマウントしているので、編集すると自動で反映される。
- 停止は `Ctrl+C`。コンテナを削除する場合は `docker compose --profile app down`（DB のデータも消す場合は `-v` を付ける）。
- ポート 3000 / 5432 が他で使われている場合は、`.env` に `APP_PORT` / `DB_PORT` を書いて変更する（`.env.example` 参照）。

> Git フック（lefthook）・E2E テスト・結合テストはホスト側の Node.js を前提にしているため、開発する場合は B を使う。

### B. ネイティブ開発

前提: Node.js 22 以上、pnpm 10 以上、Docker（PostgreSQL 用）。

```bash
pnpm install
cp .env.example .env          # 値はダミー。必要なら変更
docker compose up -d          # PostgreSQL を起動
pnpm prisma migrate dev       # スキーマ適用
pnpm db:seed                  # 架空の従業員・標準マスタ・祝日データを投入
pnpm dev                      # http://localhost:3000
```

初期管理者は `.env` の `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`。
初回ログイン時にパスワード変更を求められる。

### 環境変数

`.env.example` を参照。最低限、以下は各自の値にすること。

| 変数                                             | 説明                                               |
| ------------------------------------------------ | -------------------------------------------------- |
| `DATABASE_URL`                                   | PostgreSQL 接続文字列                              |
| `AUTH_SECRET`                                    | セッション署名鍵。`openssl rand -base64 32` で生成 |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | seed が作る初期管理者                              |

## 本番環境の設定

1. `DATABASE_URL` を自前の PostgreSQL に向ける（RDS / Cloud SQL / 自前サーバ等）。
2. `AUTH_SECRET` を再生成する。
3. `pnpm prisma migrate deploy` でスキーマを適用。
4. 架空データ seed は流さず、管理者だけ作成する: `pnpm create:admin --email you@example.com --password '...' --name 氏名`。
5. 就業規則（所定労働時間・締め日・割増率・深夜帯・法定休日曜日）を `/admin/work-rules` で設定。
6. 祝日データは `pnpm holidays:update`（内閣府 CSV から `data/holidays.json` を再生成）で更新できる。

> 割増計算は労基法準拠の固定ロジック（日 8h / 週 40h、時間外 25%、月 60h 超 50%、
> 深夜 25%、法定休日 35%）。フレックス・裁量労働・変形労働時間制・シフトは対象外。
> 詳細と限界は [docs/04-aggregation-spec.md](docs/04-aggregation-spec.md) を参照。

## スクリプト

| コマンド                                 | 内容                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js（Turbopack）                                                                |
| `pnpm db:seed`                           | 開発用データ投入（架空の従業員・標準マスタ・祝日 2020-）                            |
| `pnpm create:admin`                      | 管理者のみ作成（本番向け）                                                          |
| `pnpm holidays:update`                   | 内閣府 CSV から `data/holidays.json` を再生成（省略時は既存データを保持）           |
| `pnpm verify`                            | typecheck + lint + 単体テスト（DB 不要）                                            |
| `pnpm test`                              | Vitest 単体（`src/features/**/domain`・`lib` が中心）                               |
| `pnpm test:integration`                  | usecase の結合テスト。**docker の PostgreSQL が必要**（`pnpm verify` には含めない） |
| `pnpm test:e2e`                          | Playwright E2E。dev サーバーを自動起動し、実行前に DB をリセット＆シード            |

## テストの前提

- `pnpm test:integration` と `pnpm test:e2e` は `docker compose up -d` で起動した
  `kintai-db` を直接操作する（TRUNCATE / seed）。**開発用 DB 専用**。実データのある DB では実行しないこと。

## ライセンス

[MIT License](./LICENSE)
