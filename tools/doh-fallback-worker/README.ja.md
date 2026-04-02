# DoH Fallback Worker

バージョン作成日時: 2026年4月2日 13:30 JST

Language:

- [English](./README.md)
- 日本語

## 概要

このディレクトリには、Cloudflare Worker ベースの DoH フォールバック用リバースプロキシ実装が含まれています。

用途は明確です。ユーザーが通常利用している DoH エンドポイントが停止、遮断、不安定化、または一時的に劣化した場合に、緊急用のバックアップ DoH エンドポイントとして使います。

これはメインのリゾルバとして設計されたものではありません。公開 DoH アップストリームの前段に置く軽量なプロキシであり、目的は可用性の補完と障害時の復旧性です。

## この Worker が行うこと

[worker.js](./tools/doh-fallback-worker/worker.js) は `/dns-query` で DoH リクエストを受け付け、複数のアップストリームリゾルバへ転送します。

- Cloudflare DoH
- Google Public DNS DoH
- Quad9 DoH

標準的な DoH の 2 つの形式に対応しています。

- `GET /dns-query?dns=...`
- `POST /dns-query` with `application/dns-message`

## 実装の主要設計

この Worker は、次の設計方針で構成されています。

1. 複数アップストリームの並列レース
   複数の DoH 上流へ同時に問い合わせを送り、最初に成功したレスポンスを採用します。勝者が決まった時点で、残りのリクエストは中断されます。

2. TTL ベースのキャッシュ
   キャッシュ時間を固定値にせず、DNS 応答を解析して最小 TTL を取り出し、その値を `Cache-Control` に反映します。

3. バックグラウンド更新
   キャッシュが失効間近であれば、現在のキャッシュを即時返却しつつ、`ctx.waitUntil(...)` で背後更新を行います。

4. ECS を考慮したキャッシュ分離
   ECS（EDNS Client Subnet）を含むクエリは別キャッシュとして扱われ、ECS なしの応答と混ざらないようになっています。

5. POST 用 SHA-256 キャッシュキー
   POST の DoH リクエストでは、バイナリ DNS ペイロードを SHA-256 でハッシュ化し、その値をキャッシュキーに使います。これにより生のクエリ内容を URL に露出させません。

## リクエスト処理の流れ

処理フローは次の通りです。

1. クライアントが `/dns-query` に DoH リクエストを送信する。
2. Worker がメソッドとリクエスト形式を検証する。
3. Worker がキャッシュキーを生成する。
4. キャッシュがあれば即時返却する。
5. キャッシュの有効期限が近ければ、バックグラウンド更新を開始する。
6. キャッシュがなければ、設定済みアップストリームへ並列に問い合わせる。
7. 最初に成功したアップストリームの応答を返す。
8. 抽出した TTL に基づいて非同期でキャッシュへ保存する。

## キャッシュ動作

[worker.js](./tools/doh-fallback-worker/worker.js) 内の現在の設定値:

- 最小 TTL 下限: `60` 秒
- 最大 TTL 上限: `86400` 秒
- 解析失敗時のデフォルト TTL: `300` 秒
- バックグラウンド更新の開始閾値: TTL 消費率 `75%` 以降

実運用上の意味は次の通りです。

- 極端に短い TTL は過剰な再問い合わせを避けるために底上げされます。
- 極端に長い TTL はキャッシュの残留を防ぐために上限で抑えられます。
- DNS 応答の解析に失敗した場合でも、安全側の TTL で処理されます。

## 返却ヘッダー

クライアントへ返す主なヘッダー:

- `content-type: application/dns-message`
- `cache-control: public, max-age=...`
- `x-cache: HIT` または `MISS`
- ブラウザ互換のための CORS ヘッダー
- `x-content-type-options` や `x-frame-options` などの基本的なセキュリティヘッダー

## 制限事項

この Worker は意図的に役割を絞っています。

- `/dns-query` だけを処理します。
- レート制限は実装していません。
- 認証は実装していません。
- メトリクスや可視化ダッシュボードは標準ではありません。
- 可用性は公開 DoH 上流の状態にも依存します。

公開インターネットにそのまま出す場合は、不特定多数向けの汎用公開リゾルバではなく、障害時の補助エンドポイントとして扱うのが適切です。

## ファイル

- [worker.js](./tools/doh-fallback-worker/worker.js): Cloudflare Worker 実装本体
- [README.md](./tools/doh-fallback-worker/README.md): 英語版ドキュメント

## デプロイ方法

Cloudflare ダッシュボード経由でも、Wrangler CLI 経由でもデプロイできます。

### 方法 A: Cloudflare ダッシュボードでデプロイ

1. Cloudflare ダッシュボードにサインインします。
2. `Workers & Pages` を開きます。
3. 新しい Worker を作成します。
4. デフォルトのスクリプトを [worker.js](./tools/doh-fallback-worker/worker.js) の内容で置き換えます。
5. 保存してデプロイします。

デプロイ後、Cloudflare は次のようなデフォルトホスト名を発行します。

```text
https://doh-fallback-proxy.example-account.workers.dev/dns-query
```

この URL をそのままフォールバック DoH エンドポイントとして使えます。

### 方法 B: Wrangler でデプロイ

1. Wrangler をインストールします。

```bash
npm install -g wrangler
```

2. Cloudflare にログインします。

```bash
wrangler login
```

3. このディレクトリで、必要に応じて最小構成の `wrangler.toml` を作成します。

```toml
name = "doh-fallback-worker"
main = "worker.js"
compatibility_date = "2026-04-02"
workers_dev = true
```

4. デプロイします。

```bash
wrangler deploy
```

成功すると、`workers.dev` の URL が払い出されます。

## カスタムドメイン設定

`workers.dev` を使わず、Cloudflare 上で管理している独自ドメインに Worker を紐付けることもできます。

例として、次のようなドメインを使う想定です。

```text
doh-backup.example-signal.net
```

最終的な DoH エンドポイント例:

```text
https://doh-backup.example-signal.net/dns-query
```

一般的な手順:

1. 利用するドメインを Cloudflare に追加します。
2. `Workers & Pages` を開きます。
3. デプロイ済み Worker を選択します。
4. カスタムドメインまたはルート割り当て設定を開きます。
5. `doh-backup.example-signal.net` のようなホスト名を紐付けます。
6. HTTPS が有効で、正しくルーティングされることを確認します。

DoH クライアント設定では、ホスト名だけでなく必ず `/dns-query` を含む完全な URL を指定してください。この Worker は `/dns-query` でしか応答しません。

## クライアントでの使い方

設定に使う値は、`/dns-query` を含む完全な HTTPS URL です。

```text
https://doh-backup.example-signal.net/dns-query
```

または `workers.dev` を使う場合:

```text
https://doh-fallback-proxy.example-account.workers.dev/dns-query
```

実際の設定画面はクライアントごとに異なりますが、通常必要なのはこの完全な DoH URL です。

## 動作確認

本番の退避先として使う前に、必ず疎通確認を行ってください。

確認ポイント:

1. URL を開いて Cloudflare プラットフォームエラーではなく Worker 自体が応答していることを確認する。
2. DoH 対応クライアントから実際のクエリを送る。
3. 同一クエリを繰り返した際に `x-cache: HIT` が返ることを確認する。
4. 一部アップストリームが遅延または失敗しても利用継続できることを確認する。

## 運用上の指針

- この Worker はフォールバック用途として使う。
- スクリプトは小さく保ち、監査しやすくする。
- アップストリーム一覧を変えたら再デプロイする。
- 将来的にレート制限やアクセス制御を追加する場合は、クライアント互換性に影響するため必ず明記する。
