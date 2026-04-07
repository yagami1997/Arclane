# edge204 — CF エッジ 204 プローブ

バージョン作成日時: 2026年4月7日 15:10 JST

Language:

- [English](./README.md)
- 日本語

## 概要

このディレクトリには、Cloudflare エッジから直接純粋な HTTP 204 レスポンスを返す Cloudflare Worker が含まれています。上流へのリクエストは一切発生せず、TLS オーバーヘッドもありません。

主な用途は Surge のプロキシノード遅延測定です。`url-test` または `fallback` 策略グループの `url` ターゲットとして設定すると、TLS 握手コストや上流サーバーの遅延を含まない、プロキシノードから最寄りの Cloudflare PoP までの純粋な RTT を Surge に提供します。

## なぜ HTTPS ではなく HTTP を使うのか

TLS 握手は初回接続時に 50〜150ms の追加コストを生じさせます。このオーバーヘッドが RTT 測定値を汚染し、Surge のノード順位付けを誤らせます。プレーンな HTTP で提供することで、実際に測定したい値、つまりプロキシノードの出口 IP から CF エッジまでの時間だけを取り出すことができます。

内部で `http://` リクエストを HTTPS にアップグレードするノードは、遅延数値が膨らんで表示されます。予期しない高い測定値が出た場合は `/trace` を使い、実際にどのプロトコルが Worker に到達したかを確認してください。

## Worker の機能

[`worker.js`](./worker.js) は 5 つのケースを処理します。

| パス | メソッド | ステータス | 用途 |
|---|---|---|---|
| `/generate_204` | GET / HEAD | 204 | Surge 向けメインプローブエンドポイント |
| `/204` | GET / HEAD | 204 | メインプローブの別名 |
| `/ping` | GET | 200 JSON | 死活確認、キャッシュなしを確認 |
| `/trace` | GET | 200 テキスト | CF PoP 診断情報を返す（障害調査用） |
| その他のパス | GET / HEAD | 404 | |
| 任意のパス | POST など | 405 | |

すべてのレスポンスに `Cache-Control: no-store, no-cache, must-revalidate` と `Pragma: no-cache` を付与し、いかなるキャッシュ層も古いデータを返さないようにして遅延測定値の汚染を防ぎます。

## 設計方針

Worker は意図的に最小構成にしています。

- `fetch()` 呼び出しなし。すべてのレスポンスはエッジで直接生成します。上流リクエスト、オリジンサーバー、エッジを超えるラウンドトリップは一切ありません。
- バインディングなし。KV、D1、R2、Durable Objects は使用しません。Worker は完全にステートレスです。
- アクセス制御・IP フィルタリングなし。レート制限は Worker コードではなく、ゾーンの WAF レイヤーで処理します。
- 単一の `fetch` ハンドラーをエクスポートする ES Module 構文を使用します。

## デプロイ手順

### Step 1: Cloudflare Dashboard で Worker を作成する

1. Cloudflare ダッシュボードにサインインします。
2. **Workers & Pages** を開きます。
3. **Create Worker** をクリックします。
4. 名前を `cf-edge-probe` にします。
5. デフォルトのスクリプトを [`worker.js`](./worker.js) の内容に置き換えます。
6. **Deploy** をクリックします。

### Step 2: カスタムドメインをバインドする

1. デプロイ済みの `cf-edge-probe` Worker を開きます。
2. **Settings → Domains & Routes → Add Custom Domain** に進みます。
3. `probe.example.com` を入力します。
4. Cloudflare がゾーンに CNAME レコードを自動作成します。
5. ドメインのステータスが **Active** になるまで待ちます（通常 1 分以内）。

### Step 3: ゾーンの SSL/TLS 設定を確認する

対象ゾーンの **SSL/TLS** で以下を確認します。

| 設定項目 | 必要な状態 |
|---|---|
| 常に HTTPS を使用 | オフ |
| 日和見的暗号化 | オフ |
| HSTS | 無効 |

これらの設定により、HTTP リクエストが Worker に到達する前に HTTPS にアップグレードされるのを防ぎます。

### Step 4: WAF レート制限ルールを追加する

対象ゾーンの **Security → WAF → Rate Limiting Rules** でルールを 1 つ作成します。

| 項目 | 値 |
|---|---|
| 条件 | ホスト名が `probe.example.com` と一致 |
| しきい値 | IP ごとに 10 秒あたり 60 リクエスト |
| アクション | ブロック（429 を返す） |

エンドポイント URL が知られた場合のクォータ枯渇を防ぎます。Surge の 300 秒間隔テストはこのしきい値を大幅に下回ります。

## 動作確認

カスタムドメインが有効になったら以下を確認します。

```bash
# メインプローブ：204 が返り、301 リダイレクトがないこと
curl -si http://probe.example.com/generate_204 | head -3

# Cache-Control ヘッダーが存在すること
curl -si http://probe.example.com/generate_204 | grep -i cache-control

# /ping の ts が呼び出しごとに異なること（キャッシュなしの確認）
curl -s http://probe.example.com/ping
curl -s http://probe.example.com/ping

# /trace が "unknown" ではなく実際の CF PoP データを返すこと
curl -s http://probe.example.com/trace
```

プロキシノード経由で `/trace` を呼び出したときの期待される出力：

```
colo=LAX
country=US
city=Los Angeles
asn=13335
ray=8a1b2c3d4e5f6a7b-LAX
ip=<プロキシ出口 IP>
ts=<ミリ秒タイムスタンプ>
```

`colo` がそのプロキシノードに期待した都市でない場合、ノードの出口が別の CF PoP を経由してルーティングされています。その場合の高遅延はルーティングの問題であり、ノード自体の障害ではありません。

## Surge 設定

### url-test 策略グループ

```ini
[Proxy Group]
Auto = url-test, Node-US-1, Node-US-2, Node-JP-1, Node-HK-1, \
  url=http://probe.example.com/generate_204, \
  interval=300, \
  tolerance=50
```

### fallback 策略グループ

```ini
[Proxy Group]
Fallback = fallback, Node-US-1, Node-US-2, Node-JP-1, \
  url=http://probe.example.com/generate_204, \
  interval=300
```

| パラメータ | 値 | 説明 |
|---|---|---|
| `url` | `http://probe.example.com/generate_204` | HTTP、TLS オーバーヘッドなし |
| `interval` | `300` | 300 秒ごとに再測定 |
| `tolerance` | `50` | 50ms 以内の差ではノードを切り替えない |

## 予期しない高遅延ノードの調査

```bash
# 問題のあるプロキシノード経由でリクエストをルーティングする
curl -x http://<NodeHost>:<Port> http://probe.example.com/trace
```

`colo` がノードの所在地から遠い PoP を示している場合、遅延はルーティングの問題です。`colo` が正しい場合、問題はそのノードと近隣の CF PoP 間のリンクにあります。

## ファイル構成

- [`worker.js`](./worker.js): Cloudflare Worker 実装
- [`dev-plan.md`](./dev-plan.md): 開発計画とアーキテクチャノート
